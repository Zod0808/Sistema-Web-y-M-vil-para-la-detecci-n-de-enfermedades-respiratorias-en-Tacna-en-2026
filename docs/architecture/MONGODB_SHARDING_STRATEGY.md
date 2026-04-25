# 🗄️ Estrategia de Sharding MongoDB - RespiCare Tacna

Guía completa para la estrategia de replicación y sharding de MongoDB para alta disponibilidad y escalabilidad.

---

## 📋 Índice

1. [Replicación MongoDB](#replicación-mongodb)
2. [Estrategia de Sharding](#estrategia-de-sharding)
3. [Read Replicas](#read-replicas)
4. [Backup y Recovery](#backup-y-recovery)
5. [Monitoreo](#monitoreo)

---

## Replicación MongoDB

### Replica Set (3 nodos)

#### Configuración

```javascript
// Inicializar Replica Set
rs.initiate({
  _id: "respicare-rs",
  members: [
    { _id: 0, host: "mongodb-0.mongodb.respicare-prod.svc.cluster.local:27017", priority: 2 },
    { _id: 1, host: "mongodb-1.mongodb.respicare-prod.svc.cluster.local:27017", priority: 1 },
    { _id: 2, host: "mongodb-2.mongodb.respicare-prod.svc.cluster.local:27017", priority: 1, arbiterOnly: false }
  ]
})
```

#### Roles

- **Primary**: Todas las escrituras y lecturas por defecto
- **Secondary 1**: Solo lecturas, puede convertirse en primary
- **Secondary 2**: Solo lecturas, puede convertirse en primary

#### Ventajas

- ✅ Alta disponibilidad (99.9%+)
- ✅ Failover automático (<30 segundos)
- ✅ Lecturas distribuidas
- ✅ Backup sin impacto

---

## Estrategia de Sharding

### Cuándo Usar Sharding

**Indicadores**:
- >10M documentos en una colección
- >100GB de datos
- Necesidad de distribución geográfica
- Throughput >10,000 ops/s

### Shard Key Selection

#### Opción 1: Sharding por PatientId (Recomendado)

```javascript
// Shard key: patientId
sh.shardCollection("respicare.medicalhistories", { patientId: 1 })

// Distribución:
// - Shard 1: patientId 0-33M
// - Shard 2: patientId 33M-66M
// - Shard 3: patientId 66M-100M
```

**Ventajas**:
- Distribución uniforme de datos
- Queries por paciente son eficientes
- Escalabilidad horizontal

**Desventajas**:
- Queries globales requieren scatter-gather

#### Opción 2: Sharding por Fecha (Para Analytics)

```javascript
// Shard key: date (compuesto con patientId)
sh.shardCollection("respicare.medicalhistories", { date: 1, patientId: 1 })

// Distribución:
// - Shard 1: Últimos 3 meses
// - Shard 2: 3-6 meses
// - Shard 3: 6-12 meses
// - Shard 4: >12 meses (archivo)
```

**Ventajas**:
- Queries por fecha son eficientes
- Archivo de datos antiguos fácil

**Desventajas**:
- Distribución no uniforme (shard reciente más grande)

### Configuración de Sharding

```javascript
// 1. Habilitar sharding en base de datos
sh.enableSharding("respicare")

// 2. Crear índices en shard key
db.medicalhistories.createIndex({ patientId: 1 })

// 3. Shardear colección
sh.shardCollection("respicare.medicalhistories", { patientId: 1 })

// 4. Verificar distribución
sh.status()
```

### Configuración de Shards

```yaml
# 3 Shards con 3 nodos cada uno (9 nodos total)
Shard 1:
  - mongodb-shard1-0 (Primary)
  - mongodb-shard1-1 (Secondary)
  - mongodb-shard1-2 (Secondary)

Shard 2:
  - mongodb-shard2-0 (Primary)
  - mongodb-shard2-1 (Secondary)
  - mongodb-shard2-2 (Secondary)

Shard 3:
  - mongodb-shard3-0 (Primary)
  - mongodb-shard3-1 (Secondary)
  - mongodb-shard3-2 (Secondary)

Config Servers (3 nodos):
  - mongodb-config-0
  - mongodb-config-1
  - mongodb-config-2

Mongos Routers (2+ nodos):
  - mongos-0
  - mongos-1
```

---

## Read Replicas

### Configuración

```javascript
// Configurar read preference
db.setReadPreference("secondaryPreferred")

// O en conexión
const client = new MongoClient(uri, {
  readPreference: 'secondaryPreferred',
  readConcern: { level: 'majority' }
})
```

### Uso por Tipo de Query

#### Escrituras
```javascript
// Siempre al primary
db.medicalhistories.insertOne({ ... })
```

#### Lecturas Críticas
```javascript
// Primary para consistencia
db.medicalhistories.findOne({ patientId: "123" }, { readPreference: 'primary' })
```

#### Analytics y Reportes
```javascript
// Secondary para no afectar primary
db.medicalhistories.aggregate([
  { $match: { date: { $gte: new Date('2024-01-01') } } },
  { $group: { _id: "$diagnosis", count: { $sum: 1 } } }
], { readPreference: 'secondary' })
```

---

## Backup y Recovery

### Estrategia de Backup

#### 1. Backup Completo (Diario)
```bash
mongodump --host="mongodb-0.mongodb.respicare-prod.svc.cluster.local:27017" \
  --username=respicare \
  --password=$PASSWORD \
  --authenticationDatabase=admin \
  --out=/backup/full/$(date +%Y%m%d)
```

#### 2. Backup Incremental (Cada 6 horas)
```bash
mongodump --host="mongodb-0.mongodb.respicare-prod.svc.cluster.local:27017" \
  --username=respicare \
  --password=$PASSWORD \
  --authenticationDatabase=admin \
  --oplog \
  --out=/backup/incremental/$(date +%Y%m%d_%H%M%S)
```

#### 3. Point-in-Time Recovery
```bash
# Restaurar backup completo
mongorestore --host="mongodb-0.mongodb.respicare-prod.svc.cluster.local:27017" \
  --username=respicare \
  --password=$PASSWORD \
  --authenticationDatabase=admin \
  /backup/full/20241121

# Aplicar oplog hasta punto específico
mongorestore --host="mongodb-0.mongodb.respicare-prod.svc.cluster.local:27017" \
  --username=respicare \
  --password=$PASSWORD \
  --authenticationDatabase=admin \
  --oplogReplay \
  --oplogLimit=1698000000 \
  /backup/incremental/20241121_120000
```

### Retención

- **Backups completos**: 30 días
- **Backups incrementales**: 7 días
- **Oplog**: 72 horas

---

## Monitoreo

### Métricas Clave

#### Replica Set
- Lag de replicación
- Estado de miembros
- Tiempo de failover
- Throughput de escritura/lectura

#### Sharding
- Distribución de chunks
- Balance de datos entre shards
- Migraciones de chunks
- Queries scatter-gather

### Alertas

```yaml
# Alertas críticas
- Replica set member down > 5 minutos
- Replication lag > 10 segundos
- Primary election > 30 segundos
- Shard imbalance > 20%
- Disk usage > 80%
```

---

## Roadmap de Implementación

### Fase 1: Replica Set (Semana 1)
- ✅ Configurar 3 nodos MongoDB
- ✅ Inicializar replica set
- ✅ Configurar autenticación
- ✅ Configurar backups

### Fase 2: Read Replicas (Semana 2)
- ✅ Configurar read preferences
- ✅ Separar queries de analytics
- ✅ Monitoreo de lag

### Fase 3: Sharding (Semana 3-4, si necesario)
- ✅ Evaluar necesidad de sharding
- ✅ Diseñar shard key
- ✅ Configurar config servers
- ✅ Configurar mongos routers
- ✅ Migrar datos

---

## Referencias

- [MongoDB Replication](https://docs.mongodb.com/manual/replication/)
- [MongoDB Sharding](https://docs.mongodb.com/manual/sharding/)
- [Shard Key Selection](https://docs.mongodb.com/manual/core/sharding-shard-key/)
- [Read Preferences](https://docs.mongodb.com/manual/core/read-preference/)

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0

