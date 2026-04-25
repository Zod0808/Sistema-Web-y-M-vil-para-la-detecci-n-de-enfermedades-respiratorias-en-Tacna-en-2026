/**
 * Monitor de consumo de batería
 * 
 * Monitorea y reporta el consumo de batería en dispositivos móviles
 * Integra con BatteryOptimizationService para optimizaciones automáticas
 */

import React from 'react';

interface BatteryStatus {
  level: number; // 0-1
  charging: boolean;
  chargingTime: number | null;
  dischargingTime: number | null;
}

interface BatteryMetrics {
  initialLevel: number;
  currentLevel: number;
  consumptionRate: number; // Por hora
  estimatedTimeRemaining: number | null;
  isCharging: boolean;
  timestamp: number;
}

class BatteryMonitor {
  private batteryStatus: BatteryStatus | null = null;
  private metrics: BatteryMetrics[] = [];
  private initialLevel: number | null = null;
  private lastCheckTime: number = Date.now();
  private listeners: Array<(status: BatteryStatus) => void> = [];

  constructor() {
    this.initializeBatteryAPI();
  }

  /**
   * Inicializa la API de batería (si está disponible)
   */
  private async initializeBatteryAPI(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Intentar usar Battery API (Chrome/Edge)
      const battery = await (navigator as any).getBattery?.();
      
      if (battery) {
        this.updateBatteryStatus(battery);
        
        battery.addEventListener('chargingchange', () => {
          this.updateBatteryStatus(battery);
        });
        
        battery.addEventListener('levelchange', () => {
          this.updateBatteryStatus(battery);
        });
        
        battery.addEventListener('chargingtimechange', () => {
          this.updateBatteryStatus(battery);
        });
        
        battery.addEventListener('dischargingtimechange', () => {
          this.updateBatteryStatus(battery);
        });
      } else {
        // Fallback: usar estimaciones basadas en uso
        this.estimateBatteryUsage();
      }
    } catch (error) {
      console.warn('Battery API not available:', error);
      this.estimateBatteryUsage();
    }
  }

  /**
   * Actualiza el estado de la batería
   */
  private updateBatteryStatus(battery: any): void {
    this.batteryStatus = {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime
    };

    if (this.initialLevel === null) {
      this.initialLevel = battery.level;
    }

    this.recordMetric();
    this.notifyListeners();
  }

  /**
   * Estima el uso de batería cuando la API no está disponible
   */
  private estimateBatteryUsage(): void {
    // En dispositivos donde la API no está disponible,
    // podemos estimar basándonos en el uso de recursos
    this.batteryStatus = {
      level: 1.0, // Asumir 100% si no podemos medir
      charging: false,
      chargingTime: null,
      dischargingTime: null
    };

    // Monitorear uso de CPU y memoria como proxy
    this.monitorResourceUsage();
  }

  /**
   * Monitorea el uso de recursos como proxy de consumo de batería
   */
  private monitorResourceUsage(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      // Calcular consumo estimado basado en:
      // - Número de timers activos
      // - Uso de memoria
      // - Actividad de red
      const estimatedConsumption = this.calculateEstimatedConsumption();
      
      if (this.batteryStatus) {
        // Ajustar nivel estimado (muy aproximado)
        this.batteryStatus.level = Math.max(0, 
          (this.batteryStatus.level || 1) - estimatedConsumption
        );
        
        this.recordMetric();
      }
    }, 60000); // Cada minuto
  }

  /**
   * Calcula consumo estimado basado en uso de recursos
   */
  private calculateEstimatedConsumption(): number {
    // Estimación muy básica
    // En producción, esto debería ser más sofisticado
    let consumption = 0.001; // Base

    // Aumentar consumo si hay mucha actividad
    if (typeof window !== 'undefined') {
      const performance = (window as any).performance;
      if (performance && performance.memory) {
        const memory = performance.memory;
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        // Más memoria = más consumo
        consumption += memoryUsage * 0.002;
      }
    }

    return consumption;
  }

  /**
   * Registra una métrica de batería
   */
  private recordMetric(): void {
    if (!this.batteryStatus || this.initialLevel === null) return;

    const now = Date.now();
    const timeDiff = (now - this.lastCheckTime) / (1000 * 60 * 60); // Horas

    const levelDiff = this.initialLevel - this.batteryStatus.level;
    const consumptionRate = timeDiff > 0 ? levelDiff / timeDiff : 0;

    const metric: BatteryMetrics = {
      initialLevel: this.initialLevel,
      currentLevel: this.batteryStatus.level,
      consumptionRate,
      estimatedTimeRemaining: this.batteryStatus.dischargingTime 
        ? this.batteryStatus.dischargingTime / (1000 * 60) // Convertir a minutos
        : null,
      isCharging: this.batteryStatus.charging,
      timestamp: now
    };

    this.metrics.push(metric);
    this.lastCheckTime = now;

    // Mantener solo las últimas 100 métricas
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  /**
   * Obtiene el estado actual de la batería
   */
  getBatteryStatus(): BatteryStatus | null {
    return this.batteryStatus;
  }

  /**
   * Obtiene las métricas de batería
   */
  getMetrics(): BatteryMetrics[] {
    return [...this.metrics];
  }

  /**
   * Obtiene estadísticas de consumo
   */
  getConsumptionStats(): {
    avgConsumptionRate: number;
    currentLevel: number;
    isCharging: boolean;
    estimatedTimeRemaining: number | null;
  } {
    if (!this.batteryStatus) {
      return {
        avgConsumptionRate: 0,
        currentLevel: 1,
        isCharging: false,
        estimatedTimeRemaining: null
      };
    }

    const consumptionRates = this.metrics
      .filter(m => !m.isCharging)
      .map(m => m.consumptionRate)
      .filter(r => r > 0);

    const avgConsumptionRate = consumptionRates.length > 0
      ? consumptionRates.reduce((a, b) => a + b, 0) / consumptionRates.length
      : 0;

    return {
      avgConsumptionRate,
      currentLevel: this.batteryStatus.level,
      isCharging: this.batteryStatus.charging,
      estimatedTimeRemaining: this.batteryStatus.dischargingTime
        ? this.batteryStatus.dischargingTime / (1000 * 60)
        : null
    };
  }

  /**
   * Suscribe a cambios en el estado de la batería
   */
  onBatteryChange(callback: (status: BatteryStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Retornar función de cleanup
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifica a los listeners
   */
  private notifyListeners(): void {
    if (!this.batteryStatus) return;

    this.listeners.forEach(listener => {
      try {
        listener(this.batteryStatus!);
      } catch (error) {
        console.error('Error in battery listener:', error);
      }
    });
  }

  /**
   * Verifica si la batería está baja
   */
  isBatteryLow(threshold: number = 0.2): boolean {
    return this.batteryStatus !== null 
      && !this.batteryStatus.charging 
      && this.batteryStatus.level < threshold;
  }

  /**
   * Obtiene recomendaciones de optimización basadas en el estado de la batería
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.batteryStatus) {
      return recommendations;
    }

    if (this.isBatteryLow(0.2)) {
      recommendations.push('Batería muy baja: Reducir frecuencia de sincronización');
      recommendations.push('Desactivar actualizaciones en segundo plano');
      recommendations.push('Reducir animaciones y efectos visuales');
    } else if (this.batteryStatus.level < 0.5) {
      recommendations.push('Batería moderada: Considerar reducir actividad de red');
    }

    if (!this.batteryStatus.charging && this.batteryStatus.level < 0.3) {
      recommendations.push('Cargar el dispositivo pronto');
    }

    return recommendations;
  }
}

// Instancia singleton
export const batteryMonitor = new BatteryMonitor();

/**
 * Hook para usar el monitor de batería en componentes React
 */
export function useBatteryMonitor() {
  const [batteryStatus, setBatteryStatus] = React.useState<BatteryStatus | null>(
    batteryMonitor.getBatteryStatus()
  );

  React.useEffect(() => {
    const unsubscribe = batteryMonitor.onBatteryChange((status) => {
      setBatteryStatus(status);
    });

    return unsubscribe;
  }, []);

  return {
    batteryStatus,
    metrics: batteryMonitor.getMetrics(),
    stats: batteryMonitor.getConsumptionStats(),
    isLow: batteryMonitor.isBatteryLow(),
    recommendations: batteryMonitor.getOptimizationRecommendations()
  };
}

