# Solución: Conflicto de Puerto MongoDB

## Problema

Al ejecutar `docker-compose up -d`, aparece el error:
```
Error response from daemon: ports are not available: exposing port TCP 127.0.0.1:27017 -> 127.0.0.1:0: listen tcp4 127.0.0.1:27017: bind: Only one usage of each socket address (protocol/network address/port) is normally permitted.
```

## Causa

MongoDB está corriendo directamente en Windows (como servicio o proceso) y está usando el puerto 27017, que es el mismo puerto que Docker intenta usar.

## Solución Implementada

Se cambió el puerto externo de MongoDB en `docker-compose.dev.yml` de `27017` a `27018`:

```yaml
ports:
  - "27018:27017"  # Puerto externo 27018 para evitar conflicto con MongoDB de Windows
```

### ¿Por qué funciona?

- **Puerto externo (27018)**: Es el puerto que usas desde tu máquina Windows para conectarte a MongoDB en Docker
- **Puerto interno (27017)**: Es el puerto que MongoDB usa dentro del contenedor Docker (no cambia)

Las conexiones **dentro de Docker** siguen usando `mongodb:27017` (correcto), solo cambió el puerto para acceder desde Windows.

## Cómo Conectarte

### Desde tu aplicación (dentro de Docker)
```javascript
// Sigue siendo el mismo
mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin
```

### Desde herramientas externas (MongoDB Compass, Studio 3T, etc.)
```
mongodb://admin:password123@localhost:27018/respicare_dev?authSource=admin
```

### Desde línea de comandos (mongosh)
```bash
mongosh "mongodb://admin:password123@localhost:27018/respicare_dev?authSource=admin"
```

## Alternativas

### Opción 1: Detener MongoDB de Windows

Si no necesitas MongoDB de Windows, puedes detenerlo:

```powershell
# Ver procesos de MongoDB
Get-Process -Name mongod

# Detener procesos
Stop-Process -Name mongod -Force

# O detener el servicio (si está como servicio)
Stop-Service MongoDB
```

Luego puedes cambiar el puerto de vuelta a 27017 en `docker-compose.dev.yml`.

### Opción 2: Usar Puerto Diferente (Implementado)

Ya está implementado: usar puerto 27018 para Docker y mantener 27017 para MongoDB de Windows.

### Opción 3: Cambiar Puerto de MongoDB de Windows

Si prefieres que MongoDB de Windows use otro puerto:

1. Edita el archivo de configuración de MongoDB (normalmente en `C:\Program Files\MongoDB\Server\X.X\bin\mongod.cfg`)
2. Cambia el puerto a otro (ej: 27019)
3. Reinicia el servicio de MongoDB

## Verificar que Funciona

```bash
# Iniciar servicios
docker-compose -f docker-compose.dev.yml up -d

# Verificar que MongoDB está corriendo
docker-compose -f docker-compose.dev.yml ps mongodb

# Verificar logs
docker-compose -f docker-compose.dev.yml logs mongodb

# Probar conexión desde fuera de Docker
mongosh "mongodb://admin:password123@localhost:27018/test?authSource=admin"
```

## Notas Importantes

⚠️ **Importante**:
- Si cambias el puerto, asegúrate de actualizar cualquier herramienta externa que use MongoDB
- Las conexiones dentro de Docker NO cambian (siguen usando `mongodb:27017`)
- Solo cambia el acceso desde fuera de Docker (desde Windows)

✅ **Ventajas**:
- Puedes tener MongoDB de Windows y MongoDB en Docker corriendo simultáneamente
- No necesitas detener servicios de Windows
- Cada uno usa su propio puerto

## Archivos Modificados

- `docker-compose.dev.yml`: Puerto externo cambiado a 27018

