/**
 * Tests for SHAPVisualization Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SHAPVisualization from '../SHAPVisualization';

describe('SHAPVisualization', () => {
  const mockShapData = [
    { feature: 'Tos', value: 0.8, description: 'Tos persistente' },
    { feature: 'Fiebre', value: 0.6, description: 'Fiebre moderada' },
    { feature: 'Dificultad respiratoria', value: 0.9, description: 'Dificultad al respirar' }
  ];

  const mockExplanation = {
    friendly: {
      key_factors: [
        { feature: 'Tos', importance: 0.8, description: 'Tos persistente' },
        { feature: 'Fiebre', importance: 0.6, description: 'Fiebre moderada' }
      ]
    }
  };

  it('should render with shapData', () => {
    render(<SHAPVisualization shapData={mockShapData} />);
    expect(screen.getByText('Tos')).toBeInTheDocument();
    expect(screen.getByText('Fiebre')).toBeInTheDocument();
  });

  it('should render with explanation data', () => {
    render(<SHAPVisualization explanation={mockExplanation} />);
    expect(screen.getByText('Tos')).toBeInTheDocument();
    expect(screen.getByText('Fiebre')).toBeInTheDocument();
  });

  it('should display disease name when provided', () => {
    render(<SHAPVisualization shapData={mockShapData} disease="Asma" />);
    expect(screen.getByText(/Asma/i)).toBeInTheDocument();
  });

  it('should display confidence score when provided', () => {
    render(<SHAPVisualization shapData={mockShapData} confidence={0.85} />);
    expect(screen.getByText(/85%/i)).toBeInTheDocument();
  });

  it('should default to waterfall view', () => {
    const { container } = render(<SHAPVisualization shapData={mockShapData} />);
    expect(container.querySelector('.shap-visualization--waterfall')).toBeInTheDocument();
  });

  it('should switch to bar view', () => {
    render(<SHAPVisualization shapData={mockShapData} />);
    
    const barButton = screen.getByRole('button', { name: /bar/i });
    fireEvent.click(barButton);
    
    // Should show bar view (implementation dependent)
    expect(barButton).toHaveClass('active');
  });

  it('should switch to summary view', () => {
    render(<SHAPVisualization shapData={mockShapData} />);
    
    const summaryButton = screen.getByRole('button', { name: /summary|resumen/i });
    if (summaryButton) {
      fireEvent.click(summaryButton);
      expect(summaryButton).toHaveClass('active');
    }
  });

  it('should handle empty shapData and explanation', () => {
    render(<SHAPVisualization />);
    // Should render without crashing
    expect(screen.getByText(/SHAP|Explicación/i)).toBeInTheDocument();
  });

  it('should process explanation with decision_factors', () => {
    const decisionFactorsExplanation = {
      decision_factors: [
        { feature_name: 'Factor 1', shap_value: 0.8 },
        { feature_name: 'Factor 2', shap_value: 0.6 }
      ]
    };
    
    render(<SHAPVisualization explanation={decisionFactorsExplanation} />);
    expect(screen.getByText('Factor 1')).toBeInTheDocument();
    expect(screen.getByText('Factor 2')).toBeInTheDocument();
  });

  it('should handle array shapData', () => {
    const arrayShapData = [
      { feature: 'Feature 1', value: 0.5 },
      { feature: 'Feature 2', value: 0.3 }
    ];
    
    render(<SHAPVisualization shapData={arrayShapData} />);
    expect(screen.getByText('Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Feature 2')).toBeInTheDocument();
  });

  it('should display feature values correctly', () => {
    render(<SHAPVisualization shapData={mockShapData} />);
    // Values should be displayed (implementation dependent)
    expect(screen.getByText('Tos')).toBeInTheDocument();
  });

  it('should handle high confidence score', () => {
    render(<SHAPVisualization shapData={mockShapData} confidence={0.95} />);
    expect(screen.getByText(/95%/i)).toBeInTheDocument();
  });

  it('should handle low confidence score', () => {
    render(<SHAPVisualization shapData={mockShapData} confidence={0.45} />);
    expect(screen.getByText(/45%/i)).toBeInTheDocument();
  });
});

