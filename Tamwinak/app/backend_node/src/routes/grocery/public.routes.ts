import { Router, Response } from 'express';
import { QueryTypes, Op } from 'sequelize';
import { sequelize } from '../../config/database';
import { 
    Category, Product, ProductUnit, Unit, Store, DeliveryArea, StoreProduct, 
    ProductCustomizationStage, ProductCustomizationOption, Industry, StoreGroup
} from '../../models';
import { haversineDistance, calcDeliveryFee, getSettings, getStoreDeliveryFee, createNotification, bulkCreateNotifications } from './helpers';


import { isWithinWorkingHours } from '../../utils/time';

const router = Router();

// GET /api/v1/grocery/nearby-stores
// Uses SQL Haversine to filter + sort by distance — no full-table fetch or JS-level filtering.
router.get('/nearby-stores', async (req: any, res: Response) => {
    try {
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        const radius = parseFloat(req.query.radius as string || '15');

        if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ detail: 'lat and lng are required' });

        const nearby = await sequelize.query<Record<string, any>>(`
            SELECT *
            FROM stores
            WHERE is_approved = true
              AND is_active = true
              AND 6371 * acos(
                    GREATEST(-1, LEAST(1,
                        cos(radians(:lat)) * cos(radians(latitude))
                        * cos(radians(longitude) - radians(:lng))
                        + sin(radians(:lat)) * sin(radians(latitude))
                    ))
                  ) <= :radius
            ORDER BY name ASC
        `, {
            replacements: { lat, lng, radius },
            type: QueryTypes.SELECT,
        });

        res.json(nearby.map(s => ({
            ...s,
            is_open: isWithinWorkingHours(s.working_hours)
        })));
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/nearby-categories
// Returns distinct categories with product counts, sorted by count desc.
// Uses SQL Haversine to filter stores within radius — no JS-level filtering.
router.get('/nearby-categories', async (req: any, res: Response) => {
    try {
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        const radius = parseFloat(req.query.radius as string || '15');

        if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ detail: 'lat and lng are required' });

        const rows = await sequelize.query<{ category: string; count: string }>(`
            SELECT p.category, COUNT(DISTINCT p.id) AS count
            FROM products p
            INNER JOIN store_products sp ON sp.product_id = p.id AND sp.is_available = true
            INNER JOIN stores s ON s.id = sp.store_id 
                AND (s.is_approved IS TRUE OR s.is_approved IS NULL) 
                AND (s.is_active IS TRUE OR s.is_active IS NULL)
            WHERE p.is_available = true
              AND p.category IS NOT NULL
              AND (
                6371 * acos(
                  LEAST(1, GREATEST(-1, cos(radians(:lat)) * cos(radians(s.latitude))
                  * cos(radians(s.longitude) - radians(:lng))
                  + sin(radians(:lat)) * sin(radians(s.latitude))))
                ) <= :radius
              )
            GROUP BY p.category
            ORDER BY count DESC
        `, {
            replacements: { lat, lng, radius },
            type: 'SELECT' as any,
        });

        res.json(rows.map((r) => ({ name: r.category, count: parseInt(r.count) })));
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/home-data
// Returns categories and top 5 products for each, all in one request.
router.get('/home-data', async (req: any, res: Response) => {
    try {
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        const radius = parseFloat(req.query.radius as string || '15');
        const industryId = req.query.industry_id ? parseInt(req.query.industry_id as string) : null;

        // Fetch industries once at the top
        const industries = await Industry.findAll({ where: { is_active: true } });

        if (isNaN(lat) || isNaN(lng)) {
            // Find categories for this industry even if location is not yet available
            const categories = await Category.findAll({
                where: { 
                    is_active: true,
                    ...(industryId ? {
                        id: {
                            [Op.in]: sequelize.literal(`(SELECT DISTINCT category_id FROM products WHERE industry_id = ${industryId} AND is_available = true AND category_id IS NOT NULL)`)
                        }
                    } : {})
                },
                order: [['sort_order', 'ASC'], ['name', 'ASC']]
            });
            return res.json({ industries, categories, productsByCategory: {}, totalsByCategory: {} });
        }

        // 1. Fetch categories (filter by industry if industryId is provided)
        const categories = await Category.findAll({
            where: { 
                is_active: true,
                ...(industryId ? {
                    id: {
                        [Op.in]: sequelize.literal(`(SELECT DISTINCT category_id FROM products WHERE industry_id = ${industryId} AND is_available = true AND category_id IS NOT NULL)`)
                    }
                } : {})
            },
            order: [['sort_order', 'ASC'], ['name', 'ASC']]
        });

        // 2. Fetch top 5 products per category, ranked by nearest store distance
        // Simplified query to reduce lock/memory overhead in production
        const results = await sequelize.query<{ product_id: number; category: string; category_total: string; min_distance_km: number }>(`
            WITH distances AS (
                SELECT
                    p.id AS product_id,
                    p.category,
                    p.name,
                    6371 * acos(
                        LEAST(1, GREATEST(-1,
                            cos(radians(:lat)) * cos(radians(s.latitude))
                            * cos(radians(s.longitude) - radians(:lng))
                            + sin(radians(:lat)) * sin(radians(s.latitude))
                        ))
                    ) AS distance_km
                FROM products p
                INNER JOIN store_products sp ON sp.product_id = p.id AND sp.is_available = true
                    AND (sp.stock_quantity IS NULL OR sp.stock_quantity > 0)
                INNER JOIN stores s ON s.id = sp.store_id 
                    AND (s.is_approved IS NOT FALSE) 
                    AND (s.is_active IS NOT FALSE)
                WHERE p.is_available = true
                  AND p.category IS NOT NULL
                  AND (p.industry_id = :industryId OR :industryId IS NULL)
            ),
            nearest_all AS (
                SELECT product_id, category, name, MIN(distance_km) as min_distance_km
                FROM distances
                WHERE distance_km <= :radius
                GROUP BY product_id, category, name
            ),
            counts AS (
                SELECT category, COUNT(*) AS category_total
                FROM nearest_all
                GROUP BY category
            ),
            ranked AS (
                SELECT
                    n.*,
                    c.category_total,
                    ROW_NUMBER() OVER(PARTITION BY n.category ORDER BY n.name ASC) as rank
                FROM nearest_all n
                JOIN counts c ON c.category = n.category
            )
            SELECT product_id, category, category_total
            FROM ranked
            WHERE rank <= 5
            ORDER BY category, rank
        `, {
            replacements: { lat, lng, radius, industryId: industryId || null },
            type: QueryTypes.SELECT
        });

        // 3. Fetch full product data and store pricing for these specific products
        const productIds = results.map(r => r.product_id);
        if (productIds.length === 0) {
            return res.json({ industries, categories, productsByCategory: {}, totalsByCategory: {}, offers: [] });
        }

        const [productsFull, bestPrices] = await Promise.all([

            Product.findAll({
                where: { id: productIds },
                include: [
                    { model: Industry, as: 'industry', attributes: ['id', 'name', 'name_ar', 'icon'] },
                    {
                        model: ProductUnit,
                        as: 'product_units',
                        include: [{ model: Unit, as: 'unit', attributes: ['name', 'name_ar'] }],
                    },
                    {
                        model: ProductCustomizationStage,
                        as: 'customization_stages',
                        include: [{ model: ProductCustomizationOption, as: 'options' }]
                    }
                ],
                order: [
                    [{ model: ProductCustomizationStage, as: 'customization_stages' }, 'sort_order', 'ASC'],
                    [{ model: ProductCustomizationStage, as: 'customization_stages' }, { model: ProductCustomizationOption, as: 'options' }, 'sort_order', 'ASC']
                ]
            }),
            sequelize.query<any>(`
                SELECT sp.product_id, sp.sale_price, sp.sale_start, sp.sale_end, sp.override_price, sp.store_id, sp.available_units, s.can_manage_prices, s.working_hours,
                    CASE 
                        WHEN sp.sale_price IS NOT NULL AND sp.sale_price > 0 
                        AND (sp.sale_start IS NULL OR EXTRACT(EPOCH FROM sp.sale_start) <= EXTRACT(EPOCH FROM NOW()))
                        AND (sp.sale_end IS NULL OR EXTRACT(EPOCH FROM sp.sale_end) >= EXTRACT(EPOCH FROM NOW()))
                        THEN true ELSE false 
                    END as is_offer_active,
                    6371 * acos(
                        LEAST(1, GREATEST(-1, cos(radians(:lat)) * cos(radians(s.latitude))
                        * cos(radians(s.longitude) - radians(:lng))
                        + sin(radians(:lat)) * sin(radians(s.latitude))))
                    ) AS distance_km
                FROM store_products sp
                INNER JOIN stores s ON s.id = sp.store_id
                WHERE sp.product_id IN (:productIds)
                  AND sp.is_available = true
                  AND (sp.stock_quantity IS NULL OR sp.stock_quantity > 0)
                  AND (s.is_approved IS TRUE OR s.is_approved IS NULL)
                  AND (s.is_active IS TRUE OR s.is_active IS NULL)
                ORDER BY s.name ASC
            `, {
                replacements: { lat, lng, productIds },
                type: QueryTypes.SELECT
            })
        ]);

        // Map nearest store info to each product
        const storePriceInfoMap = new Map();
        const nowEpoch = Math.floor(Date.now() / 1000);
        bestPrices.forEach(row => {
            // Secondary JS-side check just in case DB clock is ahead
            const startEpoch = row.sale_start ? Math.floor(new Date(row.sale_start).getTime() / 1000) : 0;
            const endEpoch = row.sale_end ? Math.floor(new Date(row.sale_end).getTime() / 1000) : 2147483647;
            const isActuallyActive = row.sale_price > 0 && nowEpoch >= startEpoch && nowEpoch <= endEpoch;
            
            if (!storePriceInfoMap.has(row.product_id)) {
                storePriceInfoMap.set(row.product_id, {
                    sale_price: row.sale_price,
                    sale_start: row.sale_start,
                    sale_end: row.sale_end,
                    is_offer_active: isActuallyActive,
                    override_price: row.override_price,
                    store_id: row.store_id,
                    available_units: row.available_units,
                    can_manage_prices: row.can_manage_prices,
                    working_hours: row.working_hours
                });
            }
        });

        const productMap = new Map(productsFull.map(p => [p.id, p]));
        const productsByCategory: Record<string, any[]> = {};
        const totalsByCategory: Record<string, number> = {};

        results.forEach(row => {
            const p = productMap.get(row.product_id);
            if (!p) return;

            if (!productsByCategory[row.category]) productsByCategory[row.category] = [];
            totalsByCategory[row.category] = parseInt(row.category_total);

            const data: any = p.toJSON();
            const priceInfo = storePriceInfoMap.get(p.id);
            const canManagePrices = priceInfo?.can_manage_prices || false;
            
            // Filter units by availability and APPLY sale_price override
            const salePrice = priceInfo?.sale_price;
            const rawActive = priceInfo?.is_offer_active;
            const isOfferActive = (rawActive === true || rawActive === 'true' || rawActive === 1 || String(rawActive).toLowerCase() === 't') && canManagePrices;
            const overridePrice = priceInfo?.override_price;
            const hasSalePrice = isOfferActive;
            const hasOverridePrice = overridePrice !== undefined && overridePrice !== null && Number(overridePrice) > 0 && canManagePrices;

            const rawUnits = data.product_units || [];
            const firstRawUnit = rawUnits[0] ?? null;
            const basePrice = firstRawUnit ? firstRawUnit.price : (data.price || 0);

            // Current price is what the user pays
            const currentPrice = hasSalePrice ? Number(salePrice) : (hasOverridePrice ? Number(overridePrice) : basePrice);
            // Original price for display (if currentPrice < displayOriginalPrice, UI shows strikethrough)
            const displayOriginalPrice = hasSalePrice ? (hasOverridePrice ? Number(overridePrice) : basePrice) : currentPrice;

            let pUnits = rawUnits.map((pu: any) => ({
                ...pu,
                price: currentPrice // Return the current active price for all units for now
            }));

            if (priceInfo?.available_units && Array.isArray(priceInfo.available_units)) {
                const allowedSet = new Set(priceInfo.available_units.map((id: any) => Number(id)));
                pUnits = pUnits.filter((pu: any) => allowedSet.has(Number(pu.unit_id)));
            }
            
            const firstUnit = pUnits?.[0] ?? null;

            productsByCategory[row.category].push({
                ...data,
                product_units: pUnits,
                original_price: displayOriginalPrice,
                price: currentPrice,
                sale_price: salePrice,
                sale_start: priceInfo?.sale_start,
                sale_end: priceInfo?.sale_end,
                is_offer_active: priceInfo?.is_offer_active || false,
                override_price: overridePrice,
                store_id: priceInfo?.store_id,
                is_open: isWithinWorkingHours(priceInfo?.working_hours || (p as any).store?.working_hours),
                unit: firstUnit?.unit?.name || 'unit',
                unit_ar: firstUnit?.unit?.name_ar || null,
            });
        });
        // 4. Fetch nearby stores for this industry
        const nearByStores = await sequelize.query<any>(`
            SELECT DISTINCT s.*
            FROM stores s
            ${industryId ? 'INNER JOIN store_industries si ON si.store_id = s.id' : ''}
            WHERE (s.is_approved IS TRUE OR s.is_approved IS NULL)
              AND (s.is_active IS TRUE OR s.is_active IS NULL)
              ${industryId ? 'AND si.industry_id = :industryId' : ''}
              AND (
                6371 * acos(
                    LEAST(1, GREATEST(-1, cos(radians(:lat)) * cos(radians(s.latitude))
                    * cos(radians(s.longitude) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(s.latitude))))
                ) <= :radius
              )
            ORDER BY s.name ASC
        `, {
            replacements: { lat, lng, radius, industryId: industryId || null },
            type: QueryTypes.SELECT
        });

        res.json({ 
            industries,
            categories, 
            productsByCategory, 
            totalsByCategory,
            nearByStores
        });

    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});



// GET /api/v1/grocery/nearby-products
// Products are ranked by the distance to their NEAREST store.
// SQL does all filtering, deduplication, sorting and pagination.
// Optional: category (string), page (int), limit (int)
// When page is provided returns { items, total, page, limit, pages }, else plain array.
router.get('/nearby-products', async (req: any, res: Response) => {
    try {
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        const radius = parseFloat(req.query.radius as string || '15');
        const category = req.query.category as string | undefined;
        const search = req.query.search as string | undefined;
        const industry_id = req.query.industry_id as string | undefined;
        const paginated = req.query.page !== undefined;
        const page = Math.max(1, parseInt(req.query.page as string || '1'));
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || '20')));
        const offset = (page - 1) * limit;

        if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ detail: 'lat and lng are required' });

        // CTE: for each product, compute its minimum distance to any nearby store
        const categoryClause = category ? 'AND p.category = :category' : '';
        const industryClause = industry_id ? 'AND p.industry_id = :industry_id' : '';
        const searchClause = search ? 'AND (p.name ILIKE :search OR p.name_ar ILIKE :search OR p.description ILIKE :search)' : '';

        const baseCte = `
            WITH nearest AS (
                SELECT
                    p.id AS product_id,
                    p.name,
                    p.name_ar,
                    MIN(
                        6371 * acos(
                            GREATEST(-1, LEAST(1,
                                cos(radians(:lat)) * cos(radians(s.latitude))
                                * cos(radians(s.longitude) - radians(:lng))
                                + sin(radians(:lat)) * sin(radians(s.latitude))
                            ))
                        )
                    ) AS min_distance_km
                FROM products p
                INNER JOIN store_products sp ON sp.product_id = p.id 
                    AND sp.is_available = true
                    AND (sp.stock_quantity IS NULL OR sp.stock_quantity > 0)
                INNER JOIN stores s ON s.id = sp.store_id 
                    AND (s.is_approved IS TRUE OR s.is_approved IS NULL) 
                    AND (s.is_active IS TRUE OR s.is_active IS NULL)
                WHERE p.is_available = true ${categoryClause} ${industryClause} ${searchClause}
                GROUP BY p.id, p.name
                HAVING MIN(
                    6371 * acos(
                        GREATEST(-1, LEAST(1,
                            cos(radians(:lat)) * cos(radians(s.latitude))
                            * cos(radians(s.longitude) - radians(:lng))
                            + sin(radians(:lat)) * sin(radians(s.latitude))
                        ))
                    )
                ) <= :radius
            )
        `;

        const replacements: Record<string, unknown> = { lat, lng, radius };
        if (category) replacements.category = category;
        if (industry_id) replacements.industry_id = industry_id;
        if (search) replacements.search = `%${search}%`;

        // Count total matching products
        type CountRow = { total: string };
        const countRows = await sequelize.query<CountRow>(
            `${baseCte} SELECT COUNT(*) AS total FROM nearest`,
            { replacements, type: 'SELECT' as any }
        );
        const total = parseInt((countRows[0] as CountRow).total);

        if (total === 0) {
            return paginated
                ? res.json({ items: [], total: 0, page, limit, pages: 0 })
                : res.json([]);
        }

        // Fetch product IDs ordered by nearest store distance
        const paginationClause = paginated ? `LIMIT ${limit} OFFSET ${offset}` : '';
        type IdRow = { product_id: number; min_distance_km: number };
        const idRows = await sequelize.query<IdRow>(
            `${baseCte}
             SELECT nearest.product_id, nearest.min_distance_km
             FROM nearest
             ORDER BY nearest.name ASC
             ${paginationClause}`,
            { replacements, type: 'SELECT' as any }
        );

        const orderedIds = idRows.map((r: IdRow) => r.product_id);
        if (orderedIds.length === 0) {
            return paginated ? res.json({ items: [], total, page, limit, pages: Math.ceil(total / limit) }) : res.json([]);
        }

        // Fetch full product data preserving the SQL order
        const products = await Product.findAll({
            where: { id: orderedIds },
            include: [
                { model: Industry, as: 'industry', attributes: ['id', 'name', 'name_ar', 'icon'] },
                {
                    model: ProductUnit,
                    as: 'product_units',
                    include: [{ model: Unit, as: 'unit', attributes: ['name', 'name_ar'] }],
                },
                {
                    model: ProductCustomizationStage,
                    as: 'customization_stages',
                    include: [{ model: ProductCustomizationOption, as: 'options' }]
                }
            ],
            order: [
                [{ model: ProductCustomizationStage, as: 'customization_stages' }, 'sort_order', 'ASC'],
                [{ model: ProductCustomizationStage, as: 'customization_stages' }, { model: ProductCustomizationOption, as: 'options' }, 'sort_order', 'ASC']
            ]
        });

        // To get the correct sale price, we need to know which store was the "nearest" one for each product
        // We'll fetch the store_products entries for these products in the nearby stores
        const bestPrices = await sequelize.query<any>(`
            SELECT sp.product_id, sp.sale_price, sp.sale_start, sp.sale_end, sp.override_price, sp.store_id, sp.available_units, s.can_manage_prices, s.working_hours,
                CASE 
                    WHEN sp.sale_price IS NOT NULL AND sp.sale_price > 0 
                    AND (sp.sale_start IS NULL OR sp.sale_start <= NOW())
                    AND (sp.sale_end IS NULL OR sp.sale_end >= NOW())
                    THEN true ELSE false 
                END as is_offer_active,
                6371 * acos(
                    LEAST(1, GREATEST(-1, cos(radians(:lat)) * cos(radians(s.latitude))
                    * cos(radians(s.longitude) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(s.latitude))))
                ) AS distance_km
            FROM store_products sp
            INNER JOIN stores s ON s.id = sp.store_id
            WHERE sp.product_id IN (:productIds)
              AND sp.is_available = true
              AND (s.is_approved IS TRUE OR s.is_approved IS NULL)
              AND (s.is_active IS TRUE OR s.is_active IS NULL)
            ORDER BY s.name ASC
        `, {
            replacements: { lat, lng, productIds: orderedIds },
            type: QueryTypes.SELECT
        });

        // Use a map to store the price and store_id from the NEAREST store for each product
        const storePriceInfoMap = new Map();
        bestPrices.forEach(row => {
            if (!storePriceInfoMap.has(row.product_id)) {
                storePriceInfoMap.set(row.product_id, {
                    sale_price: row.sale_price,
                    sale_start: row.sale_start,
                    sale_end: row.sale_end,
                    is_offer_active: row.is_offer_active,
                    override_price: row.override_price,
                    store_id: row.store_id,
                    available_units: row.available_units,
                    can_manage_prices: row.can_manage_prices,
                    working_hours: row.working_hours
                });
            }
        });

        // Re-sort to match SQL proximity order and attach distance
        const distMap = new Map(idRows.map((r: IdRow & { min_distance_km: number }) => [r.product_id, r.min_distance_km]));
        const productMap = new Map(products.map(p => [p.id, p]));
        const ordered = orderedIds
            .map(id => productMap.get(id))
            .filter((p): p is typeof products[0] => p !== undefined);

        const items = ordered.map(p => {
            const data: any = p.toJSON();
            const priceInfo = storePriceInfoMap.get(p.id);
            const canManagePrices = priceInfo?.can_manage_prices || false;

            // Filter units by availability and APPLY sale_price override
            const salePrice = priceInfo?.sale_price;
            const rawActive = priceInfo?.is_offer_active;
            const isOfferActive = (rawActive === true || rawActive === 'true' || rawActive === 1 || String(rawActive).toLowerCase() === 't') && canManagePrices;
            const overridePrice = priceInfo?.override_price;
            const hasSalePrice = isOfferActive;
            const hasOverridePrice = overridePrice !== undefined && overridePrice !== null && Number(overridePrice) > 0 && canManagePrices;

            const rawUnits = data.product_units || [];
            const firstRawUnit = rawUnits[0] ?? null;
            const basePrice = firstRawUnit ? firstRawUnit.price : (data.price || 0);

            // Current price is what the user pays
            const currentPrice = hasSalePrice ? Number(salePrice) : (hasOverridePrice ? Number(overridePrice) : basePrice);
            // Original price for display
            const displayOriginalPrice = hasSalePrice ? (hasOverridePrice ? Number(overridePrice) : basePrice) : currentPrice;

            let pUnits = rawUnits.map((pu: any) => ({
                ...pu,
                price: currentPrice
            }));

            if (priceInfo?.available_units && Array.isArray(priceInfo.available_units)) {
                const allowedSet = new Set(priceInfo.available_units.map((id: any) => Number(id)));
                pUnits = pUnits.filter((pu: any) => allowedSet.has(Number(pu.unit_id)));
            }

            const firstUnit = pUnits?.[0] ?? null;
            
            return {
                ...data,
                product_units: pUnits,
                original_price: displayOriginalPrice,
                price: currentPrice,
                sale_price: salePrice,
                sale_start: priceInfo?.sale_start,
                sale_end: priceInfo?.sale_end,
                is_offer_active: priceInfo?.is_offer_active || false,
                override_price: overridePrice,
                store_id: priceInfo?.store_id, // Important for useCart to know which store's price to fetch
                is_open: isWithinWorkingHours(priceInfo?.working_hours),
                unit: firstUnit?.unit?.name || 'unit',
                unit_ar: firstUnit?.unit?.name_ar || null,
            };
        });

        if (!paginated) return res.json(items);
        res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/stores/:storeId/products
router.get('/stores/:storeId/products', async (req: any, res: Response) => {
    try {
        const storeId = parseInt(req.params.storeId as string);
        const category = req.query.category as string | undefined;
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '20');
        const offset = (page - 1) * limit;        const store = await Store.findByPk(storeId);
        if (!store) return res.status(404).json({ detail: 'Store not found' });
        const canManagePrices = store.can_manage_prices || false;

        // Get product mappings with sale_price and activation logic in SQL
        const storeProductLinks = await sequelize.query<any>(`
            SELECT sp.product_id, sp.sale_price, sp.override_price, sp.available_units,
                CASE 
                    WHEN sp.sale_price IS NOT NULL AND sp.sale_price > 0 
                    AND (sp.sale_start IS NULL OR EXTRACT(EPOCH FROM sp.sale_start) <= EXTRACT(EPOCH FROM NOW()))
                    AND (sp.sale_end IS NULL OR EXTRACT(EPOCH FROM sp.sale_end) >= EXTRACT(EPOCH FROM NOW()))
                    THEN true ELSE false 
                END as is_offer_active
            FROM store_products sp
            WHERE sp.store_id = :storeId
              AND sp.is_available = true
              AND (sp.stock_quantity IS NULL OR sp.stock_quantity > 0)
        `, {
            replacements: { storeId },
            type: QueryTypes.SELECT
        });

        const productIds = storeProductLinks.map(sp => sp.product_id);
        const storeInfoMap = new Map(storeProductLinks.map(sp => [sp.product_id, sp]));

        const where: any = { id: productIds, is_available: true };
        if (category && category !== 'All') where.category = category;

        const { count, rows: products } = await Product.findAndCountAll({
            where,
            include: [
                { model: Industry, as: 'industry', attributes: ['id', 'name', 'name_ar', 'icon'] },
                {
                    model: ProductUnit,
                    as: 'product_units',
                    include: [{ model: Unit, as: 'unit', attributes: ['name', 'name_ar'] }]
                },
                { model: ProductCustomizationStage, as: 'customization_stages', include: [{ model: ProductCustomizationOption, as: 'options' }] }
            ],
            limit,
            offset,
            order: [
                ['sort_order', 'ASC'], 
                ['name', 'ASC'],
                [{ model: ProductCustomizationStage, as: 'customization_stages' }, 'sort_order', 'ASC'],
                [{ model: ProductCustomizationStage, as: 'customization_stages' }, { model: ProductCustomizationOption, as: 'options' }, 'sort_order', 'ASC']
            ]
        });

        const mappedProducts = products.map(p => {
            const data: any = p.toJSON();
            const priceInfo = storeInfoMap.get(p.id);
            
            const salePrice = priceInfo?.sale_price;
            const rawActive = priceInfo?.is_offer_active;
            const isOfferActive = (rawActive === true || rawActive === 'true' || rawActive === 1 || String(rawActive).toLowerCase() === 't') && canManagePrices;
            const overridePrice = priceInfo?.override_price;
            const hasSalePrice = isOfferActive;
            const hasOverridePrice = overridePrice !== undefined && overridePrice !== null && Number(overridePrice) > 0 && canManagePrices;
            
            const rawUnits = data.product_units || [];
            const firstRawUnit = rawUnits[0] ?? null;
            const basePrice = firstRawUnit ? firstRawUnit.price : (data.price || 0);

            // Current price is what the user pays
            const currentPrice = hasSalePrice ? Number(salePrice) : (hasOverridePrice ? Number(overridePrice) : basePrice);
            // Original price for display
            const displayOriginalPrice = hasSalePrice ? (hasOverridePrice ? Number(overridePrice) : basePrice) : currentPrice;

            // Filter units by availability and APPLY currentPrice override
            let pUnits = rawUnits.map((pu: any) => ({
                ...pu,
                price: currentPrice
            }));

            if (priceInfo?.available_units && Array.isArray(priceInfo.available_units)) {
                const allowedSet = new Set(priceInfo.available_units.map((id: any) => Number(id)));
                pUnits = pUnits.filter((pu: any) => allowedSet.has(Number(pu.unit_id)));
            }

            const firstUnit = pUnits.length > 0 ? pUnits[0] : null;

            return {
                ...data,
                // Override product_units so the frontend dialog only sees the available ones with the OVERRIDDEN price
                product_units: pUnits, 
                original_price: displayOriginalPrice,
                price: currentPrice,
                sale_price: salePrice,
                sale_start: priceInfo?.sale_start,
                sale_end: priceInfo?.sale_end,
                is_offer_active: priceInfo?.is_offer_active || false,
                override_price: overridePrice,
                unit: firstUnit?.unit?.name || 'unit',
                unit_ar: firstUnit?.unit?.name_ar || null
            };
        });
        res.json({
            items: mappedProducts,
            total: count,
            page,
            limit,
            pages: Math.ceil(count / limit)
        });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/nearby-offers
// Similar to nearby-products but restricted to items with a sale_price
router.get('/nearby-offers', async (req: any, res: Response) => {
    try {
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        const radius = parseFloat(req.query.radius as string || '15');
        const storeId = req.query.store_id ? parseInt(req.query.store_id as string) : null;

        if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ detail: 'lat and lng are required' });

        // Select products that have a sale_price set in a nearby store
        let query = `
            SELECT p.*, sp.sale_price, sp.store_id, sp.available_units
            FROM products p

            INNER JOIN store_products sp ON sp.product_id = p.id 
            INNER JOIN stores s ON s.id = sp.store_id 
            WHERE sp.sale_price > 0 
              AND s.can_manage_prices = true
              AND sp.is_available = true
              AND (sp.stock_quantity IS NULL OR sp.stock_quantity > 0)
              AND (s.is_approved IS TRUE OR s.is_approved IS NULL)
              AND (s.is_active IS TRUE OR s.is_active IS NULL)
              AND (6371 * acos(
                    LEAST(1, GREATEST(-1, cos(radians(:lat)) * cos(radians(s.latitude))
                    * cos(radians(s.longitude) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(s.latitude))))
                )) <= :radius
        `;

        const replacements: any = { lat, lng, radius };
        
        if (storeId) {
            query += ` AND sp.store_id = :storeId`;
            replacements.storeId = storeId;
        }

        query += ` ORDER BY p.name ASC LIMIT 50`;

        const products = await sequelize.query<any>(query, {
            replacements,
            type: QueryTypes.SELECT,
        });

        console.log(`[NEARBY-OFFERS-DEBUG] Found ${products.length} offers. Names: ${products.map((p: any) => p.name).join(', ')}`);

        if (products.length === 0) {
            console.log('[NEARBY-OFFERS-DEBUG] No offers found even with relaxed filters!');
            return res.json([]);
        }

        // Fetch units for these products to get the original/base price
        // Fetch full product data with customizations for all offer ids
        const offerIds = products.map((p: any) => p.id);
        const productsWithMeta = await Product.findAll({
            where: { id: offerIds },
            include: [
                {
                    model: ProductCustomizationStage,
                    as: 'customization_stages',
                    include: [{ model: ProductCustomizationOption, as: 'options' }]
                }
            ]
        });
        const metaMap = new Map(productsWithMeta.map(p => [p.id, (p.toJSON() as any).customization_stages]));

        const units = await ProductUnit.findAll({
            where: { product_id: offerIds },
            include: [{ model: Unit, as: 'unit', attributes: ['name', 'name_ar'] }]
        });        const items = products.map((p: any) => {
            const rawUnits = units.filter(u => u.product_id === p.id);
            const firstRawUnit = rawUnits[0] ?? null;
            const originalPrice = firstRawUnit ? firstRawUnit.price : (p.price || 0);

            let pUnits = rawUnits.map((pu: any) => ({
                ...pu,
                price: Number(p.sale_price) // Offer is always the sale_price
            }));
            const customization_stages = metaMap.get(p.id) || [];
            
            // Filter by store-specific availability
            if (p.available_units && Array.isArray(p.available_units)) {
                const allowedSet = new Set(p.available_units.map((id: any) => Number(id)));
                pUnits = pUnits.filter((u: any) => allowedSet.has(Number(u.unit_id)));
            }
            const firstUnit = pUnits[0] as any;
            return {
                ...p,
                product_units: pUnits,
                customization_stages,
                has_customizations: customization_stages.length > 0,
                original_price: originalPrice,
                price: p.sale_price, // The customer sees the sale price
                unit: firstUnit?.unit?.name || 'unit',
                unit_ar: firstUnit?.unit?.name_ar || null,
            };
        });

        res.json(items);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/products/:id/units
router.get('/products/:id/units', async (req: any, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string);
        const rawStoreId = req.query.store_id;
        const storeId = (rawStoreId !== undefined && rawStoreId !== null && rawStoreId !== '' && rawStoreId !== 'undefined') 
            ? parseInt(rawStoreId as string) 
            : null;
        
        if (storeId !== null && isNaN(storeId)) {
            // If it's NaN (e.g. invalid string like "abc"), treat as no store
            return res.status(400).json({ detail: 'Invalid store_id' });
        }

        const [productUnits, storeLink, store] = await Promise.all([
            ProductUnit.findAll({
                where: { product_id: productId },
                include: [{ model: Unit, as: 'unit', attributes: ['id', 'name', 'name_ar', 'is_active', 'step'] }]
            }),
            storeId ? StoreProduct.findOne({ where: { store_id: storeId, product_id: productId } }) : Promise.resolve(null),
            storeId ? Store.findByPk(storeId) : Promise.resolve(null)
        ]);
        if (store && !isWithinWorkingHours(store.working_hours)) {
            return res.status(400).json({ 
                detail: `عذراً، المحل "${store.name}" مغلق حالياً ولا يستقبل طلبات. أوقات العمل من: ${store.working_hours}`,
                is_closed: true,
                store_name: store.name
            });
        }

        const canManage = store?.can_manage_prices || false;
        const now = new Date(); // Use server date for this quick check, or better, UTC ISO comparison
        
        const salePrice = storeLink?.sale_price !== null && storeLink?.sale_price !== undefined ? Number(storeLink.sale_price) : undefined;
        const overridePrice = storeLink?.override_price !== null && storeLink?.override_price !== undefined ? Number(storeLink.override_price) : undefined;

        const isOfferActive = (salePrice !== undefined && canManage) && (
            (storeLink?.sale_start === null || storeLink?.sale_start === undefined || now >= new Date(storeLink.sale_start)) &&
            (storeLink?.sale_end === null || storeLink?.sale_end === undefined || now <= new Date(storeLink.sale_end))
        );

        let unitsToReturn = productUnits.map((pu: any) => {
            let finalPrice = pu.price;
            if (isOfferActive && salePrice !== undefined) {
                finalPrice = salePrice;
            } else if (canManage && overridePrice !== undefined) {
                finalPrice = overridePrice;
            }

            return {
                id: pu.id,
                unit_id: pu.unit_id,
                price: finalPrice,
                original_price: pu.price,
                unit_name: pu.unit?.name,
                unit_name_ar: pu.unit?.name_ar,
                unit_step: pu.unit?.step || 1.0,
            };
        });

        // Filter by available_units if set
        if (storeLink?.available_units && Array.isArray(storeLink.available_units)) {
            const allowed = new Set(storeLink.available_units.map(id => Number(id)));
            unitsToReturn = unitsToReturn.filter(u => allowed.has(Number(u.unit_id)));
        }

        res.json(unitsToReturn);
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// GET /api/v1/grocery/stores/:id — fetch a single store by id (public)
router.get('/stores/:id', async (req: any, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) return res.status(400).json({ detail: 'Invalid store id' });
        const store = await Store.findOne({ 
            where: { 
                id, 
                is_approved: true, 
                [Op.or]: [{ is_active: true }, { is_active: null }] 
            } 
        });
        if (!store) return res.status(404).json({ detail: 'Store not found' });
        res.json({
            ...store.toJSON(),
            is_open: isWithinWorkingHours(store.working_hours)
        });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});
// GET /api/v1/grocery/stores/:id/categories
router.get('/stores/:id/categories', async (req: any, res: Response) => {
    try {
        const storeId = parseInt(req.params.id as string);
        const products = await Product.findAll({
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('category')), 'category']
            ],
            where: {
                id: {
                    [Op.in]: sequelize.literal(`(SELECT product_id FROM store_products WHERE store_id = ${storeId} AND is_available = true)`)
                },
                is_available: true,
                category: { [Op.ne]: null }
            },
            order: [[sequelize.col('category'), 'ASC']]
        });
        res.json(products.map((p: any) => p.category));
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});

// ...


// GET /api/v1/grocery/delivery-fee
router.get('/delivery-fee', async (req: any, res: Response) => {
    try {
        const rawStoreIds = req.query.store_ids || req.query.store_id;
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);

        if (!rawStoreIds) return res.status(400).json({ detail: 'store_ids or store_id is required' });

        const storeIds = [...new Set(Array.isArray(rawStoreIds) 
            ? rawStoreIds.map(id => parseInt(id))
            : String(rawStoreIds).split(',').map(id => parseInt(id.trim())))].filter(id => !isNaN(id));

        const settings = await getSettings();
        const baseFee = parseFloat(settings.base_delivery_fee || '2.99');
        const perKm = parseFloat(settings.per_km_fee || '0.5');

        const stores = await Store.findAll({ where: { id: storeIds }, include: [{ model: StoreGroup, as: 'group' }] });
        
        let totalFee = 0;
        const processedGroups = new Set<number>();
        const storeStats = [];

        for (const storeId of storeIds) {
            const store = stores.find(s => s.id === storeId);
            if (!store) continue;

            // Check if closed
            if (!isWithinWorkingHours(store.working_hours)) {
                return res.status(400).json({ 
                    detail: `عذراً، المحل "${store.name}" مغلق حالياً. أوقات العمل: ${store.working_hours}`,
                    is_closed: true,
                    store_name: store.name
                });
            }

            const dist = haversineDistance(lat, lng, store.latitude, store.longitude);
            const { fee, area_type, allowed } = await getStoreDeliveryFee(storeId, lat, lng, baseFee, perKm);

            if (!allowed) {
                return res.status(400).json({ 
                    detail: 'عذراً، التوصيل غير متوفر لموقعك',
                    not_allowed: true,
                    store_name: store.name,
                    area_type
                });
            }

            let currentStoreFee = 0;
            if (store.group_id && store.group && store.group.is_active) {
                if (!processedGroups.has(store.group_id)) {
                    currentStoreFee = Number(store.group.delivery_fee);
                    totalFee += currentStoreFee;
                    processedGroups.add(store.group_id);
                } else {
                    currentStoreFee = 0; // Covered by group
                }
            } else {
                currentStoreFee = fee === -1 ? calcDeliveryFee(dist, baseFee, perKm) : fee;
                totalFee += currentStoreFee;
            }

            storeStats.push({ store_id: storeId, distance_km: Math.round(dist * 100) / 100, delivery_fee: currentStoreFee });
        }

        res.json({ 
            delivery_fee: Math.round(totalFee * 100) / 100,
            stores: storeStats
        });
    } catch (e: any) {
        res.status(500).json({ detail: e.message });
    }
});


export default router;
