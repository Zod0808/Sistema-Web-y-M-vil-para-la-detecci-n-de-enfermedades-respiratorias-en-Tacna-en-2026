# 📊 Diagramas Mermaid - Sistema RespiCare

Este documento contiene los diagramas arquitectónicos principales del sistema RespiCare en formato Mermaid.

---

## 1. 🏗️ Diagrama de Arquitectura General

```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Web App<br/>React + TypeScript<br/>Puerto 3000]
        MOBILE[Mobile App<br/>React Native + Expo<br/>Nativa]
    end
    
    subgraph "API Gateway"
        NGINX[Nginx<br/>Reverse Proxy<br/>Load Balancer<br/>Puerto 80/443]
    end
    
    subgraph "Backend Services"
        BACKEND[Backend API<br/>Node.js + TypeScript<br/>Express + Clean Architecture<br/>Puerto 3001]
        AI[AI Services<br/>Python + FastAPI<br/>Machine Learning<br/>Puerto 8000]
    end
    
    subgraph "Data Layer"
        MONGODB[(MongoDB<br/>Base de Datos Principal<br/>Puerto 27017)]
        REDIS[(Redis<br/>Cache & Sessions<br/>Puerto 6379)]
        FILES[File Storage<br/>Imágenes Médicas]
    end
    
    subgraph "External Services"
        OPENAI[OpenAI API<br/>Análisis Avanzado]
        EMAIL[Email Service<br/>Notificaciones]
        SMS[SMS Service<br/>Alertas]
    end
    
    subgraph "ML Models"
        XGBOOST[XGBoost Model<br/>99.81% Accuracy]
        RF[Random Forest<br/>99.19% Accuracy]
        SHAP[SHAP Explainer<br/>Explicabilidad]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    NGINX --> BACKEND
    NGINX --> AI
    
    BACKEND --> MONGODB
    BACKEND --> REDIS
    BACKEND --> FILES
    BACKEND --> AI
    BACKEND --> EMAIL
    BACKEND --> SMS
    
    AI --> MONGODB
    AI --> REDIS
    AI --> OPENAI
    AI --> XGBOOST
    AI --> RF
    AI --> SHAP
    
    style WEB fill:#61dafb
    style MOBILE fill:#61dafb
    style NGINX fill:#009639
    style BACKEND fill:#339933
    style AI fill:#3776ab
    style MONGODB fill:#47a248
    style REDIS fill:#dc382d
    style XGBOOST fill:#ff6b6b
    style RF fill:#ff6b6b
    style SHAP fill:#ff6b6b
```

---

## 2. 🔄 Diagrama de Microservicios

```mermaid
graph LR
    subgraph "Client Layer"
        USER[👤 Usuario]
    end
    
    subgraph "Presentation Layer"
        WEB[🌐 Web Dashboard<br/>React 18 + TypeScript<br/>Vite + Tailwind CSS]
        APP[📱 Mobile App<br/>React Native + Expo<br/>Zustand State Management]
    end
    
    subgraph "API Gateway Layer"
        GATEWAY[🌐 Nginx Gateway<br/>Reverse Proxy<br/>Load Balancing<br/>SSL Termination]
    end
    
    subgraph "Microservices"
        subgraph "Backend Service"
            BACKEND[🖥️ Backend API<br/>Node.js 18+ + TypeScript<br/>Express.js + Clean Architecture<br/>JWT Authentication<br/>RBAC Authorization]
            
            subgraph "Backend Modules"
                AUTH[Authentication<br/>JWT + Refresh Tokens]
                DASHBOARD[Dashboard Service<br/>Analytics & Reports]
                SYMPTOMS[Symptom Reports<br/>CRUD Operations]
                CHAT[Chat Service<br/>Conversations]
                HISTORY[Medical History<br/>Management]
            end
        end
        
        subgraph "AI Service"
            AI[🤖 AI Services<br/>Python 3.11+ + FastAPI<br/>ML Models<br/>SHAP Explainer]
            
            subgraph "AI Modules"
                ANALYZER[Symptom Analyzer<br/>NLP Processing]
                ML_PRED[ML Predictor<br/>XGBoost + RF]
                CHATBOT[Chatbot Service<br/>Medical Assistant]
                EXPLAINER[SHAP Explainer<br/>Prediction Transparency]
            end
        end
    end
    
    subgraph "Data Layer"
        subgraph "Databases"
            MONGODB[(💾 MongoDB<br/>Primary Database<br/>Medical Data)]
            REDIS[(⚡ Redis<br/>Cache Layer<br/>Session Storage)]
        end
        
        subgraph "Storage"
            FS[📁 File Storage<br/>Medical Images<br/>Audio Notes]
        end
    end
    
    subgraph "Communication"
        HTTP[HTTP/REST<br/>JSON]
        WS[WebSocket<br/>Real-time]
    end
    
    USER --> WEB
    USER --> APP
    WEB --> GATEWAY
    APP --> GATEWAY
    GATEWAY --> BACKEND
    GATEWAY --> AI
    
    BACKEND --> AUTH
    BACKEND --> DASHBOARD
    BACKEND --> SYMPTOMS
    BACKEND --> CHAT
    BACKEND --> HISTORY
    
    AUTH --> MONGODB
    DASHBOARD --> MONGODB
    SYMPTOMS --> MONGODB
    CHAT --> MONGODB
    HISTORY --> MONGODB
    
    BACKEND --> REDIS
    BACKEND --> FS
    BACKEND --> AI
    
    AI --> ANALYZER
    AI --> ML_PRED
    AI --> CHATBOT
    AI --> EXPLAINER
    
    ANALYZER --> MONGODB
    ML_PRED --> REDIS
    CHATBOT --> MONGODB
    EXPLAINER --> REDIS
    
    BACKEND -.HTTP.-> AI
    AI -.HTTP.-> BACKEND
    WEB -.WS.-> BACKEND
    
    style WEB fill:#61dafb
    style APP fill:#61dafb
    style GATEWAY fill:#009639
    style BACKEND fill:#339933
    style AI fill:#3776ab
    style MONGODB fill:#47a248
    style REDIS fill:#dc382d
```

---

## 3. 🔄 Diagrama de Flujo de Datos - Análisis de Síntomas

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant W as 🌐 Web/Mobile App
    participant N as 🌐 Nginx Gateway
    participant B as 🖥️ Backend API
    participant A as 🤖 AI Services
    participant M as 🧠 ML Models
    participant DB as 💾 MongoDB
    participant R as ⚡ Redis
    participant O as 🔌 OpenAI API

    U->>W: 1. Ingresa síntomas<br/>(texto libre o selección)
    W->>W: 2. Valida datos de entrada
    
    W->>N: 3. POST /api/symptom-reports<br/>{symptoms, patientId, context}
    N->>N: 4. Autenticación JWT<br/>Rate Limiting
    
    N->>B: 5. Proxy Request<br/>HTTP/REST
    B->>B: 6. Validar JWT Token<br/>RBAC Authorization
    
    B->>DB: 7. Guardar reporte inicial<br/>Estado: "pending"
    DB-->>B: 8. Confirmación guardado
    
    B->>A: 9. POST /api/v1/symptom-analyzer/analyze<br/>{symptoms, patientId, context}
    
    alt Cache disponible
        A->>R: 10. Verificar cache<br/>key: hash(symptoms)
        R-->>A: 11. Resultado cacheado (si existe)
    else Sin cache
        A->>A: 12. Procesar síntomas<br/>NLP + Feature Engineering
        
        alt Estrategia OpenAI
            A->>O: 13. Llamada OpenAI API<br/>Análisis avanzado
            O-->>A: 14. Análisis + Recomendaciones
        end
        
        A->>M: 15. Clasificación ML<br/>XGBoost (99.81% accuracy)
        M->>M: 16. Feature Engineering<br/>(515 features)
        M-->>A: 17. Predicción + Confianza
        
        A->>M: 18. SHAP Explanation<br/>Factores de decisión
        M-->>A: 19. Top 3 predicciones<br/>Contribución síntomas
        
        A->>R: 20. Guardar en cache<br/>TTL: 1 hora
        A->>DB: 21. Guardar análisis completo
    end
    
    A-->>B: 22. Respuesta análisis<br/>{prediction, confidence,<br/>explanations, recommendations}
    
    B->>DB: 23. Actualizar reporte<br/>Estado: "completed"<br/>+ análisis ML
    
    B->>DB: 24. Guardar en Medical History<br/>(si usuario acepta)
    
    B-->>N: 25. HTTP 200 OK<br/>+ Resultados completos
    N-->>W: 26. Proxy Response
    
    W->>W: 27. Procesar respuesta<br/>Mostrar predicción + explicaciones
    
    W->>U: 28. Mostrar resultados<br/>- Diagnóstico principal<br/>- Top 3 alternativas<br/>- Factores de decisión (SHAP)<br/>- Recomendaciones médicas<br/>- Nivel de urgencia
    
    Note over U,DB: Flujo completo: ~500ms promedio<br/>Cache hit: ~50ms<br/>Cache miss: ~800ms
```

---

## 4. 💾 Diagrama de Base de Datos - MongoDB

```mermaid
erDiagram
    USERS ||--o{ MEDICAL_HISTORY : "creates/owns"
    USERS ||--o{ SYMPTOM_REPORTS : "submits"
    USERS ||--o{ CHAT_CONVERSATIONS : "participates"
    USERS ||--o{ AI_ANALYSES : "receives"
    SYMPTOM_REPORTS ||--|| AI_ANALYSES : "has"
    MEDICAL_HISTORY ||--o{ SYMPTOM_ITEMS : "contains"
    CHAT_CONVERSATIONS ||--o{ CHAT_MESSAGES : "contains"
    
    USERS {
        ObjectId _id PK
        string name
        string email UK
        string password
        string role "ADMIN, DOCTOR, PATIENT"
        string avatar
        boolean isActive
        date lastLogin
        date createdAt
        date updatedAt
    }
    
    MEDICAL_HISTORY {
        ObjectId _id PK
        ObjectId patientId FK
        ObjectId doctorId FK
        string patientName
        number age
        string diagnosis
        array symptoms
        string description
        object location "lat, lng, address"
        array images
        string audioNotes
        boolean isOffline
        string syncStatus "PENDING, SYNCED, ERROR"
        date date
        date createdAt
        date updatedAt
    }
    
    SYMPTOM_REPORTS {
        ObjectId _id PK
        ObjectId patientId FK
        array symptoms "name, severity, duration"
        string context
        object metadata
        string status "pending, completed, failed"
        ObjectId analysisId FK
        date createdAt
        date updatedAt
    }
    
    AI_ANALYSES {
        ObjectId _id PK
        ObjectId reportId FK
        ObjectId patientId FK
        string predictedDisease
        number confidenceScore
        array top3Predictions
        object shapExplanation
        array contributingFactors
        string urgencyLevel "low, medium, high, critical"
        number severityScore
        array recommendations
        array warningSigns
        boolean followUpRequired
        number processingTimeMs
        date analyzedAt
        date createdAt
    }
    
    CHAT_CONVERSATIONS {
        ObjectId _id PK
        ObjectId userId FK
        string title
        string status "active, completed, archived"
        date lastMessageAt
        date createdAt
        date updatedAt
    }
    
    CHAT_MESSAGES {
        ObjectId _id PK
        ObjectId conversationId FK
        string role "user, assistant, system"
        string content
        object metadata
        ObjectId analysisId FK
        date createdAt
    }
    
    SYMPTOM_ITEMS {
        ObjectId _id PK
        string name
        string severity "mild, moderate, severe"
        string duration
        string description
    }
    
    ANALYTICS {
        ObjectId _id PK
        string type "daily, weekly, monthly"
        date date
        number totalReports
        number byDisease
        number bySeverity
        object geographical
        object trends
        date createdAt
    }
```

---

## 5. 📊 Diagrama de Arquitectura en Capas (Clean Architecture)

```mermaid
graph TB
    subgraph "Frontend Layers"
        subgraph "Presentation"
            UI[UI Components<br/>React / React Native]
            STATE[State Management<br/>Zustand / Context]
        end
    end
    
    subgraph "Backend - Clean Architecture"
        subgraph "Interface Adapters Layer"
            CONTROLLERS[Controllers<br/>HTTP Handlers]
            DTOS[DTOs<br/>Request/Response]
            MIDDLEWARE[Middleware<br/>Auth, Validation, Error]
        end
        
        subgraph "Application Layer"
            SERVICES[Services<br/>Business Logic]
            USECASES[Use Cases<br/>Orchestration]
        end
        
        subgraph "Domain Layer (PIM)"
            ENTITIES[Entities<br/>Business Objects]
            VALUES[Value Objects<br/>Domain Values]
            REPOS[Repository Interfaces<br/>Contracts]
        end
        
        subgraph "Infrastructure Layer (PSM)"
            REPOS_IMPL[Repository Implementations<br/>MongoDB]
            EXTERNAL[External Services<br/>AI, Email, SMS]
        end
    end
    
    subgraph "AI Services - Clean Architecture"
        subgraph "API Layer"
            FASTAPI[FastAPI Routes<br/>Endpoints]
        end
        
        subgraph "Service Layer"
            AI_SERVICES[AI Services<br/>Analysis Orchestration]
            FACTORIES[Factories<br/>Service Creation]
        end
        
        subgraph "Strategy Layer"
            STRATEGIES[Strategies<br/>OpenAI, Local, Rule-based]
        end
        
        subgraph "ML Layer"
            MODELS[ML Models<br/>XGBoost, Random Forest]
            SHAP_EXP[SHAP Explainer<br/>Interpretability]
        end
        
        subgraph "Infrastructure"
            CB[Circuit Breaker<br/>Fault Tolerance]
            CACHE[Cache Layer<br/>Redis]
            DB_AI[Database Access<br/>MongoDB]
        end
    end
    
    subgraph "Data Layer"
        MONGODB[(MongoDB<br/>Collections)]
        REDIS[(Redis<br/>Cache & Sessions)]
    end
    
    UI --> STATE
    STATE --> CONTROLLERS
    CONTROLLERS --> MIDDLEWARE
    MIDDLEWARE --> DTOS
    DTOS --> SERVICES
    SERVICES --> USECASES
    USECASES --> ENTITIES
    USECASES --> VALUES
    USECASES --> REPOS
    REPOS -.implemented by.-> REPOS_IMPL
    REPOS_IMPL --> MONGODB
    SERVICES --> EXTERNAL
    EXTERNAL --> FASTAPI
    
    FASTAPI --> AI_SERVICES
    AI_SERVICES --> FACTORIES
    FACTORIES --> STRATEGIES
    STRATEGIES --> MODELS
    MODELS --> SHAP_EXP
    STRATEGIES --> CB
    AI_SERVICES --> CACHE
    CACHE --> REDIS
    AI_SERVICES --> DB_AI
    DB_AI --> MONGODB
    
    style ENTITIES fill:#e1f5fe
    style VALUES fill:#e1f5fe
    style REPOS fill:#e1f5fe
    style CONTROLLERS fill:#fff3e0
    style DTOS fill:#fff3e0
    style SERVICES fill:#c8e6c9
    style USECASES fill:#c8e6c9
    style REPOS_IMPL fill:#f3e5f5
    style MODELS fill:#ffebee
    style SHAP_EXP fill:#ffebee
```

---

## 6. 🎯 Diagrama de Flujo - Chatbot Médico con ML

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant C as 💬 Chatbot UI
    participant B as 🖥️ Backend API
    participant CB as 🤖 Chatbot Service
    participant ML as 🧠 ML Predictor
    participant SHAP as 📊 SHAP Explainer
    participant DB as 💾 MongoDB

    U->>C: 1. Escribe: "Tengo tos y fiebre"
    C->>B: 2. XMLHttpRequest POST /api/chat
    
    B->>CB: 3. Procesar mensaje<br/>NLP + Intención
    CB->>CB: 4. Detectar síntomas<br/>Extracción de entidades
    
    CB->>ML: 5. Clasificar enfermedad<br/>XGBoost Model
    ML->>ML: 6. Feature Engineering<br/>(515 features)
    ML-->>CB: 7. Predicción:<br/>Gripe (85% confianza)
    
    CB->>SHAP: 8. Explicar predicción<br/>Factores de decisión
    SHAP-->>CB: 9. Contribuciones:<br/>- Tos: +35%<br/>- Fiebre: +28%<br/>- Duración: +15%
    
    CB->>CB: 10. Generar respuesta<br/>+ Explicaciones + Alternativas
    
    CB->>DB: 11. Guardar conversación<br/>+ Análisis ML
    
    CB-->>B: 12. Respuesta completa:<br/>{message, prediction, articulation,<br/>top3Alternatives, factors}
    
    B-->>C: 13. JSON Response
    C->>C: 14. Renderizar mensaje<br/>+ Predicción destacada<br/>+ Factores SHAP<br/>+ Top 3 alternativas
    
    C->>U: 15. Mostrar:<br/>"Basado en tus síntomas,<br/>predicción: Gripe (85%)"<br/>+ Factores de decisión<br/>+ "También podría ser:<br/>- Resfriado común (10%)<br/>- Bronquitis (5%)"
    
    alt Usuario pregunta detalles
        U->>C: 16. "¿Por qué gripe?"
        C->>B: 17. POST /api/chat/explain
        B->>SHAP: 18. Explicación detallada
        SHAP-->>B: 19. Explicación completa
        B-->>C: 20. Respuesta explicativa
        C->>U: 21. Mostrar explicación detallada
    end
```

---

## 7. 🔐 Diagrama de Flujo - Autenticación y Autorización

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant W as 🌐 Web App
    participant B as 🖥️ Backend API
    participant AUTH as 🔐 Auth Service
    participant DB as 💾 MongoDB
    participant R as ⚡ Redis

    U->>W: 1. Login (email, password)
    W->>B: 2. POST /api/auth/login
    
    B->>AUTH: 3. Validar credenciales
    AUTH->>DB: 4. Buscar usuario<br/>Por email
    DB-->>AUTH: 5. Usuario encontrado
    
    AUTH->>AUTH: 6. Verificar password<br/>bcrypt.compare()
    
    alt Credenciales válidas
        AUTH->>AUTH: 7. Generar JWT Access Token<br/>Exp: 15 min
        AUTH->>AUTH: 8. Generar Refresh Token<br/>Exp: 7 días
        AUTH->>R: 9. Guardar refresh token<br/>Key: refresh:userId
        AUTH->>DB: 10. Actualizar lastLogin
        
        AUTH-->>B: 11. {accessToken, refreshToken, user}
        B-->>W: 12. HTTP 200 + Tokens
        W->>W: 13. Guardar tokens<br/>localStorage / SecureStore
        W->>U: 14. Redirigir a Dashboard
    else Credenciales inválidas
        AUTH-->>B: 15. Error 401
        B-->>W: 16. HTTP 401 Unauthorized
        W->>U: 17. Mostrar error
    end
    
    Note over U,R: Tokens se usan en cada request:<br/>Authorization: Bearer <accessToken>
    
    U->>W: 18. Request protegido
    W->>B: 19. GET /api/dashboard<br/>Header: Authorization Bearer <token>
    B->>AUTH: 20. Verificar JWT<br/>jwt.verify()
        
    alt Token válido
        AUTH-->>B: 21. Decoded payload<br/>{userId, role, email}
        B->>B: 22. RBAC Check<br/>Verificar permisos
        B->>DB: 23. Obtener datos dashboard
        DB-->>B: 24. Datos
        B-->>W: 25. HTTP 200 + Data
        W->>U: 26. Mostrar dashboard
    else Token expirado
        AUTH-->>B: 27. Token expired
        B->>W: 28. HTTP 401
        W->>B: 29. POST /api/auth/refresh<br/>refreshToken
        B->>R: 30. Verificar refresh token
        R-->>B: 31. Token válido
        B->>AUTH: 32. Generar nuevo access token
        AUTH-->>B: 33. Nuevo access token
        B-->>W: 34. HTTP 200 + Nuevo token
        W->>W: 35. Actualizar token
        W->>B: 36. Reintentar request original
    end
```

---

## 📝 Notas sobre los Diagramas

### Diagrama de Arquitectura
- Muestra la arquitectura general del sistema con todas las capas
- Incluye servicios externos y modelos ML
- Colores diferenciados por tipo de componente

### Diagrama de Microservicios
- Detalla los dos microservicios principales (Backend y AI)
- Muestra módulos internos de cada servicio
- Incluye tipos de comunicación (HTTP, WebSocket)

### Diagrama de Flujo de Datos
- Secuencia completa desde ingreso de síntomas hasta resultado
- Incluye cache y optimizaciones
- Muestra tiempos estimados de procesamiento

### Diagrama de Base de Datos
- Modelo entidad-relación completo
- Todas las colecciones principales de MongoDB
- Relaciones entre entidades

### Diagrama de Arquitectura en Capas
- Mapeo de Clean Architecture
- Separación PIM/PSM (Platform Independent/Specific Models)
- Flujo de dependencias correcto

### Diagrama de Chatbot con ML
- Flujo específico del chatbot médico
- Integración con ML y SHAP
- Respuestas con explicaciones

### Diagrama de Autenticación
- Flujo completo de login y autorización
- Manejo de tokens JWT y refresh tokens
- RBAC (Role-Based Access Control)

---

## 🛠️ Cómo Usar estos Diagramas

1. **En Documentación Markdown**: Estos diagramas funcionan en GitHub, GitLab, y cualquier renderizador de Mermaid
2. **En Presentaciones**: Puedes copiarlos a herramientas como:
   - Mermaid Live Editor: https://mermaid.live/
   - Draw.io (con plugin Mermaid)
   - PowerPoint/Google Slides (exportar como imagen)
3. **En LaTeX**: Usar el paquete `mermaid` para Beamer

---

## 📚 Referencias

- **Mermaid Documentation**: https://mermaid.js.org/
- **PlantUML Alternatives**: Estos diagramas reemplazan los diagramas PlantUML anteriores
- **Arquitectura del Proyecto**: Ver `readme.md` y `backend/CLEAN_ARCHITECTURE.md`

