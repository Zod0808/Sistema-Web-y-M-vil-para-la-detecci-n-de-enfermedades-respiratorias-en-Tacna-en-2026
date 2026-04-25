# Guía de Acceso a Mongo Express

## Problema Común

Mongo Express puede estar mostrando la base de datos `respicare` (vacía) en lugar de `respicare_dev` (con todos los datos).

## Solución

### Opción 1: Navegar Manualmente en Mongo Express

1. Abre Mongo Express en tu navegador: `http://localhost:8081`
2. Inicia sesión con:
   - Usuario: `admin`
   - Contraseña: `admin123`
3. En la lista de bases de datos, busca y haz clic en **`respicare_dev`**
4. Ahora verás todas las colecciones con datos:
   - `users` (8 documentos)
   - `symptomreports` (900 documentos)
   - `wearabledatas` (540 documentos)
   - `chatconversations` (50 documentos)
   - `appointments` (40 documentos)
   - `prescriptions` (25 documentos)
   - `alerts` (30 documentos)
   - `automaticreports` (30 documentos)
   - `mlexperiments` (20 documentos)
   - `auditlogs` (200 documentos)
   - `medicalhistories` (9 documentos)
   - `aianalyses` (9 documentos)
   - `consentlogs` (8 documentos)

### Opción 2: Acceso Directo por URL

Puedes acceder directamente a `respicare_dev` usando esta URL:

```
http://localhost:8081/db/respicare_dev/
```

### Opción 3: Verificar desde la Terminal

Para verificar que los datos están en MongoDB:

```bash
# Ver todas las bases de datos
docker exec respicare-mongodb-dev mongosh -u admin -p password123 --authenticationDatabase admin --eval "db.adminCommand('listDatabases')" --quiet

# Ver colecciones en respicare_dev
docker exec respicare-mongodb-dev mongosh -u admin -p password123 --authenticationDatabase admin respicare_dev --eval "db.getCollectionNames()" --quiet

# Contar documentos en una colección
docker exec respicare-mongodb-dev mongosh -u admin -p password123 --authenticationDatabase admin respicare_dev --eval "db.users.countDocuments()" --quiet
```

## Diferencias entre Bases de Datos

- **`respicare`**: Base de datos creada por el script de inicialización (`mongodb/init/01-init.js`), puede estar vacía o tener datos mínimos
- **`respicare_dev`**: Base de datos usada por el backend y donde se insertan todos los datos del script `seed-complete-system.js`

## Configuración Actual

El backend está configurado para usar `respicare_dev`:

```yaml
# docker-compose.dev.yml
backend:
  environment:
    MONGO_DB: respicare_dev
    MONGODB_URI: mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin
```

## Notas

- Mongo Express muestra todas las bases de datos disponibles
- Por defecto puede mostrar `respicare` (vacía)
- Los datos están en `respicare_dev` (1,849 documentos en total)
- MongoDB Compass muestra correctamente `respicare_dev` porque se conecta directamente a esa base de datos

