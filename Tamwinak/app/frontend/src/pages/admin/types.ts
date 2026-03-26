export interface Analytics {
    total_orders: number;
    total_revenue: number;
    gross_order_value: number;
    total_stores: number;
    pending_approvals: number;
    active_drivers: number;
    orders_by_status: Record<string, number>;
    recent_orders: { id: number; store_name: string; status: string; total: number; created_at: string }[];
}

export interface Industry {
    id: number;
    name: string;
    name_ar: string | null;
    icon: string | null;
    image_url: string | null;
    description: string | null;
    is_active: boolean;
    created_at?: string;
}

export interface Category {
    id: number;
    name: string;
    name_ar: string | null;
    icon: string | null;
    description: string | null;
    sort_order: number;
    is_active: boolean;
    product_count?: number;
    created_at?: string;
}

export interface DeliveryArea {
    id: number;
    store_id: number | null;
    name: string;
    name_ar: string | null;
    boundaries: any; // GeoJSON Polygon
    color: string;
    is_active: boolean;
    area_type: 'A' | 'B' | 'C' | null;
    delivery_fee: number;
    created_at?: string;
}


export interface Product {
    id: number;
    industry_id: number | null;
    industry?: Industry;
    name: string;
    description: string;
    price: number;
    category: string;
    unit: string;
    is_available: boolean;
    image_url: string;
    stock_quantity?: number;
    sale_price?: number | null;
    product_units?: (ProductUnit & { unit?: Unit })[];
    available_units?: number[] | null;
}

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    phone?: string;
    address?: string;
    work_area?: string;
    working_hours?: string;
    vehicle_type?: string;
    order_count?: number;
    delivered_count?: number;
}

export interface AdminStore {
    id: number;
    user_id: string;
    name: string;
    address: string;
    image_url?: string | null;
    latitude?: number;
    longitude?: number;
    is_approved: boolean;
    is_active: boolean;
    rating: number;
    total_ratings: number;
    created_at: string;
    owner_email?: string;
    owner_name?: string;
    working_hours?: string;
    can_manage_prices?: boolean;
    orders?: AdminOrder[];
}

export interface AdminOrder {
    id: number;
    user_id: string;
    store_name: string;
    driver_id: string;
    status: string;
    subtotal: number;
    delivery_fee: number;
    total: number;
    delivery_address: string;
    created_at: string;
    items?: {
        id: number;
        product_name: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
        unit_name?: string;
        customizations?: any[] | null;
    }[];
}

export interface AppSetting {
    id: number;
    key: string;
    value: string;
    description: string;
}

export interface Unit {
    id: number;
    name: string;
    name_ar: string | null;
    is_active?: boolean;
    step?: number;
    allow_decimal?: boolean;
}

export interface ProductUnit {
    unit_id: number;
    price: number;
    unit_name?: string;
    unit_name_ar?: string;
}
