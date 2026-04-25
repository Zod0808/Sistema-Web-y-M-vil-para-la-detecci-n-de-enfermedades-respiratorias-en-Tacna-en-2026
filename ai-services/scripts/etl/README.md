# RespiCare ETL Pipeline

Importa datos epidemiológicos reales de fuentes públicas a MongoDB.

## Fuentes disponibles

| Fuente | Datos | Requiere | Comando |
|--------|-------|----------|---------|
| **WHO GHO** | Mortalidad, prevalencia respiratoria Perú/América | Nada | `--source who` |
| **MINSA Datos Abiertos** | Vigilancia IRA/neumonía Perú | Nada | `--source minsa` |
| **SINADEF MINSA** | Causas de muerte respiratorias Perú | Nada | `--source sinadef` |
| **CSV Local (Kaggle)** | Síntomas/diagnósticos clínicos | Descarga manual | `--source csv` |

---

## Ejecución rápida

```bash
# Dentro del contenedor ai-services:
docker-compose exec ai-services python scripts/etl/etl_pipeline.py --source who minsa sinadef

# Ver qué haría sin escribir (dry-run):
docker-compose exec ai-services python scripts/etl/etl_pipeline.py --source all --dry-run
```

---

## Fuente 1 — WHO GHO API (sin registro)

Indicadores que extrae automáticamente:

| Código | Descripción |
|--------|-------------|
| `RSUD_MORT` | Mortalidad por EPOC (estandarizada por edad) |
| `MDG_0000000017` | Mortalidad respiratoria < 5 años |
| `SA_0000001462` | Prevalencia de tabaquismo adultos |
| `AIR_10` | Exposición a contaminación de aire interior |
| `AIR_11` | Exposición a contaminación de aire exterior |
| `RS_198` | Mortalidad EPOC/asma en personas 30-70 años |

Países incluidos: Perú, Bolivia, Chile, Colombia, Ecuador.

```bash
docker-compose exec ai-services python scripts/etl/etl_pipeline.py --source who
```

---

## Fuente 2 — MINSA / SINADEF (sin registro)

El script descarga automáticamente:
- **SINADEF**: base de fallecidos por causas respiratorias (CIE-10 capítulo J + U07/COVID)

```bash
docker-compose exec ai-services python scripts/etl/etl_pipeline.py --source sinadef
```

---

## Fuente 3 — Kaggle (descarga manual)

### Paso 1 — Crear directorio de datos

```bash
mkdir -p data/etl
```

### Paso 2 — Descargar uno o más datasets

#### Opción A: kaggle CLI (si tienes cuenta)
```bash
pip install kaggle
kaggle datasets download -d jillanisofttech/lung-disease-dataset -p data/etl --unzip
kaggle datasets download -d andrewmvd/respiratory-disease -p data/etl --unzip
```

#### Opción B: descarga manual desde navegador
1. Ve a cada URL de Kaggle
2. Descarga el CSV
3. Colócalo en `data/etl/`

### Datasets recomendados

| Dataset | URL | Columnas clave |
|---------|-----|----------------|
| Lung Disease Dataset | https://kaggle.com/datasets/jillanisofttech/lung-disease-dataset | disease, cough, fever, wheezing... |
| Respiratory Disease | https://kaggle.com/datasets/andrewmvd/respiratory-disease | label, symptoms... |
| Asthma Prediction | busca "asthma prediction dataset" en Kaggle | diagnosis, age, gender... |
| COVID Symptoms | busca "covid symptoms dataset" en Kaggle | covid_status, symptoms... |

### Paso 3 — Montar el volumen en Docker

En `docker-compose.dev.yml`, bajo el servicio `ai-services`, agrega:

```yaml
volumes:
  - ./data/etl:/app/data/etl   # ← agrega esta línea
```

Luego reinicia:
```bash
docker-compose restart ai-services
```

### Paso 4 — Ejecutar

```bash
docker-compose exec ai-services python scripts/etl/etl_pipeline.py --source csv --csv-path /app/data/etl
```

---

## Ejecución completa (todas las fuentes)

```bash
docker-compose exec ai-services python scripts/etl/etl_pipeline.py --source all --csv-path /app/data/etl
```

Salida esperada:
```
[1/4] WHO Global Health Observatory
  WHO RSUD_MORT: 45 registros
  WHO AIR_10: 32 registros
  ...
  SymptomReport(WHO): 312 documentos generados
  symptomreports → 298 nuevos, 14 ya existían

[2/4] MINSA Datos Abiertos Perú
  ...

[3/4] SINADEF - Estadísticas de fallecidos MINSA
  SINADEF: 1240 filas descargadas
  SINADEF: 387 registros respiratorios encontrados
  MedicalHistory(SINADEF): 387 documentos
  medicalhistories → 387 nuevos, 0 ya existían

[4/4] CSV Local (Kaggle / UCI)
  CSV 'lung_disease.csv': 1500 filas, 18 columnas
  SymptomReport(CSV): 1500 documentos
  MedicalHistory(CSV): 1500 documentos

═══════════════════════════════════════════════
ETL COMPLETADO
  SymptomReports nuevos  : 2110
  MedicalHistories nuevas: 1887
═══════════════════════════════════════════════
```

---

## Cómo afecta a los dashboards

| Colección | Sin ETL | Con ETL |
|-----------|---------|---------|
| SymptomReports | ~1,000 sintéticos | +2,000 reales (WHO + Kaggle) |
| MedicalHistories | ~50 sintéticos | +400 reales (SINADEF) |
| etl_metadata | — | Estadísticas WHO por indicador/año |

Los datos ETL incluyen el campo `_etl_meta` para trazabilidad.
Los datos sintéticos del seed original se mantienen, el ETL solo agrega.

---

## Re-ejecución segura

El pipeline usa **upsert con hash determinístico** — re-ejecutar el mismo ETL
no duplica documentos. Solo agrega registros genuinamente nuevos.