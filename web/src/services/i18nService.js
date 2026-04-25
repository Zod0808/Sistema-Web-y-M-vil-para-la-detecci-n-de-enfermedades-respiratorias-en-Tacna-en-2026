/**
 * Servicio de Internacionalización (i18n) para Web
 * 
 * Soporta múltiples idiomas para la aplicación web
 */

// Idiomas soportados
export const SUPPORTED_LANGUAGES = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  qu: 'Runa Simi' // Quechua
};

// Traducciones
const translations = {
  es: {
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      search: 'Buscar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      retry: 'Reintentar',
      close: 'Cerrar',
      next: 'Siguiente',
      back: 'Atrás',
      done: 'Hecho',
      update: 'Actualizar',
      source: 'Fuente',
      yes: 'Sí',
      no: 'No',
      confirm: 'Confirmar',
      online: 'En línea',
      selectLanguage: 'Seleccionar idioma',
    },
    nav: {
      home: 'Inicio',
      dashboard: 'Estado del Sistema',
      analytics: 'Análisis',
      map: 'Mapa',
      fhir: 'FHIR',
      hl7: 'HL7',
      brandName: 'RespiCare',
      brandSubtitle: 'Sistema de Enfermedades Respiratorias',
    },
    home: {
      welcome: 'Bienvenido a RespiCare',
      subtitle: 'Sistema inteligente para la gestión y análisis de enfermedades respiratorias en Tacna, Perú',
      chatbotTitle: 'Asistente Médico',
      chatbotSubtitle: 'Tu asistente médico inteligente',
      chatbotPlaceholder: 'Escribe tu consulta o síntoma...',
      chatbotSend: 'Enviar',
      chatbotVoice: 'Voz',
      chatbotClear: 'Limpiar',
      chatbotHistory: 'Historial de Conversaciones',
      chatbotSuggestions: 'Sugerencias',
    },
    dashboard: {
      title: 'Estado del Sistema',
      systemStatus: 'Estado del Sistema',
      healthy: 'Saludable',
      degraded: 'Degradado',
      offline: 'Desconectado',
      lastUpdate: 'Última actualización',
    },
    analytics: {
      title: 'Análisis',
      charts: 'Gráficos',
      trends: 'Tendencias',
      statistics: 'Estadísticas',
    },
    chatbot: {
      greeting: '¡Hola! 👋\n\nSoy tu asistente médico de Respicare. Estoy aquí para ayudarte con información sobre salud respiratoria, síntomas y orientación médica.\n\n**¿Cuál es tu consulta o problema?** Puedes:\n\n• Describirme tus síntomas\n• Preguntar sobre enfermedades respiratorias\n• Pedir orientación médica general',
      analyzing: 'Analizando...',
      error: 'Error al procesar tu consulta. Por favor, intenta de nuevo.',
      noResponse: 'No se pudo obtener una respuesta. Por favor, verifica tu conexión.',
      voiceNotSupported: 'El reconocimiento de voz no está disponible en tu navegador.',
      listening: 'Escuchando...',
      stopListening: 'Detener',
      keyFactors: 'Factores Clave del Diagnóstico',
    },
    errors: {
      networkError: 'Error de conexión. Por favor, verifica tu internet.',
      serverError: 'Error del servidor. Por favor, intenta más tarde.',
      unknownError: 'Error desconocido. Por favor, contacta al soporte.',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      retry: 'Retry',
      close: 'Close',
      next: 'Next',
      back: 'Back',
      done: 'Done',
      update: 'Update',
      source: 'Source',
      yes: 'Yes',
      no: 'No',
      confirm: 'Confirm',
      online: 'Online',
      selectLanguage: 'Select language',
    },
    nav: {
      home: 'Home',
      dashboard: 'System Status',
      analytics: 'Analytics',
      map: 'Map',
      fhir: 'FHIR',
      hl7: 'HL7',
      brandName: 'RespiCare',
      brandSubtitle: 'Respiratory Diseases System',
    },
    home: {
      welcome: 'Welcome to RespiCare',
      subtitle: 'Intelligent system for the management and analysis of respiratory diseases in Tacna, Peru',
      chatbotTitle: 'Medical Assistant',
      chatbotSubtitle: 'Your intelligent medical assistant',
      chatbotPlaceholder: 'Type your query or symptom...',
      chatbotSend: 'Send',
      chatbotVoice: 'Voice',
      chatbotClear: 'Clear',
      chatbotHistory: 'History',
      chatbotSuggestions: 'Suggestions',
    },
    dashboard: {
      title: 'System Status',
      systemStatus: 'System Status',
      healthy: 'Healthy',
      degraded: 'Degraded',
      offline: 'Offline',
      lastUpdate: 'Last update',
    },
    analytics: {
      title: 'Analytics',
      charts: 'Charts',
      trends: 'Trends',
      statistics: 'Statistics',
    },
    chatbot: {
      greeting: 'Hello! 👋\n\nI am your RespiCare medical assistant. I am here to help you with information about respiratory health, symptoms, and medical guidance.\n\n**What is your question or problem?** You can:\n\n• Describe your symptoms\n• Ask about respiratory diseases\n• Request general medical guidance',
      analyzing: 'Analyzing...',
      error: 'Error processing your query. Please try again.',
      noResponse: 'Could not get a response. Please check your connection.',
      voiceNotSupported: 'Voice recognition is not available in your browser.',
      listening: 'Listening...',
      stopListening: 'Stop',
      keyFactors: 'Key Factors of Diagnosis',
    },
    errors: {
      networkError: 'Connection error. Please check your internet.',
      serverError: 'Server error. Please try again later.',
      unknownError: 'Unknown error. Please contact support.',
    },
  },
  pt: {
    common: {
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      search: 'Buscar',
      loading: 'Carregando...',
      error: 'Erro',
      success: 'Sucesso',
      retry: 'Tentar novamente',
      close: 'Fechar',
      next: 'Próximo',
      back: 'Voltar',
      done: 'Concluído',
      update: 'Atualizar',
      source: 'Fonte',
      yes: 'Sim',
      no: 'Não',
      confirm: 'Confirmar',
    },
    nav: {
      home: 'Início',
      dashboard: 'Status do Sistema',
      analytics: 'Análises',
      map: 'Mapa',
      fhir: 'FHIR',
      hl7: 'HL7',
      brandName: 'RespiCare',
      brandSubtitle: 'Sistema de Doenças Respiratórias',
    },
    home: {
      welcome: 'Bem-vindo ao RespiCare',
      subtitle: 'Sistema inteligente para gestão e análise de doenças respiratórias em Tacna, Peru',
      chatbotTitle: 'Assistente Médico',
      chatbotSubtitle: 'Seu assistente médico inteligente',
      chatbotPlaceholder: 'Digite sua consulta ou sintoma...',
      chatbotSend: 'Enviar',
      chatbotVoice: 'Voz',
      chatbotClear: 'Limpar',
      chatbotHistory: 'Histórico',
      chatbotSuggestions: 'Sugestões',
    },
    dashboard: {
      title: 'Status do Sistema',
      systemStatus: 'Status do Sistema',
      healthy: 'Saudável',
      degraded: 'Degradado',
      offline: 'Desconectado',
      lastUpdate: 'Última atualização',
    },
    analytics: {
      title: 'Análises',
      charts: 'Gráficos',
      trends: 'Tendências',
      statistics: 'Estatísticas',
    },
    chatbot: {
      greeting: 'Olá! 👋\n\nSou seu assistente médico do RespiCare. Estou aqui para ajudá-lo com informações sobre saúde respiratória, sintomas e orientação médica.\n\n**Qual é sua consulta ou problema?** Você pode:\n\n• Descrever seus sintomas\n• Perguntar sobre doenças respiratórias\n• Solicitar orientação médica geral',
      analyzing: 'Analisando...',
      error: 'Erro ao processar sua consulta. Por favor, tente novamente.',
      noResponse: 'Não foi possível obter uma resposta. Por favor, verifique sua conexão.',
      voiceNotSupported: 'O reconhecimento de voz não está disponível em seu navegador.',
      listening: 'Ouvindo...',
      stopListening: 'Parar',
    },
    errors: {
      networkError: 'Erro de conexão. Por favor, verifique sua internet.',
      serverError: 'Erro do servidor. Por favor, tente novamente mais tarde.',
      unknownError: 'Erro desconhecido. Por favor, entre em contato com o suporte.',
    },
  },
  fr: {
    common: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      search: 'Rechercher',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      retry: 'Réessayer',
      close: 'Fermer',
      next: 'Suivant',
      back: 'Retour',
      done: 'Terminé',
      update: 'Mettre à jour',
      source: 'Source',
      yes: 'Oui',
      no: 'Non',
      confirm: 'Confirmer',
    },
    nav: {
      home: 'Accueil',
      dashboard: 'État du Système',
      analytics: 'Analyses',
      map: 'Carte',
      fhir: 'FHIR',
      hl7: 'HL7',
      brandName: 'RespiCare',
      brandSubtitle: 'Système de Maladies Respiratoires',
    },
    home: {
      welcome: 'Bienvenue sur RespiCare',
      subtitle: 'Système intelligent pour la gestion et l\'analyse des maladies respiratoires à Tacna, Pérou',
      chatbotTitle: 'Assistant Médical',
      chatbotSubtitle: 'Votre assistant médical intelligent',
      chatbotPlaceholder: 'Tapez votre question ou symptôme...',
      chatbotSend: 'Envoyer',
      chatbotVoice: 'Voix',
      chatbotClear: 'Effacer',
      chatbotHistory: 'Historique',
      chatbotSuggestions: 'Suggestions',
    },
    dashboard: {
      title: 'État du Système',
      systemStatus: 'État du Système',
      healthy: 'Sain',
      degraded: 'Dégradé',
      offline: 'Hors ligne',
      lastUpdate: 'Dernière mise à jour',
    },
    analytics: {
      title: 'Analyses',
      charts: 'Graphiques',
      trends: 'Tendances',
      statistics: 'Statistiques',
    },
    chatbot: {
      greeting: 'Bonjour ! 👋\n\nJe suis votre assistant médical RespiCare. Je suis ici pour vous aider avec des informations sur la santé respiratoire, les symptômes et les conseils médicaux.\n\n**Quelle est votre question ou problème ?** Vous pouvez :\n\n• Décrire vos symptômes\n• Poser des questions sur les maladies respiratoires\n• Demander des conseils médicaux généraux',
      analyzing: 'Analyse en cours...',
      error: 'Erreur lors du traitement de votre demande. Veuillez réessayer.',
      noResponse: 'Impossible d\'obtenir une réponse. Veuillez vérifier votre connexion.',
      voiceNotSupported: 'La reconnaissance vocale n\'est pas disponible dans votre navigateur.',
      listening: 'Écoute en cours...',
      stopListening: 'Arrêter',
    },
    errors: {
      networkError: 'Erreur de connexion. Veuillez vérifier votre internet.',
      serverError: 'Erreur du serveur. Veuillez réessayer plus tard.',
      unknownError: 'Erreur inconnue. Veuillez contacter le support.',
    },
  },
  qu: {
    common: {
      save: 'Waqaychay',
      cancel: 'Amanllay',
      delete: 'Qulluy',
      edit: 'Llamk\'apuy',
      search: 'Maskay',
      loading: 'Cargando...',
      error: 'Pantay',
      success: 'Allin',
      retry: 'Kutipay',
      close: 'Wichqay',
      next: 'Qatiq',
      back: 'Qhipa',
      done: 'Ruwasqa',
      update: 'Kusachiy',
      source: 'Pukyu',
      yes: 'Ari',
      no: 'Mana',
      confirm: 'Sut\'ichay',
    },
    nav: {
      home: 'Qallariy',
      dashboard: 'Sistema Estado',
      analytics: 'Yachay',
      map: 'Mapa',
      fhir: 'FHIR',
      hl7: 'HL7',
      brandName: 'RespiCare',
      brandSubtitle: 'Unquy Sistema',
    },
    home: {
      welcome: 'RespiCare-man kusikuy',
      subtitle: 'Tacna, Perú-pi unquykunata kamachiy yachay sistema',
      chatbotTitle: 'Hampi Yachachiq',
      chatbotSubtitle: 'Qam hampi yachachiq',
      chatbotPlaceholder: 'Tapuykita qillqay...',
      chatbotSend: 'Kachay',
      chatbotVoice: 'Rimay',
      chatbotClear: 'Pichay',
      chatbotHistory: 'Wiñay kawsay',
      chatbotSuggestions: 'Yanapay',
    },
    dashboard: {
      title: 'Sistema Estado',
      systemStatus: 'Sistema Estado',
      healthy: 'Allin',
      degraded: 'Mana allin',
      offline: 'Chinkasqa',
      lastUpdate: 'Qhipa kusachiy',
    },
    analytics: {
      title: 'Yachay',
      charts: 'Qillqakuna',
      trends: 'Ripukuna',
      statistics: 'Yupaykuna',
    },
    chatbot: {
      greeting: 'Allillanchu! 👋\n\nÑuqaqa RespiCare hampi yachachiq kani. Unquy, sintomas, hampi yanapayta yanapayta munayki.\n\n**Ima tapuykita kan?** Aswan:\n\n• Sintomasniykita willay\n• Unquykunamanta tapuy\n• Hampi yanapayta mañay',
      analyzing: 'Yachay...',
      error: 'Tapuykita mana allinta ruwasqa. Ama hina kaspa, kutipay.',
      noResponse: 'Kutichiyta mana tarikurqanchu. Ama hina kaspa, tinkiyta ch\'anay.',
      voiceNotSupported: 'Rimayta yachay mana kanchu qillqaykuna.',
      listening: 'Uyariy...',
      stopListening: 'Sayay',
    },
    errors: {
      networkError: 'Tinkiy pantay. Ama hina kaspa, internetniykita ch\'anay.',
      serverError: 'Servidor pantay. Ama hina kaspa, qhipa kutipay.',
      unknownError: 'Mana riqsisqa pantay. Ama hina kaspa, yanapayta mañay.',
    },
  },
};

// Obtener idioma del navegador o localStorage
const getBrowserLanguage = () => {
  if (typeof window === 'undefined') return 'es';
  
  const stored = localStorage.getItem('i18n-language');
  if (stored && translations[stored]) {
    return stored;
  }
  
  const browserLang = navigator.language || navigator.userLanguage;
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  return translations[langCode] ? langCode : 'es';
};

// Estado global del idioma
let currentLanguage = getBrowserLanguage();

// Función para obtener traducción
export const t = (key, params = {}) => {
  const keys = key.split('.');
  let value = translations[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && value[k]) {
      value = value[k];
    } else {
      // Fallback a español si no existe la traducción
      value = translations.es;
      for (const k2 of keys) {
        if (value && typeof value === 'object' && value[k2]) {
          value = value[k2];
        } else {
          return key; // Devolver la clave si no se encuentra
        }
      }
      break;
    }
  }
  
  // Si es string, reemplazar parámetros
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  }
  
  return typeof value === 'string' ? value : key;
};

// Función para cambiar idioma
export const setLanguage = (langCode) => {
  if (!translations[langCode]) {
    console.warn(`Idioma no soportado: ${langCode}`);
    return;
  }
  
  currentLanguage = langCode;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('i18n-language', langCode);
    
    // Disparar evento personalizado para notificar cambios
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: langCode } }));
  }
};

// Función para obtener idioma actual
export const getCurrentLanguage = () => currentLanguage;

// Función para obtener todos los idiomas soportados
export const getSupportedLanguages = () => Object.keys(SUPPORTED_LANGUAGES);

// Hook de React para usar i18n (si se usa React)
// Nota: Requiere importar React en el componente que lo use
export const useTranslation = () => {
  // Esta función requiere React, pero no podemos importarlo aquí
  // Los componentes que usen este hook deben importar React
  return {
    t,
    language: currentLanguage,
    setLanguage,
    getCurrentLanguage,
  };
};

// Exportar por defecto
const i18nService = {
  t,
  setLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  SUPPORTED_LANGUAGES,
  useTranslation,
};

export default i18nService;

