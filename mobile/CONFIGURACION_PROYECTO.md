# 📱 Configuración del Proyecto Mobile

## ✅ Proyecto Principal Configurado

**Proyecto activo:** `mobile/RespiCare-Mobile/` (Expo SDK 53)

## 📂 Estructura de Proyectos

```
mobile/
├── RespiCare-Mobile/          ✅ PROYECTO PRINCIPAL (Expo)
│   ├── app/                   # Rutas de Expo Router
│   ├── components/            # Componentes
│   ├── services/              # Servicios
│   ├── stores/                # Estado global
│   ├── package.json           # Dependencias Expo
│   └── README_SETUP.md        # Guía de setup
│
├── [Otros archivos]           ⚠️ Proyecto legacy (no usar)
│   ├── App.tsx                # React Native puro
│   ├── src/                   # Código legacy
│   └── package.json           # Dependencias React Native
│
└── DIAGNOSTICO_ERRORES.md     # Diagnóstico de problemas
```

## 🚀 Comandos Principales

### Desde `mobile/RespiCare-Mobile/`:

```bash
cd mobile/RespiCare-Mobile

# Desarrollo
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web

# Linting
npm run lint
npm run lint:fix

# Tests
npm test
npm run test:coverage

# Type checking
npm run type-check

# Auditoría de seguridad
npm run audit
```

### Desde la raíz del proyecto:

```bash
# Linting (incluye mobile)
make lint

# Formatear código
make format

# Tests mobile
make test-mobile
```

## 📋 Scripts Disponibles en RespiCare-Mobile

| Script | Descripción |
|--------|-------------|
| `start` | Inicia servidor de desarrollo Expo |
| `android` | Compila y ejecuta en Android |
| `ios` | Compila y ejecuta en iOS |
| `web` | Ejecuta en navegador |
| `lint` | Ejecuta ESLint |
| `lint:fix` | Corrige problemas de linting |
| `test` | Ejecuta tests |
| `test:watch` | Tests en modo watch |
| `test:coverage` | Tests con cobertura |
| `type-check` | Verifica tipos TypeScript |
| `audit` | Auditoría de seguridad npm |
| `audit:fix` | Corrige vulnerabilidades |

## ✅ Verificaciones Realizadas

- ✅ Versión de Expo: `~53.0.22` (correcta)
- ✅ React: `^19.0.0` (compatible con Expo SDK 53)
- ✅ React Native: `^0.79.5` (compatible con Expo SDK 53)
- ✅ TypeScript: `~5.8.3` (configurado)
- ✅ ESLint: Configurado con `eslint-config-expo`
- ✅ Makefile: Apunta correctamente a `mobile/RespiCare-Mobile`

## ⚠️ Notas Importantes

1. **Siempre trabajar en `mobile/RespiCare-Mobile/`**
2. **No usar el proyecto en `mobile/` directamente** (es legacy)
3. **El Makefile ya está configurado** para usar RespiCare-Mobile
4. **CI/CD ya está configurado** para usar RespiCare-Mobile

## 🔧 Próximos Pasos

1. **Instalar dependencias:**
   ```bash
   cd mobile/RespiCare-Mobile
   npm install
   ```

2. **Verificar que funciona:**
   ```bash
   npm start
   ```

3. **Ejecutar análisis estático:**
   ```bash
   npm run lint
   npm run type-check
   npm run audit
   ```

---

**Última actualización:** Noviembre 2025  
**Estado:** ✅ Configurado y listo para usar

