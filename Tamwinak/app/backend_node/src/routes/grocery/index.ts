import { Router } from 'express';
import publicRoutes from './public.routes';
import notificationRoutes from './notifications.routes';
import customerRoutes from './customer.routes';
import storeRoutes from './store.routes';
import driverRoutes from './driver.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Combine all grocery routes
router.use('/', publicRoutes);
router.use('/', notificationRoutes);
router.use('/', customerRoutes);
router.use('/', storeRoutes);
router.use('/', driverRoutes);
router.use('/', adminRoutes);

export default router;
