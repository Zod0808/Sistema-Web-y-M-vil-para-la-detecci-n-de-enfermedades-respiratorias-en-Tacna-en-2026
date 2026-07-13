jest.mock('@/lib/services/sqliteDatabase', () => ({
  sqliteDatabase: {
    deleteOldCompleted: jest.fn().mockResolvedValue(undefined),
    getAllOperations: jest.fn().mockResolvedValue([]),
    upsertOperation: jest.fn().mockResolvedValue(undefined),
    deleteOperation: jest.fn().mockResolvedValue(undefined),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    deleteCompleted: jest.fn().mockResolvedValue(undefined),
    deleteAll: jest.fn().mockResolvedValue(undefined),
  },
}))

import { offlineQueue } from '@/lib/services/offlineQueue'

describe('OfflineQueue', () => {
  beforeEach(async () => {
    offlineQueue.clearAll()
    // Wait a tick for the pending clearAll persistence to settle
    await Promise.resolve()
  })

  describe('enqueue', () => {
    it('creates a pending op with a unique id and returns it', () => {
      const id = offlineQueue.enqueue('create_appointment', { at: 'x' })
      expect(id).toMatch(/^op_\d+_/)
      const op = offlineQueue.getAllOperations().find(o => o.id === id)
      expect(op?.status).toBe('pending')
      expect(op?.retries).toBe(0)
      expect(op?.payload).toEqual({ at: 'x' })
    })

    it('increments pending count', () => {
      expect(offlineQueue.getPendingCount()).toBe(0)
      offlineQueue.enqueue('acknowledge_alert', {})
      offlineQueue.enqueue('acknowledge_alert', {})
      expect(offlineQueue.getPendingCount()).toBe(2)
    })
  })

  describe('markAsProcessing / markAsCompleted / markAsFailed', () => {
    it('transitions pending → processing → completed', () => {
      const id = offlineQueue.enqueue('acknowledge_alert', {})
      offlineQueue.markAsProcessing(id)
      expect(offlineQueue.getAllOperations().find(o => o.id === id)?.status).toBe('processing')
      offlineQueue.markAsCompleted(id)
      expect(offlineQueue.getAllOperations().find(o => o.id === id)?.status).toBe('completed')
    })

    it('keeps failed ops pending until MAX_RETRIES is reached', () => {
      const id = offlineQueue.enqueue('acknowledge_alert', {})
      offlineQueue.markAsFailed(id, 'boom-1')
      let op = offlineQueue.getAllOperations().find(o => o.id === id)!
      expect(op.status).toBe('pending')
      expect(op.retries).toBe(1)
      offlineQueue.markAsFailed(id, 'boom-2')
      offlineQueue.markAsFailed(id, 'boom-3')
      op = offlineQueue.getAllOperations().find(o => o.id === id)!
      expect(op.status).toBe('failed')
      expect(op.error).toBe('boom-3')
    })

    it('is a no-op for unknown ids', () => {
      offlineQueue.markAsProcessing('does-not-exist')
      offlineQueue.markAsCompleted('does-not-exist')
      offlineQueue.markAsFailed('does-not-exist', 'x')
      expect(offlineQueue.getAllOperations()).toEqual([])
    })
  })

  describe('remove / clearCompleted / clearAll', () => {
    it('remove drops a single op by id', () => {
      const a = offlineQueue.enqueue('acknowledge_alert', {})
      offlineQueue.enqueue('acknowledge_alert', {})
      offlineQueue.remove(a)
      expect(offlineQueue.getAllOperations().find(o => o.id === a)).toBeUndefined()
      expect(offlineQueue.getAllOperations().length).toBe(1)
    })

    it('clearCompleted only drops completed ops', () => {
      const a = offlineQueue.enqueue('acknowledge_alert', {})
      const b = offlineQueue.enqueue('acknowledge_alert', {})
      offlineQueue.markAsCompleted(a)
      offlineQueue.clearCompleted()
      expect(offlineQueue.getAllOperations().map(o => o.id)).toEqual([b])
    })
  })

  describe('subscribe', () => {
    it('invokes the listener on subscription and on every change, and stops after cleanup', () => {
      const cb = jest.fn()
      const off = offlineQueue.subscribe(cb)
      expect(cb).toHaveBeenCalled()
      cb.mockClear()
      offlineQueue.enqueue('acknowledge_alert', {})
      expect(cb).toHaveBeenCalled()
      off()
      cb.mockClear()
      offlineQueue.enqueue('acknowledge_alert', {})
      expect(cb).not.toHaveBeenCalled()
    })
  })

  describe('processQueue', () => {
    it('processes each pending op and marks it completed', async () => {
      const a = offlineQueue.enqueue('acknowledge_alert', { n: 1 })
      const b = offlineQueue.enqueue('acknowledge_alert', { n: 2 })
      const processor = jest.fn().mockResolvedValue(undefined)
      await offlineQueue.processQueue(processor)
      expect(processor).toHaveBeenCalledTimes(2)
      const all = offlineQueue.getAllOperations()
      expect(all.find(o => o.id === a)?.status).toBe('completed')
      expect(all.find(o => o.id === b)?.status).toBe('completed')
    })

    it('marks ops as failed when the processor throws', async () => {
      const id = offlineQueue.enqueue('acknowledge_alert', {})
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      await offlineQueue.processQueue(async () => { throw new Error('nope') })
      spy.mockRestore()
      const op = offlineQueue.getAllOperations().find(o => o.id === id)!
      expect(op.retries).toBe(1)
      expect(op.error).toBe('nope')
    })

    it('is re-entrant safe: a second call returns early while already running', async () => {
      offlineQueue.enqueue('acknowledge_alert', {})
      let running = 0
      let maxRunning = 0
      const processor = async () => {
        running++
        maxRunning = Math.max(maxRunning, running)
        await Promise.resolve()
        running--
      }
      await Promise.all([offlineQueue.processQueue(processor), offlineQueue.processQueue(processor)])
      expect(maxRunning).toBe(1)
    })
  })

  describe('getStats', () => {
    it('summarises the queue by status', () => {
      const a = offlineQueue.enqueue('acknowledge_alert', {})
      const b = offlineQueue.enqueue('acknowledge_alert', {})
      const c = offlineQueue.enqueue('acknowledge_alert', {})
      offlineQueue.markAsProcessing(a)
      offlineQueue.markAsCompleted(b)
      offlineQueue.markAsFailed(c, 'e1')
      offlineQueue.markAsFailed(c, 'e2')
      offlineQueue.markAsFailed(c, 'e3')
      const s = offlineQueue.getStats()
      expect(s.total).toBe(3)
      expect(s.processing).toBe(1)
      expect(s.completed).toBe(1)
      expect(s.failed).toBe(1)
    })
  })
})
