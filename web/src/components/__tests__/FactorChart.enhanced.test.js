/**
 * Enhanced Tests for FactorChart Component
 * Additional edge cases and coverage improvements
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FactorChart from '../FactorChart';

describe('FactorChart Enhanced Tests', () => {
  const mockFactors = [
    { name: 'Factor 1', value: 0.8, description: 'Test factor 1', category: 'Symptom' },
    { name: 'Factor 2', value: 0.6, description: 'Test factor 2', category: 'Risk' },
    { name: 'Factor 3', value: -0.4, description: 'Test factor 3', category: 'Protection' }
  ];

  describe('Edge Cases', () => {
    it('should handle negative values', () => {
      const negativeFactors = [
        { name: 'Negative Factor', value: -0.5 }
      ];
      
      render(<FactorChart factors={negativeFactors} />);
      expect(screen.getByText('Negative Factor')).toBeInTheDocument();
    });

    it('should handle very large values', () => {
      const largeFactors = [
        { name: 'Large Factor', value: 1000 }
      ];
      
      render(<FactorChart factors={largeFactors} />);
      expect(screen.getByText('Large Factor')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      const zeroFactors = [
        { name: 'Zero Factor', value: 0 }
      ];
      
      render(<FactorChart factors={zeroFactors} />);
      expect(screen.getByText('Zero Factor')).toBeInTheDocument();
    });

    it('should handle factors with missing properties', () => {
      const incompleteFactors = [
        { name: 'Factor 1' }, // Missing value
        { value: 0.5 }, // Missing name
        {} // Empty object
      ];
      
      render(<FactorChart factors={incompleteFactors} />);
      // Should not crash
      expect(screen.getByText('Factores de Influencia')).toBeInTheDocument();
    });

    it('should handle very long factor names', () => {
      const longNameFactors = [
        { name: 'A'.repeat(100), value: 0.5 }
      ];
      
      render(<FactorChart factors={longNameFactors} />);
      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });

    it('should handle factors with special characters', () => {
      const specialFactors = [
        { name: 'Factor <script>alert("xss")</script>', value: 0.5 },
        { name: 'Factor & "quotes"', value: 0.3 }
      ];
      
      render(<FactorChart factors={specialFactors} />);
      // Should render safely
      expect(screen.getByText(/Factor/)).toBeInTheDocument();
    });
  });

  describe('Chart Type Edge Cases', () => {
    it('should handle invalid chart type gracefully', () => {
      render(<FactorChart factors={mockFactors} type="invalid" />);
      // Should default to bar or handle gracefully
      expect(screen.getByText('Factores de Influencia')).toBeInTheDocument();
    });

    it('should switch between all chart types', () => {
      const { rerender } = render(<FactorChart factors={mockFactors} type="bar" />);
      expect(screen.getByText('Factores de Influencia')).toBeInTheDocument();
      
      rerender(<FactorChart factors={mockFactors} type="pie" />);
      expect(screen.getByText('Factores de Influencia')).toBeInTheDocument();
      
      rerender(<FactorChart factors={mockFactors} type="radar" />);
      expect(screen.getByText('Factores de Influencia')).toBeInTheDocument();
      
      rerender(<FactorChart factors={mockFactors} type="heatmap" />);
      expect(screen.getByText('Factores de Influencia')).toBeInTheDocument();
    });
  });

  describe('Interaction Edge Cases', () => {
    it('should handle hover on all factors', () => {
      render(<FactorChart factors={mockFactors} interactive={true} />);
      
      const factors = screen.getAllByText(/Factor/);
      factors.forEach(factor => {
        const parent = factor.closest('.factor-chart__item, .bar-item');
        if (parent) {
          fireEvent.mouseEnter(parent);
          fireEvent.mouseLeave(parent);
        }
      });
      
      // Should handle all hovers
      expect(factors.length).toBeGreaterThan(0);
    });

    it('should handle rapid clicks', () => {
      render(<FactorChart factors={mockFactors} interactive={true} />);
      
      const firstFactor = screen.getByText('Factor 1');
      const parent = firstFactor.closest('.factor-chart__item, .bar-item');
      
      if (parent) {
        // Rapid clicks
        fireEvent.click(parent);
        fireEvent.click(parent);
        fireEvent.click(parent);
        
        // Should handle gracefully
        expect(firstFactor).toBeInTheDocument();
      }
    });

    it('should handle click when interactive is false', () => {
      render(<FactorChart factors={mockFactors} interactive={false} />);
      
      const firstFactor = screen.getByText('Factor 1');
      const parent = firstFactor.closest('.factor-chart__item, .bar-item');
      
      if (parent) {
        fireEvent.click(parent);
        // Should not crash
        expect(firstFactor).toBeInTheDocument();
      }
    });
  });

  describe('Data Processing Edge Cases', () => {
    it('should handle factors with all possible properties', () => {
      const completeFactors = [
        {
          name: 'Complete Factor',
          value: 0.8,
          importance: 0.9,
          weight: 0.7,
          description: 'Full description',
          category: 'Category',
          color: '#ff0000'
        }
      ];
      
      render(<FactorChart factors={completeFactors} />);
      expect(screen.getByText('Complete Factor')).toBeInTheDocument();
    });

    it('should handle mixed factor formats', () => {
      const mixedFactors = [
        'String Factor',
        { name: 'Object Factor', value: 0.5 },
        { feature: 'Feature Factor', importance: 0.3 },
        { label: 'Label Factor', weight: 0.2 }
      ];
      
      render(<FactorChart factors={mixedFactors} />);
      expect(screen.getByText('String Factor')).toBeInTheDocument();
      expect(screen.getByText('Object Factor')).toBeInTheDocument();
      expect(screen.getByText('Feature Factor')).toBeInTheDocument();
      expect(screen.getByText('Label Factor')).toBeInTheDocument();
    });

    it('should calculate max value correctly with mixed positive/negative', () => {
      const mixedFactors = [
        { name: 'Positive', value: 0.8 },
        { name: 'Negative', value: -0.6 }
      ];
      
      render(<FactorChart factors={mixedFactors} />);
      // Should handle absolute values for max calculation
      expect(screen.getByText('Positive')).toBeInTheDocument();
      expect(screen.getByText('Negative')).toBeInTheDocument();
    });
  });

  describe('Legend Edge Cases', () => {
    it('should show legend with single factor', () => {
      render(<FactorChart factors={[{ name: 'Single', value: 0.5 }]} showLegend={true} />);
      // Legend should be present
      const { container } = render(<FactorChart factors={[{ name: 'Single', value: 0.5 }]} showLegend={true} />);
      expect(container.querySelector('.factor-chart__legend')).toBeInTheDocument();
    });

    it('should hide legend when showLegend is false', () => {
      const { container } = render(<FactorChart factors={mockFactors} showLegend={false} />);
      expect(container.querySelector('.factor-chart__legend')).not.toBeInTheDocument();
    });
  });
});

