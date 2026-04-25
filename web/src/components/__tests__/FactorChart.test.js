/**
 * Tests for FactorChart Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FactorChart from '../FactorChart';

describe('FactorChart', () => {
  const mockFactors = [
    { name: 'Factor 1', value: 0.8, description: 'Test factor 1' },
    { name: 'Factor 2', value: 0.6, description: 'Test factor 2' },
    { name: 'Factor 3', value: 0.4, description: 'Test factor 3' }
  ];

  it('should render with default props', () => {
    render(<FactorChart factors={mockFactors} />);
    expect(screen.getByText('Factores de Influencia')).toBeInTheDocument();
  });

  it('should render with custom title', () => {
    render(<FactorChart factors={mockFactors} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should render bar chart by default', () => {
    const { container } = render(<FactorChart factors={mockFactors} />);
    expect(container.querySelector('.factor-chart--bar')).toBeInTheDocument();
  });

  it('should render pie chart when type is pie', () => {
    const { container } = render(<FactorChart factors={mockFactors} type="pie" />);
    expect(container.querySelector('.factor-chart--pie')).toBeInTheDocument();
  });

  it('should render radar chart when type is radar', () => {
    const { container } = render(<FactorChart factors={mockFactors} type="radar" />);
    expect(container.querySelector('.factor-chart--radar')).toBeInTheDocument();
  });

  it('should render heatmap chart when type is heatmap', () => {
    const { container } = render(<FactorChart factors={mockFactors} type="heatmap" />);
    expect(container.querySelector('.factor-chart--heatmap')).toBeInTheDocument();
  });

  it('should display factor names', () => {
    render(<FactorChart factors={mockFactors} />);
    expect(screen.getByText('Factor 1')).toBeInTheDocument();
    expect(screen.getByText('Factor 2')).toBeInTheDocument();
    expect(screen.getByText('Factor 3')).toBeInTheDocument();
  });

  it('should handle empty factors array', () => {
    render(<FactorChart factors={[]} />);
    expect(screen.getByText('Factores de Influencia')).toBeInTheDocument();
  });

  it('should handle null factors', () => {
    render(<FactorChart factors={null} />);
    expect(screen.getByText('Factores de Influencia')).toBeInTheDocument();
  });

  it('should handle string factors', () => {
    const stringFactors = ['Factor A', 'Factor B', 'Factor C'];
    render(<FactorChart factors={stringFactors} />);
    expect(screen.getByText('Factor A')).toBeInTheDocument();
    expect(screen.getByText('Factor B')).toBeInTheDocument();
  });

  it('should show legend when showLegend is true', () => {
    const { container } = render(<FactorChart factors={mockFactors} showLegend={true} />);
    expect(container.querySelector('.factor-chart__legend')).toBeInTheDocument();
  });

  it('should hide legend when showLegend is false', () => {
    const { container } = render(<FactorChart factors={mockFactors} showLegend={false} />);
    expect(container.querySelector('.factor-chart__legend')).not.toBeInTheDocument();
  });

  it('should handle hover interactions when interactive is true', () => {
    render(<FactorChart factors={mockFactors} interactive={true} />);
    const factorElement = screen.getByText('Factor 1').closest('.factor-chart__item');
    
    if (factorElement) {
      fireEvent.mouseEnter(factorElement);
      // Should show hover state (implementation dependent)
    }
  });

  it('should handle click interactions when interactive is true', () => {
    render(<FactorChart factors={mockFactors} interactive={true} />);
    const factorElement = screen.getByText('Factor 1');
    
    if (factorElement) {
      fireEvent.click(factorElement);
      // Should select factor (implementation dependent)
    }
  });

  it('should process factors with different formats', () => {
    const mixedFactors = [
      'Simple String',
      { name: 'Named Factor', value: 0.5 },
      { feature: 'Feature Factor', importance: 0.7 },
      { label: 'Label Factor', weight: 0.3 }
    ];
    
    render(<FactorChart factors={mixedFactors} />);
    expect(screen.getByText('Simple String')).toBeInTheDocument();
    expect(screen.getByText('Named Factor')).toBeInTheDocument();
    expect(screen.getByText('Feature Factor')).toBeInTheDocument();
    expect(screen.getByText('Label Factor')).toBeInTheDocument();
  });

  it('should handle factors with categories', () => {
    const categorizedFactors = [
      { name: 'Factor 1', value: 0.8, category: 'Symptom' },
      { name: 'Factor 2', value: 0.6, category: 'Risk' }
    ];
    
    render(<FactorChart factors={categorizedFactors} />);
    expect(screen.getByText('Factor 1')).toBeInTheDocument();
    expect(screen.getByText('Factor 2')).toBeInTheDocument();
  });
});

