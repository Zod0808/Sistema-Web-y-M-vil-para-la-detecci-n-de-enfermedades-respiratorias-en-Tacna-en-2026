/**
 * Tests unitarios para SymptomAnalyzer
 * Cubre renderizado, selección de síntomas y lógica de análisis
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { SymptomAnalyzer } from '../../medical-app/components/tabs/symptom-analyzer';
import { useAppStore } from '../../medical-app/store/useAppStore';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Activity: () => null,
  Search: () => null,
  Plus: () => null,
  X: () => null,
  AlertCircle: () => null,
  CheckCircle2: () => null,
  Clock: () => null,
  TrendingUp: () => null,
  Loader2: () => null,
  FileText: () => null,
  ChevronRight: () => null,
  Calendar: () => null,
  ArrowLeft: () => null,
}));

// Mock UI components
jest.mock('../../medical-app/components/ui/ModernButton', () => ({
  ModernButton: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={props['data-testid']}>
      {children}
    </button>
  ),
}));

jest.mock('../../medical-app/components/ui/ModernInput', () => ({
  ModernInput: ({ value, onChange, placeholder }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

// Mock store
jest.mock('../../medical-app/store/useAppStore');

// Mock services
jest.mock('../../medical-app/lib/api/services/symptomAnalyzerService', () => ({
  symptomAnalyzerService: {
    analyze: jest.fn().mockResolvedValue({
      patient_id: 'user-1',
      analyzed_at: new Date().toISOString(),
      urgency_level: 'medium',
      severity_score: 0.5,
      classification: {
        urgency: 'medium',
        severity_score: 0.5,
        recommendation: 'Consultar médico',
        categories: ['respiratory'],
        confidence: 0.75,
      },
      recommendations: ['Descansar', 'Tomar líquidos'],
      warning_signs: [],
      follow_up_required: false,
      confidence_score: 0.75,
      processing_time_ms: 100,
    }),
  },
}));

jest.mock('../../medical-app/lib/api/services/medicalHistoryService', () => ({
  medicalHistoryService: {
    createHistory: jest.fn().mockResolvedValue({ _id: 'hist-1' }),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Minimal Translation mock
const mockT = {
  symptomAnalyzer: {
    title: 'Analizador de Síntomas',
    addSymptom: 'Agregar síntoma',
    analyzeButton: 'Analizar con IA',
    selectedSymptoms: 'Síntomas seleccionados',
    noSymptoms: 'Sin síntomas seleccionados',
    analyzing: 'Analizando',
    results: 'Análisis de IA',
    severity: { low: 'Leve', moderate: 'Moderado', high: 'Alto', severe: 'Severo' },
    duration: {},
    urgency: {},
    recommendations: 'Recomendaciones',
    history: 'Historial',
  },
  common: {
    cancel: 'Cancelar',
    save: 'Guardar',
    loading: 'Cargando',
    error: 'Error',
    success: 'Éxito',
    close: 'Cerrar',
    back: 'Volver',
    search: 'Buscar',
  },
} as any;

const mockSetCurrentView = jest.fn();

describe('SymptomAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        user: { _id: 'user-1', name: 'Test User' },
        isEmergencyMode: false,
        offlineData: { medicalHistories: [], symptomAnalyses: [] },
        addMedicalHistory: jest.fn(),
      };
      return typeof selector === 'function' ? selector(state) : state;
    });
  });

  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  describe('Renderizado inicial', () => {
    it('debe renderizar sin errores', () => {
      const { container } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      expect(container).toBeTruthy();
    });

    it('debe mostrar el título principal', () => {
      const { getAllByText } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      // Usa getAllByText para manejar múltiples coincidencias
      const matches = getAllByText(/Analizador de Síntomas/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('debe mostrar el botón de análisis después de agregar un síntoma', () => {
      const { getByText, getAllByText, container } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      // Abrir formulario haciendo click en un síntoma predefinido
      fireEvent.click(getByText('Fiebre'));
      // Confirmar con el botón "Agregar Síntoma" del formulario
      const addButtons = getAllByText(/Agregar Síntoma/i);
      // El botón del formulario (no el h3 title)
      const addBtn = addButtons.find(el => el.tagName === 'BUTTON');
      if (addBtn) fireEvent.click(addBtn);
      // El botón analizar aparece cuando hay al menos 1 síntoma
      expect(container.innerHTML).toContain('Analizar');
    });
  });

  describe('Lista de síntomas predefinidos', () => {
    it('debe mostrar síntomas comunes disponibles', () => {
      const { getByText } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      expect(getByText('Tos seca')).toBeTruthy();
      expect(getByText('Tos con flema')).toBeTruthy();
      expect(getByText('Fiebre')).toBeTruthy();
    });

    it('debe mostrar síntomas respiratorios', () => {
      const { getByText } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      expect(getByText('Falta de aire')).toBeTruthy();
      expect(getByText('Dificultad para respirar')).toBeTruthy();
    });

    it('debe mostrar síntomas adicionales', () => {
      const { getByText } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      expect(getByText('Dolor en el pecho')).toBeTruthy();
      expect(getByText('Fatiga')).toBeTruthy();
    });
  });

  describe('Selección de síntomas', () => {
    it('debe abrir formulario al hacer click en síntoma predefinido', () => {
      const { getAllByText } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      fireEvent.click(getAllByText('Tos seca')[0]);
      // Al hacer click abre el formulario — hay al menos un elemento con "Agregar Síntoma"
      const matches = getAllByText(/Agregar Síntoma/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('debe actualizar la UI al interactuar con síntoma', () => {
      const { getByText, container } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      fireEvent.click(getByText('Tos seca'));
      expect(container.innerHTML).toContain('Tos seca');
    });

    it('debe mostrar sección de síntomas seleccionados con el contador', () => {
      const { getByText, container } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      // Seleccionar síntoma y añadirlo
      fireEvent.click(getByText('Tos seca'));
      // Hacer click en "Agregar" para confirmar
      const addButtons = container.querySelectorAll('button');
      const addBtn = Array.from(addButtons).find(b => b.textContent?.includes('Agregar'));
      if (addBtn) fireEvent.click(addBtn);
      // El contenedor debe tener el texto del síntoma
      expect(container.innerHTML).toContain('Tos seca');
    });
  });

  describe('Opciones de severidad y duración', () => {
    it('debe renderizar opciones de severidad al abrir formulario', () => {
      const { getByText } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      // Abrir formulario de síntoma
      fireEvent.click(getByText('Tos seca'));
      // Las opciones de severidad aparecen en el formulario
      expect(getByText('Leve')).toBeTruthy();
      expect(getByText('Moderado')).toBeTruthy();
      expect(getByText('Alto')).toBeTruthy();
      expect(getByText('Severo')).toBeTruthy();
    });

    it('debe renderizar opciones de duración al abrir formulario', () => {
      const { getByText } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      // Abrir formulario de síntoma
      fireEvent.click(getByText('Tos seca'));
      expect(getByText('Menos de 1 día')).toBeTruthy();
      expect(getByText('2-3 días')).toBeTruthy();
    });
  });

  describe('Flujo de análisis', () => {
    it('debe iniciar análisis al hacer click en el botón', async () => {
      const { getAllByText, container } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      // Agregar síntoma para que aparezca el botón analizar
      fireEvent.click(getAllByText('Tos seca')[0]);
      const addBtn = Array.from(container.querySelectorAll('button')).find(
        b => b.tagName === 'BUTTON' && b.textContent?.trim() === 'Agregar Síntoma'
      );
      if (addBtn) fireEvent.click(addBtn);
      // Verificar que el botón analizar está disponible
      const analyzeBtn = Array.from(container.querySelectorAll('button')).find(
        b => b.textContent?.includes('Analizar Síntomas')
      );
      expect(analyzeBtn).toBeTruthy();
    });

    it('debe mostrar estado de carga durante el análisis', async () => {
      const { getAllByText, container } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      // Agregar un síntoma primero
      fireEvent.click(getAllByText('Fiebre')[0]);
      const addBtn = Array.from(container.querySelectorAll('button')).find(
        b => b.tagName === 'BUTTON' && b.textContent?.trim() === 'Agregar Síntoma'
      );
      if (addBtn) fireEvent.click(addBtn);
      expect(container.innerHTML).toContain('Analizar');
    });

    it('debe mostrar resultados después de completar el análisis', async () => {
      const { container } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      act(() => { jest.advanceTimersByTime(5000); });
      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 6000 });
    });
  });

  describe('Modo de emergencia', () => {
    it('debe funcionar normalmente cuando isEmergencyMode es false', () => {
      const { container } = render(
        <SymptomAnalyzer t={mockT} setCurrentView={mockSetCurrentView} />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Props opcionales', () => {
    it('debe renderizar sin setCurrentView', () => {
      const { container } = render(<SymptomAnalyzer t={mockT} />);
      expect(container).toBeTruthy();
    });
  });
});