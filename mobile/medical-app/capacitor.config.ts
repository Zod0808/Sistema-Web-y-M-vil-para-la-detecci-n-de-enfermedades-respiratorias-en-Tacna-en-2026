import { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.respicare.medicalapp',
  appName: 'RespiCare Medical',
  webDir: 'out',

  // ── Servidor ─────────────────────────────────────────────────────────────
  server: {
    androidScheme: 'https',

    // ── DESARROLLO: descomentar para live reload ────────────────────────
    // url: 'http://10.0.2.2:8083',   // emulador
    // url: 'https://xxxx.ngrok-free.app',  // dispositivo físico
    // cleartext: true,

    // Tiempo máximo de carga antes de mostrar error (ms)
    errorPath: '/error.html',
  },

  // ── Android ───────────────────────────────────────────────────────────────
  android: {
    // Permitir contenido mixto solo en DEBUG — en release el network_security_config lo controla
    allowMixedContent: isDev,

    // Logging: 'none' en producción para no exponer información
    loggingBehavior: isDev ? 'debug' : 'none',

    // WebContentsDebugging: permite inspeccionar el WebView con Chrome DevTools
    // Solo habilitar en debug — NUNCA dejar en true en release
    webContentsDebuggingEnabled: isDev,

    // Configuración de firma — los valores reales van en keystore.properties (no en repo)
    buildOptions: {
      keystorePath: process.env.KEYSTORE_PATH,
      keystoreAlias: process.env.KEYSTORE_ALIAS ?? 'respicare',
      keystorePassword: process.env.KEYSTORE_STORE_PASSWORD,
      keystoreAliasPassword: process.env.KEYSTORE_KEY_PASSWORD,
    },
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: {

    // ── Cámara ──────────────────────────────────────────────────────────
    Camera: {
      permissions: {
        camera: 'RespiCare necesita la cámara para capturar fotos de síntomas y documentos médicos.',
        photos: 'RespiCare necesita acceso a tus fotos para adjuntar imágenes a tu historial médico.',
      },
    },

    // ── Filesystem ──────────────────────────────────────────────────────
    Filesystem: {
      androidPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
      ],
    },

    // ── SQLite ──────────────────────────────────────────────────────────
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeychainPrefix: 'respicare',
      androidIsEncryption: false,
      electronWindowsLocation: 'C:\\ProgramData\\RespiCareDatabases',
      electronMacLocation: '~/Documents/RespiCareDatabases',
      electronLinuxLocation: '~/.respicare/databases',
    },

    // ── Notificaciones locales ───────────────────────────────────────────
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#3b82f6',
      sound: 'beep.wav',
    },

    // ── Push Notifications (FCM — activar cuando se integre Firebase) ────
    // PushNotifications: {
    //   presentationOptions: ['badge', 'sound', 'alert'],
    // },

    // ── Splash Screen ────────────────────────────────────────────────────
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,           // Controlado manualmente desde CapacitorProvider
      launchFadeOutDuration: 300,      // Nombre correcto en Capacitor 6
      backgroundColor: '#0f172a',      // Mismo color que ic_launcher_background
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // ── Status Bar ───────────────────────────────────────────────────────
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },

    // ── Keyboard ─────────────────────────────────────────────────────────
    Keyboard: {
      resize: KeyboardResize.Body, // Redimensiona el body al aparecer el teclado
      resizeOnFullScreen: true,
    },

    // ── Geolocalización ──────────────────────────────────────────────────
    Geolocation: {
      permissions: {
        location: 'RespiCare necesita tu ubicación para enviarla en caso de emergencia médica.',
        coarseLocation: 'RespiCare necesita tu ubicación aproximada para servicios de emergencia.',
      },
    },

    // ── Preferences ─────────────────────────────────────────────────────
    Preferences: {
      // Grupo de preferencias para evitar colisiones con otras apps (iOS)
      group: 'com.respicare.medicalapp',
    },

    // ── Haptics ─────────────────────────────────────────────────────────
    Haptics: {
      // Sin configuración especial — los patrones se definen en código
    },

    // ── App ──────────────────────────────────────────────────────────────
    App: {
      // Las URLs de deep links que la app puede abrir
      appUrlOpen: {
        schemes: ['respicare', 'https'],
      },
    },
  },
};

export default config;