import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import rootRouter from './routes';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Rate Limiting Middleware
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   limit: 200, // Limit each IP to 200 requests per window
//   standardHeaders: 'draft-7', // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
//   message: { error: 'Too many requests, please try again later.' }
// });

// Apply the rate limiting middleware to all requests
// app.use(limiter);

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} (user: ${(req as any).user?.id})`);
  next();
});

// Import deps for the top-level route
import { authenticateJWT, AuthRequest } from './middlewares/auth.middleware';
import { Store, Product, Order, OrderItem } from './models';
import { sequelize } from './config/database';
// Use the helper directly
import { createNotification } from './routes/grocery/helpers';

// URGENT DEBUG: Mounting cancellation directly
app.post('/api/v1/grocery/orders/cancel/:id', authenticateJWT as any, async (req: any, res: Response) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) { await t.rollback(); return res.status(401).json({ error: 'Unauthorized' }); }

    console.log(`[ROOT_DEBUG_CANCEL] ID: ${id} user: ${userId}`);

    let ordersToCancel: any[] = [];

    // 1. Try to see if this is a group ID
    ordersToCancel = await Order.findAll({ where: { group_id: id, user_id: userId }, transaction: t });

    // 2. If not a group ID, try to find the specific order and its siblings
    if (ordersToCancel.length === 0) {
      const idInt = parseInt(id);
      if (!isNaN(idInt)) {
        const targetOrder = await Order.findOne({ where: { id: idInt, user_id: userId }, transaction: t });
        if (targetOrder) {
          if (targetOrder.group_id) {
            // Shared group_id exists
            ordersToCancel = await Order.findAll({ where: { group_id: targetOrder.group_id, user_id: userId }, transaction: t });
          } else {
            // Heuristic grouping: Same user, address, and creation minute
            const createdAt = targetOrder.created_at;
            const address = targetOrder.delivery_address;

            if (createdAt && address) {
              const date = new Date(createdAt);
              const start = new Date(date); start.setSeconds(0, 0);
              const end = new Date(date); end.setSeconds(59, 999);

              const { Op } = require('sequelize');
              ordersToCancel = await Order.findAll({
                where: {
                  user_id: userId,
                  group_id: null,
                  delivery_address: address,
                  created_at: { [Op.between]: [start, end] }
                },
                transaction: t
              });
            } else {
              ordersToCancel = [targetOrder];
            }
          }
        }
      }
    }

    if (ordersToCancel.length === 0) {
      await t.rollback();
      return res.status(404).json({ detail: `Order(s) not found for cancellation. (ID: ${id})` });
    }

    console.log(`[CANCEL_GROUP] Found ${ordersToCancel.length} orders related to ${id}`);

    for (const order of ordersToCancel) {
      if (order.status !== 'pending' && order.status !== 'awaiting_customer') {
        console.log(`[SKIP_CANCEL] Order ${order.id} status is ${order.status}`);
        continue;
      }
      await order.update({ status: 'cancelled', updated_at: new Date() }, { transaction: t });
      const store = await Store.findByPk(order.store_id, { transaction: t });
      if (store) {
        await createNotification(store.user_id, '⚠️ Order Cancelled', `Order #${order.id} cancelled.`, 'order_cancelled', order.id);
      }
    }
    await t.commit();
    res.json({ message: 'Order(s) cancelled successfully', count: ordersToCancel.length });
  } catch (e: any) {
    if (t) await t.rollback();
    console.error('[ROOT_CANCEL_ERR]', e);
    res.status(500).json({ error: e.message });
  }
});

// Routes
app.use('/', rootRouter);

// Basic health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to Aswahi Node.js API' });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
