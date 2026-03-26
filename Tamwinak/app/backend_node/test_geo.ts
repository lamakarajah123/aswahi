import { DeliveryArea } from './src/models/DeliveryArea';
import { isPointInPolygon } from './src/routes/grocery/helpers';
import { sequelize } from './src/config/database';

async function test() {
    try {
        const areas = await DeliveryArea.findAll();
        console.log(`Found ${areas.length} areas in DB.`);
        for (const area of areas) {
            console.log(`\nArea ID: ${area.id}, Store: ${area.store_id}, Type: ${area.area_type}, Fee: ${area.delivery_fee}`);
            const poly = area.boundaries as any;
            if (poly?.type === 'Polygon' && poly?.coordinates) {
                console.log(`Valid Polygon. Coordinates Ring length: ${poly.coordinates[0]?.length}`);
                
                // Let's test a point. Maybe the center of the bounding box
                let minX = 999, minY = 999, maxX = -999, maxY = -999;
                for (const p of poly.coordinates[0]) {
                    if (p[0] < minX) minX = p[0];
                    if (p[0] > maxX) maxX = p[0];
                    if (p[1] < minY) minY = p[1];
                    if (p[1] > maxY) maxY = p[1];
                }
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                
                console.log(`Test center point [${centerX}, ${centerY}] (lng, lat):`);
                const inside = isPointInPolygon([centerX, centerY], poly.coordinates);
                console.log(`Is inside: ${inside}`);
            } else {
                console.log(`Invalid boundaries structure!`, JSON.stringify(area.boundaries).slice(0, 100));
            }
        }
    } catch (e) {
         console.error("Test error:", e);
    } finally {
        await sequelize.close();
    }
}
test();
