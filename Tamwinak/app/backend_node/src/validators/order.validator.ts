import { z } from 'zod';

export const OrderItemDataSchema = z.object({
    product_id: z.number().int().min(1),
    product_name: z.string().min(1),
    quantity: z.number().int().min(1),
    unit_price: z.number().min(0),
    subtotal: z.number().min(0)
});

export const OrderDataSchema = z.object({
    store_id: z.number().int().min(1).optional(),
    driver_id: z.string().nullable().optional(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled', 'delivering']),
    subtotal: z.number().min(0),
    delivery_fee: z.number().min(0),
    total: z.number().min(0),
    delivery_address: z.string().nullable().optional(),
    delivery_lat: z.number().nullable().optional(),
    delivery_lng: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    group_id: z.string().nullable().optional(),
    smartDistribute: z.boolean().optional(),
    items: z.array(OrderItemDataSchema).min(1).optional() // items inside order
}).refine(
    (data) => data.store_id != null || data.smartDistribute === true,
    { message: 'Either store_id or smartDistribute must be provided', path: ['store_id'] }
);

export const OrderUpdateDataSchema = z.object({
    store_id: z.number().int().min(1).optional(),
    driver_id: z.string().nullable().optional(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled', 'delivering']).optional(),
    subtotal: z.number().min(0).optional(),
    delivery_fee: z.number().min(0).optional(),
    total: z.number().min(0).optional(),
    delivery_address: z.string().nullable().optional(),
    delivery_lat: z.number().nullable().optional(),
    delivery_lng: z.number().nullable().optional(),
    notes: z.string().nullable().optional()
});
