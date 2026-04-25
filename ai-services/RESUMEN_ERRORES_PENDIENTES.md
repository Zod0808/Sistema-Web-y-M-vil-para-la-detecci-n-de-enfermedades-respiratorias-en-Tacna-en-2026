# Resumen de Errores Pendientes en Tests

## Errores Críticos por Categoría

### 1. Tests de Model Cache (`test_model_cache.py`)
**Problema**: Los tests usan métodos que no existen en `LRUModelCache`
- ❌ `add_model()` - NO EXISTE
- ❌ `get_model()` - NO EXISTE  
- ✅ `get_or_load()` - MÉTODO REAL
- ✅ `remove()` - MÉTODO REAL
- ✅ `clear()` - MÉTODO REAL
- ✅ `list_cached_models()` - MÉTODO REAL

**Solución**: Los tests necesitan usar `get_or_load()` con un `loader_func` en lugar de `add_model()` y `get_model()`.

### 2. Tests de Prediction Monitor (`test_prediction_monitor.py`)
**Problema**: La firma de `log_prediction()` es incorrecta en los tests
- ❌ Tests usan: `log_prediction(sample_prediction)` (un solo parámetro)
- ✅ Método real requiere: `log_prediction(symptoms: List[str], prediction: Dict[str, Any], ...)`

**Solución**: Actualizar todos los tests para pasar `symptoms` y `prediction` como parámetros separados.

### 3. Tests de Strategy Factory (`test_strategy_factory.py`)
**Problema**: AttributeError al hacer patch del módulo
- El patch de `factories.strategy_factory` puede no estar funcionando correctamente

### 4. Tests de XGBoost Model (`test_xgboost_model.py`)
**Problema**: Datos de prueba insuficientes causan errores de validación
- Error: "The least populated class in y has only 1 member"
- Problema: Los datos de prueba no tienen suficientes muestras por clase para entrenar

### 5. Tests de Repository Pattern (`test_repository_pattern.py`)
**Problema**: Métodos faltantes en `BaseRepository`
- ❌ `soft_delete()` - NO EXISTE
- ❌ `create_with_audit()` - NO EXISTE
- ❌ `create_with_versioning()` - NO EXISTE
- Problema con `find_all()` usando `async for` incorrectamente

### 6. Otros Tests
- Tests de RL Reminder Optimizer: Problema con parsing de hora "08:00"
- Tests de Risk Personalization: Métodos faltantes
- Tests de Circuit Breaker: Problemas con mocks de métodos privados
- Tests de Decorators: Problemas con funciones async/sync

## Prioridad de Corrección

1. **Alta Prioridad** (afectan múltiples tests):
   - `test_model_cache.py` - Corregir uso de métodos
   - `test_prediction_monitor.py` - Corregir firma de método
   
2. **Media Prioridad**:
   - `test_strategy_factory.py` - Corregir patch
   - `test_repository_pattern.py` - Verificar métodos disponibles
   
3. **Baja Prioridad** (problemas específicos):
   - Tests de XGBoost con datos insuficientes
   - Tests de RL con formato de hora
   - Tests de decorators con async/sync

## Notas

- Muchos tests asumen una interfaz que no coincide con la implementación real
- Algunos tests requieren datos más robustos para funcionar correctamente
- Algunos métodos mencionados en tests no están implementados en las clases reales

