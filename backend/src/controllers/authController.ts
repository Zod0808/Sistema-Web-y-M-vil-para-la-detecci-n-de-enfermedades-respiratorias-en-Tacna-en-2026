import { Response, Request } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { UserDocument } from '../models/User';
import { ApiResponse, LoginRequest, RegisterRequest, AuthResponse, AuthenticatedRequest, User as IUser } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { setSentryUser } from '../utils/sentry';

// Generar JWT token
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado');
  }
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  } as jwt.SignOptions);
};

// Generar refresh token
const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET no está configurado');
  }
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  } as jwt.SignOptions);
};

// Registrar nuevo usuario
export const register = asyncHandler(async (req: Request<{}, ApiResponse<AuthResponse>, RegisterRequest>, res: Response) => {
  const { name, email, password, role } = req.body;

  // Verificar si el usuario ya existe
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new AppError('El usuario ya existe con este email', 400);
  }

  // Crear nuevo usuario
  const user = await User.create({
    name,
    email,
    password,
    role
  }) as UserDocument;

  // Generar tokens
  const token = generateToken((user._id as mongoose.Types.ObjectId).toString());
  const refreshToken = generateRefreshToken((user._id as mongoose.Types.ObjectId).toString());

  // Actualizar lastLogin
  user.lastLogin = new Date();
  await user.save();

  // Establecer usuario en Sentry
  setSentryUser({
    id: (user._id as mongoose.Types.ObjectId).toString(),
    email: user.email,
    role: user.role,
  });

  logger.info(`Usuario registrado: ${email}`, { userId: (user._id as mongoose.Types.ObjectId).toString(), role });

  const response: ApiResponse<AuthResponse> = {
    success: true,
    message: 'Usuario registrado exitosamente',
    data: {
      user: {
        ...user.toJSON(),
        _id: (user._id as mongoose.Types.ObjectId).toString()
      } as Omit<IUser, 'password'>,
      token,
      refreshToken
    }
  };

  res.status(201).json(response);
});

// Iniciar sesión
export const login = asyncHandler(async (req: Request<{}, ApiResponse<AuthResponse>, LoginRequest>, res: Response) => {
  const { email, password } = req.body;

  // Buscar usuario y incluir contraseña
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new AppError('Credenciales inválidas', 401);
  }

  // Verificar si el usuario está activo
  if (!user.isActive) {
    throw new AppError('La cuenta está desactivada', 401);
  }

  // Verificar contraseña
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Credenciales inválidas', 401);
  }

  // Generar tokens
  const token = generateToken((user._id as mongoose.Types.ObjectId).toString());
  const refreshToken = generateRefreshToken((user._id as mongoose.Types.ObjectId).toString());

  // Actualizar lastLogin
  user.lastLogin = new Date();
  await user.save();

  // Establecer usuario en Sentry
  setSentryUser({
    id: (user._id as mongoose.Types.ObjectId).toString(),
    email: user.email,
    role: user.role,
  });

  logger.info(`Usuario logueado: ${email}`, { userId: (user._id as mongoose.Types.ObjectId).toString(), role: user.role });

  const response: ApiResponse<AuthResponse> = {
    success: true,
    message: 'Inicio de sesión exitoso',
    data: {
      user: {
        ...user.toJSON(),
        _id: (user._id as mongoose.Types.ObjectId).toString()
      } as Omit<IUser, 'password'>,
      token,
      refreshToken
    }
  };

  res.status(200).json(response);
});

// Refrescar token
export const refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token requerido', 400);
  }

  try {
    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    
    // Buscar usuario
    const user = await User.findById(decoded.userId) as UserDocument | null;
    if (!user || !user.isActive) {
      throw new AppError('Usuario no encontrado o inactivo', 401);
    }

    // Generar nuevos tokens
    const newToken = generateToken((user._id as mongoose.Types.ObjectId).toString());
    const newRefreshToken = generateRefreshToken((user._id as mongoose.Types.ObjectId).toString());

    logger.info(`Token refrescado para usuario: ${user.email}`, { userId: (user._id as mongoose.Types.ObjectId).toString() });

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: 'Token refrescado exitosamente',
      data: {
        user: {
        ...user.toJSON(),
        _id: (user._id as mongoose.Types.ObjectId).toString()
      } as Omit<IUser, 'password'>,
        token: newToken,
        refreshToken: newRefreshToken
      }
    };

    res.status(200).json(response);
  } catch (error) {
    throw new AppError('Refresh token inválido', 401);
  }
});

// Cerrar sesión
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // En una implementación real, podrías invalidar el token en una blacklist
  // Por ahora, simplemente devolvemos éxito
  
  logger.info(`Usuario cerró sesión`, { userId: req.user?._id });

  const response: ApiResponse = {
    success: true,
    message: 'Sesión cerrada exitosamente'
  };

  res.status(200).json(response);
});

// Obtener perfil del usuario actual
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Perfil obtenido exitosamente',
    data: user.toJSON()
  };

  res.status(200).json(response);
});

// Actualizar perfil
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, avatar } = req.body;
  const userId = req.user?._id;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  // Actualizar campos permitidos
  if (name) user.name = name;
  if (avatar) user.avatar = avatar;

  await user.save();

  logger.info(`Perfil actualizado para usuario: ${user.email}`, { userId });

  const response: ApiResponse = {
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: user.toJSON()
  };

  res.status(200).json(response);
});

// Cambiar contraseña
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?._id;

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  // Verificar contraseña actual
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Contraseña actual incorrecta', 400);
  }

  // Actualizar contraseña
  user.password = newPassword;
  await user.save();

  logger.info(`Contraseña cambiada para usuario: ${user.email}`, { userId });

  const response: ApiResponse = {
    success: true,
    message: 'Contraseña cambiada exitosamente'
  };

  res.status(200).json(response);
});

// Desactivar cuenta
export const deactivateAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?._id;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  user.isActive = false;
  await user.save();

  logger.info(`Cuenta desactivada para usuario: ${user.email}`, { userId });

  const response: ApiResponse = {
    success: true,
    message: 'Cuenta desactivada exitosamente'
  };

  res.status(200).json(response);
});

// Obtener estadísticas de usuarios (solo admin)
export const getUserStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Verificar que el usuario sea admin
  if (req.user?.role !== 'admin') {
    throw new AppError('Acceso denegado. Se requieren permisos de administrador', 403);
  }

  const stats = await User.getUserStats();

  const response: ApiResponse = {
    success: true,
    message: 'Estadísticas de usuarios obtenidas exitosamente',
    data: stats
  };

  res.status(200).json(response);
});

// Obtener lista de usuarios (solo admin)
export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Verificar que el usuario sea admin
  if (req.user?.role !== 'admin') {
    throw new AppError('Acceso denegado. Se requieren permisos de administrador', 403);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments();

  const response: ApiResponse = {
    success: true,
    message: 'Usuarios obtenidos exitosamente',
    data: users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  res.status(200).json(response);
});
