# 🔌 Guía de Integraciones Externas - RespiCare Tacna

Guía completa para integraciones con sistemas externos usando estándares HL7 FHIR, OAuth2, mTLS y APIs de terceros.

---

## 📋 Índice

1. [Integraciones FHIR/HL7](#integraciones-fhirhl7)
2. [Integración con Laboratorios](#integración-con-laboratorios)
3. [Integración con APIs de Medicamentos](#integración-con-apis-de-medicamentos)
4. [OAuth2 y mTLS](#oauth2-y-mtls)
5. [Configuración en Kubernetes](#configuración-en-kubernetes)
6. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Integraciones FHIR/HL7

### Endpoints FHIR RESTful

El sistema expone endpoints compatibles con HL7 FHIR R4:

#### Base URL
```
/api/v1/fhir
```

#### Recursos Soportados

- **Patient**: Información de pacientes
- **Observation**: Resultados de laboratorio, signos vitales
- **Condition**: Diagnósticos y condiciones
- **Medication**: Información de medicamentos
- **MedicationStatement**: Prescripciones activas
- **DiagnosticReport**: Reportes de diagnóstico
- **Encounter**: Visitas y encuentros clínicos
- **AllergyIntolerance**: Alergias e intolerancias

#### Operaciones Disponibles

##### GET /api/v1/fhir/:resourceType/:id
Obtener un recurso específico por ID.

**Ejemplo:**
```bash
curl -X GET \
  'https://api.respicare.local/api/v1/fhir/Patient/123' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

##### POST /api/v1/fhir/:resourceType
Crear un nuevo recurso.

**Ejemplo:**
```bash
curl -X POST \
  'https://api.respicare.local/api/v1/fhir/Observation' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "resourceType": "Observation",
    "status": "final",
    "code": {
      "coding": [{
        "system": "http://loinc.org",
        "code": "789-8",
        "display": "Erythrocytes"
      }],
      "text": "Eritrocitos"
    },
    "subject": {
      "reference": "Patient/123"
    },
    "effectiveDateTime": "2024-01-15T10:30:00Z",
    "valueQuantity": {
      "value": 4.5,
      "unit": "10*12/L"
    }
  }'
```

##### GET /api/v1/fhir/:resourceType
Buscar recursos con parámetros de búsqueda.

**Ejemplo:**
```bash
curl -X GET \
  'https://api.respicare.local/api/v1/fhir/Observation?subject=Patient/123&date=ge2024-01-01' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

##### PATCH /api/v1/fhir/:resourceType/:id
Actualizar parcialmente un recurso (JSON Patch).

**Ejemplo:**
```bash
curl -X PATCH \
  'https://api.respicare.local/api/v1/fhir/Observation/456' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json-patch+json' \
  -d '[
    {
      "op": "replace",
      "path": "/status",
      "value": "corrected"
    }
  ]'
```

##### POST /api/v1/fhir/bundle
Procesar un Bundle FHIR (transacción o batch).

**Ejemplo:**
```bash
curl -X POST \
  'https://api.respicare.local/api/v1/fhir/bundle' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "resourceType": "Bundle",
    "type": "transaction",
    "entry": [
      {
        "resource": {
          "resourceType": "Patient",
          "name": [{"family": "Pérez", "given": ["Juan"]}]
        },
        "request": {
          "method": "POST",
          "url": "Patient"
        }
      }
    ]
  }'
```

##### POST /api/v1/fhir/hl7/parse
Convertir mensaje HL7 v2/v3 a recurso FHIR Observation.

**Ejemplo:**
```bash
curl -X POST \
  'https://api.respicare.local/api/v1/fhir/hl7/parse' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "MSH|^~\\&|LAB|HOSP|RESPICARE|202401151030||ORU^R01|123|P|2.5\nPID|1||12345678||PÉREZ^JUAN||19900101|M",
    "format": "v2"
  }'
```

##### GET /api/v1/fhir/capabilities
Obtener capabilities statement (metadata del servidor FHIR).

```bash
curl -X GET \
  'https://api.respicare.local/api/v1/fhir/capabilities' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Permisos Requeridos

- `fhir:read`: Para operaciones GET
- `fhir:create`: Para operaciones POST
- `fhir:update`: Para operaciones PATCH

---

## Integración con Laboratorios

### Importar Resultados

#### POST /api/v1/integrations/laboratory/import

Importar resultados de laboratorio desde sistema externo.

**Request:**
```json
{
  "patientId": "123",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "5 resultados importados exitosamente",
  "data": [
    {
      "patientId": "123",
      "testName": "Hemograma Completo",
      "testCode": "CBC",
      "value": "4.5",
      "unit": "10*12/L",
      "status": "normal",
      "date": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Importar desde HL7

#### POST /api/v1/integrations/laboratory/hl7

Importar resultado desde mensaje HL7.

**Request:**
```json
{
  "hl7Message": "MSH|^~\\&|LAB|HOSP|RESPICARE|202401151030||ORU^R01|123|P|2.5\nPID|1||12345678||PÉREZ^JUAN||19900101|M\nOBR|1|||CBC^Hemograma Completo|||202401151030\nOBX|1|NM|789-8^Eritrocitos||4.5|10*12/L|4.0-5.5|N|||F"
}
```

### Sincronización Bidireccional

#### POST /api/v1/integrations/laboratory/sync

Sincronizar resultados bidireccionalmente con sistema externo.

**Request:**
```json
{
  "patientId": "123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sincronización completada",
  "data": {
    "imported": 5,
    "exported": 3
  }
}
```

### Configuración

Variables de entorno:

```bash
LABORATORY_API_URL=https://lab-api.example.com
LABORATORY_API_KEY=your-api-key
LABORATORY_FORMAT=fhir  # fhir, hl7, json
LABORATORY_ENABLE_ALERTS=true
LABORATORY_ALERT_THRESHOLD=abnormal  # normal, abnormal, critical
```

---

## Integración con APIs de Medicamentos

### Buscar Medicamento

#### GET /api/v1/integrations/drugs/search

Buscar información de medicamento.

**Request:**
```
GET /api/v1/integrations/drugs/search?name=aspirin
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Aspirin",
    "rxcui": "1191",
    "activeIngredients": ["Acetylsalicylic acid"],
    "dosageForms": ["Tablet", "Capsule"],
    "indications": ["Pain relief", "Fever reduction"],
    "contraindications": ["Active bleeding", "Peptic ulcer"],
    "sideEffects": ["Stomach upset", "Nausea"],
    "interactions": []
  }
}
```

### Verificar Interacciones

#### POST /api/v1/integrations/drugs/interactions

Verificar interacciones entre múltiples medicamentos.

**Request:**
```json
{
  "drugs": ["warfarin", "aspirin", "ibuprofen"]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "drug1": "warfarin",
      "drug2": "aspirin",
      "severity": "severe",
      "description": "Aumenta el riesgo de sangrado",
      "clinicalSignificance": "Conocida",
      "source": "drugbank"
    }
  ],
  "meta": {
    "drugsChecked": 3,
    "interactionsFound": 1
  }
}
```

### Obtener Dosificación

#### GET /api/v1/integrations/drugs/dosage

Obtener dosificación recomendada.

**Request:**
```
GET /api/v1/integrations/drugs/dosage?name=aspirin&age=45&weight=70
```

**Response:**
```json
{
  "success": true,
  "data": {
    "min": 325,
    "max": 650,
    "unit": "mg",
    "frequency": "every 4-6 hours"
  }
}
```

### Configuración

Variables de entorno:

```bash
FDA_API_KEY=your-fda-api-key
RX_NORM_BASE_URL=https://rxnav.nlm.nih.gov/REST
DRUGBANK_API_KEY=your-drugbank-api-key
```

---

## OAuth2 y mTLS

### Configuración OAuth2

El servicio OAuth2 soporta client credentials flow con mTLS opcional.

#### Crear Servicio OAuth2

```typescript
import { createOAuth2Service } from './services/oauth2Service';

const oauth2Service = createOAuth2Service({
  tokenUrl: 'https://external-api.example.com/oauth/token',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  scope: 'read write',
  // mTLS configuration
  clientCertPath: '/path/to/client.crt',
  clientKeyPath: '/path/to/client.key',
  caCertPath: '/path/to/ca.crt',
  enableMTLS: true,
});
```

#### Obtener Token

```typescript
const token = await oauth2Service.getAccessToken();
```

#### Crear Cliente Autenticado

```typescript
const client = await oauth2Service.createAuthenticatedClient(
  'https://external-api.example.com'
);

const response = await client.get('/api/data');
```

### Variables de Entorno

```bash
OAUTH2_TOKEN_URL=https://external-api.example.com/oauth/token
OAUTH2_CLIENT_ID=your-client-id
OAUTH2_CLIENT_SECRET=your-client-secret
OAUTH2_SCOPE=read write
OAUTH2_CLIENT_CERT_PATH=/path/to/client.crt
OAUTH2_CLIENT_KEY_PATH=/path/to/client.key
OAUTH2_CA_CERT_PATH=/path/to/ca.crt
OAUTH2_ENABLE_MTLS=true
```

---

## Configuración en Kubernetes

### Secrets para Integraciones

#### Crear Secret para OAuth2

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: oauth2-credentials
  namespace: respicare
type: Opaque
stringData:
  client-id: your-client-id
  client-secret: your-client-secret
  token-url: https://external-api.example.com/oauth/token
```

#### Crear Secret para Certificados mTLS

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mtls-certificates
  namespace: respicare
type: Opaque
data:
  client.crt: <base64-encoded-cert>
  client.key: <base64-encoded-key>
  ca.crt: <base64-encoded-ca>
```

#### ConfigMap para Configuración

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: integration-config
  namespace: respicare
data:
  LABORATORY_API_URL: https://lab-api.example.com
  LABORATORY_FORMAT: fhir
  FDA_API_KEY: your-fda-api-key
  RX_NORM_BASE_URL: https://rxnav.nlm.nih.gov/REST
```

#### Deployment con Secrets

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: respicare
spec:
  template:
    spec:
      containers:
      - name: backend
        env:
        - name: OAUTH2_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: oauth2-credentials
              key: client-id
        - name: OAUTH2_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth2-credentials
              key: client-secret
        volumeMounts:
        - name: mtls-certs
          mountPath: /etc/ssl/mtls
          readOnly: true
      volumes:
      - name: mtls-certs
        secret:
          secretName: mtls-certificates
```

---

## Ejemplos de Uso

### Ejemplo Completo: Importar Resultados de Laboratorio

```typescript
import { laboratoryIntegrationService } from './services/laboratoryIntegrationService';

// Importar resultados
const results = await laboratoryIntegrationService.importResults(
  'patient-123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Verificar alertas generadas
for (const result of results) {
  if (result.status === 'abnormal' || result.status === 'critical') {
    console.log(`Alerta: ${result.testName} está ${result.status}`);
  }
}
```

### Ejemplo: Verificar Interacciones de Medicamentos

```typescript
import { drugIntegrationService } from './services/drugIntegrationService';

// Verificar interacciones
const interactions = await drugIntegrationService.checkInteractions([
  'warfarin',
  'aspirin',
  'ibuprofen'
]);

// Filtrar interacciones severas
const severeInteractions = interactions.filter(
  i => i.severity === 'severe' || i.severity === 'contraindicated'
);

if (severeInteractions.length > 0) {
  console.warn('Interacciones severas detectadas:', severeInteractions);
}
```

### Ejemplo: Usar OAuth2 con mTLS

```typescript
import { createOAuth2Service } from './services/oauth2Service';

const oauth2Service = createOAuth2Service({
  tokenUrl: process.env.OAUTH2_TOKEN_URL!,
  clientId: process.env.OAUTH2_CLIENT_ID!,
  clientSecret: process.env.OAUTH2_CLIENT_SECRET!,
  scope: 'read write',
  clientCertPath: '/etc/ssl/mtls/client.crt',
  clientKeyPath: '/etc/ssl/mtls/client.key',
  caCertPath: '/etc/ssl/mtls/ca.crt',
  enableMTLS: true,
});

// Obtener token y crear cliente
const client = await oauth2Service.createAuthenticatedClient(
  'https://external-api.example.com'
);

// Usar cliente autenticado
const data = await client.get('/api/patients');
```

---

## Referencias

- [HL7 FHIR R4 Specification](https://www.hl7.org/fhir/)
- [OAuth2 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [mTLS Best Practices](https://www.owasp.org/index.php/Transport_Layer_Protection_Cheat_Sheet)
- [RxNorm API](https://www.nlm.nih.gov/research/umls/rxnorm/)
- [FDA Drug API](https://open.fda.gov/apis/drug/)

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0

