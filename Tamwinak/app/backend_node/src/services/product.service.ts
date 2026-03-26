import { Op } from 'sequelize';
import { Product, Industry, ProductUnit, Unit, StoreProduct, Category } from '../models';

export class ProductService {
    async getList(skip = 0, limit = 20, industryId?: number, category?: string, search?: string) {
        const whereClause: any = {};
        if (industryId) whereClause.industry_id = industryId;
        if (category) whereClause.category = category;
        if (search) {
            whereClause.name = { [Op.like]: `%${search}%` };
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereClause,
            include: [
                { model: Industry, as: 'industry', attributes: ['id', 'name', 'name_ar', 'icon'] },
                {
                    model: ProductUnit,
                    as: 'product_units',
                    include: [{ model: Unit, as: 'unit', attributes: ['name', 'name_ar'] }]
                },
                {
                    model: Product.sequelize?.models.ProductCustomizationStage as any,
                    as: 'customization_stages',
                    include: [{ model: Product.sequelize?.models.ProductCustomizationOption as any, as: 'options' }]
                }
            ],
            offset: skip,
            limit: limit,
            order: [
                ['id', 'DESC'],
                [{ model: Product.sequelize?.models.ProductCustomizationStage as any, as: 'customization_stages' }, 'sort_order', 'ASC'],
                [{ model: Product.sequelize?.models.ProductCustomizationStage as any, as: 'customization_stages' }, { model: Product.sequelize?.models.ProductCustomizationOption as any, as: 'options' }, 'sort_order', 'ASC']
            ],
            distinct: true
        });

        // Map legacy fields for UI compatibility
        const items = rows.map((p: any) => {
            const data: any = p.toJSON();
            const firstUnit = data.product_units && data.product_units.length > 0 ? data.product_units[0] : null;
            return {
                ...data,
                price: firstUnit ? firstUnit.price : 0,
                unit: firstUnit?.unit?.name || 'unit'
            };
        });

        return { items, total: count, skip, limit };
    }

    async getById(id: number) {
        const product = await Product.findByPk(id, {
            include: [
                { model: Industry, as: 'industry', attributes: ['id', 'name', 'name_ar', 'icon'] },
                {
                    model: ProductUnit,
                    as: 'product_units',
                    include: [{ model: Unit, as: 'unit', attributes: ['id', 'name', 'name_ar'] }]
                },
                {
                    model: Product.sequelize?.models.ProductCustomizationStage as any,
                    as: 'customization_stages',
                    include: [{ model: Product.sequelize?.models.ProductCustomizationOption as any, as: 'options' }]
                }
            ],
            order: [
                [{ model: Product.sequelize?.models.ProductCustomizationStage as any, as: 'customization_stages' }, 'sort_order', 'ASC'],
                [{ model: Product.sequelize?.models.ProductCustomizationStage as any, as: 'customization_stages' }, { model: Product.sequelize?.models.ProductCustomizationOption as any, as: 'options' }, 'sort_order', 'ASC']
            ]
        });

        if (!product) return null;

        const data: any = product.toJSON();
        const firstUnit = data.product_units && data.product_units.length > 0 ? data.product_units[0] : null;
        return {
            ...data,
            price: firstUnit ? firstUnit.price : 0,
            unit: firstUnit?.unit?.name || 'unit'
        };
    }

    async create(data: any) {
        const { store_id, price, unit, ...productData } = data;
        
        // Sync with Category table
        if (productData.category) {
            let catRecord = await Category.findOne({ where: { name: productData.category } });
            if (!catRecord) {
                catRecord = await Category.create({ 
                    name: productData.category, 
                    is_active: true, 
                    sort_order: 999 
                } as any);
            }
            (productData as any).category_id = catRecord.id;
        }

        const product = await Product.create(productData);

        // Link to store if store_id provided
        if (store_id) {
            await StoreProduct.create({
                store_id,
                product_id: product.id,
                is_available: true,
                override_price: null,
                added_at: new Date()
            } as any);
        }

        // Create default unit if price and unit provided
        if (price !== undefined && unit) {
            let unitRecord = await Unit.findOne({ where: { name: unit } });
            if (!unitRecord) {
                unitRecord = await Unit.create({ name: unit, is_active: true } as any);
            }
            await ProductUnit.create({
                product_id: product.id,
                unit_id: unitRecord.id,
                price: parseFloat(price)
            } as any);
        }

        return product;
    }

    async update(id: number, data: any) {
        const product = await Product.findByPk(id);
        if (!product) return null;

        const { store_id, price, unit, ...productData } = data;
        
        // Sync with Category table
        if (productData.category) {
            let catRecord = await Category.findOne({ where: { name: productData.category } });
            if (!catRecord) {
                catRecord = await Category.create({ 
                    name: productData.category, 
                    is_active: true, 
                    sort_order: 999 
                } as any);
            }
            (productData as any).category_id = catRecord.id;
        }

        await product.update(productData);

        // Update store link if changed
        if (store_id) {
            await StoreProduct.findOrCreate({
                where: { store_id, product_id: id },
                defaults: { store_id, product_id: id, is_available: true, added_at: new Date() } as any
            });
        }

        // Update price/unit if provided (this is simplified, usually you'd update specific units)
        if (price !== undefined && unit) {
            let unitRecord = await Unit.findOne({ where: { name: unit } });
            if (!unitRecord) {
                unitRecord = await Unit.create({ name: unit, is_active: true } as any);
            }

            const [prodUnit] = await ProductUnit.findOrCreate({
                where: { product_id: id, unit_id: unitRecord.id },
                defaults: { product_id: id, unit_id: unitRecord.id, price: parseFloat(price) } as any
            });

            if (prodUnit.price !== parseFloat(price)) {
                await prodUnit.update({ price: parseFloat(price) });
            }
        }

        return product;
    }

    async delete(id: number) {
        const product = await Product.findByPk(id);
        if (!product) return false;
        await product.destroy();
        return true;
    }
}
