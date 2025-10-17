import express from 'express';
import { onlyAdmin } from '../middlewares/validateRole.middleware.js';
import { authRequired } from '../middlewares/validateToken.middleware.js';
import {
    getAdminDashboard,
    getUsers,
    updateUserRole,
    deleteUser,
    getProducts,
    toggleProductAvailability
} from '../controllers/admin.controller.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.use(authRequired, onlyAdmin);

// Dashboard principal
router.get('/dashboard', getAdminDashboard);

// Gestión de usuarios
router.get('/users', getUsers);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);

// Gestión de productos
router.get('/products', getProducts);
router.patch('/products/:productId/availability', toggleProductAvailability);

export default router;