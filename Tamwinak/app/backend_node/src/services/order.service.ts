import { Order, OrderItem, Store } from '../models';
import { sequelize } from '../config/database';
import { randomUUID } from 'crypto';
import { OrderDistributionService, OrderItemInput } from './order-distribution.service';
import { createNotification, bulkCreateNotifications } from '../routes/grocery/helpers';

const distributionService = new OrderDistributionService();

export class OrderService {
    async getList(skip = 0, limit = 20, userId?: string, storeId?: number, groupId?: string) {
        const whereClause: any = {};
        if (userId) whereClause.user_id = userId;
        if (storeId) whereClause.store_id = storeId;
        if (groupId) whereClause.group_id = groupId;

        const { count, rows } = await Order.findAndCountAll({
            where: whereClause,
            include: [{ model: OrderItem, as: 'items' }],
            offset: skip,
            limit: limit,
            order: [['created_at', 'DESC']]
        });

        return { items: rows, total: count, skip, limit };
    }

    async getById(id: number, userId?: string) {
        const whereClause: any = { id };
        if (userId) whereClause.user_id = userId;
        return Order.findOne({
            where: whereClause,
            include: [{ model: OrderItem, as: 'items' }]
        });
    }

    async getByGroupId(groupId: string, userId?: string) {
        const whereClause: any = { group_id: groupId };
        if (userId) whereClause.user_id = userId;
        const orders = await Order.findAll({
            where: whereClause,
            include: [{ model: OrderItem, as: 'items' }],
            order: [['created_at', 'ASC']]
        });
        return orders;
    }

    async create(data: any, userId: string) {
        // Smart distribution: split order across multiple stores
        if (data.smartDistribute && !data.store_id) {
            return this.createDistributed(data, userId);
        }

        // Standard single-store order creation
        return this.createSingleOrder(data, userId);
    }

    private async createSingleOrder(data: any, userId: string, groupId?: string) {
        const transaction = await sequelize.transaction();
        try {
            const order = await Order.create({
                ...data,
                user_id: userId,
                group_id: groupId || data.group_id || null,
                created_at: new Date(),
                updated_at: new Date()
            }, { transaction });

            if (data.items && data.items.length > 0) {
                console.log(`[ORDER-DEBUG] Creating ${data.items.length} items for order ${order.id}. Items:`, JSON.stringify(data.items, null, 2));
                const itemsToCreate = data.items.map((item: any) => ({
                    ...item,
                    order_id: order.id
                }));
                await OrderItem.bulkCreate(itemsToCreate, { transaction });
            }

            await transaction.commit();

            // Notify store owner
            const store = await Store.findByPk(order.store_id);
            if (store) {
                await createNotification(
                    store.user_id,
                    '📦 New Order Received',
                    `You have a new order (#${order.id}) worth ₪${Number(order.total).toFixed(2)}.`,
                    'new_order',
                    order.id
                );
            }

            return Order.findByPk(order.id, {
                include: [{ model: OrderItem, as: 'items' }]
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    private async createDistributed(data: any, userId: string) {
        if (!data.items || data.items.length === 0) {
            throw new Error('Items are required for smart distribution');
        }

        // Run the distribution algorithm
        const result = await distributionService.distributeOrder(
            data.items as OrderItemInput[],
            data.delivery_lat,
            data.delivery_lng
        );

        // If the order cannot be fully fulfilled, reject it
        if (!result.fulfilled) {
            const unfulfillableNames = result.unfulfillableItems
                .map(item => item.product_name)
                .join(', ');
            const error: any = new Error(
                `Order cannot be fulfilled. The following items are not available in any store: ${unfulfillableNames}`
            );
            error.statusCode = 422;
            error.unfulfillableItems = result.unfulfillableItems;
            throw error;
        }

        // Generate a shared group_id for all sub-orders
        const groupId = randomUUID();

        // Create one order per store, all within a single DB transaction
        const transaction = await sequelize.transaction();
        try {
            const createdOrders: any[] = [];

            for (const assignment of result.assignments) {
                // Recalculate subtotal for this store's items
                const storeSubtotal = assignment.items.reduce(
                    (sum, item) => sum + item.subtotal, 0
                );
                // Split delivery fee evenly across stores
                const storeDeliveryFee = data.delivery_fee / result.assignments.length;
                const storeTotal = storeSubtotal + storeDeliveryFee;

                const order = await Order.create({
                    user_id: userId,
                    store_id: assignment.store_id,
                    driver_id: data.driver_id || null,
                    status: data.status || 'pending',
                    subtotal: parseFloat(storeSubtotal.toFixed(2)),
                    delivery_fee: parseFloat(storeDeliveryFee.toFixed(2)),
                    total: parseFloat(storeTotal.toFixed(2)),
                    delivery_address: data.delivery_address || null,
                    delivery_lat: data.delivery_lat || null,
                    delivery_lng: data.delivery_lng || null,
                    notes: data.notes || null,
                    group_id: groupId,
                    created_at: new Date(),
                    updated_at: new Date(),
                }, { transaction });

                const itemsToCreate = assignment.items.map(item => ({
                    order_id: order.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                    unit_name: item.unit_name || null,
                    unit_name_ar: item.unit_name_ar || null,
                    customizations: item.customizations || null,
                }));

                await OrderItem.bulkCreate(itemsToCreate, { transaction });
                createdOrders.push(order);
            }

            await transaction.commit();

            // Batch notify all store owners
            const storeIds = result.assignments.map(a => a.store_id);
            const stores = await Store.findAll({ where: { id: storeIds } });
            
            const storeNotifications = createdOrders.map(order => {
                const store = stores.find(s => s.id === order.store_id);
                if (!store) return null;
                return {
                    user_id: store.user_id,
                    title: '📦 New Order Received (Distributed)',
                    body: `You have a new order (#${order.id}) from a multi-store purchase worth ₪${Number(order.total).toFixed(2)}.`,
                    type: 'new_order',
                    order_id: order.id
                };
            }).filter(Boolean);

            await bulkCreateNotifications(storeNotifications as any);

            // Reload all orders with their items
            const orders = await Order.findAll({
                where: { group_id: groupId },
                include: [{ model: OrderItem, as: 'items' }],
                order: [['id', 'ASC']],
            });

            return {
                distributed: true,
                group_id: groupId,
                total_stores: orders.length,
                orders,
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async update(id: number, data: any, userId: string) {
        const order = await Order.findOne({ where: { id, user_id: userId } });
        if (!order) return null;

        data.updated_at = new Date();
        return order.update(data);
    }

    async delete(id: number, userId: string) {
        // Relying on FK constraints (ON DELETE CASCADE) or manual deletion
        const transaction = await sequelize.transaction();
        try {
            const order = await Order.findOne({ where: { id, user_id: userId }, transaction });
            if (!order) {
                await transaction.rollback();
                return false;
            }

            await OrderItem.destroy({ where: { order_id: id }, transaction });
            await order.destroy({ transaction });

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
