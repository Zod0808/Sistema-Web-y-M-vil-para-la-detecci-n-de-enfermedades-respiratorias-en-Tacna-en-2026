import { Router } from 'express';
import { auth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { exportUserData, deleteUserData } from '../controllers/dsrController';

const router = Router();

router.use(auth);

// Exportación de datos (admin)
router.get('/export/:userId', requirePermission('dsr:export'), exportUserData);

// Borrado de datos (admin) con doble confirmación
router.delete('/delete/:userId', requirePermission('dsr:delete'), deleteUserData);

export default router;


