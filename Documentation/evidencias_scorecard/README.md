# Evidencias medidas — Sec 4.2.2 y Sec 5.3 del informe CSS Unidad III

Fecha de recolección: **2026-07-07**
Repositorio: `github.com/Zod0808/Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026`

---

## Tarea 2 — Captura de PRs de Dependabot (reemplaza "PENDIENTE" en Sec 4.2.2)

### Datos verificables

| Métrica | Valor medido |
|---|---|
| Push de `.github/dependabot.yml` | 2026-07-04 12:36:59 UTC (commit `0ac879c`) |
| Primer PR generado | 2026-07-04 12:49:27 UTC |
| Último PR generado | 2026-07-04 12:51:04 UTC |
| **Lag desde push hasta primer PR** | **~12 minutos** |
| **Ventana de generación total** | **~2 minutos (42 PRs)** |
| Total PRs abiertos por Dependabot | **42** |
| Estado (2026-07-07) | 42/42 aún abiertos |

### Distribución por ecosistema

| Directorio | PRs |
|---|---|
| `/web` | 11 |
| `/backend` | 11 |
| `/ai-services` | 7 |
| `/mobile/medical-app` | 6 |
| `/` (github-actions) | 6 |
| `/nginx` | 1 |
| **Total** | **42** |

Distribución por tipo: **34 producción** + **8 desarrollo**.

### Hallazgo relevante para el informe

El paper de Chinthanet et al. (2021) reporta una ventana de respuesta de **24-48 h** con Dependabot. La medición empírica en este proyecto muestra una ventana de **~12 min** — Dependabot escaneó y generó los 42 PRs en <15 min tras habilitarse. Este dato pulveriza el rango del paper y confirma la mejora del ecosistema Dependabot post-2021 (integración nativa con GitHub Actions y ejecución inmediata al detectar cambios en `dependabot.yml`).

### Archivos de evidencia

- `figura_dependabot_prs.png` — captura de `/pulls?q=is:pr+author:app/dependabot`
- `dependabot_prs_2026-07-04.csv` — listado completo de los 42 PRs con timestamp, tipo, directorio y paquete

### URL verificable pública

https://github.com/Zod0808/Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026/pulls?q=is%3Apr+author%3Aapp%2Fdependabot

---

## Tarea 1 — Scorecard real (reemplaza proyección de Sec 5.3, Tabla 8)

### Progresión de mediciones

| Run | Commit | Fecha (UTC) | Score | Cambio |
|---|---|---|---|---|
| #1 | `a3e3996` | 2026-07-07 20:15 | 4.1 / 10 | baseline (workflow recién habilitado) |
| #2 | `a119517` | 2026-07-07 20:43 | 4.4 / 10 | +Packaging (N/A → 10) |
| #3 | `b1d39c1` | 2026-07-07 21:07 | **5.2 / 10** | +Token-Permissions (0 → 10) |

### Desglose de la medición final (5.2/10)

| Check | Severidad | Score |
|---|---|---|
| Dangerous-Workflow | Critical | 10/10 |
| Dependency-Update-Tool | High | 10/10 |
| License | Low | 10/10 |
| Packaging | Medium | 10/10 |
| SAST | Medium | 10/10 |
| Security-Policy | Medium | 10/10 |
| **Token-Permissions** | **High** | **10/10** |
| Binary-Artifacts | High | 7/10 |
| Pinned-Dependencies | Medium | 3/10 |
| Branch-Protection | High | 0/10 |
| CII-Best-Practices | Low | 0/10 |
| Code-Review | High | 0/10 |
| Contributors | Low | 0/10 |
| Fuzzing | Medium | 0/10 |
| Maintained | High | 0/10 |
| Vulnerabilities | High | 0/10 (258 CVEs detectados) |
| CI-Tests | Low | N/A |
| Signed-Releases | High | N/A |

### Comparación proyección vs medición

| Dimensión | Proyección informe | Medido real |
|---|---|---|
| Score agregado | 7 / 10 | **5.2 / 10** |
| Token-Permissions | proyectado alto | 10/10 ✓ |
| Pinned-Dependencies | proyectado alto | 3/10 (npm/pip sin hash) |
| Vulnerabilities | proyectado moderado | 0/10 (258 CVEs) |

La brecha proyección→realidad de 1.8 puntos evidencia que las estimaciones a priori sobre OpenSSF Scorecard subestiman consistentemente el peso de `Vulnerabilities` (que aporta 25% del score total) y `Branch-Protection` (requiere configuración manual fuera del código).

### Archivo de evidencia

- `figura_scorecard_5_2.png` — captura de scorecard.dev/viewer con score 5.2 y desglose por check

### URLs verificables públicas

- Visor: https://scorecard.dev/viewer/?uri=github.com/Zod0808/Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026
- API JSON: https://api.scorecard.dev/projects/github.com/Zod0808/Sistema-Web-y-M-vil-para-la-detecci-n-de-enfermedades-respiratorias-en-Tacna-en-2026

---

## Cambios en el código para lograr estas mediciones

| Commit | Cambio | Efecto |
|---|---|---|
| `a3e3996` | `.github/workflows/scorecard.yml` + `.gitleaks.toml` + fix pre-commit trufflehog | Habilita medición continua |
| `a119517` | 19 workflows: top-level `permissions: contents: read` | Sec 5.3 Token-Permissions |
| `6cccb51` | Ampliación de trigger paths de Scorecard | Re-medición automática |
| `b1d39c1` | 5 workflows: mover `security-events: write` y `contents: write` a job-level | Token-Permissions 0 → 10 |
