import { Store } from '../models';

export class StoresService {
    async getList(skip = 0, limit = 20, userId?: string) {
        const whereClause: any = {};
        if (userId) {
            whereClause.user_id = userId;
        }

        const { count, rows } = await Store.findAndCountAll({
            where: whereClause,
            offset: skip,
            limit: limit,
            order: [['id', 'DESC']]
        });

        return { items: rows, total: count, skip, limit };
    }

    async getById(id: number, userId?: string) {
        const whereClause: any = { id };
        if (userId) whereClause.user_id = userId;
        return Store.findOne({ where: whereClause });
    }

    async create(data: any, userId: string) {
        return Store.create({ ...data, user_id: userId });
    }

    async update(id: number, data: any, userId: string) {
        const store = await Store.findOne({ where: { id, user_id: userId } });
        if (!store) return null;
        return store.update(data);
    }

    async delete(id: number, userId: string) {
        const store = await Store.findOne({ where: { id, user_id: userId } });
        if (!store) return false;
        await store.destroy();
        return true;
    }
}
