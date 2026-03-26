import { AppSetting, Notification, DeliveryArea } from '../../models';

/**
 * Checks if a point is inside a polygon using Ray-casting algorithm
 * @param point [longitude, latitude]
 * @param polygonCoords GeoJSON Polygon coordinates [ [ [lng, lat], ... ] ]
 */
export function isPointInPolygon(point: [number, number], polygonCoords: number[][][]): boolean {
    const x = point[0], y = point[1];
    let inside = false;
    
    // Most GeoJSON polygons have one outer ring at coordinates[0]
    // Some might have inner rings (holes) but for delivery areas we usually don't care about holes
    const ring = polygonCoords[0];
    if (!ring) return false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Calculates delivery fee based on store zones (A, B, C)
 * Falls back to distance-based calculation if no zones are defined for the store.
 */
export async function getStoreDeliveryFee(storeId: number, lat: number, lng: number, baseFee: number, perKm: number): Promise<{ fee: number; area_type: string | null; allowed: boolean }> {
    const areas = await DeliveryArea.findAll({
        where: { store_id: storeId, is_active: true }
    });

    if (areas.length === 0) {
        // Fallback to distance calculation if no specific zones defined
        return { fee: -1, area_type: null, allowed: true };
    }

    // Categorize by type A, B, C
    // We check A, then B, then C.
    const priority = ['A', 'B', 'C'];
    const sortedAreas = areas.sort((a, b) => {
        const idxA = priority.indexOf(a.area_type || '');
        const idxB = priority.indexOf(b.area_type || '');
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    for (const area of sortedAreas) {
        const poly = area.boundaries as any;
        if (poly?.type === 'Polygon' && poly?.coordinates) {
            if (isPointInPolygon([lng, lat], poly.coordinates)) {
                if (area.area_type === 'C') {
                    return { fee: 0, area_type: 'C', allowed: false };
                }
                return { fee: Number(area.delivery_fee), area_type: area.area_type, allowed: true };
            }
        }
    }

    // If we have zones but the user is not in ANY of them
    // The user decided Zone C is "everything else"
    return { fee: 0, area_type: 'C', allowed: false };
}



export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dlat = ((lat2 - lat1) * Math.PI) / 180;
    const dlon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dlat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dlon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

export function calcDeliveryFee(dist: number, baseFee = 2.99, perKm = 0.5): number {
    return Math.round((baseFee + dist * perKm) * 100) / 100;
}

/**
 * Checks if current local time is within working hours.
 * Format: "HH:MM-HH:MM" (e.g., "09:00-22:30")
 */
export function isWithinWorkingHours(hoursStr: string | null | undefined): boolean {
    if (!hoursStr || hoursStr.toLowerCase() === 'all' || hoursStr === '24/7' || hoursStr.trim() === '') return true;
    
    try {
        const [start, end] = hoursStr.split('-');
        if (!start || !end) return true;

        const now = new Date();
        const palestineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Gaza' }));
        const currentMinutes = palestineTime.getHours() * 60 + palestineTime.getMinutes();

        const [startH, startM] = start.trim().split(':').map(Number);
        const [endH, endM] = end.trim().split(':').map(Number);

        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return true;

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (endMinutes < startMinutes) {
            // Case for overnight (e.g., 22:00-06:00)
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }

        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (e) {
        console.error('Error parsing working hours:', hoursStr, e);
        return true; 
    }
}

// Module-level cache — populated on first call, refreshed every 60 s
let settingsCache: Record<string, string> | null = null;
let settingsCacheExpiry = 0;
const SETTINGS_TTL_MS = 60_000;

export async function getSettings(): Promise<Record<string, string>> {
    const now = Date.now();
    if (settingsCache && now < settingsCacheExpiry) {
        return settingsCache;
    }
    const settings = await AppSetting.findAll();
    settingsCache = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    settingsCacheExpiry = now + SETTINGS_TTL_MS;
    return settingsCache;
}

/** Call this after an AppSetting is updated so the next request re-fetches. */
export function invalidateSettingsCache(): void {
    settingsCache = null;
    settingsCacheExpiry = 0;
}

export async function createNotification(userId: string, title: string, body: string, type: string, orderId?: number) {
    try {
        await Notification.create({ user_id: userId, title, body, type, order_id: orderId ?? null, is_read: false, created_at: new Date() });
    } catch (e) {
        console.error('Notification creation error:', e);
    }
}

export async function bulkCreateNotifications(
    notifications: Array<{ user_id: string; title: string; body: string; type: string; order_id?: number | null }>,
    transaction?: any
): Promise<void> {
    if (notifications.length === 0) return;
    try {
        await Notification.bulkCreate(
            notifications.map(n => ({
                user_id: n.user_id,
                title: n.title,
                body: n.body,
                type: n.type,
                order_id: n.order_id ?? null,
                is_read: false,
                created_at: new Date(),
            })) as any,
            { transaction }
        );
    } catch (e) {
        console.error('Bulk notification creation error:', e);
    }
}
