/**
 * Tests for LanguageSelector Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LanguageSelector from '../LanguageSelector';
import * as i18nService from '../../services/i18nService';

// Mock i18n service
jest.mock('../../services/i18nService', () => ({
  t: jest.fn((key) => key),
  setLanguage: jest.fn(),
  getCurrentLanguage: jest.fn(() => 'es'),
  SUPPORTED_LANGUAGES: {
    es: 'Español',
    en: 'English',
    pt: 'Português',
    fr: 'Français',
    qu: 'Quechua'
  }
}));

describe('LanguageSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18nService.getCurrentLanguage.mockReturnValue('es');
  });

  it('should render language selector button', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /seleccionar idioma/i })).toBeInTheDocument();
  });

  it('should display current language', () => {
    render(<LanguageSelector />);
    expect(screen.getByText('Español')).toBeInTheDocument();
  });

  it('should open dropdown when button is clicked', () => {
    render(<LanguageSelector />);
    const button = screen.getByRole('button', { name: /seleccionar idioma/i });
    
    fireEvent.click(button);
    
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Português')).toBeInTheDocument();
  });

  it('should close dropdown when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <LanguageSelector />
      </div>
    );
    
    const button = screen.getByRole('button', { name: /seleccionar idioma/i });
    fireEvent.click(button);
    
    expect(screen.getByText('English')).toBeInTheDocument();
    
    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);
    
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  it('should call setLanguage when a language is selected', () => {
    render(<LanguageSelector />);
    const button = screen.getByRole('button', { name: /seleccionar idioma/i });
    
    fireEvent.click(button);
    
    const englishOption = screen.getByRole('button', { name: /seleccionar english/i });
    fireEvent.click(englishOption);
    
    expect(i18nService.setLanguage).toHaveBeenCalledWith('en');
  });

  it('should close dropdown after selecting a language', () => {
    render(<LanguageSelector />);
    const button = screen.getByRole('button', { name: /seleccionar idioma/i });
    
    fireEvent.click(button);
    const englishOption = screen.getByRole('button', { name: /seleccionar english/i });
    fireEvent.click(englishOption);
    
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  it('should show checkmark for current language', () => {
    render(<LanguageSelector />);
    const button = screen.getByRole('button', { name: /seleccionar idioma/i });
    
    fireEvent.click(button);
    
    const spanishOption = screen.getByRole('button', { name: /seleccionar español/i });
    expect(spanishOption).toHaveClass('active');
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should handle language change event', () => {
    const { rerender } = render(<LanguageSelector />);
    
    // Simulate language change event
    const event = new CustomEvent('languageChanged', {
      detail: { language: 'en' }
    });
    window.dispatchEvent(event);
    
    rerender(<LanguageSelector />);
    
    // Component should update to show new language
    expect(i18nService.getCurrentLanguage).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(<LanguageSelector className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper ARIA attributes', () => {
    render(<LanguageSelector />);
    const button = screen.getByRole('button', { name: /seleccionar idioma/i });
    
    expect(button).toHaveAttribute('aria-label');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'true');
  });

  it('should update aria-expanded when dropdown opens', () => {
    render(<LanguageSelector />);
    const button = screen.getByRole('button', { name: /seleccionar idioma/i });
    
    fireEvent.click(button);
    
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

