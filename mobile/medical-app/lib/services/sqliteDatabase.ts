/**
 * SQLite Database Service for offline storage (Capacitor Android)
 *
 * Falls back to an in-memory store when running in a browser / SSR context
 * where the native plugin is unavailable (e.g. Next.js dev server, Jest).
 */

import type { OfflineOperation } from './offlineQueue'

const DB_NAME = 'respicare'
const DB_VERSION = 1

// ---------------------------------------------------------------------------
// Lazy-load the native plugin only in a browser+Capacitor context
// ---------------------------------------------------------------------------
async function getPlugin() {
  if (typeof window === 'undefined') return null
  try {
    const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite')
    return { CapacitorSQLite, SQLiteConnection }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Schema DDL
// ---------------------------------------------------------------------------
const SCHEMA = `
CREATE TABLE IF NOT EXISTS offline_queue (
  id          TEXT    PRIMARY KEY,
  type        TEXT    NOT NULL,
  payload     TEXT    NOT NULL,
  timestamp   INTEGER NOT NULL,
  retries     INTEGER NOT NULL DEFAULT 0,
  status      TEXT    NOT NULL DEFAULT 'pending',
  error       TEXT
);
`

// ---------------------------------------------------------------------------
// SQLiteDatabase – thin wrapper used by offlineQueue
// ---------------------------------------------------------------------------
class SQLiteDatabase {
  private sqliteConn: InstanceType<typeof import('@capacitor-community/sqlite').SQLiteConnection> | null = null
  private db: Awaited<ReturnType<InstanceType<typeof import('@capacitor-community/sqlite').SQLiteConnection>['createConnection']>> | null = null
  private ready: Promise<void>
  private initialized = false

  /** In-memory fallback used when the native plugin is not available */
  private memStore: Map<string, OfflineOperation> = new Map()
  private useMemFallback = false

  constructor() {
    this.ready = this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      const plugin = await getPlugin()
      if (!plugin) {
        this.useMemFallback = true
        this.initialized = true
        return
      }

      const { CapacitorSQLite, SQLiteConnection } = plugin
      const conn = new SQLiteConnection(CapacitorSQLite)

      // Check if a connection already exists
      const ret = await conn.checkConnectionsConsistency()
      const isConn = (await conn.isConnection(DB_NAME, false)).result
      let dbConn
      if (ret.result && isConn) {
        dbConn = await conn.retrieveConnection(DB_NAME, false)
      } else {
        dbConn = await conn.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)
      }

      await dbConn.open()
      await dbConn.execute(SCHEMA)

      this.sqliteConn = conn
      this.db = dbConn
      this.initialized = true
    } catch (err) {
      console.warn('[SQLiteDatabase] Native plugin unavailable, falling back to in-memory store:', err)
      this.useMemFallback = true
      this.initialized = true
    }
  }

  private async ensureReady(): Promise<void> {
    await this.ready
  }

  // -------------------------------------------------------------------------
  // CRUD helpers
  // -------------------------------------------------------------------------

  async getAllOperations(): Promise<OfflineOperation[]> {
    await this.ensureReady()
    if (this.useMemFallback) {
      return Array.from(this.memStore.values()).sort((a, b) => b.timestamp - a.timestamp)
    }
    const result = await this.db!.query('SELECT * FROM offline_queue ORDER BY timestamp DESC')
    return (result.values ?? []).map(this.rowToOperation)
  }

  async upsertOperation(op: OfflineOperation): Promise<void> {
    await this.ensureReady()
    if (this.useMemFallback) {
      this.memStore.set(op.id, op)
      return
    }
    await this.db!.run(
      `INSERT OR REPLACE INTO offline_queue (id, type, payload, timestamp, retries, status, error)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [op.id, op.type, JSON.stringify(op.payload), op.timestamp, op.retries, op.status, op.error ?? null]
    )
  }

  async updateStatus(id: string, status: OfflineOperation['status'], retries?: number, error?: string): Promise<void> {
    await this.ensureReady()
    if (this.useMemFallback) {
      const op = this.memStore.get(id)
      if (op) {
        op.status = status
        if (retries !== undefined) op.retries = retries
        if (error !== undefined) op.error = error
      }
      return
    }
    await this.db!.run(
      `UPDATE offline_queue SET status = ?, retries = COALESCE(?, retries), error = ? WHERE id = ?`,
      [status, retries ?? null, error ?? null, id]
    )
  }

  async deleteOperation(id: string): Promise<void> {
    await this.ensureReady()
    if (this.useMemFallback) {
      this.memStore.delete(id)
      return
    }
    await this.db!.run('DELETE FROM offline_queue WHERE id = ?', [id])
  }

  async deleteCompleted(): Promise<void> {
    await this.ensureReady()
    if (this.useMemFallback) {
      for (const [id, op] of this.memStore) {
        if (op.status === 'completed') this.memStore.delete(id)
      }
      return
    }
    await this.db!.run("DELETE FROM offline_queue WHERE status = 'completed'")
  }

  async deleteAll(): Promise<void> {
    await this.ensureReady()
    if (this.useMemFallback) {
      this.memStore.clear()
      return
    }
    await this.db!.run('DELETE FROM offline_queue')
  }

  async deleteOldCompleted(olderThanMs: number): Promise<void> {
    await this.ensureReady()
    const cutoff = Date.now() - olderThanMs
    if (this.useMemFallback) {
      for (const [id, op] of this.memStore) {
        if (op.status === 'completed' && op.timestamp < cutoff) this.memStore.delete(id)
      }
      return
    }
    await this.db!.run(
      "DELETE FROM offline_queue WHERE status = 'completed' AND timestamp < ?",
      [cutoff]
    )
  }

  // -------------------------------------------------------------------------
  // Row mapper
  // -------------------------------------------------------------------------
  private rowToOperation(row: Record<string, any>): OfflineOperation {
    return {
      id: row.id,
      type: row.type,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      timestamp: row.timestamp,
      retries: row.retries,
      status: row.status,
      error: row.error ?? undefined,
    }
  }

  async close(): Promise<void> {
    if (this.sqliteConn && this.db) {
      await this.sqliteConn.closeConnection(DB_NAME, false)
    }
  }
}

export const sqliteDatabase = new SQLiteDatabase()