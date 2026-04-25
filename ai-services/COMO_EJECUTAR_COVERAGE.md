# Cómo Ejecutar Coverage de AI Services

## 📋 Comandos para Ver Coverage

### Opción 1: Comando Básico (Recomendado)
```bash
cd ai-services
pytest --cov=./ --cov-report=term-missing --cov-report=xml:coverage.xml
```

### Opción 2: Con Variables de Entorno (Para Tests)
```bash
cd ai-services

# Windows PowerShell
$env:TESTING="true"
$env:AI_RATE_LIMIT_ENABLED="0"
$env:CACHE_ENABLED="false"
$env:CIRCUIT_BREAKER_ENABLED="false"
$env:PYTHONPATH="$PWD"

pytest --cov=./ --cov-report=term-missing --cov-report=xml:coverage.xml

# Linux/WSL
export TESTING=true
export AI_RATE_LIMIT_ENABLED=0
export CACHE_ENABLED=false
export CIRCUIT_BREAKER_ENABLED=false
export PYTHONPATH=$(pwd)

pytest --cov=./ --cov-report=term-missing --cov-report=xml:coverage.xml
```

### Opción 3: Coverage Solo (Sin Ejecutar Tests)
```bash
# Ver coverage del archivo XML existente
python -c "import xml.etree.ElementTree as ET; tree = ET.parse('coverage.xml'); root = tree.getroot(); coverage_rate = float(root.attrib.get('line-rate', 0)); print(f'Cobertura: {coverage_rate*100:.2f}%')"
```

### Opción 4: Con Configuración Personalizada
```bash
cd ai-services
pytest --cov=./ --cov-config=.coveragerc --cov-report=term-missing --cov-report=xml:coverage.xml --cov-report=html:htmlcov
```

## 🔍 Ver Coverage Generado

### Ver en Terminal
El comando `--cov-report=term-missing` muestra el coverage directamente en la terminal.

### Ver en Archivo XML
```bash
# Verificar si el archivo existe
ls coverage.xml

# Ver coverage desde XML
python -c "import xml.etree.ElementTree as ET; tree = ET.parse('coverage.xml'); root = tree.getroot(); coverage_rate = float(root.attrib.get('line-rate', 0)); print(f'Cobertura: {coverage_rate*100:.2f}%')"
```

### Ver Reporte HTML (Si se generó)
```bash
# Abrir en navegador
# Windows
start htmlcov/index.html

# Linux
xdg-open htmlcov/index.html
```

## ⚠️ Nota Importante

Si encuentras errores con torch DLL en Windows, puedes:

1. **Ejecutar en WSL (Recomendado)**
   ```bash
   wsl
   cd /mnt/c/Users/User/Desktop/construccionI/proyecto-final-sistema_enfermedades_respiratorias/ai-services
   export TESTING=true
   export AI_RATE_LIMIT_ENABLED=0
   pytest --cov=./ --cov-report=term-missing --cov-report=xml:coverage.xml
   ```

2. **Ver el último reporte en CI/CD**
   - Los resultados se generan automáticamente en GitHub Actions
   - Ver en: `.github/workflows/ai-services-tests.yml`

3. **Ejecutar solo tests específicos (evitando torch)**
   ```bash
   pytest tests/patterns/ tests/services/ tests/factories/ --cov=./ --cov-report=term-missing
   ```

## 📊 Verificar Umbral de Cobertura

```bash
python -c "
import xml.etree.ElementTree as ET
import sys

tree = ET.parse('coverage.xml')
root = tree.getroot()
coverage_rate = float(root.attrib.get('line-rate', 0))
coverage_percent = coverage_rate * 100

print(f'Cobertura: {coverage_percent:.2f}%')
print(f'Objetivo: 35%')

if coverage_percent >= 35:
    print('✅ Objetivo cumplido')
    sys.exit(0)
else:
    print('❌ Por debajo del objetivo')
    sys.exit(1)
"
```

