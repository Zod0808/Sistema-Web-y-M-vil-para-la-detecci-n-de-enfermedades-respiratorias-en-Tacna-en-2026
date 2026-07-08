# 📊 Estado de Cobertura de Tests - RespiCare Tacna

**Última actualización:** Julio 2026 (cifras extraídas de los reportes de cobertura generados)

## 📈 Resumen de Cobertura

| Componente | Cobertura Actual (líneas) | Objetivo | Estado |
|------------|------------------|----------|--------|
| **Backend** | 80.44% | ≥80% | ✅ Cumplido |
| **Web** | 75.67% | 80% | ⚙️ En progreso |
| **Mobile** | No medible* | 80% | ⚠️ Sin métrica global |
| **AI Services (ML)** | 49.37% | 60% | ⚠️ Por debajo |

\* *El `jest.config.js` de mobile instrumenta solo `useAppStore.ts` y `symptom-analyzer.tsx`; no hay cobertura global representativa del módulo.*

## 📋 Detalles por Componente

### Backend (Node.js/TypeScript)
- ✅ **80.44% cobertura global de líneas** (objetivo ≥80% cumplido al límite)
- ✅ **380+ tests automatizados**
- ✅ Cobertura en controllers, services, models, middlewares
- **Reporte detallado**: [testing/backend-coverage-2025-11.md](testing/backend-coverage-2025-11.md)

### Frontend Web (React)
- ⚙️ **75.67% cobertura de líneas** (objetivo 80%)
- ✅ 40+ tests implementados
- ⚙️ Mejoras en curso para alcanzar 80%
- **Ver detalles**: [web/tests/README.md](../web/tests/README.md)

### Mobile (React Native/Expo)
- ⚠️ **Sin cobertura global medible** (Jest instrumenta solo 2 archivos; objetivo 80%)
- ✅ 50+ tests implementados
- ⚙️ Mejoras en curso para alcanzar 80%
- **Ver detalles**: [mobile/__tests__/README.md](../mobile/__tests__/README.md)

### AI Services (Python/FastAPI)
- ⚠️ **49.37% cobertura de líneas** (`coverage.xml`; objetivo 60%)
- ✅ 12+ tests de monitoreo, fairness y drift detection
- ✅ Tests de modelos ML, validación de predicciones
- **Ver detalles**: [ai-services/TESTING_GUIDE.md](../ai-services/TESTING_GUIDE.md)

## 🎯 Plan de Mejora

### Web
- [ ] Aumentar cobertura de componentes UI
- [ ] Aumentar cobertura de servicios API
- [ ] Aumentar cobertura de hooks personalizados
- **Meta**: 80%+ cobertura

### Mobile
- [ ] Aumentar cobertura de screens
- [ ] Aumentar cobertura de servicios
- [ ] Aumentar cobertura de hooks
- **Meta**: 80%+ cobertura

## 📚 Documentación Relacionada

- **[TESTING_STATUS.md](TESTING_STATUS.md)** - Estado completo de testing
- **[TESTING_STRATEGY.md](TESTING_STRATEGY.md)** - Estrategia de testing
- **[TESTING_SETUP_GUIDE.md](TESTING_SETUP_GUIDE.md)** - Guía de configuración

