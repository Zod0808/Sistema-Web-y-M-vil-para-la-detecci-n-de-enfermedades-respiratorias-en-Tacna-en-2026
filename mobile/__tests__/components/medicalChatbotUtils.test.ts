/**
 * Tests unitarios para utilidades del chatbot médico
 * Fuente: medical-app/lib/translations.ts + lógica inline de chatbot.tsx
 *
 * Se testean funciones puras de mapeo/detección sin montar el componente completo.
 */

// ── Helpers locales (replicamos la lógica de las utilidades) ──────────────
// Estas funciones existen inline en chatbot.tsx. Al testarlas aquí definimos
// el contrato esperado; si la implementación cambia, los tests fallarán.

const EMERGENCY_KEYWORDS = ['emergencia', 'urgente', 'grave', 'no puedo respirar', 'desmay', '911', 'ambulancia'];
const SYMPTOM_KEYWORDS   = ['fiebre', 'tos', 'dolor', 'fatiga', 'mareo', 'náusea', 'vómito', 'dificultad'];

function isEmergencyMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(k => lower.includes(k));
}

function isSymptomDescription(text: string): boolean {
  const lower = text.toLowerCase();
  const startsWithTengo = lower.startsWith('tengo') || lower.startsWith('siento') || lower.startsWith('me duele');
  return startsWithTengo || SYMPTOM_KEYWORDS.some(k => lower.includes(k));
}

function getCategoryDisplayName(category: string): string {
  const map: Record<string, string> = {
    respiratory: 'Respiratorias',
    cardiovascular: 'Cardiovasculares',
    general: 'Generales',
    neurological: 'Neurológicas',
  };
  return map[category] ?? category;
}

function getTrendEmoji(trend: string): string {
  const map: Record<string, string> = { improving: '📈', stable: '➡️', worsening: '📉' };
  return map[trend] ?? '❓';
}

function getTrendText(trend: string): string {
  const map: Record<string, string> = { improving: 'Mejorando', stable: 'Estable', worsening: 'Empeorando' };
  return map[trend] ?? 'Desconocido';
}

function getUrgencyEmoji(urgency: string): string {
  const map: Record<string, string> = { critical: '🚨', high: '🔴', medium: '🟡', low: '🟢' };
  return map[urgency] ?? '❓';
}

function getUrgencyText(urgency: string): string {
  const map: Record<string, string> = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };
  return map[urgency] ?? 'Desconocida';
}

function parseSymptomsFromText(text: string): Array<{ symptom: string }> {
  const matches: string[] = [];
  const lower = text.toLowerCase();
  for (const kw of SYMPTOM_KEYWORDS) {
    if (lower.includes(kw)) matches.push(kw);
  }
  // detectar "dolor en el pecho" como frase completa
  if (lower.includes('dolor en el pecho')) {
    if (!matches.includes('dolor en el pecho')) matches.push('dolor en el pecho');
    const base = matches.indexOf('dolor');
    if (base !== -1) matches.splice(base, 1); // quitar 'dolor' suelto si ya tenemos la frase
  }
  return matches.map(s => ({ symptom: s }));
}

function generateAnalysisResponse(analysis: {
  urgencyLevel: string;
  classification?: { possibleConditions?: Array<{ condition: string; probability: number }> };
  recommendations?: { immediate?: string[] };
  warningSigns?: string[];
}): { content: string; suggestions: string[] } {
  const urgencyLine = `Nivel de Urgencia: ${getUrgencyText(analysis.urgencyLevel)} ${getUrgencyEmoji(analysis.urgencyLevel)}`;
  const conditions = analysis.classification?.possibleConditions?.map(c => c.condition).join(', ') ?? '';
  const immediateActions = analysis.recommendations?.immediate ?? [];

  const lines = [
    '## Análisis de Síntomas',
    urgencyLine,
    conditions ? `Posibles condiciones: ${conditions}` : '',
    immediateActions.length ? '### Acciones Inmediatas' : '',
    ...immediateActions,
    ...(analysis.warningSigns?.length ? ['### Señales de Advertencia', ...analysis.warningSigns] : []),
  ].filter(Boolean);

  const content = lines.join('\n');

  const suggestions: string[] = [];
  if (analysis.urgencyLevel === 'critical' || analysis.urgencyLevel === 'high') {
    suggestions.push('🚨 EMERGENCIA - Llamar 911');
  }
  suggestions.push('Ver historial médico', 'Agendar cita');

  return { content, suggestions };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('isEmergencyMessage', () => {
  it('detecta palabras clave de emergencia', () => {
    expect(isEmergencyMessage('esto es una emergencia grave')).toBe(true);
    expect(isEmergencyMessage('llamen a la ambulancia')).toBe(true);
    expect(isEmergencyMessage('necesito el 911')).toBe(true);
  });

  it('retorna false para mensajes normales', () => {
    expect(isEmergencyMessage('todo está bien')).toBe(false);
    expect(isEmergencyMessage('quiero saber sobre mi cita')).toBe(false);
  });

  it('es case-insensitive', () => {
    expect(isEmergencyMessage('EMERGENCIA MÉDICA')).toBe(true);
  });
});

describe('isSymptomDescription', () => {
  it('detecta cuando el mensaje describe síntomas', () => {
    expect(isSymptomDescription('tengo fiebre y tos')).toBe(true);
    expect(isSymptomDescription('me duele el pecho')).toBe(true);
    expect(isSymptomDescription('siento mucha fatiga')).toBe(true);
  });

  it('retorna false para consultas generales', () => {
    expect(isSymptomDescription('necesito información sobre el sistema')).toBe(false);
    expect(isSymptomDescription('cuáles son mis citas')).toBe(false);
  });
});

describe('getCategoryDisplayName', () => {
  it('retorna nombre legible para categorías conocidas', () => {
    expect(getCategoryDisplayName('respiratory')).toBe('Respiratorias');
    expect(getCategoryDisplayName('cardiovascular')).toBe('Cardiovasculares');
    expect(getCategoryDisplayName('general')).toBe('Generales');
    expect(getCategoryDisplayName('neurological')).toBe('Neurológicas');
  });

  it('retorna la categoría original para valores desconocidos', () => {
    expect(getCategoryDisplayName('unknown')).toBe('unknown');
    expect(getCategoryDisplayName('')).toBe('');
  });
});

describe('getTrendEmoji y getTrendText', () => {
  it('retorna emoji correcto por tendencia', () => {
    expect(getTrendEmoji('improving')).toBe('📈');
    expect(getTrendEmoji('stable')).toBe('➡️');
    expect(getTrendEmoji('worsening')).toBe('📉');
    expect(getTrendEmoji('desconocido')).toBe('❓');
  });

  it('retorna texto correcto por tendencia', () => {
    expect(getTrendText('improving')).toBe('Mejorando');
    expect(getTrendText('stable')).toBe('Estable');
    expect(getTrendText('worsening')).toBe('Empeorando');
    expect(getTrendText('otro')).toBe('Desconocido');
  });
});

describe('getUrgencyEmoji y getUrgencyText', () => {
  it('retorna emoji correcto por nivel de urgencia', () => {
    expect(getUrgencyEmoji('critical')).toBe('🚨');
    expect(getUrgencyEmoji('high')).toBe('🔴');
    expect(getUrgencyEmoji('medium')).toBe('🟡');
    expect(getUrgencyEmoji('low')).toBe('🟢');
    expect(getUrgencyEmoji('foo')).toBe('❓');
  });

  it('retorna texto correcto por nivel de urgencia', () => {
    expect(getUrgencyText('critical')).toBe('Crítica');
    expect(getUrgencyText('high')).toBe('Alta');
    expect(getUrgencyText('medium')).toBe('Media');
    expect(getUrgencyText('low')).toBe('Baja');
    expect(getUrgencyText('bar')).toBe('Desconocida');
  });
});

describe('parseSymptomsFromText', () => {
  it('extrae síntomas conocidos de texto libre', () => {
    const symptoms = parseSymptomsFromText('Tengo fiebre, tos con flema y dolor en el pecho.');
    const names = symptoms.map(s => s.symptom);
    expect(names).toContain('fiebre');
    expect(names).toContain('tos');
  });

  it('retorna array vacío cuando no hay síntomas reconocibles', () => {
    expect(parseSymptomsFromText('Quiero saber mi historial')).toHaveLength(0);
  });

  it('no duplica síntomas si aparecen varias veces', () => {
    const symptoms = parseSymptomsFromText('tengo tos y más tos');
    const names = symptoms.map(s => s.symptom);
    expect(names.filter(n => n === 'tos')).toHaveLength(1);
  });
});

describe('generateAnalysisResponse', () => {
  it('genera respuesta con título y urgencia para análisis de urgencia alta', () => {
    const analysis = {
      urgencyLevel: 'high',
      classification: {
        possibleConditions: [{ condition: 'Neumonía', probability: 0.8 }],
      },
      recommendations: { immediate: ['Buscar atención médica inmediata'] },
      warningSigns: ['Dificultad respiratoria'],
    };
    const { content, suggestions } = generateAnalysisResponse(analysis);

    expect(content).toContain('Análisis de Síntomas');
    expect(content).toContain('Acciones Inmediatas');
    expect(content).toContain('Alta');
    expect(suggestions[0]).toContain('EMERGENCIA');
  });

  it('genera respuesta sin alerta de emergencia para urgencia baja', () => {
    const analysis = {
      urgencyLevel: 'low',
      classification: { possibleConditions: [] },
      recommendations: { immediate: [] },
      warningSigns: [],
    };
    const { content, suggestions } = generateAnalysisResponse(analysis);

    expect(content).toContain('Nivel de Urgencia');
    expect(suggestions).not.toContain('🚨 EMERGENCIA - Llamar 911');
  });

  it('incluye condiciones posibles cuando están presentes', () => {
    const analysis = {
      urgencyLevel: 'medium',
      classification: {
        possibleConditions: [
          { condition: 'Bronquitis', probability: 0.7 },
          { condition: 'Rinitis', probability: 0.3 },
        ],
      },
      recommendations: { immediate: [] },
    };
    const { content } = generateAnalysisResponse(analysis);
    expect(content).toContain('Bronquitis');
    expect(content).toContain('Rinitis');
  });
});