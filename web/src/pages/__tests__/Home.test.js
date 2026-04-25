import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../Home';

jest.mock('../../components/ChatBot', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-chatbot">ChatBot embebido</div>,
}));

describe('Home page', () => {
  it('muestra el banner de bienvenida y el chatbot', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: /Bienvenido a RespiCare/i })).toBeInTheDocument();
    expect(screen.getByText(/Sistema inteligente para la gestión/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Ilustración sobre monitoreo respiratorio/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-chatbot')).toBeInTheDocument();
  });
});

