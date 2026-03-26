import { Op } from 'sequelize';
import { Store, StoreProduct } from '../models';
import { isWithinWorkingHours } from '../utils/time';
import { getStoreDeliveryFee } from '../routes/grocery/helpers';



/**
 * Input shape for an order item to be distributed.
 */
export interface OrderItemInput {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    unit_name?: string | null;
    unit_name_ar?: string | null;
    customizations?: any | null;
}

/**
 * A single store assignment from the distribution algorithm.
 */
export interface StoreAssignment {
    store_id: number;
    store: any; // Store model instance
    items: OrderItemInput[];
}

/**
 * Result of the distribution algorithm.
 */
export interface DistributionResult {
    assignments: StoreAssignment[];
    unfulfillableItems: OrderItemInput[];
    fulfilled: boolean;
}

/**
 * Smart order distribution service using a Greedy Set Cover algorithm.
 *
 * Given an order with multiple items, this service finds the minimum
 * number of stores needed to fulfill the entire order by iteratively
 * selecting the store that covers the most uncovered items.
 */
export class OrderDistributionService {
    /**
     * Distributes order items across stores using greedy set cover.
     *
     * @param orderItems - The items in the order to distribute
     * @param deliveryLat - Optional delivery latitude for tiebreaking
     * @param deliveryLng - Optional delivery longitude for tiebreaking
     * @returns DistributionResult with store assignments and any unfulfillable items
     */
    async distributeOrder(
        orderItems: OrderItemInput[],
        deliveryLat?: number | null,
        deliveryLng?: number | null
    ): Promise<DistributionResult> {
        // 1. Extract unique product IDs from the order
        const productIds = [...new Set(orderItems.map(item => item.product_id))];

        // 2. Query all active stores that carry any of these products
        const storeProducts = await StoreProduct.findAll({
            where: {
                product_id: { [Op.in]: productIds },
                is_available: true,
                [Op.or]: [
                    { stock_quantity: { [Op.gt]: 0 } },
                    { stock_quantity: null }
                ]
            },
            include: [
                {
                    model: Store,
                    as: 'store',
                    where: {
                        is_active: { [Op.or]: [true, null] } as any,
                        is_approved: { [Op.or]: [true, null] } as any,
                        is_accepting_orders: true,
                    },
                },
            ],
        });

        // 3. Build coverage map: store_id -> { store, availableProductIds }
        const coverageMap = new Map<number, { store: any; productIds: Set<number> }>();

        for (const sp of storeProducts) {
            const store = (sp as any).store;
            if (!store) continue;

            // --- Working Hours Filter ---
            if (!isWithinWorkingHours(store.working_hours)) {
                continue; // Store is currently closed
            }
            // ---------------------------

            const storeId = sp.store_id;
            
            // --- Delivery Zone Filter ---
            if (deliveryLat != null && deliveryLng != null) {
                const { allowed } = await getStoreDeliveryFee(storeId, deliveryLat, deliveryLng, 0, 0);
                if (!allowed) continue;
            }

            if (!coverageMap.has(storeId)) {
                coverageMap.set(storeId, {
                    store: store,
                    productIds: new Set<number>(),
                });
            }
            coverageMap.get(storeId)!.productIds.add(sp.product_id);
        }


        // 4. Run the greedy set cover algorithm
        const remainingProductIds = new Set<number>(productIds);
        const assignments: StoreAssignment[] = [];

        while (remainingProductIds.size > 0) {
            let bestStoreId: number | null = null;
            let bestCoverage = 0;
            let bestStore: any = null;

            for (const [storeId, data] of coverageMap.entries()) {
                // Count how many remaining items this store can cover
                let coverage = 0;
                for (const pid of remainingProductIds) {
                    if (data.productIds.has(pid)) {
                        coverage++;
                    }
                }

                if (coverage > bestCoverage) {
                    bestCoverage = coverage;
                    bestStoreId = storeId;
                    bestStore = data.store;
                } else if (coverage === bestCoverage && coverage > 0 && bestStore) {
                    // Tiebreaker 1: prefer higher-rated store
                    const currentRating = data.store?.rating ?? 0;
                    const bestRating = bestStore?.rating ?? 0;

                    if (currentRating > bestRating) {
                        bestStoreId = storeId;
                        bestStore = data.store;
                    } else if (currentRating === bestRating && deliveryLat != null && deliveryLng != null) {
                        // Tiebreaker 2: prefer closer store
                        const currentDist = this.haversineDistance(
                            deliveryLat, deliveryLng,
                            data.store.latitude, data.store.longitude
                        );
                        const bestDist = this.haversineDistance(
                            deliveryLat, deliveryLng,
                            bestStore.latitude, bestStore.longitude
                        );
                        if (currentDist < bestDist) {
                            bestStoreId = storeId;
                            bestStore = data.store;
                        }
                    }
                }
            }

            // No store can cover any remaining item — these are unfulfillable
            if (bestStoreId === null || bestCoverage === 0) {
                break;
            }

            // Assign matching items to this store
            const storeData = coverageMap.get(bestStoreId)!;
            const assignedItems: OrderItemInput[] = [];
            const coveredProductIds: number[] = [];

            for (const pid of remainingProductIds) {
                if (storeData.productIds.has(pid)) {
                    // Find ALL order items with this product_id (handles duplicates)
                    const matchingItems = orderItems.filter(item => item.product_id === pid);
                    assignedItems.push(...matchingItems);
                    coveredProductIds.push(pid);
                }
            }

            // Remove covered products from remaining set
            for (const pid of coveredProductIds) {
                remainingProductIds.delete(pid);
            }

            // Remove this store from consideration
            coverageMap.delete(bestStoreId);

            assignments.push({
                store_id: bestStoreId,
                store: bestStore,
                items: assignedItems,
            });
        }

        // Collect unfulfillable items
        const unfulfillableItems: OrderItemInput[] = [];
        for (const pid of remainingProductIds) {
            const matchingItems = orderItems.filter(item => item.product_id === pid);
            unfulfillableItems.push(...matchingItems);
        }

        return {
            assignments,
            unfulfillableItems,
            fulfilled: remainingProductIds.size === 0,
        };
    }

    /**
     * Calculate the Haversine distance between two lat/lng points in km.
     */
    private haversineDistance(
        lat1: number, lng1: number,
        lat2: number, lng2: number
    ): number {
        const R = 6371; // Earth radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
