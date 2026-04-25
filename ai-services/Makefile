.PHONY: lint lint-fix format format-check type-check security-check analyze help

help:
	@echo "Comandos disponibles para análisis de código estático:"
	@echo "  make lint          - Ejecutar Pylint y Flake8"
	@echo "  make lint-fix       - Corregir problemas automáticamente (donde sea posible)"
	@echo "  make format         - Formatear código con Black"
	@echo "  make format-check   - Verificar formato sin modificar"
	@echo "  make type-check     - Verificar tipos con mypy"
	@echo "  make security-check - Ejecutar Bandit y pip-audit"
	@echo "  make analyze        - Ejecutar todos los análisis"

lint:
	@echo "🔍 Ejecutando Pylint..."
	@pylint --rcfile=.pylintrc api/ core/ services/ ml_models/ || true
	@echo "🔍 Ejecutando Flake8..."
	@flake8 --config=.flake8 api/ core/ services/ ml_models/ || true

lint-fix:
	@echo "🔧 Corrigiendo problemas de formato..."
	@black api/ core/ services/ ml_models/
	@echo "✅ Correcciones aplicadas"

format:
	@echo "🎨 Formateando código con Black..."
	@black api/ core/ services/ ml_models/
	@echo "✅ Formato aplicado"

format-check:
	@echo "🔍 Verificando formato..."
	@black --check api/ core/ services/ ml_models/ || exit 1

type-check:
	@echo "🔍 Verificando tipos con mypy..."
	@mypy api/ core/ services/ ml_models/ || true

security-check:
	@echo "🔒 Ejecutando análisis de seguridad..."
	@echo "  - Bandit (análisis de código)..."
	@bandit -r api/ core/ services/ ml_models/ -ll || true
	@echo "  - pip-audit (vulnerabilidades de dependencias)..."
	@pip-audit --desc || true
	@echo "✅ Análisis de seguridad completado"

analyze: lint format-check type-check security-check
	@echo "✅ Análisis completo finalizado"
	@echo "📊 Ver reporte detallado en: docs/STATIC_CODE_ANALYSIS.md"

