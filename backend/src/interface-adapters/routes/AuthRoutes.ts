// Rutas de Autenticación - Capa de Interfaz
import { Router } from 'express';
import { DependencyContainer } from '../../infrastructure/container/DependencyContainer';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';

const router = Router();
const container = DependencyContainer.getInstance();
const authController = container.getAuthController();

// Rutas públicas
router.post('/login', asyncHandler(authController.login.bind(authController)));
router.post('/register', asyncHandler(authController.register.bind(authController)));
router.post('/refresh-token', asyncHandler(authController.refreshToken.bind(authController)));

// Rutas protegidas
router.use(authenticate); // Middleware de autenticación para todas las rutas siguientes

router.post('/logout', asyncHandler(authController.logout.bind(authController)));
router.get('/profile', asyncHandler(authController.getProfile.bind(authController)));
router.put('/profile', asyncHandler(authController.updateProfile.bind(authController)));
router.put('/change-password', asyncHandler(authController.changePassword.bind(authController)));
router.delete('/deactivate', asyncHandler(authController.deactivateAccount.bind(authController)));

export default router;
