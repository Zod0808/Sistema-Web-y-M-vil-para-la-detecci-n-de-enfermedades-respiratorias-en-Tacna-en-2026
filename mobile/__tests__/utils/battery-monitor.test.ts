/**
 * @jest-environment jsdom
 */

type BatteryMock = {
  level: number;
  charging: boolean;
  chargingTime: number | null;
  dischargingTime: number | null;
  addEventListener: (event: string, cb: () => void) => void;
  _emit: (event: string) => void;
};

const buildBatteryMock = (overrides: Partial<BatteryMock> = {}): BatteryMock => {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    level: 0.75,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 3600 * 1000,
    addEventListener(event, cb) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
    _emit(event) {
      (listeners[event] || []).forEach((cb) => cb());
    },
    ...overrides,
  };
};

// Cargamos el módulo dentro de isolateModules por test para tener
// una nueva instancia de la singleton `batteryMonitor` cada vez.
const loadWithBattery = async (battery: BatteryMock | null) => {
  let mod: any;
  if (battery) {
    (navigator as any).getBattery = jest.fn().mockResolvedValue(battery);
  } else {
    delete (navigator as any).getBattery;
  }
  jest.isolateModules(() => {
    mod = require('../../medical-app/lib/utils/battery-monitor');
  });
  // Esperar a que la promesa async del constructor resuelva
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  return mod;
};

describe('battery-monitor', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('inicialización con Battery API disponible', () => {
    it('lee level/charging/chargingTime/dischargingTime del battery', async () => {
      const battery = buildBatteryMock();
      const { batteryMonitor } = await loadWithBattery(battery);

      expect(batteryMonitor.getBatteryStatus()).toEqual({
        level: 0.75,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: 3600 * 1000,
      });
    });

    it('actualiza estado cuando dispara levelchange', async () => {
      const battery = buildBatteryMock();
      const { batteryMonitor } = await loadWithBattery(battery);

      battery.level = 0.6;
      battery._emit('levelchange');

      expect(batteryMonitor.getBatteryStatus()?.level).toBe(0.6);
      expect(batteryMonitor.getMetrics().length).toBeGreaterThan(0);
    });

    it('actualiza estado en chargingchange y chargingtimechange y dischargingtimechange', async () => {
      const battery = buildBatteryMock();
      const { batteryMonitor } = await loadWithBattery(battery);

      battery.charging = true;
      battery._emit('chargingchange');
      battery._emit('chargingtimechange');
      battery._emit('dischargingtimechange');

      expect(batteryMonitor.getBatteryStatus()?.charging).toBe(true);
    });

    it('mantiene máximo 100 métricas', async () => {
      const battery = buildBatteryMock({ level: 1.0 });
      const { batteryMonitor } = await loadWithBattery(battery);

      for (let i = 0; i < 150; i++) {
        battery.level = Math.max(0, 1 - i * 0.001);
        battery._emit('levelchange');
      }

      expect(batteryMonitor.getMetrics().length).toBeLessThanOrEqual(100);
    });
  });

  describe('fallback cuando la Battery API no está disponible', () => {
    it('usa estado por defecto (level=1, charging=false)', async () => {
      const { batteryMonitor } = await loadWithBattery(null);

      expect(batteryMonitor.getBatteryStatus()).toEqual({
        level: 1.0,
        charging: false,
        chargingTime: null,
        dischargingTime: null,
      });
    });

    it('advierte y cae al fallback cuando getBattery lanza', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      (navigator as any).getBattery = jest.fn().mockRejectedValue(new Error('denied'));
      let mod: any;
      jest.isolateModules(() => {
        mod = require('../../medical-app/lib/utils/battery-monitor');
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(warn).toHaveBeenCalled();
      expect(mod.batteryMonitor.getBatteryStatus()?.level).toBe(1);
    });
  });

  describe('isBatteryLow', () => {
    it('true cuando level<threshold y no carga', async () => {
      const battery = buildBatteryMock({ level: 0.1, charging: false });
      const { batteryMonitor } = await loadWithBattery(battery);
      expect(batteryMonitor.isBatteryLow(0.2)).toBe(true);
    });

    it('false cuando está cargando aunque nivel sea bajo', async () => {
      const battery = buildBatteryMock({ level: 0.1, charging: true });
      const { batteryMonitor } = await loadWithBattery(battery);
      expect(batteryMonitor.isBatteryLow(0.2)).toBe(false);
    });

    it('usa threshold 0.2 por defecto', async () => {
      const battery = buildBatteryMock({ level: 0.15, charging: false });
      const { batteryMonitor } = await loadWithBattery(battery);
      expect(batteryMonitor.isBatteryLow()).toBe(true);
    });

    it('false cuando level >= threshold', async () => {
      const battery = buildBatteryMock({ level: 0.5, charging: false });
      const { batteryMonitor } = await loadWithBattery(battery);
      expect(batteryMonitor.isBatteryLow(0.2)).toBe(false);
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('recomienda medidas agresivas cuando batería < 20%', async () => {
      const battery = buildBatteryMock({ level: 0.15, charging: false });
      const { batteryMonitor } = await loadWithBattery(battery);
      const recs = batteryMonitor.getOptimizationRecommendations();
      expect(recs.some((r: string) => /muy baja/i.test(r))).toBe(true);
    });

    it('recomienda medidas moderadas cuando batería 20%-50%', async () => {
      const battery = buildBatteryMock({ level: 0.4, charging: false });
      const { batteryMonitor } = await loadWithBattery(battery);
      const recs = batteryMonitor.getOptimizationRecommendations();
      expect(recs.some((r: string) => /moderada/i.test(r))).toBe(true);
    });

    it('recomienda cargar cuando batería 20%-30% sin carga', async () => {
      const battery = buildBatteryMock({ level: 0.25, charging: false });
      const { batteryMonitor } = await loadWithBattery(battery);
      const recs = batteryMonitor.getOptimizationRecommendations();
      expect(recs.some((r: string) => /Cargar/i.test(r))).toBe(true);
    });

    it('retorna [] cuando batería está alta', async () => {
      const battery = buildBatteryMock({ level: 0.8, charging: false });
      const { batteryMonitor } = await loadWithBattery(battery);
      expect(batteryMonitor.getOptimizationRecommendations()).toEqual([]);
    });
  });

  describe('getConsumptionStats', () => {
    it('retorna las 4 propiedades esperadas', async () => {
      const battery = buildBatteryMock();
      const { batteryMonitor } = await loadWithBattery(battery);
      const stats = batteryMonitor.getConsumptionStats();

      expect(stats).toHaveProperty('avgConsumptionRate');
      expect(stats).toHaveProperty('currentLevel');
      expect(stats).toHaveProperty('isCharging');
      expect(stats).toHaveProperty('estimatedTimeRemaining');
    });

    it('calcula avgConsumptionRate promediando métricas de descarga', async () => {
      const battery = buildBatteryMock({ level: 1.0 });
      const { batteryMonitor } = await loadWithBattery(battery);

      // Generar métricas de descarga
      battery.level = 0.9;
      battery._emit('levelchange');
      battery.level = 0.8;
      battery._emit('levelchange');

      const stats = batteryMonitor.getConsumptionStats();
      expect(stats.avgConsumptionRate).toBeGreaterThanOrEqual(0);
    });

    it('convierte dischargingTime a minutos en estimatedTimeRemaining', async () => {
      const battery = buildBatteryMock({ dischargingTime: 3600 * 1000 });
      const { batteryMonitor } = await loadWithBattery(battery);
      const stats = batteryMonitor.getConsumptionStats();
      expect(stats.estimatedTimeRemaining).toBe(60);
    });
  });

  describe('listeners onBatteryChange', () => {
    it('notifica al listener cuando cambia el nivel', async () => {
      const battery = buildBatteryMock();
      const { batteryMonitor } = await loadWithBattery(battery);

      const listener = jest.fn();
      batteryMonitor.onBatteryChange(listener);

      battery.level = 0.5;
      battery._emit('levelchange');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ level: 0.5 }),
      );
    });

    it('unsubscribe deja de notificar', async () => {
      const battery = buildBatteryMock();
      const { batteryMonitor } = await loadWithBattery(battery);

      const listener = jest.fn();
      const unsub = batteryMonitor.onBatteryChange(listener);
      unsub();

      battery.level = 0.4;
      battery._emit('levelchange');

      expect(listener).not.toHaveBeenCalled();
    });

    it('atrapa error del listener sin bloquear a otros', async () => {
      const battery = buildBatteryMock();
      const { batteryMonitor } = await loadWithBattery(battery);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const bad = jest.fn(() => {
        throw new Error('boom');
      });
      const good = jest.fn();
      batteryMonitor.onBatteryChange(bad);
      batteryMonitor.onBatteryChange(good);

      battery.level = 0.3;
      battery._emit('levelchange');

      expect(bad).toHaveBeenCalled();
      expect(good).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('modo estimado - monitorResourceUsage', () => {
    it('setInterval reduce el nivel estimado con el tiempo', async () => {
      jest.useFakeTimers();
      let mod: any;
      jest.isolateModules(() => {
        (global as any).window = { performance: undefined };
        (global as any).navigator = {};
        mod = require('../../medical-app/lib/utils/battery-monitor');
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const initial = mod.batteryMonitor.getBatteryStatus()?.level;
      jest.advanceTimersByTime(60_000);
      const after = mod.batteryMonitor.getBatteryStatus()?.level;

      expect(after).toBeLessThanOrEqual(initial);
    });

    it('considera performance.memory para consumo estimado', async () => {
      jest.useFakeTimers();
      let mod: any;
      jest.isolateModules(() => {
        (global as any).window = {
          performance: {
            memory: {
              usedJSHeapSize: 50_000_000,
              jsHeapSizeLimit: 100_000_000,
            },
          },
        };
        (global as any).navigator = {};
        mod = require('../../medical-app/lib/utils/battery-monitor');
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      jest.advanceTimersByTime(60_000);
      expect(mod.batteryMonitor.getBatteryStatus()).toBeDefined();
    });
  });
});
