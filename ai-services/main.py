"""
RespiCare AI Services
Medical analysis and prediction service
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import structlog
import re
from datetime import datetime
import time
import os
import json
import asyncio
from collections import defaultdict

# Core services
from core.cache import init_cache, close_cache, get_cache_client
from data.medical_data import MedicalDataProcessor
from utils.sentry_integration import init_sentry

# Initialize Sentry (non-blocking)
init_sentry()

# Configure logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Create FastAPI app
app = FastAPI(
    title="RespiCare AI Services",
    description="AI-powered medical analysis for respiratory diseases",
    version="1.0.0"
)

# Import and register the new conversational chat analyzer routes
try:
    from api.routes.chat_analyzer import router as chat_analyzer_router
    app.include_router(chat_analyzer_router, prefix="/api", tags=["Chat Analysis"])
    logger.info("chat_analyzer_routes_registered")
except ImportError as e:
    logger.warning("chat_analyzer_routes_not_available", error=str(e))

# Import and register audio analyzer routes
try:
    from api.routes.audio_analyzer import router as audio_analyzer_router
    app.include_router(audio_analyzer_router, prefix="/api", tags=["Audio Analysis"])
    logger.info("audio_analyzer_routes_registered")
except ImportError as e:
    logger.warning("audio_analyzer_routes_not_available", error=str(e))

# Import and register ML symptom analyzer routes
try:
    from api.routes.symptom_ml_analyzer import router as symptom_ml_router
    app.include_router(symptom_ml_router, prefix="/api", tags=["ML Analysis"])
    logger.info("symptom_ml_routes_registered")
except ImportError as e:
    logger.warning("symptom_ml_routes_not_available", error=str(e))

# Import and register ML monitoring routes
try:
    from api.routes.ml_monitoring import router as ml_monitoring_router
    app.include_router(ml_monitoring_router, prefix="/api", tags=["ML Monitoring"])
    logger.info("ml_monitoring_routes_registered")
except ImportError as e:
    logger.warning("ml_monitoring_routes_not_available", error=str(e))

# Import and register model cache routes
try:
    from api.routes.model_cache import router as model_cache_router
    app.include_router(model_cache_router, tags=["Model Cache"])
    logger.info("model_cache_routes_registered")
except ImportError as e:
    logger.warning("model_cache_routes_not_available", error=str(e))

# Import and register Advanced ML routes
try:
    from api.routes.advanced_ml import router as advanced_ml_router
    app.include_router(advanced_ml_router, prefix="/api", tags=["Advanced ML"])
    logger.info("advanced_ml_routes_registered")
except ImportError as e:
    logger.warning("advanced_ml_routes_not_available", error=str(e))

# Import and register Advanced NLP routes
try:
    from api.routes.advanced_nlp import router as advanced_nlp_router
    app.include_router(advanced_nlp_router, prefix="/api", tags=["Advanced NLP"])
    logger.info("advanced_nlp_routes_registered")
except ImportError as e:
    logger.warning("advanced_nlp_routes_not_available", error=str(e))

# Import and register AutoML routes
try:
    from api.routes.automl import router as automl_router
    app.include_router(automl_router, prefix="/api", tags=["AutoML"])
    logger.info("automl_routes_registered")
except ImportError as e:
    logger.warning("automl_routes_not_available", error=str(e))

# Import and register Reinforcement Learning routes
try:
    from api.routes.advanced_rl import router as rl_router
    app.include_router(rl_router, prefix="/api", tags=["Reinforcement Learning"])
    logger.info("rl_routes_registered")
except ImportError as e:
    logger.warning("rl_routes_not_available", error=str(e))

# Import and register Federated Learning routes
try:
    from api.routes.federated import router as fl_router
    app.include_router(fl_router, prefix="/api", tags=["Federated Learning"])
    logger.info("federated_routes_registered")
except ImportError as e:
    logger.warning("federated_routes_not_available", error=str(e))

# Import and register Advanced NLP routes
try:
    from api.routes.advanced_nlp import router as advanced_nlp_router
    app.include_router(advanced_nlp_router, prefix="/api", tags=["Advanced NLP"])
    logger.info("advanced_nlp_routes_registered")
except ImportError as e:
    logger.warning("advanced_nlp_routes_not_available", error=str(e))

# Import and register ML retraining routes
try:
    from api.routes.model_retraining import router as retraining_router
    app.include_router(retraining_router, prefix="/api", tags=["ML Retraining"])
    logger.info("ml_retraining_routes_registered")
except ImportError as e:
    logger.warning("ml_retraining_routes_not_available", error=str(e))

# Register core domains support routes
try:
    from api.routes.core_domains_support import router as core_domains_router
    app.include_router(core_domains_router, tags=["Core Domains Support"])
    logger.info("core_domains_support_routes_registered")
except ImportError as e:
    logger.warning("core_domains_support_routes_not_available", error=str(e))

# Configure CORS — use CORS_ORIGINS env var in production (comma-separated)
# Example: CORS_ORIGINS=https://app.respicare.tacna,https://respicare.tacna
_cors_origins_raw = os.getenv("CORS_ORIGINS", "")
_cors_origins: list[str] = (
    [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
    if _cors_origins_raw
    else ["*"]  # dev/unset → allow all
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Security headers middleware (CSP, HSTS, X-Frame-Options, etc.)
@app.middleware("http")
async def security_headers_middleware(request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    # CSP minimal; ajustar listas en producción
    # Swagger UI (/docs) requiere recursos de cdn.jsdelivr.net
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
        "img-src 'self' data:; "
        "frame-ancestors 'none'; "
        "base-uri 'self'"
    )
    return response

# Simple rate limiting (token bucket por IP) - configurable por env
# Deshabilitado automáticamente en modo testing
_rate_buckets = defaultdict(lambda: {"tokens": 0, "last_refill": time.time()})
_rate_capacity = int(os.getenv("AI_RATE_LIMIT_CAPACITY", "100"))  # tokens
_rate_refill_per_sec = float(os.getenv("AI_RATE_LIMIT_REFILL_PER_SEC", "1.0"))  # tokens/s
# Deshabilitar rate limiting si TESTING=true o AI_RATE_LIMIT_ENABLED=0
_rate_enabled = (
    os.getenv("TESTING", "").lower() != "true" and 
    os.getenv("AI_RATE_LIMIT_ENABLED", "1") == "1"
)

def _allow_request(ip: str) -> bool:
    bucket = _rate_buckets[ip]
    now = time.time()
    # refill
    elapsed = now - bucket["last_refill"]
    bucket["last_refill"] = now
    bucket["tokens"] = min(_rate_capacity, bucket["tokens"] + elapsed * _rate_refill_per_sec)
    if bucket["tokens"] >= 1.0:
        bucket["tokens"] -= 1.0
        return True
    return False

@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    if not _rate_enabled:
        return await call_next(request)
    client_ip = request.client.host if request.client else "unknown"
    if not _allow_request(client_ip):
        logger.warning("rate_limited", ip=client_ip, path=str(request.url.path))
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            content={"status": "error", "message": "Too Many Requests"},
        )
    return await call_next(request)

# Request size guard (Content-Length) - 2MB por defecto
_max_body_bytes = int(os.getenv("AI_MAX_BODY_BYTES", str(2 * 1024 * 1024)))
@app.middleware("http")
async def body_size_limit_middleware(request, call_next):
    cl = request.headers.get("content-length")
    try:
        if cl is not None and int(cl) > _max_body_bytes:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=413,
                content={"status": "error", "message": "Payload Too Large"},
            )
    except Exception:
        pass
    return await call_next(request)

# Performance logging middleware (profiling p95/p99 offline)
@app.middleware("http")
async def performance_logging_middleware(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 3)
    try:
        os.makedirs("monitoring/performance", exist_ok=True)
        log_path = os.path.join("monitoring", "performance", f"perf_{datetime.utcnow().strftime('%Y%m%d')}.jsonl")
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms
        }
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception as err:
        logger.warning("perf_log_write_failed", error=str(err))
    return response

# Pydantic models
class AnalysisRequest(BaseModel):
    query: str
    context: Optional[str] = "respiratory_diseases"
    patient_id: Optional[str] = None
    include_recommendations: Optional[bool] = True

class AnalysisResponse(BaseModel):
    status: str
    message: str
    analysis: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None
    urgency_level: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: str

# Initialize medical processor
medical_processor = MedicalDataProcessor()

# Knowledge base for respiratory diseases
RESPIRATORY_KNOWLEDGE_BASE = {
    "asma": {
        "description": "El asma es una enfermedad crónica que afecta las vías respiratorias de los pulmones. Las vías respiratorias se inflaman y se estrechan, lo que dificulta la respiración.",
        "symptoms": ["dificultad para respirar", "sibilancias", "opresión en el pecho", "tos", "falta de aire"],
        "triggers": ["alérgenos", "ejercicio", "aire frío", "infecciones respiratorias", "contaminación"],
        "treatment": [
            "Usar inhalador de rescate según necesidad",
            "Mantener inhalador de control diario si está prescrito",
            "Evitar desencadenantes conocidos",
            "Tener plan de acción para el asma",
            "Consultar médico regularmente"
        ],
        "urgency": "medium",
        "prevention": [
            "Identificar y evitar desencadenantes",
            "Mantener ambiente libre de polvo y alérgenos",
            "Vacunación contra gripe e influenza",
            "No fumar ni exposición al humo"
        ]
    },
    "neumonia": {
        "description": "La neumonía es una infección pulmonar que puede ser causada por bacterias, virus u hongos. Los alvéolos pulmonares se llenan de líquido o pus.",
        "symptoms": ["fiebre alta", "tos con flema", "dolor en el pecho", "dificultad respiratoria", "escalofríos", "sudoración"],
        "causes": ["bacterias", "virus", "hongos", "aspiración"],
        "treatment": [
            "Antibióticos si es bacteriana (prescrito por médico)",
            "Reposo absoluto",
            "Hidratación abundante",
            "Antipiréticos para fiebre (bajo supervisión médica)",
            "Monitoreo de saturación de oxígeno"
        ],
        "urgency": "high",
        "warning_signs": [
            "Dificultad severa para respirar",
            "Labios o uñas azulados",
            "Confusión o desorientación",
            "Fiebre persistente mayor a 39°C",
            "Dolor torácico intenso"
        ]
    },
    "bronquitis": {
        "description": "La bronquitis es la inflamación de los bronquios (vías aéreas grandes en los pulmones). Puede ser aguda (temporal) o crónica (de larga duración).",
        "symptoms": ["tos persistente", "producción de mucosidad", "fatiga", "dificultad respiratoria leve", "molestia en el pecho"],
        "types": {
            "aguda": "Dura 1-3 semanas, generalmente causada por virus",
            "crónica": "Dura meses o años, común en fumadores"
        },
        "treatment": [
            "Descanso adecuado",
            "Líquidos abundantes",
            "Humidificador para facilitar respiración",
            "Evitar irritantes (humo, polvo)",
            "Medicamentos según prescripción médica"
        ],
        "urgency": "low",
        "prevention": [
            "No fumar",
            "Evitar exposición a irritantes",
            "Lavado de manos frecuente",
            "Vacunación contra gripe"
        ]
    },
    "covid19": {
        "description": "COVID-19 es una enfermedad respiratoria causada por el coronavirus SARS-CoV-2. Puede variar de leve a severa.",
        "symptoms": ["fiebre", "tos seca", "fatiga", "pérdida de olfato o gusto", "dolor de garganta", "dificultad respiratoria"],
        "transmission": "Por gotas respiratorias, contacto cercano, superficies contaminadas",
        "treatment": [
            "Aislamiento inmediato",
            "Monitoreo de saturación de oxígeno",
            "Reposo y líquidos",
            "Seguir protocolo médico local",
            "Contactar servicios de salud si empeora"
        ],
        "urgency": "medium",
        "warning_signs": [
            "Dificultad para respirar",
            "Dolor o presión persistente en el pecho",
            "Confusión o incapacidad para mantenerse despierto",
            "Labios o cara azulados",
            "Saturación de oxígeno menor a 95%"
        ]
    },
    "gripe": {
        "description": "La gripe (influenza) es una infección viral respiratoria altamente contagiosa que afecta nariz, garganta y pulmones.",
        "symptoms": ["fiebre súbita", "dolores musculares", "dolor de cabeza", "fatiga extrema", "tos seca", "dolor de garganta"],
        "transmission": "Por gotas respiratorias al toser, estornudar o hablar",
        "treatment": [
            "Reposo completo",
            "Hidratación abundante",
            "Antivirales si se prescriben (primeras 48h)",
            "Antipiréticos para fiebre",
            "Aislamiento para evitar contagio"
        ],
        "urgency": "low",
        "prevention": [
            "Vacunación anual contra la gripe",
            "Lavado de manos frecuente",
            "Evitar contacto con personas enfermas",
            "Cubrir boca al toser o estornudar"
        ]
    },
    "epoc": {
        "description": "La Enfermedad Pulmonar Obstructiva Crónica (EPOC) es un grupo de enfermedades pulmonares que bloquean el flujo de aire y dificultan la respiración.",
        "symptoms": ["falta de aire", "sibilancias", "opresión en el pecho", "tos crónica con mucosidad", "fatiga"],
        "causes": ["tabaquismo (principal)", "contaminación del aire", "exposición ocupacional", "deficiencia de alfa-1 antitripsina"],
        "treatment": [
            "Dejar de fumar (más importante)",
            "Broncodilatadores inhalados",
            "Corticosteroides si están indicados",
            "Oxigenoterapia si es necesaria",
            "Rehabilitación pulmonar"
        ],
        "urgency": "medium",
        "management": [
            "Evitar exposición a irritantes",
            "Ejercicio regular adaptado",
            "Vacunación contra gripe y neumonía",
            "Seguimiento médico regular"
        ]
    },
    "resfriado": {
        "description": "El resfriado común es una infección viral leve de nariz y garganta. Es la enfermedad más común.",
        "symptoms": ["congestión nasal", "estornudos", "dolor de garganta", "tos leve", "malestar general"],
        "duration": "7-10 días generalmente",
        "treatment": [
            "Reposo adecuado",
            "Líquidos calientes abundantes",
            "Gárgaras de agua salada",
            "Descongestionantes si es necesario",
            "No requiere antibióticos (es viral)"
        ],
        "urgency": "very_low",
        "prevention": [
            "Lavado de manos frecuente",
            "Evitar tocarse la cara",
            "Evitar contacto cercano con personas resfriadas",
            "Mantener sistema inmune saludable"
        ]
    }
}

def analyze_query(query: str) -> Dict[str, Any]:
    """Analyze user query and extract relevant medical information"""
    query_lower = query.lower()
    
    # Disease aliases for better detection
    disease_aliases = {
        "asma": ["asma", "asmático", "asmatico"],
        "neumonia": ["neumonia", "neumonía", "pulmonía", "pulmonia"],
        "bronquitis": ["bronquitis", "bronquios inflamados"],
        "covid19": ["covid", "covid-19", "covid19", "coronavirus", "sars-cov-2"],
        "gripe": ["gripe", "influenza", "flu"],
        "epoc": ["epoc", "enfermedad pulmonar obstructiva"],
        "resfriado": ["resfriado", "resfrio", "catarro", "constipado"]
    }
    
    # Detect disease mentions
    detected_diseases = []
    for disease, aliases in disease_aliases.items():
        if any(alias in query_lower for alias in aliases):
            detected_diseases.append(disease)
    
    # Detect symptoms
    detected_symptoms = []
    for category, symptoms in medical_processor.symptom_categories.items():
        for symptom in symptoms:
            if symptom in query_lower:
                detected_symptoms.append({
                    "symptom": symptom,
                    "category": category,
                    "confidence": 0.8
                })
    
    # Detect question type
    question_type = "general"
    if any(word in query_lower for word in ["qué es", "que es", "define", "definir", "explicar", "explica"]):
        question_type = "definition"
    elif any(word in query_lower for word in ["síntomas", "sintomas", "señales", "signos"]):
        question_type = "symptoms"
    elif any(word in query_lower for word in ["tratamiento", "tratar", "curar", "medicina", "medicamento"]):
        question_type = "treatment"
    elif any(word in query_lower for word in ["prevenir", "prevención", "prevencion", "evitar"]):
        question_type = "prevention"
    elif any(word in query_lower for word in ["qué hacer", "que hacer", "debo", "tengo que"]):
        question_type = "action"
    
    return {
        "detected_diseases": detected_diseases,
        "detected_symptoms": detected_symptoms,
        "question_type": question_type,
        "query_lower": query_lower
    }

def generate_response(analysis: Dict[str, Any], query: str) -> Dict[str, Any]:
    """Generate appropriate response based on query analysis"""
    detected_diseases = analysis["detected_diseases"]
    detected_symptoms = analysis["detected_symptoms"]
    question_type = analysis["question_type"]
    
    response = {
        "message": "",
        "recommendations": [],
        "urgency_level": "low",
        "confidence": 0.0,
        "detailed_info": {}
    }
    
    # If specific disease is detected
    if detected_diseases:
        primary_disease = detected_diseases[0]
        disease_info = RESPIRATORY_KNOWLEDGE_BASE[primary_disease]
        
        response["urgency_level"] = disease_info.get("urgency", "low")
        response["confidence"] = 0.85
        response["detailed_info"]["disease"] = primary_disease
        
        # Build message based on question type
        if question_type == "definition":
            response["message"] = f"🫁 **{primary_disease.upper()}**\n\n{disease_info['description']}"
            
        elif question_type == "symptoms":
            symptoms_text = "\n".join([f"• {s}" for s in disease_info.get("symptoms", [])])
            response["message"] = f"🤒 **Síntomas de {primary_disease}:**\n\n{symptoms_text}"
            
        elif question_type == "treatment":
            treatment_text = "\n".join([f"• {t}" for t in disease_info.get("treatment", [])])
            response["message"] = f"💊 **Tratamiento para {primary_disease}:**\n\n{treatment_text}"
            response["recommendations"] = disease_info.get("treatment", [])
            
        elif question_type == "prevention":
            prevention_text = "\n".join([f"• {p}" for p in disease_info.get("prevention", [])])
            response["message"] = f"🛡️ **Prevención de {primary_disease}:**\n\n{prevention_text}"
            response["recommendations"] = disease_info.get("prevention", [])
            
        else:
            # General information
            response["message"] = f"🫁 **{primary_disease.upper()}**\n\n{disease_info['description']}\n\n"
            
            if "symptoms" in disease_info:
                symptoms_text = ", ".join(disease_info["symptoms"][:5])
                response["message"] += f"**Síntomas comunes:** {symptoms_text}\n\n"
            
            if "treatment" in disease_info:
                response["message"] += "**Recomendaciones principales:**\n"
                response["message"] += "\n".join([f"• {t}" for t in disease_info["treatment"][:3]])
                response["recommendations"] = disease_info.get("treatment", [])
        
        # Add warning signs if available
        if "warning_signs" in disease_info and response["urgency_level"] in ["high", "medium"]:
            warning_text = "\n".join([f"⚠️ {w}" for w in disease_info["warning_signs"]])
            response["message"] += f"\n\n**⚠️ Signos de alarma - Buscar atención médica inmediata:**\n{warning_text}"
    
    # If symptoms are detected but no specific disease
    elif detected_symptoms:
        symptom_categories = {}
        for symptom in detected_symptoms:
            cat = symptom["category"]
            if cat not in symptom_categories:
                symptom_categories[cat] = []
            symptom_categories[cat].append(symptom["symptom"])
        
        response["confidence"] = 0.7
        response["message"] = "🤒 He detectado los siguientes síntomas:\n\n"
        
        for category, symptoms in symptom_categories.items():
            cat_name = {
                "respiratory": "Síntomas respiratorios",
                "fever": "Síntomas de fiebre",
                "pain": "Síntomas de dolor",
                "fatigue": "Síntomas de fatiga",
                "digestive": "Síntomas digestivos",
                "neurological": "Síntomas neurológicos"
            }.get(category, category)
            
            response["message"] += f"**{cat_name}:**\n"
            response["message"] += "\n".join([f"• {s}" for s in symptoms[:3]]) + "\n\n"
        
        # Suggest possible conditions
        if "respiratory" in symptom_categories:
            response["message"] += "**Posibles condiciones relacionadas:**\n"
            response["message"] += "• Resfriado común\n• Gripe\n• Bronquitis\n• COVID-19\n\n"
            response["urgency_level"] = "medium"
        
        response["recommendations"] = [
            "Monitorear la evolución de los síntomas",
            "Mantener hidratación adecuada",
            "Descansar lo suficiente",
            "Consultar médico si los síntomas empeoran",
            "Evitar automedicarse sin supervisión médica"
        ]
        
    # General respiratory health query
    else:
        response["confidence"] = 0.6
        response["message"] = """🫁 **Información sobre Enfermedades Respiratorias**

Las enfermedades respiratorias afectan las vías respiratorias y los pulmones. Puedo ayudarte con información sobre:

• **Asma** - Enfermedad crónica de las vías respiratorias
• **Neumonía** - Infección pulmonar
• **Bronquitis** - Inflamación de los bronquios
• **COVID-19** - Enfermedad por coronavirus
• **Gripe** - Infección viral respiratoria
• **EPOC** - Enfermedad pulmonar obstructiva crónica
• **Resfriado** - Infección viral leve

**¿Sobre qué enfermedad específica te gustaría saber más?**

También puedes preguntarme sobre síntomas, tratamientos, o prevención."""

        response["recommendations"] = [
            "Especifica tus síntomas o la enfermedad sobre la que quieres información",
            "Puedes preguntar: '¿Qué es el asma?', '¿Cuáles son los síntomas de neumonía?', etc.",
            "Para consultas médicas urgentes, busca atención médica inmediata"
        ]
    
    # Add general disclaimer
    response["message"] += "\n\n---\n⚠️ **Importante:** Esta es información general. Para un diagnóstico preciso y tratamiento personalizado, consulta con un profesional de la salud."
    
    return response

# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "RespiCare AI Services",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/api/v1/health",
            "analyze": "/api/v1/analyze (POST)",
            "docs": "/docs"
        }
    }

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    cache_status = "uninitialized"
    cache_latency_ms: Optional[float] = None

    cache_client = get_cache_client()

    if cache_client:
        try:
            start = time.perf_counter()
            await cache_client.ping()
            cache_latency_ms = round((time.perf_counter() - start) * 1000, 3)
            cache_status = "healthy"
        except Exception as error:
            cache_status = "unhealthy"
            logger.error("redis_health_check_failed", error=str(error))
    else:
        cache_status = "disconnected"

    overall_status = "healthy" if cache_status == "healthy" else "degraded"

    return {
        "status": overall_status,
        "service": "ai-services",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "dependencies": {
            "redis": {
                "status": cache_status,
                "latency_ms": cache_latency_ms
            }
        }
    }

# DEPRECATED: This endpoint is replaced by the new enhanced_chatbot_service
# Kept for backwards compatibility but should use the new /api/v1/analyze from chat_analyzer router
# @app.post("/api/v1/analyze", response_model=AnalysisResponse)
# async def analyze_symptoms(request: AnalysisRequest):
#     """
#     OLD ENDPOINT - Replaced by enhanced chatbot service
#     """
#     logger.warning("Using deprecated analyze endpoint")
#     return AnalysisResponse(
#         status="deprecated",
#         message="Please use the new enhanced chatbot endpoint at /api/v1/analyze",
#         analysis={},
#         recommendations=["This is a deprecated endpoint"],
#         urgency_level="low",
#         confidence=0.0,
#         timestamp=datetime.now().isoformat()
#     )

@app.get("/api/v1/diseases")
async def get_diseases():
    """Get list of supported respiratory diseases"""
    diseases = []
    for disease, info in RESPIRATORY_KNOWLEDGE_BASE.items():
        diseases.append({
            "id": disease,
            "name": disease.title(),
            "description": info["description"][:100] + "...",
            "urgency": info.get("urgency", "low")
        })
    
    return {
        "status": "success",
        "count": len(diseases),
        "diseases": diseases
    }

@app.get("/api/v1/symptoms")
async def get_symptom_categories():
    """Get available symptom categories"""
    return {
        "status": "success",
        "categories": medical_processor.symptom_categories
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    await init_cache()
    logger.info("ai_services_started", 
               message="RespiCare AI Services started successfully",
               diseases_count=len(RESPIRATORY_KNOWLEDGE_BASE))

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    await close_cache()
    logger.info("ai_services_stopped", 
               message="RespiCare AI Services stopped")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
