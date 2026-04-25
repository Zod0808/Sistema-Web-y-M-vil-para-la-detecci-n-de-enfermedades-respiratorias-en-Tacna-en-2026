/**
 * Enhanced ChatBot Component
 * 
 * Chatbot mejorado con:
 * - Visualizaciones SHAP
 * - Gráficos interactivos de factores
 * - Historial de conversaciones mejorado
 * - Sugerencias contextuales inteligentes
 * - Modo de voz (speech-to-text)
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import SHAPVisualization from './SHAPVisualization';
import FactorChart from './FactorChart';
import MLAdvancedResults from './MLAdvancedResults';
import { t, getCurrentLanguage } from '../services/i18nService';
import './ChatBot.css';
import './ChatBotEnhanced.css';
import { API_BASE, AI_BASE_URL, LEGACY_API_BASE } from '../utils/apiBase';

function ChatBotEnhanced() {
  const [sessionId, setSessionId] = useState(null);
  const [language, setLanguage] = useState(getCurrentLanguage());
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: t('chatbot.greeting'),
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showAdvancedResults, setShowAdvancedResults] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  const [currentExperimentId, setCurrentExperimentId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize conversation session
  useEffect(() => {
    initializeSession();
    loadConversationHistory();
    initializeVoiceRecognition();
  }, []);

  // Update greeting message when language changes
  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
      // Update initial greeting message
      setMessages(prev => {
        if (prev.length > 0 && prev[0].type === 'bot') {
          const newMessages = [...prev];
          newMessages[0] = {
            ...newMessages[0],
            text: t('chatbot.greeting')
          };
          return newMessages;
        }
        return prev;
      });
    };

    window.addEventListener('languageChanged', handleLanguageChange);

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  // Initialize voice recognition
  const initializeVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  };

  // Start voice recognition
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Stop voice recognition
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Load conversation history from localStorage
  const loadConversationHistory = () => {
    try {
      const saved = localStorage.getItem('chatbot_history');
      if (saved) {
        const history = JSON.parse(saved);
        setConversationHistory(history);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  // Save conversation history to localStorage
  const saveConversationHistory = (newMessage) => {
    try {
      const updated = [...conversationHistory, newMessage].slice(-50); // Keep last 50 conversations
      setConversationHistory(updated);
      localStorage.setItem('chatbot_history', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  };

  const initializeSession = async () => {
    try {
      const response = await axios.post(`${LEGACY_API_BASE}/chat-conversations`, {
        metadata: {
          source: 'web',
          language: 'es'
        },
        location: {
          city: 'Tacna',
          country: 'Perú'
        }
      });
      
      if (response.data.success) {
        setSessionId(response.data.data.sessionId);
        console.log('✅ Chat session initialized:', response.data.data.sessionId);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const saveMessage = async (role, content, metadata = {}) => {
    if (!sessionId) return;
    
    try {
      await axios.post(
        `${LEGACY_API_BASE}/chat-conversations/${sessionId}/messages`,
        {
          role,
          content,
          metadata
        }
      );
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate contextual suggestions based on conversation
  const generateSuggestions = useMemo(() => {
    const lastMessages = messages.slice(-3);
    const lastUserMessage = lastMessages.find(m => m.type === 'user');
    const lastBotMessage = lastMessages.find(m => m.type === 'bot');
    
    if (!lastUserMessage && !lastBotMessage) {
      return [
        'Tengo tos persistente',
        'Me duele el pecho',
        'Tengo dificultad para respirar',
        '¿Qué es el asma?'
      ];
    }

    const userText = lastUserMessage?.text?.toLowerCase() || '';
    const botText = lastBotMessage?.text?.toLowerCase() || '';

    // Symptom-based suggestions
    if (userText.includes('tos') || userText.includes('toser')) {
      return [
        '¿Cuánto tiempo llevo con la tos?',
        '¿La tos es seca o con flema?',
        '¿Tengo fiebre además de tos?',
        '¿Qué medicamentos puedo tomar?'
      ];
    }

    if (userText.includes('dolor') || userText.includes('pecho')) {
      return [
        '¿Es un dolor agudo o constante?',
        '¿El dolor empeora al respirar?',
        '¿Tengo otros síntomas?',
        '¿Cuándo debo buscar atención médica?'
      ];
    }

    if (userText.includes('dificultad') || userText.includes('respirar')) {
      return [
        '¿Es constante o solo al hacer ejercicio?',
        '¿Tengo sibilancias?',
        '¿Qué puedo hacer para aliviar?',
        '¿Es una emergencia?'
      ];
    }

    // Disease-based suggestions
    if (botText.includes('asma') || userText.includes('asma')) {
      return [
        '¿Cómo se trata el asma?',
        '¿Qué desencadena el asma?',
        '¿Necesito un inhalador?',
        '¿El asma es curable?'
      ];
    }

    if (botText.includes('neumonía') || userText.includes('neumonía')) {
      return [
        '¿Cómo se diagnostica la neumonía?',
        '¿Es contagiosa?',
        '¿Cuánto tiempo dura el tratamiento?',
        '¿Cuándo debo ir al hospital?'
      ];
    }

    // Default suggestions
    return [
      'Tengo más síntomas',
      '¿Necesito ver a un médico?',
      '¿Qué medicamentos puedo tomar?',
      'Más información sobre esto'
    ];
  }, [messages]);

  useEffect(() => {
    setSuggestions(generateSuggestions);
  }, [generateSuggestions]);

  // Extract symptoms from user message
  const extractSymptoms = (text) => {
    const symptomKeywords = [
      'tos', 'toser', 'fiebre', 'dolor', 'garganta', 'pecho', 'dificultad', 'respirar',
      'respiratoria', 'sibilancias', 'falta', 'aire', 'congestión', 'nasal', 'secreción',
      'nasal', 'estornudos', 'fatiga', 'cansancio', 'debilidad', 'náuseas', 'vómitos',
      'dolor de cabeza', 'dolor muscular', 'escalofríos', 'sudoración', 'opresión',
      'pecho', 'picazón', 'lagrimeo', 'goteo nasal', 'malestar general'
    ];
    
    const foundSymptoms = [];
    const seenSymptoms = new Set();
    
    for (const keyword of symptomKeywords) {
      if (text.toLowerCase().includes(keyword) && !seenSymptoms.has(keyword)) {
        foundSymptoms.push(keyword);
        seenSymptoms.add(keyword);
      }
    }
    
    const phrases = text.toLowerCase().match(/(tos|fiebre|dolor|dificultad)[^.,;]*/gi);
    if (phrases) {
      phrases.forEach(phrase => {
        const cleaned = phrase.trim();
        if (cleaned.length > 3 && !seenSymptoms.has(cleaned)) {
          foundSymptoms.push(cleaned);
          seenSymptoms.add(cleaned);
        }
      });
    }
    
    return foundSymptoms.length > 0 ? foundSymptoms : null;
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    saveConversationHistory({ ...userMessage, sessionId });
    saveMessage('user', inputText);
    
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const extractedSymptoms = extractSymptoms(currentInput);
      let mlAnalysisResult = null;
      
      if (extractedSymptoms && extractedSymptoms.length > 0) {
        try {
          const token = localStorage.getItem('token');
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          
          const mlResponse = await axios.post(
            `${API_BASE}/symptom-analyzer/ml-analyze`,
            {
              symptoms: extractedSymptoms,
              patient_age: 35,
              risk_factors: [],
              include_explanation: true,
              apply_personalization: true
            },
            { headers }
          );
          
          if (mlResponse.data.success) {
            mlAnalysisResult = mlResponse.data.data;
            // Store analysis ID for advanced results
            if (mlResponse.data.data.id || mlResponse.data.data.analysisId) {
              setCurrentAnalysisId(mlResponse.data.data.id || mlResponse.data.data.analysisId);
            }
            // Store session ID if available
            if (sessionId) {
              setCurrentSessionId(sessionId);
            }
          }
        } catch (mlError) {
          console.warn('ML analysis failed:', mlError);
        }
      }
      
      const conversationHistory = messages
        .filter(msg => msg.type === 'user' || msg.type === 'bot')
        .map(msg => ({
          type: msg.type,
          text: msg.text,
          timestamp: msg.timestamp
        }));
      
      const response = await axios.post(`${AI_BASE_URL}/analyze`, {
        message: currentInput,
        conversation_history: conversationHistory,
        context: {
          source: 'web_chat',
          location: {
            city: 'Tacna',
            country: 'Perú'
          },
          ml_prediction: mlAnalysisResult ? {
            disease: mlAnalysisResult.disease,
            confidence: mlAnalysisResult.confidence
          } : null
        },
        session_id: sessionId
      });

      let botText = response.data.message || 'He procesado tu consulta.';
      
      if (mlAnalysisResult) {
        const confidencePercent = (mlAnalysisResult.confidence * 100).toFixed(1);
        const urgencyEmoji = {
          'critical': '🚨',
          'high': '⚠️',
          'medium': '⚡',
          'low': '💚'
        }[mlAnalysisResult.urgency_level] || '💚';
        
        const explanation = mlAnalysisResult.explanation;
        const friendly = explanation?.friendly || explanation;
        
        let mlInfo = `\n\n**📊 Resultado del Análisis**\n\n`;
        
        if (friendly?.main_explanation) {
          mlInfo += `${friendly.main_explanation}\n\n`;
        } else {
          mlInfo += `${urgencyEmoji} **Diagnóstico:** ${mlAnalysisResult.disease}\n`;
          mlInfo += `**Nivel de confianza:** ${confidencePercent}%\n`;
          mlInfo += `**Urgencia:** ${mlAnalysisResult.urgency_level.toUpperCase()}\n\n`;
        }
        
        if (friendly?.key_factors && friendly.key_factors.length > 0) {
          mlInfo += `**🔍 ¿Por qué este diagnóstico?**\n`;
          friendly.key_factors.slice(0, 3).forEach((factor) => {
            mlInfo += `• ${factor}\n`;
          });
          mlInfo += `\n`;
        }
        
        if (friendly?.recommendations && friendly.recommendations.length > 0) {
          mlInfo += `**✅ Recomendaciones:**\n`;
          friendly.recommendations.slice(0, 4).forEach(rec => {
            mlInfo += `${rec}\n`;
          });
          mlInfo += `\n`;
        }
        
        if (mlAnalysisResult.needs_medical_attention) {
          mlInfo += `\n⚠️ **IMPORTANTE:** Se recomienda consultar con un médico profesional para una evaluación completa.\n`;
        }
        
        botText = botText + mlInfo;
      }

      const botMessage = {
        type: 'bot',
        text: botText,
        timestamp: new Date(),
        urgency: mlAnalysisResult?.urgency_level || response.data.urgency_level,
        symptomCount: response.data.symptom_count,
        categories: response.data.symptom_categories,
        mlPrediction: mlAnalysisResult,
        explanation: mlAnalysisResult?.explanation
      };

      setMessages(prev => [...prev, botMessage]);
      saveConversationHistory({ ...botMessage, sessionId });
      saveMessage('bot', botText, {
        urgencyLevel: mlAnalysisResult?.urgency_level || response.data.urgency_level,
        symptomCount: response.data.symptom_count,
        symptomCategories: response.data.symptom_categories,
        needsMedicalAttention: mlAnalysisResult?.needs_medical_attention || response.data.needs_medical_attention,
        mlPrediction: mlAnalysisResult
      });
    } catch (error) {
      console.error('Error al comunicarse con AI services:', error);
      
      let responseText = '';
      const lowerInput = currentInput.toLowerCase();
      
      if (lowerInput.includes('asma') || lowerInput.includes('asmático')) {
        responseText = '🫁 El asma es una enfermedad crónica que afecta las vías respiratorias. Los síntomas incluyen dificultad para respirar, sibilancias y opresión en el pecho. Es importante tener un inhalador de rescate y seguir el tratamiento indicado por tu médico.';
      } else if (lowerInput.includes('neumonía') || lowerInput.includes('neumonia')) {
        responseText = '🦠 La neumonía es una infección pulmonar que puede ser causada por bacterias, virus u hongos. Los síntomas incluyen fiebre alta, tos con flema, dolor en el pecho y dificultad para respirar. Es importante buscar atención médica inmediata.';
      } else {
        responseText = 'Gracias por tu consulta sobre enfermedades respiratorias. Te recomiendo proporcionar más detalles sobre tus síntomas. Puedo ayudarte con información sobre: asma, neumonía, bronquitis, COVID-19, gripe, y otros problemas respiratorios.';
      }

      const botMessage = {
        type: 'bot',
        text: responseText + '\n\n⚠️ Recuerda: Esta es información general. Para un diagnóstico preciso, consulta con un profesional de la salud.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      saveConversationHistory({ ...botMessage, sessionId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputText(suggestion);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const formatMessage = (text) => {
    if (!text) return '';
    
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/#{3}\s?(.*?)$/gm, '<h4>$1</h4>')
      .replace(/#{2}\s?(.*?)$/gm, '<h3>$1</h3>')
      .replace(/#{1}\s?(.*?)$/gm, '<h2>$1</h2>')
      .replace(/^•\s/gm, '• ')
      .replace(/^-\s/gm, '• ')
      .replace(/\n/g, '<br />');
    
    return formatted;
  };

  const renderFormattedMessage = (text) => {
    const formatted = formatMessage(text);
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <div className="chatbot-container enhanced">
      <div className="chatbot-header">
        <div className="header-content">
          <span className="header-icon">🤖</span>
          <div>
            <h3>{t('home.chatbotTitle')}</h3>
            <p className="header-subtitle">{t('home.chatbotSubtitle')}</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="history-button"
            onClick={() => setShowHistory(!showHistory)}
            title={t('home.chatbotHistory')}
          >
            📜
          </button>
          <div className="status-indicator online">
            <span className="status-dot"></span>
            {t('common.online') || 'En línea'}
          </div>
        </div>
      </div>

      {showHistory && conversationHistory.length > 0 && (
        <div className="conversation-history">
          <div className="history-header">
            <h4>{t('home.chatbotHistory')}</h4>
            <button onClick={() => setShowHistory(false)} aria-label={t('common.close')}>✕</button>
          </div>
          <div className="history-list">
            {conversationHistory.slice(-10).reverse().map((conv, idx) => (
              <div key={idx} className="history-item">
                <span className="history-type">{conv.type === 'user' ? '👤' : '🤖'}</span>
                <span className="history-text">{conv.text.substring(0, 50)}...</span>
                <span className="history-time">
                  {new Date(conv.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            <div className="message-avatar">
              {message.type === 'bot' ? '🤖' : '👤'}
            </div>
            <div className="message-content">
              <div className="message-text">{renderFormattedMessage(message.text)}</div>
              
              {/* SHAP Visualization */}
              {message.mlPrediction && message.explanation && (
                <div className="message-visualization">
                  <SHAPVisualization
                    explanation={message.explanation}
                    disease={message.mlPrediction.disease}
                    confidence={message.mlPrediction.confidence}
                  />
                </div>
              )}

              {/* Factor Chart */}
              {message.explanation?.friendly?.key_factors && (
                <div className="message-visualization">
                  <FactorChart
                    factors={message.explanation.friendly.key_factors}
                    type="bar"
                    title="Factores Clave del Diagnóstico"
                  />
                </div>
              )}

              {/* Button to view advanced ML results */}
              {message.mlPrediction && message.type === 'bot' && (
                <div className="message-actions" style={{ marginTop: '10px' }}>
                  <button
                    className="advanced-results-btn"
                    onClick={() => {
                      setShowAdvancedResults(true);
                      if (message.mlPrediction?.id || message.mlPrediction?.analysisId) {
                        setCurrentAnalysisId(message.mlPrediction.id || message.mlPrediction.analysisId);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    📊 Ver Resultados ML Avanzados
                  </button>
                </div>
              )}

              <div className="message-time">
                {message.timestamp.toLocaleTimeString('es-PE', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message bot">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Contextual Suggestions */}
      {suggestions.length > 0 && messages.length > 1 && (
        <div className="contextual-suggestions">
          <p className="suggestions-title">💡 {t('home.chatbotSuggestions')}:</p>
          <div className="suggestions-list">
            {suggestions.slice(0, 4).map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-btn"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced ML Results Modal/Overlay */}
      {showAdvancedResults && (currentAnalysisId || currentExperimentId || currentSessionId) && (
        <div className="advanced-results-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="advanced-results-container" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => {
                setShowAdvancedResults(false);
                setCurrentAnalysisId(null);
                setCurrentExperimentId(null);
                setCurrentSessionId(null);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <MLAdvancedResults
              analysisId={currentAnalysisId}
              experimentId={currentExperimentId}
              sessionId={currentSessionId}
            />
          </div>
        </div>
      )}

      <div className="chatbot-input">
        <button
          className={`voice-button ${isListening ? 'listening' : ''}`}
          onClick={isListening ? stopListening : startListening}
          title={isListening ? t('chatbot.stopListening') : t('home.chatbotVoice')}
          disabled={!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)}
          aria-label={isListening ? t('chatbot.stopListening') : t('home.chatbotVoice')}
        >
          {isListening ? '⏹️' : '🎤'}
        </button>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isListening ? t('chatbot.listening') : t('home.chatbotPlaceholder')}
          rows="2"
          disabled={isLoading || isListening}
        />
        <button 
          onClick={handleSend} 
          disabled={isLoading || !inputText.trim() || isListening}
          className="send-button"
          aria-label="Enviar mensaje"
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
}

export default ChatBotEnhanced;

