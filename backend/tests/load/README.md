# Tests de Carga con K6

## ⚠️ IMPORTANTE: Antes de Ejecutar

**El backend DEBE estar corriendo antes de ejecutar los tests de carga.**

### Iniciar el Backend

```bash
cd backend
npm run dev
```

O si usas Docker:

```bash
docker-compose up backend
```

### Verificar que el Backend Esté Activo

```bash
# Verificar health endpoint
curl http://localhost:3001/health

# O verificar endpoint raíz
curl http://localhost:3001/
```

## Ejecución de Tests

### Test Básico

```bash
cd backend
npm run test:load
```

### Con Opciones Personalizadas

```bash
# Especificar URL del backend
k6 run --env BASE_URL=http://localhost:3001 tests/load/k6-load-tests.js

# Reducir carga para pruebas iniciales
k6 run --vus 5 --duration 30s tests/load/k6-load-tests.js

# Con stages personalizados
k6 run --stage 10s:5,20s:10,10s:0 tests/load/k6-load-tests.js
```

## Solución de Problemas

### Error: "No se puede conectar al backend"

**Causa**: El backend no está corriendo o no está accesible en la URL especificada.

**Solución**:
1. Verifica que el backend esté corriendo: `npm run dev`
2. Verifica el puerto: Por defecto es `3001`
3. Verifica la URL: `http://localhost:3001`
4. Si usas otra URL, especifícala: `k6 run --env BASE_URL=http://tu-url tests/load/k6-load-tests.js`

### Error: "Login falló" o "Register falló"

**Causa**: Las credenciales de prueba no existen o son incorrectas.

**Solución**:
1. Crea un usuario de prueba en el backend
2. O modifica las credenciales en `k6-load-tests.js` (línea ~60-65)
3. Asegúrate de que el usuario tenga permisos adecuados

### Error: "100% de errores"

**Causa**: El backend no está respondiendo correctamente.

**Solución**:
1. Verifica los logs del backend para ver errores
2. Verifica que MongoDB y Redis estén corriendo
3. Verifica que las variables de entorno estén configuradas correctamente
4. Reduce la carga inicialmente: `k6 run --vus 1 --duration 10s tests/load/k6-load-tests.js`

## Configuración de Usuarios de Prueba

Por defecto, el test usa estos usuarios (líneas 60-65):

```javascript
const testUsers = [
  { email: 'test1@example.com', password: 'Test123456!' },
  { email: 'test2@example.com', password: 'Test123456!' },
  { email: 'test3@example.com', password: 'Test123456!' },
];
```

**IMPORTANTE**: Estos usuarios deben existir en la base de datos antes de ejecutar los tests.

### Crear Usuarios de Prueba

Puedes crear usuarios usando el script de seed:

```bash
npm run seed
```

O manualmente a través de la API:

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "password": "Test123456!",
    "firstName": "Test",
    "lastName": "User",
    "role": "patient"
  }'
```

## Métricas Esperadas

Con el backend funcionando correctamente, deberías ver:

- ✅ `checks: rate>0.99` - Más del 99% de checks pasan
- ✅ `http_req_failed: rate<0.01` - Menos del 1% de errores
- ✅ `http_req_duration: p(95)<500` - 95% de peticiones en menos de 500ms

Si ves errores, revisa la sección de [Solución de Problemas](#solución-de-problemas).

