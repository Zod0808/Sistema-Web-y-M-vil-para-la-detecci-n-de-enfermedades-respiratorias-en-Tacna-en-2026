/**
 * Tests for ThemeProvider Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useThemeContext } from '../ThemeProvider';
import { getTheme } from '../../theme/theme';

// Mock theme
jest.mock('../../theme/theme', () => ({
  getTheme: jest.fn((mode) => ({
    palette: {
      primary: { main: mode === 'light' ? '#1976d2' : '#90caf9' },
      background: { default: mode === 'light' ? '#ffffff' : '#121212' },
      text: {
        primary: mode === 'light' ? '#000000' : '#ffffff',
        secondary: mode === 'light' ? '#666666' : '#aaaaaa'
      },
      divider: mode === 'light' ? '#e0e0e0' : '#333333'
    }
  }))
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'light'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Test component that uses theme context
const TestComponent = () => {
  const { theme, mode, toggleTheme, setTheme } = useThemeContext();
  
  return (
    <div>
      <div data-testid="mode">{mode}</div>
      <div data-testid="primary-color">{theme.palette.primary.main}</div>
      <button onClick={toggleTheme} data-testid="toggle">Toggle</button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">Set Dark</button>
      <button onClick={() => setTheme('light')} data-testid="set-light">Set Light</button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('light');
    document.body.className = '';
  });

  it('should provide theme context to children', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('should load theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('should default to light theme if no saved preference', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('should toggle theme when toggleTheme is called', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const toggleButton = screen.getByTestId('toggle');
    fireEvent.click(toggleButton);
    
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'dark');
  });

  it('should set theme when setTheme is called', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const setDarkButton = screen.getByTestId('set-dark');
    fireEvent.click(setDarkButton);
    
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'dark');
  });

  it('should apply theme CSS variables to document', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-primary')).toBeTruthy();
    expect(root.style.getPropertyValue('--color-background')).toBeTruthy();
  });

  it('should apply theme class to body', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(document.body).toHaveClass('theme-light');
    
    const toggleButton = screen.getByTestId('toggle');
    fireEvent.click(toggleButton);
    
    expect(document.body).toHaveClass('theme-dark');
  });

  it('should throw error if useThemeContext is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useThemeContext must be used within ThemeProvider');
    
    console.error = originalError;
  });

  it('should update theme when mode changes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const setDarkButton = screen.getByTestId('set-dark');
    fireEvent.click(setDarkButton);
    
    expect(getTheme).toHaveBeenCalledWith('dark');
    expect(screen.getByTestId('primary-color')).toHaveTextContent('#90caf9');
  });
});

