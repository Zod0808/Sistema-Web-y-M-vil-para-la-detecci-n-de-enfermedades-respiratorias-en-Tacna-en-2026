# 🚀 Guía de Configuración - Análisis de Código Estático

Esta guía te ayudará a configurar y ejecutar el análisis de código estático en tu entorno local.

## 📋 Prerrequisitos

### Backend (Node.js/TypeScript)
- Node.js 18+
- npm 8+

### AI Services (Python)
- Python 3.11+
- pip

## 🔧 Instalación

### Backend

```bash
cd backend
npm install
```

Las herramientas ya están incluidas en `package.json`:
- ESLint
- Prettier
- TypeScript (para type-checking)

### AI Services

```bash
cd ai-services
pip install -r requirements-lint.txt
```

Esto instalará:
- Pylint
- Flake8
- Black
- mypy
- Bandit
- pip-audit (alternativa moderna a safety)

## 🎯 Uso Rápido

### Backend

```bash
# Análisis completo
npm run analyze

# Solo linting
npm run lint

# Corregir problemas automáticamente
npm run lint:fix

# Verificar formato
npm run format:check

# Formatear código
npm run format

# Verificar tipos
npm run type-check

# Auditoría de seguridad
npm run audit
```

### AI Services

```bash
# Análisis completo
make analyze

# Solo linting
make lint

# Formatear código
make format

# Verificar formato
make format-check

# Verificar tipos
make type-check

# Análisis de seguridad
make security-check
```

O usando comandos directos:

```bash
# Pylint
pylint --rcfile=.pylintrc api/ core/ services/ ml_models/

# Flake8
flake8 --config=.flake8 api/ core/ services/ ml_models/

# Black (formatear)
black api/ core/ services/ ml_models/

# mypy (type checking)
mypy api/ core/ services/ ml_models/

# Bandit (seguridad)
bandit -r api/ core/ services/ ml_models/

# pip-audit (vulnerabilidades)
pip-audit --desc
```

## 📊 Interpretación de Resultados

### ESLint (Backend)
- **Errores (error)**: Deben corregirse antes de hacer commit
- **Advertencias (warn)**: Se recomienda corregir, pero no bloquean
- **Informativos (info)**: Sugerencias de mejora

### Pylint (AI Services)
- **Calificación**: 0-10 (objetivo: >9.0)
- **Errores**: Problemas críticos que deben corregirse
- **Warnings**: Problemas menores
- **Convenciones**: Estilo de código

### Bandit (Seguridad)
- **Critical**: Vulnerabilidades críticas
- **High**: Vulnerabilidades altas
- **Medium**: Vulnerabilidades medias
- **Low**: Problemas menores

## 🔄 Integración con Git

### Pre-commit Hook (Opcional)

Puedes configurar un hook para ejecutar análisis antes de cada commit:

```bash
# Crear hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
cd backend && npm run lint && npm run type-check
cd ../ai-services && make format-check
EOF

chmod +x .git/hooks/pre-commit
```

## 🐛 Solución de Problemas

### ESLint no encuentra archivos

```bash
# Verificar que estás en el directorio correcto
cd backend

# Verificar configuración
cat .eslintrc.json
```

### Pylint muestra muchos errores

```bash
# Verificar configuración
cat .pylintrc

# Ejecutar solo en archivos específicos
pylint api/routes/health.py
```

### Black no formatea

```bash
# Verificar que Black está instalado
pip show black

# Reinstalar si es necesario
pip install --upgrade black
```

## 📚 Recursos Adicionales

- [Documentación completa de análisis estático](STATIC_CODE_ANALYSIS.md)
- [ESLint Documentation](https://eslint.org/)
- [Pylint Documentation](https://pylint.pycqa.org/)
- [Black Documentation](https://black.readthedocs.io/)

---

**Última actualización:** Diciembre 2024

