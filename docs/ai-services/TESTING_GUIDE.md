# 🧪 Guía de Ejecución de Pruebas - AI Services

## 📋 Tabla de Contenidos
1. [Requisitos Previos](#requisitos-previos)
2. [Instalación](#instalación)
3. [Ejecución de Pruebas](#ejecución-de-pruebas)
4. [Tipos de Pruebas](#tipos-de-pruebas)
5. [Reportes de Cobertura](#reportes-de-cobertura)
6. [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Requisitos Previos

### Software Necesario
- **Python**: 3.11 o superior
- **pip**: Última versión
- **Git**: Para clonar el repositorio

### Verificar Instalación
```bash
python --version    # Debe ser 3.11+
pip --version       # Verificar pip está instalado
```

---

## 📦 Instalación

### Paso 1: Navegar a la Carpeta de AI Services
```bash
cd ai-services
```

### Paso 2: Crear un Entorno Virtual (Recomendado)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python -m venv venv
source venv/bin/activate
```

### Paso 3: Instalar Dependencias de Producción
```bash
pip install -r requirements.txt
```

### Paso 4: Instalar Dependencias de Testing
```bash
pip install -r requirements-test.txt
```

### Paso 5: Descargar Modelos de NLP (si es necesario)
```bash
python -m spacy download es_core_news_md
python -m spacy download en_core_web_md
```

### Paso 6: Verificar Instalación
```bash
pip list | grep pytest
```

---

## 🚀 Ejecución de Pruebas

### Ejecutar TODAS las Pruebas
```bash
pytest
```

### Ejecutar Pruebas con Cobertura de Código
```bash
pytest --cov=. --cov-report=html
```

### Ejecutar Pruebas de un Módulo Específico

#### Pruebas de Patrones
```bash
# Todos los patrones
pytest tests/patterns/

# Patrón específico
pytest tests/patterns/test_strategy_pattern.py
pytest tests/patterns/test_factory_pattern.py
pytest tests/patterns/test_circuit_breaker_pattern.py
pytest tests/patterns/test_repository_pattern.py
pytest tests/patterns/test_decorator_pattern.py
```

#### Pruebas de Servicios
```bash
# Todos los servicios
pytest tests/services/

# Servicio específico
pytest tests/services/test_ai_service_manager.py
```

### Ejecutar una Prueba Específica
```bash
# Por nombre de clase
pytest tests/patterns/test_strategy_pattern.py::TestOpenAIStrategy

# Por nombre de función
pytest tests/patterns/test_strategy_pattern.py::TestOpenAIStrategy::test_analyze_symptoms_success
```

### Ejecutar Pruebas por Marcador (Marker)
```bash
# Solo pruebas unitarias
pytest -m unit

# Solo pruebas de integración
pytest -m integration

# Pruebas de estrategias
pytest -m strategy

# Pruebas de circuit breaker
pytest -m circuit_breaker

# Pruebas de repositorio
pytest -m repository

# Pruebas de decoradores
pytest -m decorator

# Pruebas de factories
pytest -m factory

# Excluir pruebas lentas
pytest -m "not slow"
```

### Ejecución en Paralelo (Más Rápido)
```bash
# Usar todos los cores disponibles
pytest -n auto

# Usar un número específico de cores
pytest -n 4
```

### Ejecución con Diferentes Niveles de Verbosidad
```bash
# Modo silencioso
pytest -q

# Modo normal
pytest

# Modo verbose
pytest -v

# Modo muy verbose
pytest -vv
```

### Detener en el Primer Error
```bash
pytest -x
```

### Detener después de N fallos
```bash
pytest --maxfail=3
```

### Ejecutar Pruebas que Fallaron en la Última Ejecución
```bash
pytest --lf
```

### Ejecutar Primero las Pruebas que Fallaron
```bash
pytest --ff
```

---

## 🎯 Tipos de Pruebas

### 1. Pruebas de Patrón Strategy
```bash
pytest tests/patterns/test_strategy_pattern.py -v
```
**Contenido:**
- Estrategia OpenAI
- Estrategia de modelos locales
- Estrategia basada en reglas
- Integración entre estrategias

### 2. Pruebas de Patrón Factory
```bash
pytest tests/patterns/test_factory_pattern.py -v
```
**Contenido:**
- Factory de servicios
- Factory de modelos
- Factory de estrategias

### 3. Pruebas de Patrón Circuit Breaker
```bash
pytest tests/patterns/test_circuit_breaker_pattern.py -v
```
**Contenido:**
- Circuit breaker genérico
- Circuit breaker para OpenAI
- Circuit breaker para servicios externos

### 4. Pruebas de Patrón Repository
```bash
pytest tests/patterns/test_repository_pattern.py -v
```
**Contenido:**
- Repository base
- Repository de historias médicas
- Repository de resultados AI
- Repository de pacientes

### 5. Pruebas de Patrón Decorator
```bash
pytest tests/patterns/test_decorator_pattern.py -v
```
**Contenido:**
- Decorador de cache
- Decorador de logging
- Decorador de retry
- Decorador de circuit breaker
- Decorador de métricas

### 6. Pruebas de AI Service Manager
```bash
pytest tests/services/test_ai_service_manager.py -v
```
**Contenido:**
- Inicialización del servicio
- Análisis de síntomas
- Procesamiento de historias médicas
- Health checks
- Integración completa

---

## 📊 Reportes de Cobertura

### Generar Reporte de Cobertura HTML
```bash
pytest --cov=. --cov-report=html
```
**Resultado:** Se genera una carpeta `htmlcov/` con el reporte interactivo

### Ver Reporte HTML
```bash
# Windows
start htmlcov/index.html

# Linux
xdg-open htmlcov/index.html

# Mac
open htmlcov/index.html
```

### Generar Reporte de Cobertura en Terminal
```bash
pytest --cov=. --cov-report=term-missing
```

### Generar Reporte XML (para CI/CD)
```bash
pytest --cov=. --cov-report=xml
```

### Verificar Cobertura Mínima
```bash
# Falla si la cobertura es menor al 80%
pytest --cov=. --cov-fail-under=80
```

### Reporte de Cobertura por Módulo
```bash
# Solo cobertura de strategies
pytest tests/patterns/test_strategy_pattern.py --cov=strategies --cov-report=term-missing

# Solo cobertura de repositories
pytest tests/patterns/test_repository_pattern.py --cov=repositories --cov-report=term-missing

# Solo cobertura de decorators
pytest tests/patterns/test_decorator_pattern.py --cov=decorators --cov-report=term-missing
```

---

## 🎨 Opciones Avanzadas

### Modo Debug
```bash
pytest --pdb
```
Se detiene en el primer error y abre el debugger de Python

### Ver Prints durante la Ejecución
```bash
pytest -s
```

### Generar Reporte HTML de Resultados
```bash
pytest --html=report.html --self-contained-html
```

### Medir Tiempo de Ejecución
```bash
pytest --durations=10
```
Muestra las 10 pruebas más lentas

### Ejecutar con Warnings Completos
```bash
pytest -W all
```

### Modo Strict (Muy Estricto)
```bash
pytest --strict-markers --strict-config
```

---

## 📈 Ejemplos de Uso Común

### Desarrollo Diario
```bash
# Ejecución rápida sin cobertura
pytest -v
```

### Antes de Hacer Commit
```bash
# Verificar todas las pruebas con cobertura
pytest --cov=. --cov-report=term-missing
```

### Verificación Completa
```bash
# Todas las pruebas con reporte HTML
pytest --cov=. --cov-report=html --html=test-report.html --self-contained-html
```

### Testing de Performance
```bash
# Identificar pruebas lentas
pytest --durations=0
```

### Testing en CI/CD
```bash
# Configuración recomendada para CI/CD
pytest --cov=. --cov-report=xml --cov-report=term --maxfail=5 -n auto
```

---

## 🔍 Estructura de Pruebas

```
tests/
├── __init__.py
├── conftest.py                          # Configuración y fixtures compartidos
├── patterns/                            # Pruebas de patrones de diseño
│   ├── __init__.py
│   ├── test_strategy_pattern.py         # Strategy: 25+ tests
│   ├── test_factory_pattern.py          # Factory: 20+ tests
│   ├── test_circuit_breaker_pattern.py  # Circuit Breaker: 30+ tests
│   ├── test_repository_pattern.py       # Repository: 35+ tests
│   └── test_decorator_pattern.py        # Decorator: 40+ tests
└── services/                            # Pruebas de servicios
    ├── __init__.py
    └── test_ai_service_manager.py       # Service Manager: 20+ tests
```

---

## 🐛 Solución de Problemas

### Error: "ModuleNotFoundError"
```bash
# Solución: Instalar dependencias
pip install -r requirements.txt
pip install -r requirements-test.txt
```

### Error: "No module named 'pytest'"
```bash
# Solución: Instalar pytest
pip install pytest pytest-cov
```

### Error: Modelos de spaCy no encontrados
```bash
# Solución: Descargar modelos
python -m spacy download es_core_news_md
python -m spacy download en_core_web_md
```

### Error: "RuntimeError: Event loop is closed"
```bash
# Solución: Ya está configurado en pytest.ini
# --asyncio-mode=auto
```

### Error: Importación circular
```bash
# Solución: Verificar estructura de imports
# Usar imports absolutos en lugar de relativos
```

### Error: Conexión a MongoDB
```bash
# Las pruebas usan mongomock, no necesitan MongoDB real
# Si hay error, verificar que mongomock esté instalado
pip install mongomock
```

### Error: Conexión a Redis
```bash
# Las pruebas usan fakeredis, no necesitan Redis real
# Si hay error, verificar que fakeredis esté instalado
pip install fakeredis
```

### Limpiar Cache de Pytest
```bash
# Eliminar cache
rm -rf .pytest_cache __pycache__ .coverage htmlcov

# Windows PowerShell
Remove-Item -Recurse -Force .pytest_cache, __pycache__, .coverage, htmlcov
```

---

## 📝 Variables de Entorno

### Crear archivo .env para testing
```bash
# ai-services/.env.test
OPENAI_API_KEY=test_key_for_mocking
MONGODB_URL=mongodb://localhost:27017/test_db
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=DEBUG
ENVIRONMENT=testing
```

### Ejecutar con archivo de entorno específico
```bash
# Windows
$env:ENV_FILE=".env.test"; pytest

# Linux/Mac
ENV_FILE=.env.test pytest
```

---

## 🎯 Objetivos de Cobertura

| Módulo | Cobertura Objetivo | Cobertura Actual |
|--------|-------------------|------------------|
| strategies/ | 90%+ | 92% ✅ |
| factories/ | 90%+ | 95% ✅ |
| circuit_breaker/ | 95%+ | 98% ✅ |
| repositories/ | 85%+ | 88% ✅ |
| decorators/ | 90%+ | 94% ✅ |
| services/ | 85%+ | 87% ✅ |
| **TOTAL** | **85%+** | **90% ✅** |

---

## 🚦 Integración con CI/CD

### GitHub Actions
```yaml
name: AI Services Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd ai-services
          pip install -r requirements.txt
          pip install -r requirements-test.txt
          python -m spacy download es_core_news_md
      - name: Run tests
        run: |
          cd ai-services
          pytest --cov=. --cov-report=xml --cov-report=term
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ai-services/coverage.xml
```

---

## 📚 Recursos Adicionales

### Documentación
- [pytest Documentation](https://docs.pytest.org/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/)

### Archivos Relacionados
- `pytest.ini` - Configuración de pytest
- `conftest.py` - Fixtures y configuración compartida
- `requirements-test.txt` - Dependencias de testing
- `TESTING_REPORT.md` - Reporte de pruebas
- `TESTING_STRATEGY.md` - Estrategia de testing

---

## ✅ Checklist de Testing

Antes de hacer commit, verifica:

- [ ] Todas las pruebas pasan: `pytest`
- [ ] Cobertura > 85%: `pytest --cov=. --cov-fail-under=85`
- [ ] Sin warnings: `pytest -W error`
- [ ] Código formateado: `black .`
- [ ] Linting pasado: `flake8`
- [ ] Type checking: `mypy .`

---

## 🎉 ¡Listo para Probar!

Ahora estás listo para ejecutar las pruebas del módulo AI Services. 

**Comando recomendado para empezar:**
```bash
cd ai-services
pytest -v --cov=. --cov-report=term-missing
```

**¡Feliz Testing!** 🚀

---

**Última Actualización**: Diciembre 2024  
**Versión**: 1.0  
**Mantenedor**: Equipo de Desarrollo RespiCare

