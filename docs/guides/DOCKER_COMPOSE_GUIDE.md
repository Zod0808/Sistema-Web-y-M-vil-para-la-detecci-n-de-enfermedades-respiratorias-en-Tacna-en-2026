# 🐳 Guía de Docker Compose para Desarrollo

Esta guía explica cómo usar Docker Compose para desarrollo local del sistema RespiCare.

---

## 📋 Prerrequisitos

- Docker >= 20.10
- Docker Compose >= 2.0
- Al menos 4GB de RAM disponible
- 10GB de espacio en disco

---

## 📁 Archivos Docker Compose Disponibles

El proyecto incluye varios archivos Docker Compose para diferentes entornos:

### `docker-compose.yml` (Base)
- Configuración base con todos los servicios
- Usado como base para desarrollo y producción
- **No usar directamente** - usar con `-f` flag

### `docker-compose.dev.yml` (Desarrollo) ⭐ **Recomendado para desarrollo**
- Configuración optimizada para desarrollo local
- Hot reload habilitado
- Debugger de Node.js expuesto (puerto 9229)
- Mongo Express y Redis Commander incluidos
- Volúmenes montados para desarrollo activo

### `docker-compose.prod.yml` (Producción)
- Configuración optimizada para producción
- Sin hot reload
- Recursos limitados
- Certbot para SSL
- Servicio de backups automáticos
- Puertos restringidos a localhost

### `docker-compose.override.yml.example` (Personalización)
- Ejemplo de override para personalización local
- Copiar a `docker-compose.override.yml` (ignorado por git)
- Permite personalizar sin afectar otros desarrolladores

---

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basándote en `env.example`:

```bash
# Copiar ejemplo
cp env.example .env

# Editar con tus valores
# MongoDB
MONGO_USERNAME=admin
MONGO_PASSWORD=password123
MONGO_DB=respicare

# Redis
REDIS_PASSWORD=

# Backend
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-change-in-production
NODE_ENV=development
PORT=3001

# AI Services
OPENAI_API_KEY=your-openai-api-key-optional
LOG_LEVEL=INFO
PYTHON_VERSION=3.10

# Sentry (opcional)
SENTRY_DSN=your-sentry-dsn
SENTRY_ENABLED=false
```

### 2. Iniciar Servicios para Desarrollo

```bash
# Opción 1: Usar docker-compose.dev.yml (recomendado)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Opción 2: Usar Makefile (más fácil)
make dev

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f ai-services
```

### 3. Iniciar Servicios para Producción

```bash
# Usar docker-compose.prod.yml
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verificar que todo funciona
docker-compose ps
```

### 4. Verificar que Todo Funciona

```bash
# Backend
curl http://localhost:3001/health

# AI Services
curl http://localhost:8000/api/v1/health

# MongoDB
docker-compose exec mongodb mongosh -u admin -p password123 --authenticationDatabase admin

# Redis
docker-compose exec redis redis-cli ping
```

---

## 📦 Servicios Incluidos

### MongoDB
- **Puerto**: `27017` (solo localhost en producción)
- **Usuario**: `admin` (por defecto)
- **Contraseña**: Configurada en `.env`
- **Base de datos**: `respicare` (por defecto) / `respicare_dev` (desarrollo)
- **Volúmenes**: `mongodb_data` (persistente)
- **Admin UI**: Mongo Express disponible en desarrollo (`http://localhost:8081`)

### Redis
- **Puerto**: `6379` (solo localhost en producción)
- **Memoria máxima**: 256MB
- **Política**: `allkeys-lru`
- **Volúmenes**: `redis_data` (persistente)
- **Admin UI**: Redis Commander disponible en desarrollo (`http://localhost:8082`)

### Backend API
- **Puerto**: `3001`
- **Debugger**: `9229` (solo en desarrollo)
- **Health check**: `http://localhost:3001/health`
- **Hot reload**: Habilitado en desarrollo (`npm run dev`)
- **Logs**: `backend_logs` volume
- **Variables de entorno**: `NODE_ENV=development` (dev) / `production` (prod)

### AI Services
- **Puerto**: `8000`
- **Health check**: `http://localhost:8000/api/v1/health`
- **Hot reload**: Habilitado en desarrollo (`--reload` flag)
- **Logs**: `ai_logs` volume
- **Variables de entorno**: `LOG_LEVEL=DEBUG` (dev) / `INFO` (prod)

### Web Frontend (solo en desarrollo)
- **Puerto**: `3000`
- **Hot reload**: Habilitado con `CHOKIDAR_USEPOLLING=true`
- **Variables de entorno**: `REACT_APP_API_URL`, `REACT_APP_AI_URL`

### Nginx (Proxy Reverso)
- **Puerto**: `80` (HTTP), `443` (HTTPS)
- **Configuración**: `nginx/nginx.conf`
- **Rutas**:
  - `/api` → Backend (3001)
  - `/ai` → AI Services (8000)
- **SSL**: Certbot configurado en producción

### Servicios Adicionales (solo desarrollo)
- **Mongo Express**: `http://localhost:8081` - Interfaz web para MongoDB
- **Redis Commander**: `http://localhost:8082` - Interfaz web para Redis

---

## 🛠️ Comandos Útiles

### Gestión de Servicios

#### Desarrollo
```bash
# Iniciar servicios de desarrollo
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# O usar Makefile
make dev

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart backend

# Reconstruir un servicio
docker-compose build backend
docker-compose up -d backend

# Ver estado de servicios
docker-compose ps
```

#### Producción
```bash
# Iniciar servicios de producción
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Detener servicios
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Ver estado
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

#### Personalización Local
```bash
# Copiar ejemplo de override
cp docker-compose.override.yml.example docker-compose.override.yml

# Editar docker-compose.override.yml con tus personalizaciones
# Este archivo es ignorado por git y no afecta a otros desarrolladores

# Usar con override
docker-compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.override.yml up -d
```

### Logs

```bash
# Ver todos los logs
docker-compose logs -f

# Ver logs de un servicio
docker-compose logs -f backend
docker-compose logs -f ai-services
docker-compose logs -f mongodb

# Ver últimas 100 líneas
docker-compose logs --tail=100 backend

# Ver logs desde una fecha
docker-compose logs --since 2024-11-03T10:00:00 backend
```

### Ejecutar Comandos en Contenedores

```bash
# Ejecutar comando en backend
docker-compose exec backend npm run test
docker-compose exec backend npm run seed

# Ejecutar comando en AI Services
docker-compose exec ai-services python -m pytest
docker-compose exec ai-services python scripts/seed_data.py

# Acceder a shell
docker-compose exec backend sh
docker-compose exec ai-services bash
```

### Base de Datos

```bash
# Conectar a MongoDB
docker-compose exec mongodb mongosh -u admin -p password123 --authenticationDatabase admin

# Backup de MongoDB
docker-compose exec mongodb mongodump --uri="mongodb://admin:password123@localhost:27017/respicare?authSource=admin" --out=/data/backup

# Restaurar backup
docker-compose exec mongodb mongorestore --uri="mongodb://admin:password123@localhost:27017/respicare?authSource=admin" /data/backup/respicare

# Ver bases de datos
docker-compose exec mongodb mongosh -u admin -p password123 --authenticationDatabase admin --eval "show dbs"
```

### Redis

```bash
# Conectar a Redis CLI
docker-compose exec redis redis-cli

# Ver todas las claves
docker-compose exec redis redis-cli KEYS "*"

# Limpiar cache
docker-compose exec redis redis-cli FLUSHALL

# Ver información de memoria
docker-compose exec redis redis-cli INFO memory
```

---

## 🔧 Configuración Avanzada

### Variables de Entorno por Servicio

Puedes crear archivos `.env.backend`, `.env.ai-services`, etc., y referenciarlos en `docker-compose.yml`:

```yaml
services:
  backend:
    env_file:
      - .env
      - .env.backend
```

### Volúmenes Personalizados

Para desarrollo, puedes montar el código local (ya configurado en `docker-compose.dev.yml`):

```yaml
services:
  backend:
    volumes:
      - ./backend:/app
      - /app/node_modules  # Excluir node_modules del mount
```

### Usar docker-compose.override.yml para Personalización

Crea `docker-compose.override.yml` (ignorado por git) para personalizar tu entorno local:

```yaml
# docker-compose.override.yml
services:
  backend:
    ports:
      - "9229:9229"  # Node.js debugger
    environment:
      - NODE_OPTIONS=--inspect=0.0.0.0:9229
      - DEBUG=true
```

### Redes Personalizadas

Por defecto, todos los servicios están en la red `respicare-network` (o `respicare-dev-network` en desarrollo). Puedes crear redes adicionales:

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
```

### Usar Makefile (Recomendado)

El proyecto incluye un `Makefile` con comandos útiles:

```bash
# Ver todos los comandos disponibles
make help

# Setup inicial
make setup

# Desarrollo
make dev          # Iniciar en modo desarrollo con logs
make up           # Iniciar en background
make down         # Detener servicios
make logs         # Ver logs
make logs-backend # Ver logs del backend
make logs-ai      # Ver logs de AI Services

# Construcción
make build        # Construir todas las imágenes

# Tests
make test         # Ejecutar todos los tests
make test-backend # Tests del backend
make test-ai      # Tests de AI Services
```

---

## 🐛 Troubleshooting

### Puerto ya en uso

```bash
# Ver qué proceso usa el puerto
lsof -i :3001
lsof -i :8000
lsof -i :27017

# Cambiar puerto en docker-compose.yml
ports:
  - "3002:3001"  # Cambiar puerto externo
```

### Contenedor no inicia

```bash
# Ver logs detallados
docker-compose logs backend

# Verificar configuración
docker-compose config

# Reconstruir sin cache
docker-compose build --no-cache backend
```

### Problemas de permisos

```bash
# En Linux/Mac, ajustar permisos de volúmenes
sudo chown -R $USER:$USER ./mongodb_data
sudo chown -R $USER:$USER ./redis_data
```

### Limpiar todo y empezar de nuevo

```bash
# Detener y eliminar contenedores, redes, volúmenes
docker-compose down -v

# Limpiar imágenes no usadas
docker system prune -a

# Reconstruir todo
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Monitoreo

### Health Checks

Todos los servicios tienen health checks configurados:

```bash
# Ver estado de health checks
docker-compose ps

# Verificar health manualmente
curl http://localhost:3001/health
curl http://localhost:8000/api/v1/health
```

### Métricas

- **Backend**: `http://localhost:3001/api/v1/metrics` (si está configurado)
- **AI Services**: `http://localhost:8000/api/v1/metrics` (si está configurado)

---

## 🔐 Seguridad

### Desarrollo vs Producción

⚠️ **IMPORTANTE**: El `docker-compose.yml` está configurado para **desarrollo**. Para producción:

1. **NO** exponer puertos directamente (usar reverse proxy)
2. **NO** usar contraseñas por defecto
3. **SÍ** habilitar autenticación en MongoDB
4. **SÍ** usar secrets management
5. **SÍ** habilitar TLS/SSL
6. **SÍ** configurar firewalls

### Secrets Management

Para producción, usa Docker Secrets o variables de entorno seguras:

```yaml
secrets:
  jwt_secret:
    external: true
  mongodb_password:
    external: true
```

---

## 📚 Recursos Adicionales

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Backend README](../backend/README.md)
- [AI Services README](../ai-services/README.md)

---

---

## 📝 Resumen de Archivos Docker Compose

| Archivo | Uso | Cuándo usar |
|---------|-----|-------------|
| `docker-compose.yml` | Base | Nunca usar solo, siempre con `-f` |
| `docker-compose.dev.yml` | Desarrollo | Desarrollo local, hot reload, debugger |
| `docker-compose.prod.yml` | Producción | Despliegue en producción |
| `docker-compose.override.yml` | Personalización | Personalización local (ignorado por git) |

### Ejemplos de Uso

```bash
# Desarrollo (recomendado)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Producción
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Desarrollo con personalización local
docker-compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.override.yml up -d

# Usar Makefile (más fácil)
make dev  # Desarrollo
```

---

**Última actualización**: 2024-11-03  
**Versión**: 2.0.0  
**Mantenido por**: Equipo DevOps RespiCare

