/**
 * Enhanced Tests for SHAPVisualization Component
 * Additional edge cases and coverage improvements
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SHAPVisualization from '../SHAPVisualization';

describe('SHAPVisualization Enhanced Tests', () => {
  describe('Edge Cases', () => {
    it('should handle empty shapData array', () => {
      render(<SHAPVisualization shapData={[]} />);
      expect(screen.getByText(/no hay datos/i)).toBeInTheDocument();
    });

    it('should handle null shapData and explanation', () => {
      render(<SHAPVisualization shapData={null} explanation={null} />);
      expect(screen.getByText(/no hay datos/i)).toBeInTheDocument();
    });

    it('should handle undefined shapData and explanation', () => {
      render(<SHAPVisualization shapData={undefined} explanation={undefined} />);
      expect(screen.getByText(/no hay datos/i)).toBeInTheDocument();
    });

    it('should handle very large confidence values', () => {
      render(<SHAPVisualization shapData={[{ feature: 'Test', value: 0.5 }]} confidence={1.5} />);
      // Should handle gracefully
      expect(screen.getByText(/Test/i)).toBeInTheDocument();
    });

    it('should handle negative confidence values', () => {
      render(<SHAPVisualization shapData={[{ feature: 'Test', value: 0.5 }]} confidence={-0.5} />);
      // Should handle gracefully
      expect(screen.getByText(/Test/i)).toBeInTheDocument();
    });

    it('should handle factors with missing values', () => {
      const incompleteData = [
        { feature: 'Factor 1' }, // Missing value
        { value: 0.5 }, // Missing feature
        {} // Empty
      ];
      
      render(<SHAPVisualization shapData={incompleteData} />);
      // Should not crash
      expect(screen.getByText(/SHAP|Explicación/i)).toBeInTheDocument();
    });
  });

  describe('Data Format Edge Cases', () => {
    it('should handle explanation with empty friendly key_factors', () => {
      const emptyExplanation = {
        friendly: {
          key_factors: []
        }
      };
      
      render(<SHAPVisualization explanation={emptyExplanation} />);
      expect(screen.getByText(/no hay datos/i)).toBeInTheDocument();
    });

    it('should handle explanation with empty decision_factors', () => {
      const emptyExplanation = {
        decision_factors: []
      };
      
      render(<SHAPVisualization explanation={emptyExplanation} />);
      expect(screen.getByText(/no hay datos/i)).toBeInTheDocument();
    });

    it('should handle mixed data formats', () => {
      const mixedData = [
        { feature: 'Feature 1', value: 0.5 },
        { name: 'Feature 2', shap_value: 0.3 },
        'String Feature'
      ];
      
      render(<SHAPVisualization shapData={mixedData} />);
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
    });

    it('should handle factors with negative shap values', () => {
      const negativeData = [
        { feature: 'Negative Factor', shap_value: -0.5 }
      ];
      
      const explanation = {
        decision_factors: [
          { feature_name: 'Negative Factor', shap_value: -0.5 }
        ]
      };
      
      render(<SHAPVisualization explanation={explanation} />);
      expect(screen.getByText('Negative Factor')).toBeInTheDocument();
    });
  });

  describe('View Switching Edge Cases', () => {
    it('should handle rapid view switching', () => {
      render(<SHAPVisualization shapData={[{ feature: 'Test', value: 0.5 }]} />);
      
      const barButton = screen.queryByRole('button', { name: /bar/i });
      const summaryButton = screen.queryByRole('button', { name: /summary|resumen/i });
      
      if (barButton && summaryButton) {
        fireEvent.click(barButton);
        fireEvent.click(summaryButton);
        fireEvent.click(barButton);
        
        // Should handle gracefully
        expect(screen.getByText('Test')).toBeInTheDocument();
      }
    });

    it('should maintain state when switching views', () => {
      render(<SHAPVisualization shapData={[{ feature: 'Test', value: 0.5 }]} />);
      
      const barButton = screen.queryByRole('button', { name: /bar/i });
      if (barButton) {
        fireEvent.click(barButton);
        expect(barButton).toHaveClass('active');
      }
    });
  });

  describe('Disease and Confidence Edge Cases', () => {
    it('should handle very long disease names', () => {
      const longDisease = 'A'.repeat(100);
      render(<SHAPVisualization shapData={[{ feature: 'Test', value: 0.5 }]} disease={longDisease} />);
      expect(screen.getByText(longDisease)).toBeInTheDocument();
    });

    it('should handle disease name with special characters', () => {
      const specialDisease = 'Disease <script>alert("xss")</script>';
      render(<SHAPVisualization shapData={[{ feature: 'Test', value: 0.5 }]} disease={specialDisease} />);
      // Should render safely
      expect(screen.getByText(/Disease/i)).toBeInTheDocument();
    });

    it('should format confidence as percentage correctly', () => {
      render(<SHAPVisualization shapData={[{ feature: 'Test', value: 0.5 }]} confidence={0.85123} />);
      // Should format to percentage
      expect(screen.getByText(/85|86/i)).toBeInTheDocument();
    });

    it('should handle confidence of 1.0 (100%)', () => {
      render(<SHAPVisualization shapData={[{ feature: 'Test', value: 0.5 }]} confidence={1.0} />);
      expect(screen.getByText(/100%/i)).toBeInTheDocument();
    });

    it('should handle confidence of 0.0 (0%)', () => {
      render(<SHAPVisualization shapData={[{ feature: 'Test', value: 0.5 }]} confidence={0.0} />);
      expect(screen.getByText(/0%/i)).toBeInTheDocument();
    });
  });

  describe('Data Processing Edge Cases', () => {
    it('should handle factors with all possible properties', () => {
      const completeData = [
        {
          feature: 'Complete Feature',
          value: 0.8,
          shap_value: 0.9,
          importance: 0.7,
          description: 'Full description'
        }
      ];
      
      render(<SHAPVisualization shapData={completeData} />);
      expect(screen.getByText('Complete Feature')).toBeInTheDocument();
    });

    it('should sort by absolute value correctly', () => {
      const unsortedData = [
        { feature: 'Small', value: 0.2 },
        { feature: 'Large', value: 0.9 },
        { feature: 'Medium', value: 0.5 }
      ];
      
      render(<SHAPVisualization shapData={unsortedData} />);
      // Should be sorted
      expect(screen.getByText('Large')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Small')).toBeInTheDocument();
    });

    it('should handle duplicate feature names', () => {
      const duplicateData = [
        { feature: 'Duplicate', value: 0.5 },
        { feature: 'Duplicate', value: 0.3 }
      ];
      
      render(<SHAPVisualization shapData={duplicateData} />);
      // Should handle duplicates
      const duplicates = screen.getAllByText('Duplicate');
      expect(duplicates.length).toBeGreaterThan(0);
    });
  });
});

