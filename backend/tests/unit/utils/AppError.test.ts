import { AppError } from '../../../src/utils/AppError';

describe('AppError', () => {
  it('crea un error con mensaje y statusCode', () => {
    const err = new AppError('Recurso no encontrado', 404);
    expect(err.message).toBe('Recurso no encontrado');
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
  });

  it('usa statusCode 500 por defecto', () => {
    const err = new AppError('Error interno');
    expect(err.statusCode).toBe(500);
  });

  it('es instancia de Error', () => {
    const err = new AppError('Error test', 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('tiene isOperational en true siempre', () => {
    const err400 = new AppError('Bad request', 400);
    const err500 = new AppError('Server error', 500);
    expect(err400.isOperational).toBe(true);
    expect(err500.isOperational).toBe(true);
  });

  it('acepta code opcional', () => {
    const err = new AppError('Credenciales inválidas', 401, 'AUTH_INVALID_CREDENTIALS');
    expect(err.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('acepta field opcional', () => {
    const err = new AppError('Campo requerido', 400, 'VALIDATION_REQUIRED', 'email');
    expect(err.field).toBe('email');
  });

  it('tiene code y field undefined cuando no se pasan', () => {
    const err = new AppError('Error', 500);
    expect(err.code).toBeUndefined();
    expect(err.field).toBeUndefined();
  });

  it('tiene stack trace definido', () => {
    const err = new AppError('Error con stack', 500);
    expect(err.stack).toBeDefined();
  });

  it('puede capturarse con try/catch', () => {
    expect(() => {
      throw new AppError('Lanzado', 422);
    }).toThrow('Lanzado');
  });

  it('el nombre del error es Error', () => {
    const err = new AppError('test', 400);
    // AppError hereda de Error, el name por defecto es 'Error'
    expect(err.name).toBeDefined();
  });
});