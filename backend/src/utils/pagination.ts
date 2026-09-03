import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Extrae page/limit de la query string con valores por defecto.
 * Centraliza el parseo para evitar duplicarlo en cada ruta paginada.
 */
export const parsePagination = (query: Request['query']): PaginationParams => {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;

  return { page, limit };
};
