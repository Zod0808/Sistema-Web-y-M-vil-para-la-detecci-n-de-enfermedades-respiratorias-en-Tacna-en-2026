# Diagramas de Clases y Base de Datos - Sistema RespiCare

## 1. Diagrama de Clases

```mermaid
classDiagram
    %% Modelos de Dominio
    class User {
        +ObjectId _id
        +String name
        +String email
        +String password
        +String role
        +String avatar
        +String phone
        +Boolean isActive
        +Date lastLogin
        +Date createdAt
        +Date updatedAt
        +comparePassword(candidatePassword) Boolean
        +toJSON() Object
        +isAdmin() Boolean
        +isDoctor() Boolean
        +isPatient() Boolean
    }

    class MedicalHistory {
        +ObjectId _id
        +String patientId
        +String doctorId
        +String patientName
        +Number age
        +String diagnosis
        +Array~Symptom~ symptoms
        +String description
        +Object location
        +Array~String~ images
        +String audioNotes
        +Boolean isOffline
        +String syncStatus
        +Date date
        +Date createdAt
        +Date updatedAt
        +isUrgent() Boolean
        +hasLocation() Boolean
        +isSynced() Boolean
        +markAsSynced() MedicalHistory
    }

    class Symptom {
        +String name
        +String severity
        +String duration
        +String description
    }

    class AIAnalysis {
        +ObjectId _id
        +String medicalHistoryId
        +Array~Symptom~ symptoms
        +Array~PossibleDiagnosis~ possibleDiagnoses
        +String urgency
        +Number confidence
        +Date timestamp
        +Date createdAt
        +Date updatedAt
        +findByMedicalHistory(medicalHistoryId) Array
        +findByUrgency(urgency) Array
        +findCritical() Array
    }

    class PossibleDiagnosis {
        +String condition
        +Number probability
        +Array~String~ recommendations
    }

    class Appointment {
        +ObjectId _id
        +String patientId
        +String doctorId
        +String createdBy
        +Date scheduledAt
        +Number durationMinutes
        +String status
        +String reason
        +String notes
        +Object location
        +Number reminderMinutesBefore
        +Date reminderSentAt
        +Array~String~ tags
        +String rescheduledFrom
        +String cancellationReason
        +Date createdAt
        +Date updatedAt
        +cancel(reason) void
        +markCompleted(notes) void
        +reschedule(newDate, durationMinutes) void
    }

    class Alert {
        +ObjectId _id
        +String userId
        +String patientId
        +String doctorId
        +String title
        +String message
        +String category
        +Array~String~ channels
        +String priority
        +String status
        +Object trigger
        +Object metadata
        +Array~String~ tags
        +Date scheduledAt
        +Date dispatchedAt
        +Date acknowledgedAt
        +Date expiresAt
        +Number retries
        +String lastError
        +Number priorityWeight
        +Date createdAt
        +Date updatedAt
        +markAsDispatched() void
        +markAsFailed(error) void
        +markAsAcknowledged() void
        +isDue(referenceDate) Boolean
    }

    class SymptomReport {
        +ObjectId _id
        +String patientId
        +Object location
        +Array~Symptom~ symptoms
        +String category
        +String overallSeverity
        +String suspectedDisease
        +Number temperature
        +Number oxygenSaturation
        +Boolean hasPreexistingConditions
        +Array~String~ preexistingConditions
        +Object contactInfo
        +String status
        +Boolean medicalAttentionRequired
        +Boolean medicalAttentionReceived
        +String notes
        +String reportedBy
        +String source
        +Boolean isAnonymous
        +Date createdAt
        +Date updatedAt
        +calculateSeverity() String
    }

    class ChatConversation {
        +ObjectId _id
        +String sessionId
        +String userId
        +Array~Message~ messages
        +Object userInfo
        +Object location
        +Object metadata
        +Object summary
        +String status
        +Boolean requiresFollowUp
        +String followUpNotes
        +Date startedAt
        +Date lastActivityAt
        +Date completedAt
        +Date createdAt
        +Date updatedAt
        +addMessage(role, content, metadata) void
        +complete() void
    }

    class Message {
        +String role
        +String content
        +Date timestamp
        +Object metadata
    }

    class Prescription {
        +ObjectId _id
        +String patientId
        +String doctorId
        +String createdBy
        +String diagnosis
        +String observations
        +Array~PrescriptionMedication~ medications
        +Array~DrugInteraction~ interactions
        +String status
        +String validatedBy
        +Date validatedAt
        +String validationNotes
        +Object metadata
        +Date createdAt
        +Date updatedAt
        +markCompleted(notes) void
        +cancel(reason) void
        +addValidation(doctorId, notes) void
    }

    class PrescriptionMedication {
        +String name
        +String dosage
        +String form
        +Number frequencyPerDay
        +Number durationDays
        +Date startDate
        +String instructions
        +String notes
        +Array~String~ reminderTimes
        +Object smartDosage
    }

    class AutomaticReport {
        +ObjectId _id
        +String reportType
        +Object period
        +String status
        +Object metrics
        +Array~Anomaly~ anomalies
        +String filePath
        +Date exportedAt
        +String exportFormat
        +String generatedBy
        +Date generatedAt
        +Date createdAt
        +Date updatedAt
        +findByType(type, limit) Array
        +findByDateRange(startDate, endDate) Array
        +findLatestByType(type) AutomaticReport
    }

    class WearableData {
        +ObjectId _id
        +ObjectId patientId
        +Number heartRate
        +Number oxygenSaturation
        +Number steps
        +Number distance
        +Number respiratoryRate
        +Number sleepHours
        +Date timestamp
        +String source
        +Date syncedAt
        +Date createdAt
        +Date updatedAt
    }

    class MLExperiment {
        +ObjectId _id
        +String experimentId
        +String experimentType
        +String modelName
        +String modelVersion
        +String status
        +Object metadata
        +Object inputs
        +Object outputs
        +Array~LogEntry~ logs
        +Array~ErrorEntry~ errors
        +Object performance
        +Object results
        +Date createdAt
        +Date updatedAt
        +addLog(level, message, data) void
        +addError(error, context) void
        +complete(outputs, results) void
    }

    class AuditLog {
        +ObjectId _id
        +String userId
        +String method
        +String route
        +Number statusCode
        +String ip
        +String userAgent
        +String payloadHash
        +Object redactedPayload
        +Date createdAt
    }

    class ConsentLog {
        +ObjectId _id
        +String userId
        +Array~Consent~ consents
        +String version
        +String ipAddress
        +String userAgent
        +Date timestamp
        +Date revokedAt
        +String revokedReason
        +Date createdAt
        +Date updatedAt
    }

    %% Servicios
    class AIIntegrationService {
        -AxiosInstance aiClient
        -Boolean isConnected
        +analyzeSymptoms(request) SymptomAnalysisResponse
        +analyzeSymptomsML(request) MLPredictionResponse
        +getSymptomTrends(patientId, period) Object
        +checkHealth() Boolean
    }

    class AutomaticReportService {
        -String reportsDir
        +generateReport(options) AutomaticReportDocument
        +exportReport(reportId, format) String
        +getReportStats() Object
    }

    class PrescriptionService {
        +createPrescription(payload) PrescriptionDocument
        +validatePrescriptionInput(payload) ValidateResult
        +checkDrugInteractions(medications) Array~DrugInteraction~
        +applySmartDosage(medication, context) PrescriptionMedication
    }

    class AlertService {
        +createAlert(alertData) AlertDocument
        +sendAlert(alertId) void
        +getDueAlerts(limit) Array~AlertDocument~
        +getDashboardMetrics() Object
    }

    class AppointmentService {
        +createAppointment(appointmentData) AppointmentDocument
        +checkAvailability(doctorId, start, end) Boolean
        +updateAppointment(appointmentId, updates) AppointmentDocument
        +cancelAppointment(appointmentId, reason) void
    }

    class FhirService {
        -AxiosInstance client
        -String tenantId
        +createResource(resource) FhirResource
        +getResource(resourceType, id) FhirResource
        +searchResources(resourceType, params) Array~FhirResource~
    }

    class DrugIntegrationService {
        -AxiosInstance fdaClient
        -AxiosInstance rxNormClient
        -AxiosInstance drugBankClient
        -Map cache
        +searchDrug(drugName) DrugInfo
        +checkInteractions(medications) Array~DrugInteraction~
        +getDrugInfo(drugId) DrugInfo
    }

    class ExportService {
        +exportToPDF(data, template) Buffer
        +exportToCSV(data) String
        +exportToJSON(data) String
        +exportMedicalHistory(historyId, format) Buffer
    }

    %% Relaciones
    User ||--o{ MedicalHistory : "creates/owns"
    User ||--o{ Appointment : "schedules"
    User ||--o{ Alert : "receives"
    User ||--o{ Prescription : "prescribed_to"
    User ||--o{ ChatConversation : "participates"
    User ||--o{ SymptomReport : "submits"
    User ||--o{ WearableData : "generates"
    User ||--o{ AuditLog : "generates"
    User ||--o{ ConsentLog : "consents"

    MedicalHistory ||--|| AIAnalysis : "has"
    MedicalHistory ||--o{ Symptom : "contains"
    MedicalHistory ||--o{ Appointment : "related_to"

    AIAnalysis ||--o{ PossibleDiagnosis : "contains"

    Appointment ||--o{ Prescription : "may_result_in"

    Prescription ||--o{ PrescriptionMedication : "contains"
    Prescription ||--o{ DrugInteraction : "has"

    ChatConversation ||--o{ Message : "contains"

    AutomaticReport ||--o{ MedicalHistory : "aggregates"
    AutomaticReport ||--o{ Alert : "aggregates"
    AutomaticReport ||--o{ Appointment : "aggregates"

    AIIntegrationService ..> MedicalHistory : "analyzes"
    AIIntegrationService ..> AIAnalysis : "creates"
    AutomaticReportService ..> AutomaticReport : "generates"
    PrescriptionService ..> Prescription : "manages"
    PrescriptionService ..> DrugIntegrationService : "uses"
    AlertService ..> Alert : "manages"
    AppointmentService ..> Appointment : "manages"
    ExportService ..> MedicalHistory : "exports"
```

## 2. Diagrama de Base de Datos (ERD) - Completo

```mermaid
erDiagram
    USERS ||--o{ MEDICAL_HISTORY : "doctor crea para paciente"
    USERS ||--o{ APPOINTMENTS : "paciente/doctor programa"
    USERS ||--o{ ALERTS : "usuario recibe"
    USERS ||--o{ PRESCRIPTIONS : "doctor prescribe a paciente"
    USERS ||--o{ CHAT_CONVERSATIONS : "usuario participa"
    USERS ||--o{ SYMPTOM_REPORTS : "paciente reporta (opcional)"
    USERS ||--o{ WEARABLE_DATA : "paciente genera datos"
    USERS ||--o{ AUDIT_LOGS : "usuario genera logs"
    USERS ||--o{ CONSENT_LOGS : "usuario consiente"
    USERS ||--o{ AUTOMATIC_REPORTS : "admin genera reportes"

    MEDICAL_HISTORY ||--o| AI_ANALYSES : "tiene análisis IA"
    MEDICAL_HISTORY }o--o{ APPOINTMENTS : "puede estar relacionada"
    APPOINTMENTS ||--o{ PRESCRIPTIONS : "puede resultar en prescripción"

    AUTOMATIC_REPORTS ..> MEDICAL_HISTORY : "agrega datos"
    AUTOMATIC_REPORTS ..> ALERTS : "agrega datos"
    AUTOMATIC_REPORTS ..> APPOINTMENTS : "agrega datos"
    AUTOMATIC_REPORTS ..> SYMPTOM_REPORTS : "agrega datos"

    USERS {
        ObjectId _id PK
        string name
        string email UK
        string password
        string role "patient, doctor, admin"
        string avatar
        string phone
        boolean isActive
        date lastLogin
        date createdAt
        date updatedAt
    }

    MEDICAL_HISTORY {
        ObjectId _id PK
        string patientId FK
        string doctorId FK
        string patientName
        number age
        string diagnosis
        string description
        object location "latitude, longitude, address"
        array images
        string audioNotes
        boolean isOffline
        string syncStatus "pending, synced, error"
        date date
        date createdAt
        date updatedAt
    }

    SYMPTOMS {
        ObjectId _id PK
        string name
        string severity "mild, moderate, severe"
        string duration
        string description
    }

    AI_ANALYSES {
        ObjectId _id PK
        string medicalHistoryId FK
        string urgency "low, medium, high, critical"
        number confidence
        date timestamp
        date createdAt
        date updatedAt
    }

    POSSIBLE_DIAGNOSES {
        ObjectId _id PK
        string condition
        number probability
        array recommendations
    }

    APPOINTMENTS {
        ObjectId _id PK
        string patientId FK
        string doctorId FK
        string createdBy FK
        date scheduledAt
        number durationMinutes
        string status "scheduled, completed, cancelled, rescheduled, no_show"
        string reason
        string notes
        object location "type, description, meetingLink, address"
        number reminderMinutesBefore
        date reminderSentAt
        array tags
        string rescheduledFrom
        string cancellationReason
        date createdAt
        date updatedAt
    }

    ALERTS {
        ObjectId _id PK
        string userId FK
        string patientId FK
        string doctorId FK
        string title
        string message
        string category "critical_symptom, medication_reminder, follow_up, doctor_notification, system, emergency"
        array channels "in_app, push, email, sms"
        string priority "low, medium, high, critical"
        string status "pending, scheduled, sent, delivered, failed, acknowledged, expired"
        object trigger
        object metadata
        array tags
        date scheduledAt
        date dispatchedAt
        date acknowledgedAt
        date expiresAt
        number retries
        string lastError
        number priorityWeight
        date createdAt
        date updatedAt
    }

    SYMPTOM_REPORTS {
        ObjectId _id PK
        string patientId FK
        object location "district, coordinates, address"
        array symptoms
        string category "respiratory, fever, pain, digestive, fatigue, neurological"
        string overallSeverity "low, medium, high"
        string suspectedDisease "asma, neumonia, bronquitis, covid19, gripe, epoc, resfriado, unknown"
        number temperature
        number oxygenSaturation
        boolean hasPreexistingConditions
        array preexistingConditions
        object contactInfo
        string status "pending, reviewed, urgent, resolved"
        boolean medicalAttentionRequired
        boolean medicalAttentionReceived
        string notes
        string reportedBy "patient, family, healthcare_worker, anonymous"
        string source "web, mobile, phone, hospital"
        boolean isAnonymous
        date createdAt
        date updatedAt
    }

    CHAT_CONVERSATIONS {
        ObjectId _id PK
        string sessionId UK
        string userId FK
        array messages
        object userInfo "name, email, phone, age, gender"
        object location "district, city, country"
        object metadata "userAgent, ipAddress, language, source"
        object summary "totalMessages, userMessages, botMessages, detectedDiseases, detectedSymptoms, highestUrgency, averageConfidence"
        string status "active, completed, abandoned"
        boolean requiresFollowUp
        string followUpNotes
        date startedAt
        date lastActivityAt
        date completedAt
        date createdAt
        date updatedAt
    }

    MESSAGES {
        string role "user, bot"
        string content
        date timestamp
        object metadata "urgencyLevel, confidence, detectedDiseases, detectedSymptoms, questionType"
    }

    PRESCRIPTIONS {
        ObjectId _id PK
        string patientId FK
        string doctorId FK
        string createdBy FK
        string diagnosis
        string observations
        array medications
        array interactions
        string status "draft, pending_validation, active, completed, cancelled, rejected"
        string validatedBy FK
        date validatedAt
        string validationNotes
        object metadata
        date createdAt
        date updatedAt
    }

    PRESCRIPTION_MEDICATIONS {
        string name
        string dosage
        string form
        number frequencyPerDay
        number durationDays
        date startDate
        string instructions
        string notes
        array reminderTimes
        object smartDosage "recommended, rationale"
    }

    DRUG_INTERACTIONS {
        string medicationA
        string medicationB
        string severity "minor, moderate, major, contraindicated"
        string description
        string source
    }

    AUTOMATIC_REPORTS {
        ObjectId _id PK
        string reportType "daily, weekly, monthly"
        object period "startDate, endDate"
        string status "pending, generating, completed, failed, exported"
        object metrics "totalPatients, totalDoctors, totalAdmins, totalMedicalHistories, totalAlerts, criticalAlerts, totalAppointments, completedAppointments, aiAnalyses, averageAIConfidence, topDiagnoses, symptomCategories, districtDistribution, growthMetrics"
        array anomalies
        string filePath
        date exportedAt
        string exportFormat "pdf, csv, json"
        string generatedBy FK
        date generatedAt
        date createdAt
        date updatedAt
    }

    ANOMALIES {
        string metric
        number value
        object expectedRange "min, max"
        string severity "low, medium, high, critical"
        string description
        date detectedAt
    }

    WEARABLE_DATA {
        ObjectId _id PK
        ObjectId patientId FK
        number heartRate
        number oxygenSaturation
        number steps
        number distance
        number respiratoryRate
        number sleepHours
        date timestamp
        string source "apple_health, google_fit, manual"
        date syncedAt
        date createdAt
        date updatedAt
    }

    ML_EXPERIMENTS {
        ObjectId _id PK
        string experimentId UK
        string experimentType "rl_session, fl_round, automl_pipeline, prediction, training, evaluation"
        string modelName
        string modelVersion
        string status "pending, running, completed, failed, cancelled"
        object metadata "userId, patientId, sessionId, roundNumber, clientIds"
        object inputs "state, symptoms, features, trainingData, hyperparameters"
        object outputs "prediction, action, reward, metrics, modelArtifact, aggregatedModel"
        array logs
        array errors
        object performance "startTime, endTime, durationMs, cpuUsage, memoryUsage, gpuUsage"
        object results "success, message, recommendations, nextSteps"
        date createdAt
        date updatedAt
    }

    AUDIT_LOGS {
        ObjectId _id PK
        string userId FK
        string method
        string route
        number statusCode
        string ip
        string userAgent
        string payloadHash
        object redactedPayload
        date createdAt
    }

    CONSENT_LOGS {
        ObjectId _id PK
        string userId FK
        array consents "id, accepted, timestamp"
        string version
        string ipAddress
        string userAgent
        date timestamp
        date revokedAt
        string revokedReason
        date createdAt
        date updatedAt
    }
```

## 3. Descripción de Relaciones

### Relaciones Principales:

1. **USERS → MEDICAL_HISTORY**: Un usuario (doctor) puede crear múltiples historias médicas para pacientes
2. **USERS → APPOINTMENTS**: Un usuario puede tener múltiples citas (como paciente o doctor)
3. **USERS → ALERTS**: Un usuario puede recibir múltiples alertas
4. **USERS → PRESCRIPTIONS**: Un usuario (paciente) puede tener múltiples prescripciones
5. **MEDICAL_HISTORY → AI_ANALYSES**: Cada historia médica puede tener un análisis de IA asociado
6. **APPOINTMENTS → PRESCRIPTIONS**: Una cita puede resultar en una prescripción
7. **PRESCRIPTIONS → PRESCRIPTION_MEDICATIONS**: Una prescripción contiene múltiples medicamentos
8. **PRESCRIPTIONS → DRUG_INTERACTIONS**: Una prescripción puede tener interacciones entre medicamentos
9. **CHAT_CONVERSATIONS → MESSAGES**: Una conversación contiene múltiples mensajes
10. **AUTOMATIC_REPORTS → ANOMALIES**: Un reporte automático puede contener múltiples anomalías detectadas

### Índices Clave:

- **USERS**: email (único), role, isActive, createdAt
- **MEDICAL_HISTORY**: patientId, doctorId, date, syncStatus, geoLocation (2dsphere)
- **APPOINTMENTS**: patientId, doctorId, scheduledAt, status
- **ALERTS**: userId, status, scheduledAt, priorityWeight
- **AI_ANALYSES**: medicalHistoryId, urgency, confidence, timestamp
- **CHAT_CONVERSATIONS**: sessionId (único), userId, status
- **SYMPTOM_REPORTS**: patientId, location.district, overallSeverity, status
- **PRESCRIPTIONS**: patientId, doctorId, status, createdAt
- **AUTOMATIC_REPORTS**: reportType, status, period.startDate
- **ML_EXPERIMENTS**: experimentId (único), experimentType, status, modelName

### Campos Cifrados (Encriptación en Reposo):

- **USERS**: name, avatar, phone
- **MEDICAL_HISTORY**: patientName, diagnosis, description, audioNotes, location.address
- **APPOINTMENTS**: reason, notes, location.address, location.meetingLink, cancellationReason
- **ALERTS**: title, message, lastError
- **PRESCRIPTIONS**: diagnosis, observations, validationNotes
- **AI_ANALYSES**: possibleDiagnoses[].recommendations[] (cifrado anidado)

