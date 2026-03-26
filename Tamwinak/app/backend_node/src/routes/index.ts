import { Router } from 'express';
import storeRoutes from './store.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';
import authRoutes from './auth.routes';
import rbacRoutes from './rbac.routes';
import notificationRoutes from './notification.routes';
import groceryRoutes from './grocery';
import userRoutes from './user.routes';
import languageRoutes from './language.routes';
import industryRoutes from './industry.routes';
import storeProductRoutes from './store-product.routes';
import unitRoutes from './unit.routes';
import categoryRoutes from './category.routes';
import areaRoutes from './area.routes';

const rootRouter = Router();

rootRouter.get('/api/config', (req, res) => {
    res.json({
        API_BASE_URL: process.env.API_BASE_URL || 'http://127.0.0.1:8001'
    });
});

rootRouter.use('/api/v1/auth', authRoutes);
rootRouter.use('/api/v1/rbac', rbacRoutes);
rootRouter.use('/api/v1/grocery', groceryRoutes);
rootRouter.use('/api/v1/users', userRoutes);
rootRouter.use('/api/v1/entities/stores', storeRoutes);
rootRouter.use('/api/v1/entities/products', productRoutes);
rootRouter.use('/api/v1/entities/orders', orderRoutes);
rootRouter.use('/api/v1/entities/notifications', notificationRoutes);
rootRouter.use('/api/v1/languages', languageRoutes);
rootRouter.use('/api/v1/industries', industryRoutes);
rootRouter.use('/api/v1/units', unitRoutes);
rootRouter.use('/api/v1/store-products', storeProductRoutes);
rootRouter.use('/api/v1/categories', categoryRoutes);
rootRouter.use('/api/v1/areas', areaRoutes);

// Broad alias at the end
rootRouter.use('/api/v1', authRoutes);

export default rootRouter;
