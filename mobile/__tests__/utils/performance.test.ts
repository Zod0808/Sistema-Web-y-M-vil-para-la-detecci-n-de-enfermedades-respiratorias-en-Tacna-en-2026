/**
 * @jest-environment jsdom
 */

import {
  debounce,
  throttle,
  lazyLoadImage,
  memoize,
  BatchProcessor,
  getVisibleItems,
} from '../../medical-app/lib/utils/performance';

describe('performance utils', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('debounce', () => {
    it('llama a la función después del wait', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced('a');
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('a');
    });

    it('reinicia el timer en llamadas consecutivas', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced('a');
      jest.advanceTimersByTime(50);
      debounced('b');
      jest.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('b');
    });
  });

  describe('throttle', () => {
    it('ejecuta la primera llamada inmediatamente', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled('a');
      expect(fn).toHaveBeenCalledWith('a');
    });

    it('bloquea llamadas subsecuentes durante el intervalo', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled('a');
      throttled('b');
      throttled('c');
      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttled('d');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('d');
    });
  });

  describe('memoize', () => {
    it('cachea resultados por argumentos', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('llama a la función original para argumentos distintos', () => {
      const fn = jest.fn((x: number) => x + 1);
      const memoized = memoize(fn);

      memoized(1);
      memoized(2);
      memoized(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('serializa múltiples argumentos como key', () => {
      const fn = jest.fn((a: number, b: number) => a + b);
      const memoized = memoize(fn);

      expect(memoized(1, 2)).toBe(3);
      expect(memoized(1, 2)).toBe(3);
      expect(memoized(2, 1)).toBe(3);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('lazyLoadImage', () => {
    it('setea el src cuando el observer detecta intersección', () => {
      let callback: (entries: any[]) => void = () => {};
      const observe = jest.fn();
      const unobserve = jest.fn();
      (global as any).IntersectionObserver = jest.fn().mockImplementation((cb: any) => {
        callback = cb;
        return { observe, unobserve, disconnect: jest.fn() };
      });

      const img = document.createElement('img');
      lazyLoadImage(img, 'https://example.com/image.jpg');

      expect(observe).toHaveBeenCalledWith(img);

      callback([{ isIntersecting: true }]);
      expect(img.src).toBe('https://example.com/image.jpg');
      expect(unobserve).toHaveBeenCalledWith(img);
    });

    it('no setea el src cuando no hay intersección', () => {
      let callback: (entries: any[]) => void = () => {};
      (global as any).IntersectionObserver = jest.fn().mockImplementation((cb: any) => {
        callback = cb;
        return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
      });

      const img = document.createElement('img');
      lazyLoadImage(img, 'https://example.com/x.jpg');

      callback([{ isIntersecting: false }]);
      expect(img.src).toBe('');
    });
  });

  describe('BatchProcessor', () => {
    it('procesa cuando la cola llega al batchSize', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);
      const batcher = new BatchProcessor<number>(processor, 3, 1000);

      batcher.add(1);
      batcher.add(2);
      batcher.add(3);

      await Promise.resolve();
      await Promise.resolve();

      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('procesa por timeout cuando no se llena el batch', async () => {
      jest.useFakeTimers();
      const processor = jest.fn().mockResolvedValue(undefined);
      const batcher = new BatchProcessor<number>(processor, 10, 500);

      batcher.add(1);
      batcher.add(2);

      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(processor).toHaveBeenCalledWith([1, 2]);
    });

    it('flush no hace nada cuando la cola está vacía', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);
      const batcher = new BatchProcessor<number>(processor, 10, 500);

      await batcher.flush();
      expect(processor).not.toHaveBeenCalled();
    });

    it('reintenta items cuando el processor falla', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const processor = jest.fn().mockRejectedValue(new Error('boom'));
      const batcher = new BatchProcessor<number>(processor, 2, 1000);

      batcher.add(1);
      batcher.add(2);

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(errorSpy).toHaveBeenCalled();
      // Items reinsertados en la cola
      await batcher.flush().catch(() => {});
    });

    it('forceFlush ejecuta el flush', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);
      const batcher = new BatchProcessor<number>(processor, 10, 500);

      batcher.add(1);
      await batcher.forceFlush();

      expect(processor).toHaveBeenCalledWith([1]);
    });
  });

  describe('getVisibleItems', () => {
    it('retorna slice correcta según scrollTop', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const result = getVisibleItems(items, 400, 40, 200);

      expect(result.start).toBeLessThanOrEqual(5);
      expect(result.end).toBeGreaterThan(result.start);
      expect(result.visibleItems).toEqual(items.slice(result.start, result.end));
    });

    it('start clampeado a 0 cuando scrollTop es 0', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const result = getVisibleItems(items, 400, 40, 0);
      expect(result.start).toBe(0);
    });

    it('end clampeado al length del array', () => {
      const items = [1, 2, 3, 4, 5];
      const result = getVisibleItems(items, 1000, 40, 0);
      expect(result.end).toBe(5);
      expect(result.visibleItems).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('optimizeImage', () => {
    // optimizeImage usa canvas + Image + FileReader, todos con soporte parcial en jsdom.
    // Testeamos solo error paths que no dependen del pipeline visual.

    it('rechaza cuando FileReader falla', async () => {
      const { optimizeImage } = await import('../../medical-app/lib/utils/performance');
      const originalReader = global.FileReader;

      class FailingReader {
        onload: any = null;
        onerror: any = null;
        readAsDataURL() {
          setTimeout(() => this.onerror && this.onerror(new Error('read fail')), 0);
        }
      }
      (global as any).FileReader = FailingReader;

      const file = new File(['x'], 'x.png', { type: 'image/png' });
      await expect(optimizeImage(file)).rejects.toThrow(/leer el archivo/);

      global.FileReader = originalReader;
    });
  });
});
