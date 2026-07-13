import { NativeStorage, StorageKeys } from '@/lib/services/nativeStorage'

describe('NativeStorage (web/jsdom branch)', () => {
  beforeEach(() => localStorage.clear())

  describe('setItem / getItem / removeItem / clear', () => {
    it('round-trips a string via localStorage', async () => {
      await NativeStorage.setItem('k', 'v')
      expect(await NativeStorage.getItem('k')).toBe('v')
      await NativeStorage.removeItem('k')
      expect(await NativeStorage.getItem('k')).toBeNull()
    })

    it('clear wipes all keys', async () => {
      await NativeStorage.setItem('a', '1')
      await NativeStorage.setItem('b', '2')
      await NativeStorage.clear()
      expect(await NativeStorage.getItem('a')).toBeNull()
      expect(await NativeStorage.getItem('b')).toBeNull()
    })

    it('setItem swallows QuotaExceededError silently', async () => {
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      await expect(NativeStorage.setItem('k', 'v')).resolves.toBeUndefined()
      spy.mockRestore()
    })

    it('getItem returns null when localStorage throws', async () => {
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('denied')
      })
      expect(await NativeStorage.getItem('k')).toBeNull()
      spy.mockRestore()
    })
  })

  describe('keys', () => {
    it('lists all keys stored', async () => {
      await NativeStorage.setItem('a', '1')
      await NativeStorage.setItem('b', '2')
      const keys = await NativeStorage.keys()
      expect(keys.sort()).toEqual(['a', 'b'])
    })

    it('returns [] when localStorage throws', async () => {
      const spy = jest.spyOn(Object, 'keys').mockImplementationOnce(() => { throw new Error('denied') })
      expect(await NativeStorage.keys()).toEqual([])
      spy.mockRestore()
    })
  })

  describe('setJSON / getJSON', () => {
    it('round-trips an object', async () => {
      await NativeStorage.setJSON('u', { id: 1, name: 'A' })
      expect(await NativeStorage.getJSON('u')).toEqual({ id: 1, name: 'A' })
    })

    it('returns null when the raw value is not valid JSON', async () => {
      await NativeStorage.setItem('u', 'not-json')
      expect(await NativeStorage.getJSON('u')).toBeNull()
    })

    it('returns null when the key does not exist', async () => {
      expect(await NativeStorage.getJSON('missing')).toBeNull()
    })
  })

  describe('setBool / getBool', () => {
    it('stores true as "1" and false as "0"', async () => {
      await NativeStorage.setBool('b1', true)
      await NativeStorage.setBool('b2', false)
      expect(await NativeStorage.getItem('b1')).toBe('1')
      expect(await NativeStorage.getItem('b2')).toBe('0')
    })

    it('parses "1"/"true" as true and everything else as false', async () => {
      await NativeStorage.setItem('a', '1')
      await NativeStorage.setItem('b', 'true')
      await NativeStorage.setItem('c', '0')
      expect(await NativeStorage.getBool('a')).toBe(true)
      expect(await NativeStorage.getBool('b')).toBe(true)
      expect(await NativeStorage.getBool('c')).toBe(false)
    })

    it('returns the default when the key is missing', async () => {
      expect(await NativeStorage.getBool('missing', true)).toBe(true)
      expect(await NativeStorage.getBool('missing')).toBe(false)
    })
  })

  describe('StorageKeys', () => {
    it('exposes a stable namespace prefix', () => {
      for (const value of Object.values(StorageKeys)) {
        expect(value.startsWith('respicare:')).toBe(true)
      }
    })
  })
})

describe('NativeStorage (native/Capacitor branch)', () => {
  const prefsMock = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue({ value: 'from-prefs' }),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockResolvedValue({ keys: ['k1', 'k2'] }),
  }

  beforeAll(() => {
    jest.doMock('@capacitor/preferences', () => ({ Preferences: prefsMock }))
    ;(window as any).Capacitor = { isNativePlatform: () => true }
  })

  afterAll(() => {
    delete (window as any).Capacitor
    jest.dontMock('@capacitor/preferences')
  })

  beforeEach(() => Object.values(prefsMock).forEach(fn => (fn as jest.Mock).mockClear()))

  it('setItem delegates to Preferences.set', async () => {
    const { NativeStorage: NS } = require('@/lib/services/nativeStorage')
    await NS.setItem('k', 'v')
    expect(prefsMock.set).toHaveBeenCalledWith({ key: 'k', value: 'v' })
  })

  it('getItem returns the value emitted by Preferences.get', async () => {
    const { NativeStorage: NS } = require('@/lib/services/nativeStorage')
    expect(await NS.getItem('k')).toBe('from-prefs')
    expect(prefsMock.get).toHaveBeenCalledWith({ key: 'k' })
  })

  it('removeItem, clear and keys go through Preferences', async () => {
    const { NativeStorage: NS } = require('@/lib/services/nativeStorage')
    await NS.removeItem('k')
    await NS.clear()
    const keys = await NS.keys()
    expect(prefsMock.remove).toHaveBeenCalledWith({ key: 'k' })
    expect(prefsMock.clear).toHaveBeenCalled()
    expect(keys).toEqual(['k1', 'k2'])
  })
})
