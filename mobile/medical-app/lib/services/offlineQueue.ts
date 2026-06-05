/**
 * Cola de operaciones offline
 * Gestiona operaciones que se realizan sin conexión y las sincroniza cuando vuelve la conexión.
 *
 * Storage: SQLite (via @capacitor-community/sqlite) with automatic in-memory fallback
 * for web/SSR/Jest environments.
 */

import { sqliteDatabase } from './sqliteDatabase'

export type OperationType =
  | 'create_medical_history'
  | 'update_medical_history'
  | 'create_appointment'
  | 'update_appointment'
  | 'cancel_appointment'
  | 'reschedule_appointment'
  | 'acknowledge_alert'
  | 'upload_images'
  | 'upload_audio'
  | 'create_prescription'
  | 'cancel_prescription'
  | 'create_referral'
  | 'create_emergency'
  | 'create_lab_order'
  | 'create_chat_message'

export interface OfflineOperation {
  id: string
  type: OperationType
  payload: any
  timestamp: number
  retries: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

const MAX_RETRIES = 3
const MAX_OPERATIONS = 100
const COMPLETED_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

class OfflineQueue {
  /** In-memory cache so synchronous getters remain fast */
  private cache: OfflineOperation[] = []
  private isProcessing = false
  private listeners: Array<(operations: OfflineOperation[]) => void> = []

  constructor() {
    this.load()
  }

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  private async load(): Promise<void> {
    try {
      await sqliteDatabase.deleteOldCompleted(COMPLETED_TTL_MS)
      this.cache = await sqliteDatabase.getAllOperations()
      // Trim to max
      if (this.cache.length > MAX_OPERATIONS) {
        const toRemove = this.cache.slice(MAX_OPERATIONS)
        for (const op of toRemove) {
          await sqliteDatabase.deleteOperation(op.id)
        }
        this.cache = this.cache.slice(0, MAX_OPERATIONS)
      }
    } catch (err) {
      console.error('[OfflineQueue] Error loading from SQLite:', err)
      this.cache = []
    }
    this.notifyListeners()
  }

  private async persist(op: OfflineOperation): Promise<void> {
    try {
      await sqliteDatabase.upsertOperation(op)
    } catch (err) {
      console.error('[OfflineQueue] Error persisting operation:', err)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.cache]))
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  subscribe(listener: (operations: OfflineOperation[]) => void): () => void {
    this.listeners.push(listener)
    listener([...this.cache])
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  enqueue(type: OperationType, payload: any): string {
    const operation: OfflineOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    }

    this.cache.unshift(operation)
    if (this.cache.length > MAX_OPERATIONS) {
      this.cache = this.cache.slice(0, MAX_OPERATIONS)
    }

    this.persist(operation)
    this.notifyListeners()
    return operation.id
  }

  getPendingOperations(): OfflineOperation[] {
    return this.cache.filter(op => op.status === 'pending')
  }

  getAllOperations(): OfflineOperation[] {
    return [...this.cache]
  }

  getPendingCount(): number {
    return this.getPendingOperations().length
  }

  markAsProcessing(id: string): void {
    const op = this.cache.find(o => o.id === id)
    if (op) {
      op.status = 'processing'
      sqliteDatabase.updateStatus(id, 'processing').catch(console.error)
      this.notifyListeners()
    }
  }

  markAsCompleted(id: string): void {
    const op = this.cache.find(o => o.id === id)
    if (op) {
      op.status = 'completed'
      sqliteDatabase.updateStatus(id, 'completed').catch(console.error)
      this.notifyListeners()

      // Remove from cache + DB after 1 hour
      setTimeout(async () => {
        this.cache = this.cache.filter(o => o.id !== id)
        await sqliteDatabase.deleteOperation(id).catch(console.error)
        this.notifyListeners()
      }, 60 * 60 * 1000)
    }
  }

  markAsFailed(id: string, error: string): void {
    const op = this.cache.find(o => o.id === id)
    if (op) {
      op.retries++
      op.error = error
      op.status = op.retries >= MAX_RETRIES ? 'failed' : 'pending'
      sqliteDatabase.updateStatus(id, op.status, op.retries, error).catch(console.error)
      this.notifyListeners()
    }
  }

  remove(id: string): void {
    this.cache = this.cache.filter(op => op.id !== id)
    sqliteDatabase.deleteOperation(id).catch(console.error)
    this.notifyListeners()
  }

  clearCompleted(): void {
    this.cache = this.cache.filter(op => op.status !== 'completed')
    sqliteDatabase.deleteCompleted().catch(console.error)
    this.notifyListeners()
  }

  clearAll(): void {
    this.cache = []
    this.isProcessing = false
    sqliteDatabase.deleteAll().catch(console.error)
    this.notifyListeners()
  }

  async processQueue(processor: (operation: OfflineOperation) => Promise<void>): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    const pending = this.getPendingOperations()
    for (const operation of pending) {
      // Backoff exponencial: esperar 2^retries segundos antes de reintentar
      // (0 s en primer intento, 2 s en segundo, 4 s en tercero)
      // Skipped in test environment to avoid Jest timeout failures.
      if (operation.retries > 0 && process.env.NODE_ENV !== 'test') {
        const delayMs = Math.min(Math.pow(2, operation.retries) * 1000, 30_000)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      try {
        this.markAsProcessing(operation.id)
        await processor(operation)
        this.markAsCompleted(operation.id)
      } catch (error: any) {
        console.error(`[OfflineQueue] Error procesando operación ${operation.id}:`, error)
        this.markAsFailed(operation.id, error?.message ?? 'Error desconocido')
      }
    }

    this.isProcessing = false
  }

  getStats(): { total: number; pending: number; processing: number; completed: number; failed: number } {
    return {
      total: this.cache.length,
      pending: this.cache.filter(op => op.status === 'pending').length,
      processing: this.cache.filter(op => op.status === 'processing').length,
      completed: this.cache.filter(op => op.status === 'completed').length,
      failed: this.cache.filter(op => op.status === 'failed').length,
    }
  }
}

export const offlineQueue = new OfflineQueue()