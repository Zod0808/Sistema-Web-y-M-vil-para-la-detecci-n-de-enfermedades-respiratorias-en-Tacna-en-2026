# Configuración de MongoDB para Desarrollo Local

## Problema Común: "getaddrinfo ENOTFOUND mongodb"

Este error ocurre cuando el backend intenta conectarse a un hostname "mongodb" que solo existe dentro de Docker, pero estás ejecutando el backend localmente.

## Soluciones

### Opción 1: Usar MongoDB Local (Recomendado para desarrollo)

1. **Instalar MongoDB localmente**:

   **Windows:**
   ```powershell
   # Con Chocolatey
   choco install mongodb
   
   # O descargar desde: https://www.mongodb.com/try/download/community
   ```

   **macOS:**
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

   **Linux (Ubuntu/Debian):**
   ```bash
   sudo apt-get install mongodb
   ```

2. **Iniciar MongoDB**:

   **Windows:**
   ```powershell
   # MongoDB se inicia automáticamente como servicio
   # O manualmente:
   mongod --dbpath C:\data\db
   ```

   **macOS/Linux:**
   ```bash
   # Con Homebrew (macOS)
   brew services start mongodb-community
   
   # O manualmente
   mongod --dbpath /usr/local/var/mongodb
   ```

3. **Configurar variable de entorno**:

   Crea un archivo `.env` en `backend/`:

   ```bash
   cd backend
   cp .env.example .env
   ```

   Edita `.env` y asegúrate de que tenga:

   ```env
   MONGODB_URI=mongodb://localhost:27017/respicare_dev
   ```

4. **Iniciar el backend**:

   ```bash
   npm run dev
   ```

### Opción 2: Usar Docker para MongoDB

Si prefieres usar Docker solo para MongoDB:

1. **Iniciar solo MongoDB con Docker**:

   ```bash
   docker run -d \
     --name respicare-mongodb \
     -p 27017:27017 \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=change_this_password \
     mongo:latest
   ```

2. **Configurar variable de entorno**:

   En `backend/.env`:

   ```env
   MONGODB_URI=mongodb://admin:change_this_password@localhost:27017/respicare_dev?authSource=admin
   ```

3. **Iniciar el backend**:

   ```bash
   npm run dev
   ```

### Opción 3: Usar Docker Compose Completo

Si quieres usar todo el stack con Docker:

1. **Iniciar todos los servicios**:

   ```bash
   docker-compose up -d
   ```

2. **Configurar variable de entorno**:

   En `backend/.env`:

   ```env
   MONGODB_URI=mongodb://admin:change_this_password@mongodb:27017/respicare_dev?authSource=admin
   DOCKER_ENV=true
   ```

3. **Iniciar el backend dentro de Docker** o configurar para que se conecte al contenedor.

## Verificar Conexión

Para verificar que MongoDB está corriendo:

```bash
# Verificar que MongoDB está escuchando
netstat -ano | findstr :27017  # Windows
lsof -i:27017                  # Linux/macOS

# Conectar con MongoDB CLI
mongosh                          # MongoDB 6+
mongo                            # MongoDB < 6
```

## Crear Base de Datos Inicial

Una vez que MongoDB esté corriendo, el backend creará automáticamente la base de datos al conectarse. Si quieres poblar datos de prueba:

```bash
cd backend
npm run seed
```

## Troubleshooting

### Error: "MongoNetworkError: connect ECONNREFUSED"

**Causa**: MongoDB no está corriendo.

**Solución**: Inicia MongoDB (ver Opción 1 o 2 arriba).

### Error: "MongoServerError: Authentication failed"

**Causa**: Credenciales incorrectas.

**Solución**: Verifica el `MONGODB_URI` en tu `.env`. Si MongoDB local no tiene autenticación, usa:

```env
MONGODB_URI=mongodb://localhost:27017/respicare_dev
```

### Error: "getaddrinfo ENOTFOUND mongodb"

**Causa**: Estás intentando conectarte a "mongodb" (hostname de Docker) pero estás ejecutando localmente.

**Solución**: 
1. Usa `localhost` en lugar de `mongodb` en `MONGODB_URI`
2. O usa Docker Compose para todo el stack

## Recursos

- [Instalación de MongoDB](https://www.mongodb.com/docs/manual/installation/)
- [Docker Hub - MongoDB](https://hub.docker.com/_/mongo)
- [MongoDB Connection Strings](https://www.mongodb.com/docs/manual/reference/connection-string/)

