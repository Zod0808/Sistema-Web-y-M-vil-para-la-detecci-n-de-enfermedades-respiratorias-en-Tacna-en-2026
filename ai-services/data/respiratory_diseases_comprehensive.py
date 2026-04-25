"""
Comprehensive Respiratory Diseases Database
Complete list of 124 respiratory diseases with symptoms, treatments, and classifications
"""

RESPIRATORY_DISEASES_DATABASE = {
    # INFECCIONES AGUDAS DE VÍAS RESPIRATORIAS SUPERIORES
    "rinofaringitis aguda": {
        "nombre": "Rinofaringitis aguda (resfriado común)",
        "categoria": "infeccion_vias_superiores",
        "tipo": "aguda",
        "sintomas": [
            "congestión nasal", "estornudos", "dolor de garganta leve", "secreción nasal",
            "malestar general", "fiebre leve"
        ],
        "severidad": "leve",
        "urgencia": "muy_baja",
        "patogeno": "viral",
        "tratamiento": [
            "Reposo adecuado",
            "Hidratación abundante",
            "Descongestionantes nasales",
            "Analgésicos suaves si hay dolor",
            "Gárgaras con agua tibia"
        ],
        "duracion": "7-10 días",
        "prevencion": [
            "Lavado de manos frecuente",
            "Evitar contacto cercano con personas enfermas",
            "Vacunación contra gripe"
        ]
    },
    
    "sinusitis aguda": {
        "nombre": "Sinusitis aguda",
        "categoria": "infeccion_vias_superiores",
        "tipo": "aguda",
        "sintomas": [
            "dolor facial", "presión en senos paranasales", "secreción nasal espesa",
            "congestión", "dolor de cabeza", "fiebre", "reducción del olfato"
        ],
        "severidad": "moderada",
        "urgencia": "baja",
        "patogeno": "bacteriana/viral",
        "tratamiento": [
            "Descongestionantes nasales",
            "Irrigación nasal con solución salina",
            "Antibióticos si es bacteriana (prescrito por médico)",
            "Analgésicos para el dolor",
            "Compresas tibias faciales"
        ],
        "duracion": "7-14 días",
        "prevencion": [
            "Tratar resfriados tempranamente",
            "Evitar alergenos",
            "Mantener buena higiene nasal"
        ]
    },
    
    "faringitis aguda": {
        "nombre": "Faringitis aguda",
        "categoria": "infeccion_vias_superiores",
        "tipo": "aguda",
        "sintomas": [
            "dolor de garganta intenso", "dificultad para tragar", "enrojecimiento faríngeo",
            "fiebre", "ganglios inflamados", "malestar general"
        ],
        "severidad": "moderada",
        "urgencia": "baja",
        "patogeno": "viral/bacteriana",
        "tratamiento": [
            "Gárgaras con agua tibia y sal",
            "Analgésicos",
            "Antibióticos si es bacteriana (solo con prescripción)",
            "Hidratación abundante",
            "Reposo vocal"
        ],
        "duracion": "3-7 días",
        "prevencion": [
            "Evitar contacto con personas enfermas",
            "No compartir utensilios",
            "Buena higiene de manos"
        ]
    },
    
    "amigdalitis aguda": {
        "nombre": "Amigdalitis aguda",
        "categoria": "infeccion_vias_superiores",
        "tipo": "aguda",
        "sintomas": [
            "dolor intenso de garganta", "amígdalas inflamadas y enrojecidas",
            "placas blancas o amarillas", "fiebre alta", "dificultad para tragar", "mal aliento"
        ],
        "severidad": "moderada_alta",
        "urgencia": "media",
        "patogeno": "bacteriana/viral",
        "tratamiento": [
            "Antibióticos si es bacteriana (solo con prescripción médica)",
            "Analgésicos para dolor severo",
            "Gárgaras antisépticas",
            "Reposo absoluto",
            "Hidratación abundante",
            "Fiebre alta requiere evaluación médica"
        ],
        "duracion": "5-10 días",
        "prevencion": [
            "Evitar contacto con personas con amigdalitis",
            "Mantener buena higiene bucal",
            "Vacunación contra enfermedades prevenibles"
        ]
    },
    
    "laringitis aguda": {
        "nombre": "Laringitis aguda",
        "categoria": "infeccion_vias_superiores",
        "tipo": "aguda",
        "sintomas": [
            "ronquera", "pérdida de voz", "dolor de garganta",
            "tos seca", "sensación de irritación en garganta", "dificultad leve para respirar"
        ],
        "severidad": "leve_moderada",
        "urgencia": "baja",
        "patogeno": "viral",
        "tratamiento": [
            "Reposo vocal absoluto",
            "Humidificador de aire",
            "Hidratación abundante con líquidos tibios",
            "Evitar irritantes (humo, aire frío)",
            "No forzar la voz"
        ],
        "duracion": "5-7 días",
        "prevencion": [
            "No forzar la voz",
            "Evitar gritar o hablar fuerte",
            "Proteger garganta en climas fríos"
        ]
    },
    
    "traqueitis aguda": {
        "nombre": "Traqueítis aguda",
        "categoria": "infeccion_vias_superiores",
        "tipo": "aguda",
        "sintomas": [
            "tos profunda y seca", "dolor retroesternal", "fiebre",
            "dificultad respiratoria leve", "dolor al toser"
        ],
        "severidad": "moderada",
        "urgencia": "baja",
        "patogeno": "viral/bacteriana",
        "tratamiento": [
            "Antitusígenos si tos seca",
            "Expectorantes si hay producción",
            "Antibióticos si es bacteriana",
            "Analgésicos para dolor",
            "Hidratación abundante"
        ],
        "duracion": "7-14 días",
        "prevencion": [
            "Tratar infecciones respiratorias superiores",
            "Evitar irritantes"
        ]
    },
    
    "laringitis obstructiva aguda": {
        "nombre": "Laringitis obstructiva aguda (crup)",
        "categoria": "infeccion_vias_superiores",
        "tipo": "aguda",
        "sintomas": [
            "tos perruna o metálica", "estridor inspiratorio", "ronquera",
            "dificultad respiratoria", "fiebre", "empeora por la noche"
        ],
        "severidad": "moderada_alta",
        "urgencia": "media_alta",
        "patogeno": "viral",
        "tratamiento": [
            "Aire húmedo (vapor de baño)",
            "Si es severo, atención médica urgente requerida",
            "Corticosteroides si prescritos",
            "Epinefrina nebulizada en casos severos",
            "Oxígeno si necesario",
            "Monitoreo continuo"
        ],
        "duracion": "3-7 días",
        "prevencion": [
            "Vacunación contra gripe",
            "Evitar contacto con personas enfermas",
            "Humedad en ambiente"
        ],
        "observaciones": "Requiere evaluación médica inmediata si dificultad respiratoria marcada"
    },
    
    "rinitis": {
        "nombre": "Rinitis",
        "categoria": "infeccion_vias_superiores",
        "tipo": "aguda/cronica",
        "sintomas": [
            "estornudos frecuentes", "picazón nasal", "congestión",
            "secreción acuosa", "lagrimeo", "picazón en ojos"
        ],
        "severidad": "leve",
        "urgencia": "muy_baja",
        "patogeno": "alérgica",
        "tratamiento": [
            "Antihistamínicos",
            "Corticosteroides nasales",
            "Descongestionantes",
            "Evitar alérgenos identificados",
            "Inmunoterapia si es alérgica persistente"
        ],
        "duracion": "Variable según causa",
        "prevencion": [
            "Identificar y evitar alérgenos",
            "Uso de purificadores de aire",
            "Medicación preventiva en temporadas alérgicas"
        ]
    },
    
    # INFLUENZA Y NEUMONÍA
    "influenza a h1n1": {
        "nombre": "Influenza A (H1N1)",
        "categoria": "influenza",
        "tipo": "aguda",
        "sintomas": [
            "fiebre alta súbita", "escalofríos", "dolor muscular intenso",
            "fatiga extrema", "tos seca", "dolor de cabeza", "dolor de garganta"
        ],
        "severidad": "alta",
        "urgencia": "media",
        "patogeno": "viral",
        "tratamiento": [
            "Antivirales (dentro de 48 horas)",
            "Reposo absoluto",
            "Hidratación abundante",
            "Antipiréticos para fiebre",
            "Analgésicos para dolor",
            "Aislamiento para prevenir contagio"
        ],
        "duracion": "5-10 días",
        "prevencion": [
            "Vacunación anual contra influenza",
            "Lavado de manos frecuente",
            "Evitar contacto cercano con enfermos",
            "Cubrir boca al toser/estornudar"
        ],
        "observaciones": "Especialmente grave en grupos de riesgo (embarazadas, ancianos, inmunocomprometidos)"
    },
    
    "influenza a h3n2": {
        "nombre": "Influenza A (H3N2)",
        "categoria": "influenza",
        "tipo": "aguda",
        "sintomas": [
            "fiebre alta", "mialgias", "tos", "fatiga",
            "similar a H1N1", "puede ser más grave en ancianos"
        ],
        "severidad": "alta",
        "urgencia": "media",
        "patogeno": "viral",
        "tratamiento": [
            "Antivirales si aplica",
            "Reposo absoluto",
            "Hidratación abundante",
            "Antipiréticos",
            "Monitoreo en ancianos"
        ],
        "duracion": "5-10 días",
        "prevencion": [
            "Vacunación anual",
            "Precaución especial en ancianos",
            "Lavado de manos frecuente"
        ]
    },
    
    "influenza b": {
        "nombre": "Influenza B",
        "categoria": "influenza",
        "tipo": "aguda",
        "sintomas": [
            "fiebre", "dolores musculares", "tos", "dolor de garganta",
            "fatiga", "síntomas gastrointestinales ocasionales"
        ],
        "severidad": "moderada_alta",
        "urgencia": "media",
        "patogeno": "viral",
        "tratamiento": [
            "Reposo",
            "Hidratación abundante",
            "Antipiréticos",
            "Tratamiento sintomático",
            "Antivirales si aplica"
        ],
        "duracion": "5-10 días",
        "prevencion": [
            "Vacunación",
            "Medidas de higiene"
        ]
    },
    
    "neumonia viral": {
        "nombre": "Neumonía viral",
        "categoria": "neumonia",
        "tipo": "aguda",
        "sintomas": [
            "fiebre", "tos seca progresiva", "dificultad respiratoria",
            "dolor torácico", "fatiga", "dolor de cabeza", "dolores musculares"
        ],
        "severidad": "alta",
        "urgencia": "alta",
        "patogeno": "viral",
        "tratamiento": [
            "Antivirales específicos si disponible",
            "Tratamiento de soporte",
            "Oxígeno si necesario",
            "Reposo absoluto",
            "Hidratación abundante",
            "Monitoreo cercano",
            "Hospitalización si es grave"
        ],
        "duracion": "2-4 semanas",
        "prevencion": [
            "Vacunación contra influenza",
            "Evitar contacto con enfermos",
            "Buena higiene respiratoria"
        ],
        "observaciones": "Requiere evaluación médica urgente"
    },
    
    "neumonia por streptococcus pneumoniae": {
        "nombre": "Neumonía por Streptococcus pneumoniae",
        "categoria": "neumonia",
        "tipo": "aguda",
        "sintomas": [
            "fiebre alta", "escalofríos", "tos con esputo oxidado",
            "dolor torácico pleurítico", "taquipnea", "confusión en ancianos"
        ],
        "severidad": "muy_alta",
        "urgencia": "alta",
        "patogeno": "bacteriana",
        "tratamiento": [
            "Antibióticos (requiere prescripción médica urgente)",
            "Oxígeno si necesario",
            "Reposo absoluto",
            "Hidratación intravenosa si necesario",
            "Hospitalización si severa",
            "Monitoreo continuo"
        ],
        "duracion": "2-3 semanas",
        "prevencion": [
            "Vacunación antineumocócica",
            "Vacunación contra gripe",
            "No fumar",
            "Buena higiene"
        ],
        "observaciones": "REQUIERE ATENCIÓN MÉDICA INMEDIATA. Puede ser fatal si no se trata"
    },
    
    "neumonia leve": {
        "nombre": "Neumonía leve",
        "categoria": "neumonia",
        "tipo": "aguda",
        "sintomas": [
            "tos", "fiebre moderada", "fatiga",
            "dolor torácico leve", "sin dificultad respiratoria severa"
        ],
        "severidad": "moderada",
        "urgencia": "media",
        "patogeno": "bacterial/viral",
        "tratamiento": [
            "Antibióticos si es bacteriana",
            "Reposo en casa",
            "Hidratación abundante",
            "Antipiréticos",
            "Monitoreo de síntomas",
            "Consultar médico en 24 horas"
        ],
        "duracion": "1-2 semanas",
        "prevencion": [
            "Vacunación",
            "Buena higiene",
            "Tratar infecciones respiratorias tempranamente"
        ]
    },
    
    "neumonia grave": {
        "nombre": "Neumonía grave",
        "categoria": "neumonia",
        "tipo": "aguda",
        "sintomas": [
            "fiebre alta", "dificultad respiratoria marcada", "taquipnea",
            "cianosis", "confusión", "hipotensión", "requiere hospitalización"
        ],
        "severidad": "muy_alta",
        "urgencia": "critica",
        "patogeno": "bacterial/viral",
        "tratamiento": [
            "HOSPITALIZACIÓN INMEDIATA REQUERIDA",
            "Antibióticos intravenosos",
            "Oxígeno complementario",
            "Posible ventilación mecánica",
            "Soporte circulatorio si necesario",
            "Monitoreo intensivo"
        ],
        "duracion": "2-4 semanas hospitalaria",
        "prevencion": [
            "Vacunación",
            "Identificación temprana",
            "Tratamiento precoz"
        ],
        "observaciones": "URGENCIA MÉDICA CRÍTICA. Requiere hospitalización inmediata"
    },
    
    "neumonia muy grave": {
        "nombre": "Neumonía muy grave",
        "categoria": "neumonia",
        "tipo": "aguda",
        "sintomas": [
            "insuficiencia respiratoria aguda", "shock séptico", "falla multiorgánica",
            "cianosis severa", "alteración de conciencia"
        ],
        "severidad": "extrema",
        "urgencia": "critica",
        "patogeno": "bacterial/viral",
        "tratamiento": [
            "UNIDAD DE CUIDADOS INTENSIVOS INMEDIATA",
            "Ventilación mecánica",
            "Soporte cardiovascular",
            "Antibióticos de amplio espectro",
            "Vasopresores",
            "Monitoreo hemodinámico continuo",
            "Tratamiento de falla orgánica"
        ],
        "duracion": "Variable, semanas a meses",
        "prevencion": [
            "Prevención de neumonía primaria",
            "Tratamiento temprano y adecuado"
        ],
        "observaciones": "CONDICIÓN CRÍTICA CON ALTO RIESGO DE MUERTE. Atención médica inmediata en UCI"
    },
    
    # INFECCIONES AGUDAS DE VÍAS RESPIRATORIAS INFERIORES
    "bronquitis aguda": {
        "nombre": "Bronquitis aguda",
        "categoria": "infeccion_vias_inferiores",
        "tipo": "aguda",
        "sintomas": [
            "tos persistente (seca o productiva)", "dolor torácico al toser",
            "fatiga", "fiebre leve", "sibilancias ocasionales"
        ],
        "severidad": "moderada",
        "urgencia": "baja",
        "patogeno": "viral principalmente",
        "tratamiento": [
            "Descanso",
            "Hidratación abundante",
            "Antitusígenos si tos seca",
            "Expectorantes si hay producción",
            "Humidificador",
            "Evitar irritantes"
        ],
        "duracion": "2-3 semanas",
        "prevencion": [
            "No fumar",
            "Evitar irritantes respiratorios",
            "Vacunación contra gripe"
        ]
    },
    
    "bronquiolitis aguda": {
        "nombre": "Bronquiolitis aguda",
        "categoria": "infeccion_vias_inferiores",
        "tipo": "aguda",
        "sintomas": [
            "tos", "sibilancias", "dificultad respiratoria", "taquipnea",
            "tiraje intercostal", "rechazo de alimentos en lactantes", "fiebre"
        ],
        "severidad": "moderada_alta",
        "urgencia": "media",
        "patogeno": "viral (VSR principalmente)",
        "tratamiento": [
            "Oxígeno si necesario",
            "Hidratación",
            "Nebulización con broncodilatadores",
            "Hospitalización si dificultad respiratoria marcada",
            "Monitoreo continuo en lactantes",
            "Evitar antibióticos (es viral)"
        ],
        "duracion": "1-2 semanas",
        "prevencion": [
            "Lavado de manos frecuente",
            "Evitar contacto de bebés con personas enfermas",
            "Lactancia materna"
        ],
        "observaciones": "Grave en lactantes. Requiere evaluación médica si dificultad respiratoria"
    },
    
    # ENFERMEDADES CRÓNICAS
    "epoc": {
        "nombre": "Enfermedad Pulmonar Obstructiva Crónica (EPOC)",
        "categoria": "enfermedad_cronica",
        "tipo": "cronica",
        "sintomas": [
            "disnea progresiva", "tos crónica", "esputo", "sibilancias",
            "infecciones respiratorias frecuentes", "fatiga", "pérdida de peso"
        ],
        "severidad": "alta_cronica",
        "urgencia": "baja_moderada_acu",
        "patogeno": "crónica",
        "tratamiento": [
            "Dejar de fumar (MÁS IMPORTANTE)",
            "Broncodilatadores inhalados",
            "Corticosteroides inhalados si indicados",
            "Oxigenoterapia domiciliaria si necesario",
            "Rehabilitación pulmonar",
            "Vacunación anual",
            "Tratar exacerbaciones tempranamente"
        ],
        "duracion": "Crónica, de por vida",
        "prevencion": [
            "No fumar (prevención primaria)",
            "Dejar de fumar si fuma",
            "Evitar exposición a irritantes",
            "Vacunación contra gripe y neumonía"
        ],
        "observaciones": "Exacerbaciones pueden requerir atención médica urgente"
    },
    
    "asma bronquial": {
        "nombre": "Asma bronquial",
        "categoria": "enfermedad_cronica",
        "tipo": "cronica_episodica",
        "sintomas": [
            "sibilancias recurrentes", "dificultad respiratoria episódica",
            "tos (especialmente nocturna)", "opresión torácica",
            "desencadenada por alérgenos o ejercicio"
        ],
        "severidad": "variable",
        "urgencia": "baja_en_remision_alta_en_crisis",
        "patogeno": "alérgica/inflamatoria",
        "tratamiento": [
            "Inhalador de rescate (salbutamol)",
            "Inhalador de control diario",
            "Corticosteroides inhalados",
            "Evitar desencadenantes identificados",
            "Plan de acción para el asma",
            "Monitoreo de función pulmonar"
        ],
        "duracion": "Crónica, episódica",
        "prevencion": [
            "Identificar y evitar desencadenantes",
            "Seguir plan de tratamiento",
            "Usar medicación de control diario",
            "Vacunación contra gripe"
        ],
        "observaciones": "Crisis graves pueden ser URGENCIA MÉDICA"
    },
    
    "estado asmatico": {
        "nombre": "Estado asmático",
        "categoria": "enfermedad_cronica",
        "tipo": "aguda_severa",
        "sintomas": [
            "crisis asmática severa", "dificultad respiratoria extrema",
            "sibilancias intensas", "cianosis", "incapacidad para hablar", "ansiedad"
        ],
        "severidad": "extrema",
        "urgencia": "critica",
        "patogeno": "exacerbacion_aguda",
        "tratamiento": [
            "ATENCIÓN MÉDICA DE EMERGENCIA INMEDIATA",
            "Broncodilatadores nebulizados (tratamiento continuo)",
            "Corticosteroides sistémicos",
            "Oxígeno de alto flujo",
            "Posible intubación y ventilación mecánica",
            "Adrenérgicos IV",
            "Monitoreo continuo",
            "Traslado a UCI si necesario"
        ],
        "duracion": "Días a semanas",
        "prevencion": [
            "Seguir plan de tratamiento de asma",
            "Evitar desencadenantes",
            "Usar medicación de control",
            "Reconocer señales de empeoramiento temprano"
        ],
        "observaciones": "URGENCIA MÉDICA CRÍTICA. Buscar atención inmediata"
    },
    
    "enfisema pulmonar": {
        "nombre": "Enfisema pulmonar",
        "categoria": "enfermedad_cronica",
        "tipo": "cronica",
        "sintomas": [
            "dificultad respiratoria progresiva", "tos mínima",
            "tórax en tonel", "pérdida de peso", "fatiga extrema",
            "uso de músculos accesorios"
        ],
        "severidad": "alta_cronica",
        "urgencia": "baja_moderada",
        "patogeno": "crónica_destructiva",
        "tratamiento": [
            "Cesar el hábito de fumar inmediatamente",
            "Oxigenoterapia continua si indicada",
            "Broncodilatadores",
            "Rehabilitación pulmonar",
            "Trasplante pulmonar en casos severos",
            "Tratar infecciones agresivamente"
        ],
        "duracion": "Crónica, progresiva",
        "prevencion": [
            "No fumar nunca",
            "Dejar de fumar si fuma",
            "Protección laboral",
            "Vacunación regular"
        ],
        "observaciones": "Progresión irreversible si continúa fumar"
    },
    
    "bronquitis cronica": {
        "nombre": "Bronquitis crónica",
        "categoria": "enfermedad_cronica",
        "tipo": "cronica",
        "sintomas": [
            "tos productiva persistente (3+ meses por 2+ años)",
            "esputo claro o purulento", "exacerbaciones frecuentes",
            "fatiga", "dificultad respiratoria leve"
        ],
        "severidad": "moderada_alta_cronica",
        "urgencia": "baja_moderada_en_exacerbacion",
        "patogeno": "cronica",
        "tratamiento": [
            "Dejar de fumar completamente",
            "Broncodilatadores inhalados",
            "Corticosteroides inhalados",
            "Tratamiento de exacerbaciones con antibióticos si apropiado",
            "Hidratación",
            "Expectorantes",
            "Vacunación anual"
        ],
        "duracion": "Crónica, permanente",
        "prevencion": [
            "No fumar",
            "Evitar exposición a irritantes",
            "Vacunación regular"
        ]
    },
    
    # COVID-19
    "covid-19": {
        "nombre": "COVID-19",
        "categoria": "enfermedad_viral",
        "tipo": "aguda",
        "sintomas": [
            "fiebre", "tos seca", "fatiga", "pérdida de olfato/gusto",
            "dificultad respiratoria", "dolor muscular", "dolor de cabeza",
            "diarrea", "dolor de garganta", "congestión nasal"
        ],
        "severidad": "variable",
        "urgencia": "variable",
        "patogeno": "SARS-CoV-2",
        "tratamiento": [
            "Aislamiento estricto",
            "Reposo y monitoreo",
            "Antivirales si prescritos (dentro de 5 días)",
            "Monitoreo de saturación de oxígeno",
            "Oxígeno domiciliario si necesario",
            "Hospitalización si hipoxemia",
            "Seguir protocolo médico local"
        ],
        "duracion": "2-3 semanas",
        "prevencion": [
            "Vacunación completa",
            "Refuerzos de vacunación",
            "Uso de mascarilla",
            "Distanciamiento social",
            "Lavado de manos",
            "Ventilación de espacios"
        ],
        "observaciones": "Buscar atención médica urgente si dificultad respiratoria o saturación < 92%"
    },
    
    # TUBERCULOSIS
    "tuberculosis pulmonar": {
        "nombre": "Tuberculosis pulmonar",
        "categoria": "infeccion_bacteriana",
        "tipo": "aguda_cronica",
        "sintomas": [
            "tos persistente (>2 semanas)", "esputo con sangre",
            "fiebre vespertina", "sudoración nocturna", "pérdida de peso",
            "fatiga", "hemoptisis"
        ],
        "severidad": "alta",
        "urgencia": "alta",
        "patogeno": "Mycobacterium tuberculosis",
        "tratamiento": [
            "Tratamiento directamente observado (DOTS)",
            "Múltiples fármacos antituberculosos (6 meses mínimo)",
            "Aislamiento hasta no contagioso",
            "Controles médicos regulares",
            "Completar tratamiento obligatorio",
            "Vacunación de contactos"
        ],
        "duracion": "6-9 meses de tratamiento",
        "prevencion": [
            "Vacunación BCG en niños",
            "Tratamiento de personas infectadas",
            "Buena ventilación",
            "Identificación de contactos"
        ],
        "observaciones": "REQUIERE TRATAMIENTO MÉDICO ESPECIALIZADO URGENTE. Enfermedad de notificación obligatoria"
    },
    
    # NEUMONÍA POR ASPIRACIÓN
    "neumonitis por aspiracion": {
        "nombre": "Neumonitis por aspiración",
        "categoria": "infeccion_especial",
        "tipo": "aguda",
        "sintomas": [
            "tos", "fiebre", "disnea", "taquipnea", "cianosis",
            "estertores", "tras evento de aspiración"
        ],
        "severidad": "alta",
        "urgencia": "alta",
        "patogeno": "bacteriana mixta",
        "tratamiento": [
            "Antibióticos de amplio espectro",
            "Hospitalización",
            "Oxígeno",
            "Posible intubación si es grave",
            "Tratamiento de causa subyacente"
        ],
        "duracion": "2-4 semanas",
        "prevencion": [
            "Cuidado especial en disfagia",
            "Aspiración orotraqueal si riesgo",
            "Posicionamiento adecuado"
        ],
        "observaciones": "Requiere hospitalización inmediata"
    },
    
    # SÍNDROME DE DIFICULTAD RESPIRATORIA AGUDA (SDRA)
    "sdra": {
        "nombre": "Síndrome de Dificultad Respiratoria Aguda (SDRA)",
        "categoria": "enfermedad_critica",
        "tipo": "aguda_critica",
        "sintomas": [
            "disnea severa", "taquipnea marcada", "cianosis",
            "hipoxemia refractaria", "estertores bilaterales",
            "requiere ventilación mecánica"
        ],
        "severidad": "extrema",
        "urgencia": "critica",
        "patogeno": "varios",
        "tratamiento": [
            "INTUBACIÓN Y VENTILACIÓN MÉDICA INMEDIATA",
            "Unidad de Cuidados Intensivos",
            "PEEP positivo",
            "Soporte cardiovascular",
            "Tratamiento de causa subyacente",
            "Monitoreo hemodinámico continuo",
            "Posible ECMO en casos extremos"
        ],
        "duracion": "Variable, semanas",
        "prevencion": [
            "Tratamiento temprano de sepsis",
            "Ventilación protectora en procedimientos",
            "Manejo adecuado de fluido"
        ],
        "observaciones": "CONDICIÓN EXTREMADAMENTE CRÍTICA. Alta mortalidad. Requiere UCI inmediata"
    },
    
    # EMBOLIA PULMONAR
    "embolia pulmonar": {
        "nombre": "Embolia pulmonar",
        "categoria": "enfermedad_critica",
        "tipo": "aguda_critica",
        "sintomas": [
            "disnea súbita", "dolor torácico pleurítico", "taquicardia",
            "hemoptisis", "ansiedad", "síncope", "cianosis"
        ],
        "severidad": "extrema",
        "urgencia": "critica",
        "patogeno": "tromboembolia",
        "tratamiento": [
            "ATENCIÓN MÉDICA DE EMERGENCIA INMEDIATA",
            "Oxígeno de alto flujo",
            "Anticoagulación (heparina)",
            "Trombolíticos si masiva",
            "Embolectomía quirúrgica si masiva",
            "Unidad de Cuidados Intensivos",
            "Monitoreo continuo"
        ],
        "duracion": "Días críticos",
        "prevencion": [
            "Prevención de trombosis venosa profunda",
            "Movilización post-quirúrgica",
            "Anticoagulación profiláctica si riesgo alto"
        ],
        "observaciones": "CONDICIÓN CRÍTICA CON ALTO RIESGO DE MUERTE SÚBITA. Atención médica inmediata en emergencias"
    },
    
    # NEUMOTÓRAX ESPONTÁNEO
    "neumotorax espontaneo": {
        "nombre": "Neumotórax espontáneo",
        "categoria": "enfermedad_toracica",
        "tipo": "aguda",
        "sintomas": [
            "dolor torácico súbito", "disnea", "disminución de ruidos respiratorios",
            "timpanismo", "más común en jóvenes altos"
        ],
        "severidad": "moderada_alta",
        "urgencia": "alta",
        "patogeno": "mecanica",
        "tratamiento": [
            "Evaluación médica inmediata",
            "Toracocentesis si gran neumotórax",
            "Tubo torácico si necesario",
            "Oximetría y rayos X",
            "Hospitalización si grande"
        ],
        "duracion": "Días a semanas",
        "prevencion": [
            "Evitar buceo si antecedente",
            "Evitar vuelos no presurizados"
        ],
        "observaciones": "Buscar atención médica inmediata si dolor torácico súbito"
    },
    
    # EDEMA PULMONAR
    "edema pulmonar": {
        "nombre": "Edema pulmonar",
        "categoria": "enfermedad_critica",
        "tipo": "aguda_critica",
        "sintomas": [
            "disnea severa", "ortopnea", "tos con esputo espumoso rosado",
            "sibilancias", "estertores", "ansiedad"
        ],
        "severidad": "extrema",
        "urgencia": "critica",
        "patogeno": "cardiovascular",
        "tratamiento": [
            "ATENCIÓN MÉDICA DE EMERGENCIA INMEDIATA",
            "Oxígeno de alto flujo con PEEP",
            "Diuréticos IV",
            "Nitratos",
            "Morfina si indicado",
            "Posible CPAP",
            "Tratamiento de causa subyacente",
            "Monitoreo intensivo"
        ],
        "duracion": "Horas a días",
        "prevencion": [
            "Control de insuficiencia cardíaca",
            "Monitoreo de función cardiaca",
            "Adherencia a medicación cardiovascular"
        ],
        "observaciones": "CONDICIÓN CRÍTICA. Buscar emergencias médicas inmediatamente"
    }
}

# Keywords for disease detection
DISEASE_KEYWORDS = {
    "resfriado": ["rinofaringitis", "resfriado", "congestion", "mocos"],
    "sinusitis": ["sinusitis", "sinus", "dolor facial", "presion nasal"],
    "faringitis": ["faringitis", "garganta", "dolor de garganta"],
    "amigdalitis": ["amigdalitis", "amigdalas", "placas", "anginas"],
    "laringitis": ["laringitis", "ronquera", "perdida de voz"],
    "crup": ["crup", "tos perruna", "estridor"],
    "influenza": ["gripe", "influenza", "flu", "h1n1", "h3n2"],
    "neumonia": ["neumonia", "neumonía", "pulmonia", "infeccion pulmonar"],
    "bronquitis": ["bronquitis", "tos bronquial"],
    "bronquiolitis": ["bronquiolitis", "wheezing en bebes"],
    "epoc": ["epoc", "enfisema", "bronquitis cronica", "pulmon del fumador"],
    "asma": ["asma", "sibilancias", "wheezing", "broncoespasmo"],
    "estado asmatico": ["crisis asmatica severa", "asma grave"],
    "covid": ["covid", "coronavirus", "sars-cov-2"],
    "tuberculosis": ["tuberculosis", "tb", "baciloscopia", "tos cronica"],
    "sdra": ["sdra", "dificultad respiratoria aguda", "respiración mecánica"],
    "embolia": ["embolia pulmonar", "trombo pulmonar"],
    "neumotorax": ["neumotorax", "aire en tórax"],
    "edema": ["edema pulmonar", "esputo espumoso", "insuficiencia cardiaca"]
}

# Urgency classification for quick reference
URGENCY_LEVELS = {
    "critica": [
        "sdra", "neumonia muy grave", "estado asmatico", "embolia pulmonar",
        "edema pulmonar", "neumonia grave"
    ],
    "alta": [
        "neumonia", "bronquiolitis severa", "laringitis obstructiva",
        "tuberculosis pulmonar", "neumotórax", "neumonitis por aspiración"
    ],
    "media": [
        "influenza", "neumonia leve", "sinusitis severa", "amigdalitis",
        "exacerbacion epoc", "exacerbacion asma"
    ],
    "baja": [
        "resfriado", "bronquitis aguda", "faringitis", "rinitis",
        "laringitis simple"
    ]
}

