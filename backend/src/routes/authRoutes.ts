import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  getUserStats,
  getUsers
} from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema
} from '../validators/authValidators';

const router = Router();

// Rutas públicas
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh-token', validateRequest(refreshTokenSchema), refreshToken);

// Rutas protegidas
router.use(authenticate); // Todas las rutas siguientes requieren autenticación

router.post('/logout', logout);
router.get('/profile', getProfile);
router.put('/profile', validateRequest(updateProfileSchema), updateProfile);
router.put('/change-password', validateRequest(changePasswordSchema), changePassword);
router.put('/deactivate', deactivateAccount);

// Rutas de administrador
router.get('/users', authorize('admin'), getUsers);
router.get('/stats', authorize('admin'), getUserStats);

export default router;
