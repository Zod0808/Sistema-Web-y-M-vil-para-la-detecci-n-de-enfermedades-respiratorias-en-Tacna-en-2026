# 🎨 Guía de UX/UI - RespiCare Tacna

Guía completa de diseño y experiencia de usuario para las plataformas Web y Mobile.

---

## 📋 Índice

1. [Design System](#design-system)
2. [Web UX/UI](#web-uxui)
3. [Mobile UX/UI](#mobile-uxui)
4. [Accesibilidad](#accesibilidad)
5. [Microinteracciones](#microinteracciones)
6. [Mejores Prácticas](#mejores-prácticas)

---

## Design System

### Colores

#### Paleta Principal
- **Primary**: `#1976d2` (Azul principal)
- **Secondary**: `#9c27b0` (Púrpura secundario)
- **Success**: `#4caf50` (Verde éxito)
- **Warning**: `#ff9800` (Naranja advertencia)
- **Error**: `#f44336` (Rojo error)
- **Info**: `#2196f3` (Azul información)

#### Tema Light
- **Background**: `#ffffff`
- **Paper**: `#f5f5f5`
- **Text Primary**: `rgba(0, 0, 0, 0.87)`
- **Text Secondary**: `rgba(0, 0, 0, 0.6)`

#### Tema Dark
- **Background**: `#121212`
- **Paper**: `#1e1e1e`
- **Text Primary**: `rgba(255, 255, 255, 0.87)`
- **Text Secondary**: `rgba(255, 255, 255, 0.6)`

### Tipografía

- **Font Family**: `"Roboto", "Helvetica", "Arial", sans-serif`
- **H1**: 2.5rem, weight 500
- **H2**: 2rem, weight 500
- **H3**: 1.75rem, weight 500
- **Body**: 1rem, weight 400
- **Button**: 0.875rem, weight 500, uppercase

### Espaciado

- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px
- **XXL**: 48px

### Bordes

- **Default**: 4px
- **Small**: 2px
- **Large**: 8px

---

## Web UX/UI

### Layout Principal

#### Estructura
```
┌─────────────────────────────────────┐
│           Navbar                    │
├─────────────────────────────────────┤
│                                     │
│         Main Content               │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

#### Componentes Principales

**Navbar**
- Logo y nombre de la aplicación
- Navegación principal
- Toggle de tema (light/dark)
- Accesibilidad: `role="navigation"`, landmarks ARIA

**Main Content**
- Área principal con `role="main"`
- Skip link para navegación por teclado
- Contraste WCAG 2.1 AA

### Temas

#### Light Theme
- Fondo blanco
- Texto oscuro
- Sombras sutiles
- Ideal para uso diurno

#### Dark Theme
- Fondo oscuro (#121212)
- Texto claro
- Menos fatiga visual
- Ideal para uso nocturno

#### Implementación
```javascript
import { ThemeProvider, useThemeContext } from './components/ThemeProvider';

// En App.js
<ThemeProvider>
  {/* Contenido */}
</ThemeProvider>

// En componentes
const { theme, toggleTheme } = useThemeContext();
```

### Accesibilidad Web

#### WCAG 2.1 AA Compliance

**Contraste**
- Texto normal: mínimo 4.5:1
- Texto grande: mínimo 3:1
- Componentes UI: mínimo 3:1

**Navegación por Teclado**
- Todos los elementos interactivos son accesibles por teclado
- Orden de tab lógico
- Indicadores de foco visibles
- Skip links para saltar navegación

**Lectores de Pantalla**
- Atributos ARIA apropiados
- Landmarks (`main`, `nav`, `header`, `footer`)
- Labels descriptivos
- Anuncios para cambios dinámicos

**Ejemplo de Componente Accesible**
```jsx
<button
  aria-label="Cerrar diálogo"
  aria-describedby="dialog-description"
  onClick={handleClose}
>
  <span aria-hidden="true">×</span>
</button>
```

---

## Mobile UX/UI

### Tutorial Interactivo

#### Implementación
```typescript
import TutorialOverlay from '../components/Tutorial/TutorialOverlay';
import { useTutorial } from '../hooks/useTutorial';

const steps = [
  {
    id: 'home',
    target: 'home-button',
    title: 'Bienvenido a RespiCare',
    description: 'Desde aquí puedes acceder a todas las funciones principales',
    position: 'bottom',
  },
  // ... más pasos
];

const { visible, completeTutorial } = useTutorial(steps);

<TutorialOverlay
  steps={steps}
  visible={visible}
  onComplete={completeTutorial}
/>
```

#### Características
- Overlay oscuro con agujero en elemento objetivo
- Tooltip contextual con descripción
- Navegación entre pasos (Anterior/Siguiente)
- Indicadores de progreso
- Opción de saltar tutorial

### Microinteracciones

#### Flujos Críticos

**Login**
- Animación de fade in al cargar
- Animación de shake en error
- Animación de éxito (checkmark) al completar
- Feedback háptico opcional

**Citas**
- Animación de slide al crear cita
- Animación de pulse en recordatorios
- Transiciones suaves entre estados

**Análisis IA**
- Animación de loading durante procesamiento
- Animación de scale al mostrar resultados
- Transiciones suaves entre pantallas

#### Utilidades de Animación
```typescript
import { fadeIn, fadeOut, bounce, shake } from '../utils/animations';

// Fade in
const fadeAnim = useRef(new Animated.Value(0)).current;
fadeIn(fadeAnim, 300).start();

// Bounce
const scaleAnim = useRef(new Animated.Value(1)).current;
bounce(scaleAnim).start();

// Shake (error)
const translateX = useRef(new Animated.Value(0)).current;
shake(translateX).start();
```

### Onboarding

#### Flujo
1. **Pantalla de bienvenida**: Introducción a la app
2. **Características principales**: Síntomas, citas, alertas
3. **Permisos**: Solicitar permisos necesarios
4. **Consentimiento**: Pantalla de consentimiento GDPR/HIPAA
5. **Completado**: Redirigir a pantalla principal

#### Persistencia
- Estado guardado en `AsyncStorage`
- No se muestra nuevamente después de completar
- Opción de resetear desde configuración

---

## Accesibilidad

### Web (WCAG 2.1 AA)

#### Checklist
- [x] Contraste de colores mínimo 4.5:1
- [x] Navegación por teclado completa
- [x] Indicadores de foco visibles
- [x] Atributos ARIA apropiados
- [x] Landmarks semánticos
- [x] Skip links
- [x] Anuncios para lectores de pantalla
- [x] Textos alternativos en imágenes

#### Herramientas
- **Lighthouse**: Auditoría de accesibilidad
- **WAVE**: Evaluación de accesibilidad web
- **axe DevTools**: Extensiones de navegador

### Mobile

#### Checklist
- [x] TestIDs para automatización
- [x] Labels accesibles
- [x] Roles de accesibilidad
- [x] Contraste adecuado
- [x] Tamaños de toque mínimos (44x44pt)
- [x] Soporte VoiceOver/TalkBack

#### Implementación
```typescript
<Button
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Iniciar sesión"
  accessibilityHint="Presiona para iniciar sesión en la aplicación"
  testID="login-button"
>
  Iniciar Sesión
</Button>
```

---

## Microinteracciones

### Principios

1. **Feedback Inmediato**: El usuario debe saber que su acción fue registrada
2. **Transiciones Suaves**: Animaciones fluidas entre estados
3. **Consistencia**: Mismas animaciones para acciones similares
4. **Performance**: Animaciones a 60fps usando `useNativeDriver`

### Tipos de Animaciones

#### Fade
- Uso: Aparecer/desaparecer elementos
- Duración: 300ms
- Easing: `Easing.out(Easing.ease)`

#### Scale
- Uso: Énfasis en elementos importantes
- Duración: 200ms
- Easing: Spring animation

#### Slide
- Uso: Transiciones entre pantallas
- Duración: 300ms
- Easing: `Easing.out(Easing.ease)`

#### Bounce
- Uso: Confirmación de acciones
- Duración: 400ms
- Easing: Spring animation

#### Shake
- Uso: Indicar errores
- Duración: 300ms
- Easing: Linear

---

## Mejores Prácticas

### Web

1. **Responsive Design**
   - Mobile-first approach
   - Breakpoints: 320px, 768px, 1024px, 1440px
   - Imágenes adaptativas

2. **Performance**
   - Lazy loading de componentes
   - Code splitting
   - Optimización de imágenes

3. **Consistencia**
   - Usar design system unificado
   - Componentes reutilizables
   - Estilos centralizados

### Mobile

1. **Gestos**
   - Swipe para acciones rápidas
   - Pull to refresh
   - Long press para opciones

2. **Feedback**
   - Haptic feedback opcional
   - Animaciones suaves
   - Estados de carga claros

3. **Offline**
   - Indicadores de estado de conexión
   - Sincronización automática
   - Mensajes informativos

---

## Ejemplos de Capturas

### Web - Dashboard
```
┌─────────────────────────────────────┐
│ 🏥 RespiCare    [Dashboard] [Analytics] [🌙] │
├─────────────────────────────────────┤
│                                     │
│  📊 Resumen del Sistema             │
│  ┌─────────┐ ┌─────────┐          │
│  │ 150     │ │ 45      │          │
│  │ Pacientes│ │ Citas   │          │
│  └─────────┘ └─────────┘          │
│                                     │
│  📈 Tendencias                      │
│  [Gráfico de líneas]                │
│                                     │
└─────────────────────────────────────┘
```

### Mobile - Home Screen
```
┌─────────────────┐
│ 👤 Hola, Juan   │
│                 │
│ 🏠 Inicio       │
│                 │
│ 📊 Análisis     │
│ Riesgo: Medio   │
│                 │
│ 📅 Próxima Cita │
│ 15 Nov, 10:00   │
│                 │
│ [➕ Nueva]      │
│ [📋 Historial]  │
└─────────────────┘
```

---

## Recursos

- **Design System**: `web/src/theme/theme.js`
- **Componentes Web**: `web/src/components/`
- **Componentes Mobile**: `mobile/src/components/`
- **Utilidades**: `web/src/utils/accessibility.js`, `mobile/src/utils/animations.ts`

---

**Última actualización**: 2024-11-03  
**Versión**: 1.0.0

