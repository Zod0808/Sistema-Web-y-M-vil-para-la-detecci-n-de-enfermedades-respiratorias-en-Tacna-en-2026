/**
 * Error Response DTO
 * 
 * DTO para respuestas de error amigables y localizables
 */

export interface ErrorResponseDTO {
  success: false;
  error: {
    code: string;
    message: string;
    userMessage: string;
    field?: string;
    suggestions?: string[];
    technicalDetails?: any;
  };
  timestamp: string;
  path?: string;
}

export interface SuccessResponseDTO<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export type ApiResponseDTO<T = any> = SuccessResponseDTO<T> | ErrorResponseDTO;

/**
 * Helper para crear respuesta de éxito
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponseDTO<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper para crear respuesta de error
 */
export function createErrorResponse(
  code: string,
  field?: string,
  technicalDetails?: any,
  path?: string
): ErrorResponseDTO {
  const { formatErrorResponse } = require('../utils/localizedErrors');
  const response = formatErrorResponse(code, field, technicalDetails);
  
  return {
    ...response,
    timestamp: new Date().toISOString(),
    ...(path && { path }),
  };
}

