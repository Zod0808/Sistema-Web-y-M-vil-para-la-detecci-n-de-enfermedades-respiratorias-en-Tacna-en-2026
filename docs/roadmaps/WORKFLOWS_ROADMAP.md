# 🛠️ Roadmap Workflows (CI/CD)

## Fase Wf1: CI Unificado
- Lint + tests por módulo (backend/web/mobile/ai-services)
- Cobertura mínima: mobile/web (70%), backend (80%), ai-services (70%)
- Artefactos: junit + coverage

## Fase Wf2: Artefactos y Beta
- Mobile Beta por tag (ZIP), backend/web Docker image por tag
- Versionado semántico + changelog

## Fase Wf3: CD Staging/Prod
- Deploy auto a staging, smoke tests y rollback
- Producción con rollout/blue-green y gates de aprobación

## Integraciones
- Codecov cobertura, Sentry tracking, Dependabot/Audit

# 🛠️ Roadmap Workflows (CI/CD) - RespiCare Tacna

## Fase 1: CI Básico
- ✅ Lint + tests por componente (backend, web, mobile, ai-services)
- ✅ Artefactos de cobertura (mobile/AI Services), umbrales mínimos
- ✅ AI Services CI con junit.xml y coverage.xml (fail under 70%) + badge

## Fase 2: Artefactos y Releases
- ✅ Mobile Beta (tags `beta-*` → ZIP artefacto)
- ✅ Backend/Web build artefact (Docker image) por tag
- ✅ Versionado semántico y changelog automatizado
- ✅ AI Services: artefactos de comparación de modelos y tendencias (TXT/MD/CSV)

## Fase 3: CD/Staging
- ✅ Deploy automático a staging (backend/web/ai-services)
- ✅ Smoke tests post-deploy y rollback
- ✅ Workflow implementado: `.github/workflows/deploy-staging.yml`

## Fase 4: Producción
- ✅ Deploy progresivo/blue-green
- ✅ Gate de aprobación con evidencia (tests/cobertura/seguridad)
- ✅ Workflow implementado: `.github/workflows/deploy-production.yml`
- ⏳ Despliegue real en producción (requiere configuración de secretos, certificados, etc.)

## Integraciones
- ✅ Codecov (coverage report AI Services)
- ✅ Sentry (error tracking integrado en Backend y AI Services)
- ⏳ Dependabot/Audit en pipelines


