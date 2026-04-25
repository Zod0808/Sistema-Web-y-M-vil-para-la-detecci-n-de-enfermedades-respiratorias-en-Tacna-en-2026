// Controlador de Autenticación - Capa de Interfaz
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { AuthService } from '../../application/services/AuthService';
import { ApiResponse } from '../dtos/ApiResponse';
import { LoginRequestDto } from '../dtos/LoginRequestDto';
import { RegisterRequestDto } from '../dtos/RegisterRequestDto';
import { AuthResponseDto } from '../dtos/AuthResponseDto';
import { UserResponseDto } from '../dtos/UserResponseDto';

export class AuthController {
  constructor(private authService: AuthService) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginRequest: LoginRequestDto = req.body;
      
      // Validar entrada
      if (!loginRequest.email || !loginRequest.password) {
        res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        } as ApiResponse);
        return;
      }

      const result = await this.authService.login(loginRequest);
      
      const response: ApiResponse<AuthResponseDto> = {
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: UserResponseDto.fromEntity(result.user),
          token: result.token,
          refreshToken: result.refreshToken
        }
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error en el inicio de sesión'
      } as ApiResponse);
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const registerRequest: RegisterRequestDto = req.body;
      
      // Validar entrada
      if (!registerRequest.name || !registerRequest.email || !registerRequest.password) {
        res.status(400).json({
          success: false,
          message: 'Nombre, email y contraseña son requeridos'
        } as ApiResponse);
        return;
      }

      const result = await this.authService.register(registerRequest);
      
      const response: ApiResponse<AuthResponseDto> = {
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: UserResponseDto.fromEntity(result.user),
          token: result.token,
          refreshToken: result.refreshToken
        }
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error en el registro'
      } as ApiResponse);
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token requerido'
        } as ApiResponse);
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);
      
      const response: ApiResponse<AuthResponseDto> = {
        success: true,
        message: 'Token refrescado exitosamente',
        data: {
          user: UserResponseDto.fromEntity(result.user),
          token: result.token,
          refreshToken: result.refreshToken
        }
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al refrescar token'
      } as ApiResponse);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      
      if (userId) {
        await this.authService.logout(userId);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Sesión cerrada exitosamente'
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al cerrar sesión'
      } as ApiResponse);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      const user = await this.authService.getProfile(userId);
      
      const response: ApiResponse<UserResponseDto> = {
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: UserResponseDto.fromEntity(user)
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener perfil'
      } as ApiResponse);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { name, avatar } = req.body;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'El nombre es requerido'
        } as ApiResponse);
        return;
      }

      const user = await this.authService.updateProfile(userId, name, avatar);
      
      const response: ApiResponse<UserResponseDto> = {
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: UserResponseDto.fromEntity(user)
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar perfil'
      } as ApiResponse);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { currentPassword, newPassword } = req.body;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Contraseña actual y nueva contraseña son requeridas'
        } as ApiResponse);
        return;
      }

      await this.authService.changePassword(userId, currentPassword, newPassword);
      
      const response: ApiResponse = {
        success: true,
        message: 'Contraseña cambiada exitosamente'
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al cambiar contraseña'
      } as ApiResponse);
    }
  }

  async deactivateAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }

      await this.authService.deactivateAccount(userId);
      
      const response: ApiResponse = {
        success: true,
        message: 'Cuenta desactivada exitosamente'
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al desactivar cuenta'
      } as ApiResponse);
    }
  }
}
