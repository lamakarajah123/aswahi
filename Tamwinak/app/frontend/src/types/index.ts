// ─────────────────────────────────────────────────────────────
// Shared application types — import from '@/types'
// Admin-specific types live in src/pages/admin/types.ts
// ─────────────────────────────────────────────────────────────

// Storefront product (customer-facing pages)
export interface Product {
  id: number;
  store_id?: number;
  name: string;
  name_ar?: string | null;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  unit: string | null;
  unit_ar?: string | null;
  is_available: boolean | null;
  stock_quantity?: number;
  sale_price?: number | null;
  original_price?: number | null;
  has_customizations?: boolean | null;
  customization_stages?: any[];
  is_offer_active?: boolean;
  is_open?: boolean;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unit: string;
  unitAr?: string | null;
  unitId: number;
  step?: number;
  price: number;
  customizations?: any[] | null;
}

export interface StoreInfo {
  id: number;
  name: string;
  description: string | null;
  address: string;
  rating: number | null;
  total_ratings: number | null;
  image_url: string | null;
  is_open?: boolean;
  working_hours?: string;
}

// ─── Order types ─────────────────────────────────────────────

export interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  unit_name: string | null;
  unit_name_ar: string | null;
  customizations?: any[] | null;
}

export interface Order {
  id: number;
  store_id: number;
  store_name: string | null;
  driver_id: string | null;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string | null;
  notes: string | null;
  created_at: string | null;
  group_id: string | null;
  issue_details: string | null;
  items: OrderItem[] | null;
}

// ─── Driver types ─────────────────────────────────────────────

export interface AvailableOrder {
  id: number;
  store_id?: number;
  store_name?: string;
  store_address?: string;
  status?: string;
  delivery_fee?: number;
  total?: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  distance_km: number;
  created_at: string;
  is_group?: boolean;
  group_id?: string;
  orders?: any[];
}

export interface Delivery {
  id: number;
  store_name?: string;
  status: string;
  delivery_fee?: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  created_at: string;
  is_group?: boolean;
  group_id?: string;
  orders?: any[];
}

// ─── Store dashboard types ────────────────────────────────────

export interface StoreProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  override_price: number | null;
  sale_price: number | null;
  sale_start: string | null;
  sale_end: string | null;
  original_price?: number;
  category: string;
  unit: string;
  unit_ar?: string | null;
  is_available: boolean;
  image_url: string;
  stock_quantity?: number | null;
}

export interface StoreOrder {
  id: number;
  user_id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  notes: string;
  created_at: string;
  issue_details?: string;
  items: { 
    id: number; 
    product_name: string; 
    quantity: number; 
    unit_price: number; 
    subtotal: number; 
    unit_name: string | null; 
    status: string;
    customizations?: any[] | null;
  }[];
}

export interface SalesReport {
  total_orders: number;
  total_revenue: number;
  average_order: number;
  orders_by_status: Record<string, number>;
  store_rating: number;
  total_ratings: number;
}

export interface MyStore {
  id: number;
  name: string;
  description: string;
  address: string;
  phone: string;
  image_url: string;
  latitude: string | number;
  longitude: string | number;
  is_approved?: boolean;
  is_active?: boolean;
  is_accepting_orders?: boolean;
  working_hours?: string;
  can_manage_prices?: boolean;
}

// ─── Super-admin / RBAC types ─────────────────────────────────

export interface Role {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  permission_count: number;
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  module: string;
  action: string;
}

export interface UserRoleAssignment {
  id: number;
  user_id: string;
  role_id: number;
  role_name: string;
  assigned_at: string | null;
  assigned_by: string | null;
}

export interface AuditLog {
  id: number;
  user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string | null;
}

// ─── Auth / login types ───────────────────────────────────────

export interface TestAccount {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}
