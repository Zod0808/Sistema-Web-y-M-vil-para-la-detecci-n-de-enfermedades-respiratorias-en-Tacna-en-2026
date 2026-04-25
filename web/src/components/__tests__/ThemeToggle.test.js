/**
 * Tests for ThemeToggle Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../ThemeProvider';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'light'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('light');
  });

  it('should render theme toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should display light mode icon when in light mode', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    expect(screen.getByText('🌙')).toBeInTheDocument();
    expect(screen.getByText('Modo oscuro')).toBeInTheDocument();
  });

  it('should toggle theme when clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // After toggle, should show dark mode
    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText('Modo claro')).toBeInTheDocument();
  });

  it('should have proper ARIA label', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Cambiar a tema oscuro');
  });

  it('should update ARIA label after toggle', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(button).toHaveAttribute('aria-label', 'Cambiar a tema claro');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle className="custom-class" />
      </ThemeProvider>
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have title attribute', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Cambiar a tema oscuro');
  });

  it('should save theme preference to localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'dark');
  });
});

