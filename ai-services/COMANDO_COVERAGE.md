# Comando para Ver Coverage de AI Services

## 🚀 Comando Principal (Recomendado)

```bash
python ver_coverage.py
```

Este comando muestra un **reporte completo y detallado** con:
- ✅ Cobertura total y líneas cubiertas/faltantes
- ✅ Comparación con objetivos (35%, 50%, 60%)
- ✅ Progreso visual hacia objetivos
- ✅ **Cobertura por módulo detallada** (nuevo)
- ✅ **Situación de tests por módulo** - qué módulos tienen tests (nuevo)
- ✅ Top 10 módulos con menor cobertura (áreas de oportunidad)
- ✅ Top 5 módulos con mayor cobertura
- ✅ Recomendaciones personalizadas según la situación actual
- ✅ Comandos útiles

## 📋 Comandos Adicionales

### Generar Nuevo Reporte de Coverage

#### Windows PowerShell
```powershell
cd ai-services
$env:TESTING="true"
$env:AI_RATE_LIMIT_ENABLED="0"
$env:CACHE_ENABLED="false"
$env:CIRCUIT_BREAKER_ENABLED="false"
$env:PYTHONPATH="$PWD"

python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=term-missing --cov-report=xml:coverage.xml
```

#### Linux/WSL/Bash
```bash
cd ai-services
export TESTING=true
export AI_RATE_LIMIT_ENABLED=0
export CACHE_ENABLED=false
export CIRCUIT_BREAKER_ENABLED=false
export PYTHONPATH=$(pwd)

python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=term-missing --cov-report=xml:coverage.xml
```

### Ver Coverage del Archivo XML Existente

```bash
python ver_coverage.py
```

### Ver Solo el Porcentaje (Rápido)

```bash
python -c "import xml.etree.ElementTree as ET; tree = ET.parse('coverage.xml'); root = tree.getroot(); print(f'Cobertura: {float(root.attrib.get(\"line-rate\", 0))*100:.2f}%')"
```

### Ver Coverage con HTML (Más Detallado)

```bash
# Generar reporte HTML
python -m pytest --cov=./ --cov-report=html:htmlcov --cov-report=term-missing

# Abrir en navegador
# Windows
start htmlcov/index.html

# Linux
xdg-open htmlcov/index.html
```

### Ver Coverage por Módulo Específico

```bash
# Core modules
python -m pytest --cov=core --cov-report=term-missing tests/core/

# Services
python -m pytest --cov=services --cov-report=term-missing tests/services/

# API routes
python -m pytest --cov=api --cov-report=term-missing tests/api/

# Strategies
python -m pytest --cov=strategies --cov-report=term-missing tests/patterns/

# Decorators
python -m pytest --cov=decorators --cov-report=term-missing tests/decorators/

# Repositories
python -m pytest --cov=repositories --cov-report=term-missing tests/repositories/

# Factories
python -m pytest --cov=factories --cov-report=term-missing tests/factories/
```

### Ver Coverage Solo en Terminal (Sin XML)

```bash
python -m pytest --cov=./ --cov-report=term --quiet
```

### Verificar Umbral de Cobertura (35%)

```bash
python -m pytest --cov=./ --cov-report=xml:coverage.xml --cov-fail-under=35
```

## 📊 Ejemplo de Salida del Script Mejorado

Al ejecutar `python ver_coverage.py`, verás un reporte completo como:

```
================================================================================
📊 REPORTE COMPLETO DE COBERTURA Y SITUACIÓN DE PRUEBAS - AI SERVICES
================================================================================

📅 Fecha del reporte: 2025-12-04 14:30:00

--------------------------------------------------------------------------------
📈 RESUMEN GENERAL
--------------------------------------------------------------------------------

✅ Cobertura Total: 45.23%
   Líneas cubiertas: 6,827 / 15,098
   Líneas faltantes: 8,271

📁 Archivos de test encontrados: 75

--------------------------------------------------------------------------------
🎯 OBJETIVOS DE COBERTURA
--------------------------------------------------------------------------------

📌 Objetivo Mínimo: 35.00% (umbral CI/CD)
   ✅ CUMPLIDO (por encima en 10.23%)

🎯 Objetivo Meta: 50.00%
   ⏳ En progreso (falta 4.77%)
   📊 Progreso: 68.27% del camino hacia 50%

[... más secciones ...]

--------------------------------------------------------------------------------
📦 COBERTURA POR MÓDULO
--------------------------------------------------------------------------------

Módulo                    Cobertura    Archivos   Líneas
-------------------------------------------------------------------
core                      ✅ 85.23%      5          420/493
services                  ✅ 72.15%      9          680/943
api                       ✅ 68.45%      16         580/848
[... más módulos ...]

--------------------------------------------------------------------------------
🧪 SITUACIÓN DE TESTS POR MÓDULO
--------------------------------------------------------------------------------

Módulo                    Tiene Tests     Estado
------------------------------------------------------------
Core                      ✅               ✅ Con tests
Services                  ✅               ✅ Con tests
API Routes                ✅               ✅ Con tests
[... más módulos ...]
```

## 🔧 Variables de Entorno Recomendadas

Para ejecutar tests con coverage correctamente, configura estas variables:

```bash
# Windows PowerShell
$env:TESTING="true"
$env:AI_RATE_LIMIT_ENABLED="0"
$env:CACHE_ENABLED="false"
$env:CIRCUIT_BREAKER_ENABLED="false"
$env:PYTHONPATH="$PWD"

# Linux/WSL
export TESTING=true
export AI_RATE_LIMIT_ENABLED=0
export CACHE_ENABLED=false
export CIRCUIT_BREAKER_ENABLED=false
export PYTHONPATH=$(pwd)
```

## 📝 Nuevas Características del Script

### 📦 Cobertura por Módulo
El script ahora analiza y muestra la cobertura de cada módulo principal:
- `core` - Módulos centrales
- `services` - Capa de servicios
- `api` - Rutas de API
- `strategies` - Estrategias de análisis
- `decorators` - Decoradores
- `repositories` - Repositorios
- `factories` - Factories
- `circuit_breaker` - Circuit breakers
- `utils` - Utilidades
- `main` - Aplicación principal

### 🧪 Situación de Tests
Identifica qué módulos tienen archivos de test y cuáles necesitan tests:
- ✅ Módulos con tests
- ❌ Módulos sin tests
- Total de archivos de test encontrados

### 💡 Recomendaciones Personalizadas
El script analiza la situación actual y proporciona recomendaciones específicas:
- Si la cobertura está por debajo del mínimo
- Qué módulos necesitan más atención
- Referencias al plan de mejora
- Próximos pasos sugeridos

## 🎯 Objetivos de Cobertura

- **Mínimo**: 35% (umbral CI/CD)
- **Meta**: 50% (objetivo principal)
- **Final**: 60%+ (excelencia)

El script `ver_coverage.py` compara automáticamente la cobertura actual con estos objetivos y muestra:
- Si se cumple cada objetivo
- Cuánto falta para alcanzarlos
- Progreso porcentual hacia la meta

## 📚 Información Relacionada

- **Plan de Mejora**: `ai-services/docs/COVERAGE_IMPROVEMENT_PLAN.md`
- **Progreso de Correcciones**: `ai-services/docs/TEST_FIXES_PROGRESS.md`
- **Configuración**: `ai-services/.coveragerc`

## ⚠️ Notas Importantes

1. **Problemas con Torch (Windows)**: Si encuentras errores con DLL de torch, ejecuta los tests en WSL o Docker.

2. **Archivo Coverage.xml**: El script `ver_coverage.py` lee el archivo `coverage.xml`. Si no existe, primero genera el reporte ejecutando pytest.

3. **Actualización**: Después de agregar nuevos tests, regenera el reporte para ver la cobertura actualizada:
   ```bash
   pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml
   python ver_coverage.py
   ```

4. **Análisis Detallado**: El script analiza automáticamente la estructura de tests y proporciona insights sobre qué módulos necesitan más cobertura.
