/**
 * Educational Content Controller
 * Expone el módulo educativo (RF-011, CU-007: Consultar información educativa)
 */

import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { educationalContentService } from '../services/educationalContentService';

export const getPersonalizedContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?._id) {
    throw new AppError('No autenticado', 401);
  }

  const content = await educationalContentService.getPersonalizedContent(req.user._id.toString());

  const response: ApiResponse = {
    success: true,
    message: 'Contenido educativo personalizado obtenido correctamente',
    data: content,
  };

  res.status(200).json(response);
});

export const getContentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?._id) {
    throw new AppError('No autenticado', 401);
  }

  const content = await educationalContentService.getContentById(
    req.params.id,
    req.user._id.toString()
  );

  const response: ApiResponse = {
    success: true,
    message: 'Contenido educativo obtenido correctamente',
    data: content,
  };

  res.status(200).json(response);
});

export const listContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { category, isActive } = req.query;

  const content = await educationalContentService.listContent({
    category: category ? (String(category) as any) : undefined,
    isActive: typeof isActive === 'string' ? isActive === 'true' : undefined,
  });

  const response: ApiResponse = {
    success: true,
    message: 'Contenido educativo obtenido correctamente',
    data: content,
  };

  res.status(200).json(response);
});

export const createContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const content = await educationalContentService.createContent(req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Contenido educativo creado correctamente',
    data: content,
  };

  res.status(201).json(response);
});

export const updateContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const content = await educationalContentService.updateContent(req.params.id, req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Contenido educativo actualizado correctamente',
    data: content,
  };

  res.status(200).json(response);
});

export const deleteContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await educationalContentService.deleteContent(req.params.id);

  const response: ApiResponse = {
    success: true,
    message: 'Contenido educativo eliminado correctamente',
  };

  res.status(200).json(response);
});
