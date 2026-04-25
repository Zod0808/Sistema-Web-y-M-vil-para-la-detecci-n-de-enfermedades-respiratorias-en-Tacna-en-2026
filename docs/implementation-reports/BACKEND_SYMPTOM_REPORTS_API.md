# 📊 Backend API: Symptom Reports & Heatmap

## 🎉 Implementación Completa

Se han implementado endpoints completos en el backend (Node.js/Express/MongoDB) para gestionar reportes de síntomas y generar datos para el mapa de calor.

---

## 🚀 Endpoints Implementados

### Base URL
```
http://localhost:3001/api/symptom-reports
```

---

### 1. GET `/api/symptom-reports/heatmap`

**Descripción:** Obtiene datos agregados por distrito para el mapa de calor

**Método:** `GET`

**Query Parameters:**
- `startDate` (optional): Fecha inicio (ISO 8601)
- `endDate` (optional): Fecha fin (ISO 8601)

**Response:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "district": "Centro de Tacna",
      "totalCases": 45,
      "highSeverity": 12,
      "mediumSeverity": 20,
      "lowSeverity": 13,
      "coordinates": {
        "latitude": -18.0056,
        "longitude": -70.2444
      },
      "severity": "high"
    }
  ],
  "timestamp": "2025-10-24T02:00:00.000Z"
}
```

**Ejemplo:**
```bash
curl http://localhost:3001/api/symptom-reports/heatmap
```

---

### 2. GET `/api/symptom-reports/statistics`

**Descripción:** Obtiene estadísticas generales de los reportes

**Método:** `GET`

**Query Parameters:**
- `startDate` (optional): Fecha inicio
- `endDate` (optional): Fecha fin

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 203,
    "bySeverity": {
      "high": 45,
      "medium": 94,
      "low": 64
    },
    "urgent": 8,
    "byCategory": {
      "respiratory": 120,
      "fever": 65,
      "pain": 45,
      "digestive": 12,
      "fatigue": 35,
      "neurological": 8
    },
    "timestamp": "2025-10-24T02:00:00.000Z"
  }
}
```

**Ejemplo:**
```bash
curl http://localhost:3001/api/symptom-reports/statistics
```

---

### 3. GET `/api/symptom-reports`

**Descripción:** Obtiene lista de reportes con filtros opcionales

**Método:** `GET`

**Query Parameters:**
- `district` (optional): Filtrar por distrito
- `severity` (optional): Filtrar por severidad (low/medium/high)
- `status` (optional): Filtrar por estado (pending/reviewed/urgent/resolved)
- `startDate` (optional): Fecha inicio
- `endDate` (optional): Fecha fin
- `limit` (optional, default: 100): Cantidad máxima de resultados

**Response:**
```json
{
  "success": true,
  "count": 45,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "location": {
        "district": "Centro de Tacna",
        "coordinates": {
          "latitude": -18.0056,
          "longitude": -70.2444
        }
      },
      "symptoms": [
        {
          "name": "tos",
          "severity": "severe",
          "duration": {
            "value": 5,
            "unit": "days"
          }
        }
      ],
      "category": "respiratory",
      "overallSeverity": "high",
      "suspectedDisease": "neumonia",
      "temperature": 38.5,
      "status": "urgent",
      "medicalAttentionRequired": true,
      "createdAt": "2025-10-24T02:00:00.000Z",
      "updatedAt": "2025-10-24T02:00:00.000Z"
    }
  ]
}
```

**Ejemplo:**
```bash
# Todos los reportes
curl http://localhost:3001/api/symptom-reports

# Filtrar por distrito
curl http://localhost:3001/api/symptom-reports?district=Centro%20de%20Tacna

# Filtrar por severidad
curl http://localhost:3001/api/symptom-reports?severity=high

# Filtrar por estado
curl http://localhost:3001/api/symptom-reports?status=urgent
```

---

### 4. GET `/api/symptom-reports/:id`

**Descripción:** Obtiene un reporte específico por ID

**Método:** `GET`

**URL Parameters:**
- `id` (required): ID del reporte (MongoDB ObjectId)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "location": {
      "district": "Centro de Tacna",
      "coordinates": {
        "latitude": -18.0056,
        "longitude": -70.2444
      }
    },
    // ... más campos
  }
}
```

**Ejemplo:**
```bash
curl http://localhost:3001/api/symptom-reports/507f1f77bcf86cd799439011
```

---

### 5. POST `/api/symptom-reports`

**Descripción:** Crea un nuevo reporte de síntomas

**Método:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "location": {
    "district": "Centro de Tacna",
    "coordinates": {
      "latitude": -18.0056,
      "longitude": -70.2444
    },
    "address": "Av. Bolognesi 123"
  },
  "symptoms": [
    {
      "name": "tos",
      "severity": "severe",
      "duration": {
        "value": 5,
        "unit": "days"
      }
    },
    {
      "name": "fiebre",
      "severity": "moderate",
      "duration": {
        "value": 2,
        "unit": "days"
      }
    }
  ],
  "category": "respiratory",
  "temperature": 38.5,
  "oxygenSaturation": 95,
  "hasPreexistingConditions": false,
  "contactInfo": {
    "phone": "+51987654321",
    "email": "paciente@example.com"
  },
  "notes": "Síntomas comenzaron hace 5 días",
  "reportedBy": "patient",
  "source": "web",
  "isAnonymous": false
}
```

**Required Fields:**
- `location.district`
- `location.coordinates.latitude`
- `location.coordinates.longitude`
- `symptoms` (array con al menos 1 síntoma)
- `category`

**Response:**
```json
{
  "success": true,
  "message": "Symptom report created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    // ... datos del reporte creado
  }
}
```

**Ejemplo:**
```bash
curl -X POST http://localhost:3001/api/symptom-reports \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "district": "Centro de Tacna",
      "coordinates": {"latitude": -18.0056, "longitude": -70.2444}
    },
    "symptoms": [{"name": "tos", "severity": "moderate", "duration": {"value": 3, "unit": "days"}}],
    "category": "respiratory"
  }'
```

---

### 6. PUT `/api/symptom-reports/:id`

**Descripción:** Actualiza un reporte existente

**Método:** `PUT`

**URL Parameters:**
- `id` (required): ID del reporte

**Request Body:** (campos a actualizar)
```json
{
  "status": "reviewed",
  "medicalAttentionReceived": true,
  "notes": "Paciente atendido en hospital"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Symptom report updated successfully",
  "data": {
    // ... datos del reporte actualizado
  }
}
```

---

### 7. DELETE `/api/symptom-reports/:id`

**Descripción:** Elimina un reporte

**Método:** `DELETE`

**URL Parameters:**
- `id` (required): ID del reporte

**Response:**
```json
{
  "success": true,
  "message": "Symptom report deleted successfully"
}
```

---

## 📊 Modelo de Datos

### SymptomReport Schema

```javascript
{
  // Patient information
  patientId: String (optional),
  
  // Location data
  location: {
    district: String (required) - Enum of 8 Tacna districts,
    coordinates: {
      latitude: Number (required),
      longitude: Number (required)
    },
    address: String (optional)
  },
  
  // Symptoms
  symptoms: [{
    name: String (required),
    severity: String (required) - 'mild', 'moderate', 'severe',
    duration: {
      value: Number,
      unit: String - 'hours', 'days', 'weeks'
    }
  }],
  
  // Primary symptom category
  category: String (required) - 'respiratory', 'fever', 'pain', etc.,
  
  // Severity assessment
  overallSeverity: String (required) - 'low', 'medium', 'high',
  
  // Disease suspicion
  suspectedDisease: String - 'asma', 'neumonia', 'bronquitis', etc.,
  
  // Additional data
  temperature: Number (35-42),
  oxygenSaturation: Number (0-100),
  hasPreexistingConditions: Boolean,
  preexistingConditions: [String],
  
  // Contact information
  contactInfo: {
    phone: String,
    email: String
  },
  
  // Status
  status: String - 'pending', 'reviewed', 'urgent', 'resolved',
  medicalAttentionRequired: Boolean,
  medicalAttentionReceived: Boolean,
  
  // Notes
  notes: String,
  
  // Metadata
  reportedBy: String - 'patient', 'family', 'healthcare_worker', 'anonymous',
  source: String - 'web', 'mobile', 'phone', 'hospital',
  isAnonymous: Boolean,
  
  // Timestamps (auto-generated)
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🗺️ Distritos de Tacna

Los 8 distritos soportados:

1. **Centro de Tacna** (-18.0056, -70.2444)
2. **Gregorio Albarracín** (-18.0300, -70.2500)
3. **Ciudad Nueva** (-18.0120, -70.2300)
4. **Pocollay** (-17.9950, -70.2100)
5. **Alto de la Alianza** (-17.9700, -70.2400)
6. **Calana** (-17.9600, -70.1950)
7. **Pachia** (-17.9200, -70.1850)
8. **Boca del Río** (-18.0400, -70.2800)

---

## 📈 Datos de Ejemplo

El sistema viene con **203 reportes de ejemplo** distribuidos en los 8 distritos:

| Distrito | Casos | Severidad |
|----------|-------|-----------|
| Centro de Tacna | 45 | Alta |
| Alto de la Alianza | 38 | Alta |
| Gregorio Albarracín | 32 | Media |
| Ciudad Nueva | 28 | Media |
| Boca del Río | 25 | Media |
| Pocollay | 15 | Baja |
| Calana | 12 | Baja |
| Pachia | 8 | Baja |

**Estadísticas:**
- Total de reportes: **203**
- Alta severidad: **45**
- Media severidad: **94**
- Baja severidad: **64**
- Casos urgentes: **8**

---

## 🔧 Scripts de Utilidad

### Poblar base de datos
```bash
# Dentro del contenedor backend
docker exec respicare-backend-dev node src/scripts/seed-symptom-reports.js

# Desde el host
npm run seed:symptom-reports
```

### Limpiar base de datos
```javascript
// MongoDB Shell
use respicare
db.symptomreports.deleteMany({})
```

---

## 🌐 Integración con Frontend

El componente `HeatMap.js` consume automáticamente estos endpoints:

```javascript
// Fetch heatmap data
const response = await axios.get('http://localhost:3001/api/symptom-reports/heatmap');

// Transform data for visualization
const transformedData = response.data.data.map((item, index) => ({
  id: index + 1,
  location: item.district,
  lat: item.coordinates.latitude,
  lng: item.coordinates.longitude,
  cases: item.totalCases,
  severity: item.severity,
  highSeverity: item.highSeverity,
  mediumSeverity: item.mediumSeverity,
  lowSeverity: item.lowSeverity
}));
```

---

## ⚡ Funcionalidades Avanzadas

### 1. Cálculo Automático de Severidad

El modelo tiene un método que calcula automáticamente la severidad basándose en los síntomas:

```javascript
report.calculateSeverity();
// Retorna: 'low', 'medium', o 'high'
```

**Lógica:**
- **High**: 2+ síntomas severos O 1 severo + 2+ moderados
- **Medium**: 1 síntoma severo O 2+ moderados
- **Low**: Resto de casos

### 2. Agregación por Distrito

Método estático para obtener estadísticas agregadas:

```javascript
const aggregated = await SymptomReport.getAggregatedByDistrict({
  startDate: '2025-10-01',
  endDate: '2025-10-31'
});
```

### 3. Filtrado Avanzado

```javascript
const reports = await SymptomReport.getByDistrict('Centro de Tacna', {
  startDate: '2025-10-01',
  severity: 'high'
});
```

### 4. Virtual Fields

El modelo incluye campos virtuales calculados dinámicamente:
- `daysSinceReport`: Días desde el reporte
- `riskLevel`: Nivel de riesgo calculado

---

## 🔒 Seguridad

### Datos Sensibles

Los endpoints públicos excluyen automáticamente información sensible:
- `contactInfo`
- `patientId`

```javascript
.select('-contactInfo -patientId')
```

### Validaciones

El modelo incluye validaciones automáticas:
- Coordenadas dentro del rango de Tacna
- Temperatura dentro del rango fisiológico (35-42°C)
- Saturación de oxígeno (0-100%)
- Enums para distritos, severidades, estados

---

## 🧪 Testing

### Pruebas Manuales

```bash
# 1. Obtener datos del heatmap
curl http://localhost:3001/api/symptom-reports/heatmap

# 2. Obtener estadísticas
curl http://localhost:3001/api/symptom-reports/statistics

# 3. Crear nuevo reporte
curl -X POST http://localhost:3001/api/symptom-reports \
  -H "Content-Type: application/json" \
  -d '{
    "location": {"district": "Pocollay", "coordinates": {"latitude": -17.9950, "longitude": -70.2100}},
    "symptoms": [{"name": "tos", "severity": "mild", "duration": {"value": 2, "unit": "days"}}],
    "category": "respiratory"
  }'

# 4. Filtrar por distrito
curl "http://localhost:3001/api/symptom-reports?district=Centro%20de%20Tacna&severity=high"
```

---

## 📁 Archivos Creados

```
backend/src/
├── models/
│   └── SymptomReport.js               # Modelo de MongoDB
├── routes/
│   └── symptomReportsRoutes.js        # Rutas y controladores
├── scripts/
│   └── seed-symptom-reports.js        # Script de población
└── index-dev.js                        # Actualizado con nuevas rutas

web/src/components/
└── HeatMap.js                          # Actualizado para usar API real
```

---

## 🚀 Próximas Mejoras

- [ ] Autenticación y autorización
- [ ] Validación de entrada más robusta
- [ ] Rate limiting
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Export de datos (CSV, PDF)
- [ ] Análisis de tendencias temporales
- [ ] Notificaciones automáticas para casos urgentes
- [ ] Integración con servicios de salud externos
- [ ] Machine Learning para predicción de brotes

---

## ✅ Estado Actual

```
✅ Modelo de datos completo
✅ 7 endpoints implementados
✅ 203 reportes de ejemplo en BD
✅ Integración con frontend (HeatMap)
✅ Agregación por distrito
✅ Estadísticas en tiempo real
✅ Filtros avanzados
✅ Cálculo automático de severidad
✅ Fallback a datos mock si BD no disponible
```

---

**¡Sistema completamente funcional y listo para uso!** 🎉

**Fecha de Implementación:** 24 de Octubre, 2025  
**Versión:** 1.0.0

