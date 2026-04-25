// Clase personalizada para errores de la aplicación
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string; // Código de error para localización
  public field?: string; // Campo relacionado (para validación)

  constructor(message: string, statusCode: number = 500, code?: string, field?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.field = field;

    Error.captureStackTrace(this, this.constructor);
  }
}
