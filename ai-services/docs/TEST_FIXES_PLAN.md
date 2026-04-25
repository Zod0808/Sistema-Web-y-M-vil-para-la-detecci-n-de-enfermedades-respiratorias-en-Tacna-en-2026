# Plan de Corrección de Tests

## Estado Actual
- **Tests Fallando**: 372 failed, 64 errors
- **Cobertura**: 51.86% (por encima del umbral de 35%)
- **Problemas Principales**: Rate limiting, mocks incompletos, dependencias faltantes

## Correcciones Aplicadas

### 1. Rate Limiting ✅
- **Problema**: Errores 429 (Too Many Requests) en muchos tests
- **Solución**: 
  - Modificado `main.py` para deshabilitar rate limiting cuando `TESTING=true`
  - Agregado `AI_RATE_LIMIT_ENABLED=0` en `conftest.py` y workflow
- **Estado**: Completado

### 2. Mocks Mejorados ✅
- **Problema**: Dependencias faltantes (openai, whisper, librosa, etc.)
- **Solución**:
  - Mejorado mock de `openai` con `AsyncOpenAI` y `OpenAI`
  - Agregado mock de `whisper`
  - Agregado mock de `librosa` y `soundfile`
  - Agregado mock de `SHAPDiseaseExplainer`
- **Estado**: Completado (necesita pruebas)

## Problemas por Categoría

### A. Rate Limiting (429 Errors) - ~150 tests
**Estado**: Corregido en código, necesita verificación

### B. Dependencias Faltantes - ~100 tests
**Categorías**:
- OpenAI (`AsyncOpenAI`, `OpenAI`)
- Whisper (transcripción de audio)
- SHAP (`SHAPDiseaseExplainer`)
- Librosa/Soundfile (procesamiento de audio)
- Torch/Spacy (modelos ML)

**Estado**: Mocks básicos agregados, necesita mejoras

### C. Tests de Circuit Breaker - ~20 tests
**Problemas**:
- Atributos faltantes en decoradores
- Mocks incorrectos

### D. Tests de Factories - ~30 tests
**Problemas**:
- Imports incorrectos
- Atributos faltantes en módulos

### E. Tests de Repositorios - ~25 tests
**Problemas**:
- Problemas con async/await
- Mocks de MongoDB incorrectos

### F. Tests de Servicios - ~40 tests
**Problemas**:
- Dependencias faltantes
- Mocks incompletos

### G. Tests de Estrategias - ~20 tests
**Problemas**:
- Imports de OpenAI
- Configuración incorrecta

## Plan de Acción

### Fase 1: Correcciones Básicas (Completada)
- ✅ Deshabilitar rate limiting en tests
- ✅ Agregar mocks básicos de dependencias

### Fase 2: Mejora de Mocks (En Progreso)
- [ ] Mejorar mock de OpenAI con todas las clases necesarias
- [ ] Completar mock de SHAPDiseaseExplainer
- [ ] Agregar mocks para torch, spacy, subprocess

### Fase 3: Corrección de Tests por Categoría
- [ ] Arreglar tests de circuit breaker
- [ ] Arreglar tests de factories
- [ ] Arreglar tests de repositorios
- [ ] Arreglar tests de servicios
- [ ] Arreglar tests de estrategias

### Fase 4: Tests de API
- [ ] Arreglar tests de endpoints que fallan por rate limiting
- [ ] Corregir mocks de servicios para tests de API

## Notas Importantes

1. El workflow actualmente tiene `continue-on-error: true` para que no falle si hay tests fallidos
2. La verificación de cobertura es el único paso crítico
3. Se debe trabajar gradualmente para arreglar los tests
4. Los tests de performance y security están ignorados intencionalmente (requieren dependencias pesadas)

## Próximos Pasos

1. Ejecutar los tests nuevamente para ver cuántos errores 429 se redujeron
2. Mejorar mocks según los errores restantes
3. Trabajar en categorías de tests una por una
4. Aumentar gradualmente la cobertura objetivo

