# Makefile
.PHONY: help build up down logs clean install setup dev test

# Variables
DOCKER_COMPOSE = docker-compose
DOCKER_COMPOSE_DEV = docker-compose -f docker-compose.yml -f docker-compose.dev.yml

help: ## Mostrar ayuda
	@echo "Comandos disponibles:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $1, $2}' $(MAKEFILE_LIST)

setup: ## Setup inicial del proyecto
	@echo "🚀 Configurando proyecto RespiCare-Tacna..."
	@cp .env.example .env
	@mkdir -p mongodb/init ai-services/models ai-services/cache nginx/ssl
	@echo "✅ Setup completado. Edita el archivo .env con tus configuraciones."

build: ## Construir todas las imágenes
	@echo "🔨 Construyendo imágenes Docker..."
	$(DOCKER_COMPOSE_DEV) build

up: ## Levantar todos los servicios
	@echo "🚀 Iniciando servicios..."
	$(DOCKER_COMPOSE_DEV) up -d

dev: ## Modo desarrollo con logs
	@echo "🔧 Iniciando en modo desarrollo..."
	$(DOCKER_COMPOSE_DEV) up

down: ## Detener todos los servicios
	@echo "🛑 Deteniendo servicios..."
	$(DOCKER_COMPOSE) down

logs: ## Ver logs de todos los servicios
	$(DOCKER_COMPOSE) logs -f

logs-web: ## Ver logs del frontend
	$(DOCKER_COMPOSE) logs -f web

logs-backend: ## Ver logs del backend
	$(DOCKER_COMPOSE) logs -f backend

logs-ai: ## Ver logs de servicios IA
	$(DOCKER_COMPOSE) logs -f ai-services

install: ## Instalar dependencias en todos los servicios
	@echo "📦 Instalando dependencias..."
	$(DOCKER_COMPOSE) exec backend npm install
	$(DOCKER_COMPOSE) exec web npm install
	$(DOCKER_COMPOSE) exec ai-services pip install -r requirements.txt

test: ## Ejecutar todos los tests
	@echo "🧪 Ejecutando tests completos..."
	@./scripts/test-all.sh

test-ai: ## Tests de AI Services
	@echo "🤖 Ejecutando tests de AI Services..."
	@./scripts/test-all.sh --ai-services

test-backend: ## Tests de Backend API
	@echo "🖥️ Ejecutando tests de Backend API..."
	@./scripts/test-all.sh --backend

test-web: ## Tests de Web Frontend
	@echo "🌐 Ejecutando tests de Web Frontend..."
	@./scripts/test-all.sh --web

test-mobile: ## Tests de Mobile App
	@echo "📱 Ejecutando tests de Mobile App..."
	@./scripts/test-all.sh --mobile

test-integration: ## Tests de integración
	@echo "🔗 Ejecutando tests de integración..."
	@./scripts/test-all.sh --integration

test-coverage: ## Generar reportes de cobertura
	@echo "📊 Generando reportes de cobertura..."
	@./scripts/test-all.sh --coverage

test-legacy: ## Ejecutar tests legacy (Docker)
	@echo "🧪 Ejecutando tests legacy..."
	$(DOCKER_COMPOSE) exec backend npm test
	$(DOCKER_COMPOSE) exec web npm test
	$(DOCKER_COMPOSE) exec ai-services python -m pytest

clean: ## Limpiar contenedores y volúmenes
	@echo "🧹 Limpiando sistema..."
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker system prune -f

restart: down up ## Reiniciar todos los servicios

shell-backend: ## Acceder al shell del backend
	$(DOCKER_COMPOSE) exec backend sh

shell-ai: ## Acceder al shell de IA services
	$(DOCKER_COMPOSE) exec ai-services bash

db-backup: ## Backup de la base de datos
	@echo "💾 Creando backup..."
	docker exec respicare-mongodb mongodump --archive=/backup/respicare-$(shell date +%Y%m%d_%H%M%S).archive --gzip

db-restore: ## Restaurar base de datos (especificar BACKUP_FILE=nombre)
	@echo "♻️ Restaurando backup..."
	docker exec respicare-mongodb mongorestore --archive=/backup/$(BACKUP_FILE) --gzip

status: ## Ver estado de servicios
	$(DOCKER_COMPOSE) ps

health: ## Check de salud de servicios
	@echo "🏥 Verificando salud de servicios..."
	@curl -f http://localhost:3001/health || echo "❌ Backend no disponible"
	@curl -f http://localhost:3000 || echo "❌ Web no disponible"
	@curl -f http://localhost:8000/health || echo "❌ AI Services no disponible"
	@echo "✅ Health check completado"

lint: ## Ejecutar linting en todos los módulos
	@echo "🔍 Ejecutando linting..."
	@cd backend && npm run lint
	@cd web && npm run lint
	@cd mobile/RespiCare-Mobile && npm run lint
	@cd ai-services && flake8 . --max-line-length=127

format: ## Formatear código
	@echo "✨ Formateando código..."
	@cd backend && npm run format
	@cd web && npm run format
	@cd mobile/RespiCare-Mobile && npm run format
	@cd ai-services && black . --line-length=127

clean-all: ## Limpiar archivos temporales y coverage
	@echo "🧹 Limpiando archivos temporales..."
	@rm -rf coverage-reports
	@rm -rf ai-services/htmlcov
	@rm -rf ai-services/coverage.xml
	@rm -rf backend/coverage
	@rm -rf web/coverage
	@rm -rf mobile/RespiCare-Mobile/coverage
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Limpieza completada"