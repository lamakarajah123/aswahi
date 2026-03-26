# Performance Issues Audit — Tamwinak App
> Generated: March 10, 2026  
> Scope: `backend_node/src/` + `frontend/src/`

---

## Legend
| Symbol | Severity |
|--------|----------|
| 🔴 | **High** — Active bottleneck; will cause failures at scale |
| 🟠 | **Medium** — Degraded performance or data integrity risk |
| 🟡 | **Low** — Code quality / minor waste |

---

# BACKEND

---

## 🔴 High Severity

### B-1 · Full Table Scan + N+1 in Analytics — `routes/grocery/admin.routes.ts`

Three separate full-table `Order.findAll()` calls to compute numbers that a single aggregate SQL query could return. Additionally, recent orders are fetched without their store association, then re-queried per row.

```typescript
// BAD — fetches ALL delivered orders into memory just to sum a column
const delivered_orders = await Order.findAll({ where: { status: 'delivered' } });
const total_revenue = delivered_orders.reduce((sum, o) => sum + o.total, 0);

const all_orders_raw = await Order.findAll(); // fetches ENTIRE orders table
const gross_order_value = all_orders_raw.reduce((sum, o) => sum + o.total, 0);

// BAD — N+1: 1 store query per order row
const recent_orders = await Promise.all(recent_orders_rows.map(async (o) => {
    const store = await Store.findByPk(o.store_id); // 1 extra query per order
    return { ...o.toJSON(), store_name: store?.name ?? 'Unknown' };
}));
```

**Fix:** Single aggregate SQL query + eager-load store via `include`.

---

### B-2 · Unbounded Fetch + N+1 on `/admin/orders` — `routes/grocery/admin.routes.ts`

No pagination, every order in the DB is returned. Then a store lookup fires per row.

```typescript
const orders = await Order.findAll({ order: [['created_at', 'DESC']], include: [...] });
// then per order:
const store = await Store.findByPk(o.store_id); // N+1
```

**Fix:** Add `limit`/`offset` params and move store to `include`.

---

### B-3 · Triple N+1 on `/driver/my-deliveries` — `routes/grocery/driver.routes.ts`

For every delivery: 1 store query + 1 user query + 1 order items query = **3 DB hits per row**. For a driver with 20 deliveries this is **60 extra queries**.

```typescript
const result = await Promise.all(deliveries.map(async (o) => {
    const store    = await Store.findByPk(o.store_id);              // N+1
    const customer = await User.findByPk(o.user_id);               // N+1
    const items    = await OrderItem.findAll({ where: { order_id: o.id } }); // N+1
}));
```

**Fix:** Eager-load store + items via `include`; batch-fetch customers with `WHERE id IN (...)`.

---

### B-4 · Dual N+1 in Sequential Loop — `/driver/available-orders` — `routes/grocery/driver.routes.ts`

A `for...of` loop (not even parallel) fires 2 DB queries per order row.

```typescript
for (const order of validReadyOrders) {          // sequential, not Promise.all
    const store = await Store.findByPk(order.store_id);                      // N+1
    const items = await OrderItem.findAll({ where: { order_id: order.id } }); // N+1
}
```

**Fix:** Eager-load both via `include` in the initial `findAll`.

---

### B-5 · SQL Injection via `sequelize.literal()` — `routes/grocery/notifications.routes.ts`

User-controlled data interpolated directly into raw SQL literals, bypassing all parameterization.

```typescript
// UNSAFE — req.user.id injected into raw SQL
const count = await Notification.count({
    where: sequelize.literal(`user_id = '${req.user.id}' AND is_read = false`) as any,
});
const notif = await Notification.findOne({
    where: sequelize.literal(`id = ${parseInt(req.params.id)} AND user_id = '${req.user.id}'`) as any,
});
```

**Fix:** Use plain Sequelize `where` objects — `{ user_id: req.user.id, is_read: false }`.

---

### B-6 · Full Table Fetch + JS Geo-Filter — `/nearby-stores` — `routes/grocery/public.routes.ts`

Loads **all approved stores** from the database into Node.js memory, then computes Haversine distances in JavaScript. Will degrade catastrophically as the store count grows.

```typescript
const stores = await Store.findAll({ where: { is_approved: true, is_active: true } });
const nearby = stores
    .map(s => ({ ...s.toJSON(), dist: haversineDistance(lat, lng, ...) }))
    .filter(s => s._dist <= radius);
```

**Fix:** Push the Haversine calculation to PostgreSQL (as already done for `/nearby-categories`) and add `HAVING distance_km <= :radius` to reduce the result set at the DB level.

---

### B-7 · N+1 in Cancellation Loop — `routes/grocery/customer.routes.ts`

Sequential per-order: `UPDATE` + `SELECT store` + `INSERT notification` inside a for loop.

```typescript
for (const order of orders) {
    await order.update({ status: 'cancelled' }, { transaction: t });
    const store = await Store.findByPk(order.store_id, { transaction: t }); // N+1
    await createNotification(store.user_id, ...);                           // N+1
}
```

**Fix:** Batch `UPDATE` with `WHERE id IN (...)`, batch-fetch stores, batch `Notification.bulkCreate`.

---

## 🟠 Medium Severity

### B-8 · N+1 Sequential Item Loop in Order Creation — `routes/grocery/customer.routes.ts`

`/orders` and `/orders/smart` both iterate over order items firing 2 queries per item.

```typescript
for (const item of items) {
    const product = await Product.findByPk(item.product_id, { transaction: t }); // 1 per item
    const pu = await ProductUnit.findOne({ where: { ... }, transaction: t });    // 1 per item
}
```

**Fix:** Batch-fetch all products and product-units before the loop using `WHERE id IN (...)`.

---

### B-9 · No Connection Pool Config — `config/database.ts`

Sequelize defaults (`max: 5`, `acquire: 60 000 ms`) will exhaust under concurrent load. Every N+1 pattern amplifies this.

```typescript
export const sequelize = new Sequelize(env.DATABASE_URL, {
    dialect: 'postgres',
    // ← no pool config
});
```

**Fix:**
```typescript
pool: { max: 20, min: 2, acquire: 30_000, idle: 10_000 }
```

---

### B-10 · `sync({ alter: true })` in Production — `config/database.ts`

`ALTER TABLE` runs against the live database on **every server restart** — slow, destructive, incompatible with zero-downtime deployments.

```typescript
await sequelize.sync({ alter: true }); // runs on every startup
```

**Fix:** Remove from startup; run Sequelize migrations via `npx sequelize-cli db:migrate`.

---

### B-11 · `getSettings()` Hits DB on Every Order — `routes/grocery/helpers.ts`

App settings are fetched from the DB on every single order creation. Settings change rarely.

```typescript
export async function getSettings() {
    const settings = await AppSetting.findAll(); // no caching
    return Object.fromEntries(settings.map(s => [s.key, s.value]));
}
```

**Fix:** Cache with a TTL (e.g., `lru-cache` or a module-level singleton refreshed every 60 s).

---

### B-12 · Auth Middleware DB Hit on Every Request — `middlewares/auth.middleware.ts`

Every authenticated API request fires `SELECT * FROM users WHERE id = ?` with no caching.

```typescript
const user = await User.findByPk(decoded.sub || decoded.id); // runs on every request
```

**Fix:** Add a short-lived in-memory cache (e.g., 30–60 s TTL via `lru-cache`) keyed on `user.id`.

---

### B-13 · No Pagination on 6 List Endpoints

| File | Endpoint | Issue |
|------|----------|-------|
| `grocery/admin.routes.ts` | `GET /admin/stores` | `Store.findAll()` — all stores |
| `grocery/admin.routes.ts` | `GET /admin/orders` | `Order.findAll()` — all orders |
| `grocery/store.routes.ts` | `GET /store/orders` | `Order.findAll()` — all store orders |
| `grocery/customer.routes.ts` | `GET /my-orders` | `Order.findAll()` — all user orders |
| `routes/user.routes.ts` | `GET /pending` | `User.findAll()` — all pending users |
| `routes/user.routes.ts` | `GET /drivers` | `User.findAll()` — all drivers |

**Fix:** Add `limit` + `offset` query params with `findAndCountAll` on all list endpoints.

---

### B-14 · Duplicate Query in RBAC Permission Check — `routes/rbac.routes.ts`

`getUserRoles` and `getUserPermissions` both internally run `UserRole.findAll({ where: { user_id } })`, doubling the DB hit. `getUserPermissions` further chains 3 sequential queries (UserRole → RolePermission → Permission) that could be one JOIN.

---

### B-15 · Missing Transaction on Store+Owner Creation — `routes/grocery/admin.routes.ts`

If `Store.create` fails after `authService.signupWithPassword`, the `User` row is left orphaned with no rollback.

---

### B-16 · Sensitive Columns Fetched Unnecessarily — `routes/user.routes.ts`

`findAll()` with no `attributes` filter pulls `password_hash`, `reset_otp`, `reset_otp_expires` etc. into memory, then discards them in the response `.map()`.

**Fix:** Add `attributes: ['id', 'email', 'name', 'role', 'status', ...]` to every `findAll`.

---

## 🟡 Low Severity

### B-17 · Missing Database Indexes on All High-Traffic Columns

No model file defines Sequelize `indexes`. Every query on these columns does a sequential scan.

| Model | Missing Indexes |
|-------|----------------|
| `Order` | `status`, `store_id`, `user_id`, `driver_id`, `group_id`, `created_at` |
| `Notification` | `user_id`, `is_read` |
| `UserRole` | composite `(user_id, role_id)` |
| `Product` | `is_available`, `category_id`, `industry_id`, `name` (LIKE search) |
| `OrderItem` | `order_id`, `status` |
| `Store` | `user_id`, `is_approved`, `is_active` |
| `User` | `email`, `role`, `status` |
| `AppSetting` | `key` (unique) |

---

### B-18 · `require()` Inside Request Hot Path — `routes/grocery/driver.routes.ts`

Dynamic `require('sequelize')` called inside the route handler on every request instead of a top-level import.

---

### B-19 · Redundant 2-Query Pattern for Store-Industries — `routes/grocery/admin.routes.ts`

```typescript
const links = await StoreIndustry.findAll({ where: { store_id } }); // query 1
const industries = await Industry.findAll({ where: { id: industryIds } }); // query 2
```

One JOIN via `include` would suffice.

---

### B-20 · Unvalidated `req.params.id` in Redirect URL — `routes/grocery/customer.routes.ts`

```typescript
res.redirect(307, `/api/v1/grocery/orders/cancel/${req.params.id}`);
```

`req.params.id` is interpolated without sanitization, enabling log injection or unexpected routing if the value contains path traversal sequences.

---

---

# FRONTEND

---

## 🔴 High Severity

### F-1 · No Route-Level Code Splitting — `App.tsx`

Every page — including heavy admin pages, Leaflet maps, and TSP routing — is eagerly imported at the module boundary. The entire app JS is bundled and downloaded on first load.

```tsx
// ALL 20+ pages loaded upfront
import Index from './pages/Index';
import DriverDashboard from './pages/DriverDashboard'; // includes leaflet ~140KB
import AdminAnalytics from './pages/admin/AdminAnalytics';
// ...16 more eager imports
```

**Fix:** Wrap every route import with `React.lazy(() => import(...))` and wrap routes in `<Suspense>`.

---

### F-2 · Leaflet (~140 KB) Always Bundled — `DriverDashboard.tsx`, `MapPicker.tsx`

Leaflet and its CSS are statically imported. This asset loads on every page, even when the user never opens a map.

```tsx
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
```

**Fix:** Dynamically import `MapPicker` only when `showMap === true` using `React.lazy`.

---

### F-3 · N Parallel API Calls Per Category on Homepage Load — `Index.tsx`

One API call fires per category simultaneously when coordinates arrive — potentially 10+ parallel requests on every homepage load with no concurrency limit or batching.

```tsx
categories.forEach((cat) => {
    fetchCategoryProducts(cat.name, coords.lat, coords.lng); // one request per category, no limit
});
```

**Fix:** Use a single paginated endpoint or limit concurrency with `p-limit`.

---

### F-4 · `loadData` Fires Twice on Driver Dashboard Mount — `DriverDashboard.tsx`

`driverLat`/`driverLng` are geolocation state values in the `useEffect` dependency array. When geolocation resolves after mount, it triggers a second `loadData` call — **6 API requests** (3×2) on every page load.

```tsx
useEffect(() => {
    loadData();
}, [user, authLoading, driverLat, driverLng]); // driverLat/Lng cause double-load
```

**Fix:** Separate the geolocation effect from the data load. Use a `coordsReady` flag to gate the data fetch.

---

### F-5 · `limit=1000` — All Products Fetched at Once — `AdminProducts.tsx`, `AdminStoreProducts.tsx`

Every admin products page load downloads up to 1000 product records regardless of what the user is viewing.

```tsx
apiCall.invoke({ url: '/api/v1/entities/products?limit=1000', method: 'GET' })
```

**Fix:** Use server-side pagination; fetch only the current page.

---

### F-6 · Fetches All Nearby Stores to Display One — `StorePage.tsx`

To render a single store page, the app downloads all stores within a 50 km radius (with hardcoded coordinates), then filters client-side.

```tsx
const storesRes = await apiCall.invoke({
    url: '/api/v1/grocery/nearby-stores',
    params: { lat: 32.2211, lng: 35.2544, radius: 50 }, // hardcoded coords
});
const storeData = storesRes.data.find(s => s.id === Number(storeId)); // client-side filter
```

**Fix:** Call a specific `/api/v1/stores/:id` endpoint instead.

---

### F-7 · No `AbortController` on Any Fetch in `useEffect` — Multiple Pages

None of the `apiCall.invoke()` calls inside `useEffect` hooks use `AbortController`. Navigating away before a response arrives causes state updates on unmounted components (React warning + memory leak). Affected files include `Index.tsx`, `StorePage.tsx`, and `useNotifications.ts`.

**Fix:** Create an `AbortController` per effect, pass the signal to the fetch, and call `abort()` in the cleanup function.

---

### F-8 · `t()` Does O(n) Linear Search on Every Call — `LanguageContext.tsx`

The translation function does `STATIC_LABELS.find(l => l.key === key)` on every invocation. With 200+ labels and `t()` called dozens of times per render, each render triggers hundreds of O(n) array scans.

```tsx
const t = (key: string) => {
    const staticItem = STATIC_LABELS.find(l => l.key === key); // O(n) on every call
};
```

**Fix:** Build a `Map<string, StaticLabel>` from `STATIC_LABELS` once at module initialization and use `map.get(key)` — O(1) lookup.

---

### F-9 · Context Value Objects Not Memoized — `AuthContext.tsx`, `LanguageContext.tsx`

Both contexts pass inline object literals as `value`. None of their functions use `useCallback`. Every state change in the provider (e.g., `loading` toggling) creates a new value reference, forcing **every consumer across the entire app** to re-render.

```tsx
// AuthContext — new object reference on every render
const value: AuthContextType = { user, loading, loginWithPassword, loginSSO, hasRole, ... };
return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

// LanguageContext — same pattern
<LanguageContext.Provider value={{ languages, currentLanguage, setLanguage, t, loading, ... }}>
```

**Fix:** Wrap the value object with `useMemo` and all handler functions with `useCallback`.

---

### F-10 · 200+ Translation Inputs Rendered Without Virtualization — `AdminLanguages.tsx`

The admin language editor renders an `<Input>` for every single `STATIC_LABELS` entry at once — creating 200+ DOM nodes simultaneously.

```tsx
{STATIC_LABELS.map((label) => (
    <div key={label.key}>
        <Input ... />
    </div>
))}
```

**Fix:** Use `react-window` or `react-virtual` for virtualized rendering, or add pagination/search to reduce visible items.

---

## 🟠 Medium Severity

### F-11 · God Components — `Index.tsx`, `StorePage.tsx` (~700 Lines Each)

`Index.tsx` handles geolocation, category fetching, product fetching, infinite scroll, cart state, localStorage persistence, checkout dialog, delivery address, map picker, unit selection, order submission, and saved addresses — all in one component. Same pattern in `StorePage.tsx`.

**Fix:** Extract into purpose-specific hooks (`useCart`, `useCheckout`, `useNearbyProducts`) and sub-components.

---

### F-12 · `CategorySection` Not Memoized — `Index.tsx`

`CategorySection` is a function component that renders a full product grid but is not wrapped in `React.memo`. Any state update in `Index` (typing in search, updating cart) re-renders every category section.

**Fix:** Wrap as `export const CategorySection = React.memo(...)`.

---

### F-13 · `cartTotal` / `cartCount` Not Memoized — `Index.tsx`, `StorePage.tsx`

Two `reduce` calls run on every render to compute totals.

```tsx
const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0); // every render
const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);           // every render
```

**Fix:** Wrap both in `useMemo([cart])`.

---

### F-14 · `ORDER_TRACKING_STEPS` Recreated Every Render — `OrdersPage.tsx`

An array of 7 step objects (each calling `t()` which itself does a linear scan) is rebuilt from scratch on every render.

```tsx
const ORDER_TRACKING_STEPS = [
    { id: 'pending', label: t('status.pending', ...) }, // t() = O(n) each
    // 6 more...
];
```

**Fix:** Wrap in `useMemo([t])`.

---

### F-15 · Order Grouping Logic in Render Path — `OrdersPage.tsx`

A full `reduce` + `Object.entries` + nested status aggregation runs every render, not just when orders change.

**Fix:** Wrap derived grouped data in `useMemo([orders])`.

---

### F-16 · `cart.find()` O(n×m) Per Product in Render — `Index.tsx`

```tsx
products.map((product) => {
    const inCart = cart.find(c => c.product.id === product.id); // O(m) per product
```

With 20 products and 10 cart items this is 200 comparisons per category render.

**Fix:** Pre-compute `const cartIds = useMemo(() => new Set(cart.map(c => c.product.id)), [cart])` and use `cartIds.has(product.id)`.

---

### F-17 · `setTimeout` Without Cleanup in `useEffect` — `Index.tsx`, `StorePage.tsx`

```tsx
useEffect(() => {
    setTimeout(() => {
        setCartPortalTarget(document.getElementById('cart-portal'));
    }, 100); // no clearTimeout returned
}, [...]);
```

If the component unmounts before the timer fires, the callback calls `setState` on an unmounted component.

**Fix:** Return `() => clearTimeout(timerId)` from the effect.

---

### F-18 · Double API Call After Save in AdminLanguages — `AdminLanguages.tsx`

Two calls to the same endpoint fire back-to-back immediately after a save.

```tsx
await refreshLanguages(); // API call 1
fetchLanguages();         // API call 2 — same endpoint
```

**Fix:** Remove one of the two calls.

---

### F-19 · Product Images Missing `loading="lazy"` — `Index.tsx`, `StorePage.tsx`

Dozens of product images render without lazy loading, forcing all of them to load on page paint including those below the fold.

**Fix:** Add `loading="lazy"` and explicit `width`/`height` attributes to prevent layout shift.

---

### F-20 · Hero Image from External CDN Without Dimensions — `Index.tsx`

```tsx
const HERO_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/.../...png';
```

No `width`/`height` specified → Cumulative Layout Shift (CLS). External CDN dependency adds latency and a point of failure.

---

### F-21 · `QueryClient` Missing Default `staleTime` and `retry` Config — `App.tsx`

`staleTime: 0` (default) triggers a refetch on every window focus event. `retry: 3` (default) retries three times on 4xx errors including auth failures.

```tsx
const queryClient = new QueryClient(); // no defaults set
```

**Fix:**
```tsx
const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});
```

---

### F-22 · Data-Fetch Functions Not Wrapped in `useCallback` — Multiple Pages

`loadData` / `fetchOrders` declared as plain `async` functions inside `StoreDashboard.tsx`, `OrdersPage.tsx`, and `DriverDashboard.tsx`. They're recreated on every render, preventing stable dependency references in effects.

---

### F-23 · `getRoleBadge` Calls `t()` 4× Per Render in `AppHeader` — `AppHeader.tsx`

```tsx
const getRoleBadge = () => {
    if (isSuperAdmin) return { label: t('nav.super_admin', ...) }; // t() = O(n) linear search
    // ...
};
const roleBadge = getRoleBadge(); // called on every render incl. 15s notification polls
```

**Fix:** Wrap with `useMemo([user, t])`.

---

## 🟡 Low Severity

### F-24 · Notification Polling Not Shared via Context — `AppHeader.tsx`

The 15 s polling interval starts inside `AppHeader`. Notification state is inaccessible to other components without prop drilling, and mounting `AppHeader` multiple times would create duplicate polls.

---

### F-25 · `console.log` Left in Production Code — `OrdersPage.tsx`

```tsx
console.log(`[FRONTEND_CANCEL] Calling URL: ${targetUrl} for ${idToCancel}`);
```

---

### F-26 · `window.confirm` Used for Destructive Actions — `AdminStores.tsx`, `AdminStoreProducts.tsx`

```tsx
if (!window.confirm(t('confirm.archive_store', ...))) return;
```

Blocks the JS thread, cannot be styled, not RTL-aware. The `alert-dialog` shadcn/ui component is already in the project.

---

### F-27 · `useState<any>` for Store Object — `StoreDashboard.tsx`

Disables TypeScript inference for the entire store object throughout the component.

---

### F-28 · TSP `calculateOptimalRoute` Not Memoized — `DriverDashboard.tsx`

Pure nearest-neighbor TSP algorithm runs synchronously on every invocation without memoization. For large group orders this blocks the main thread.

**Fix:** Memoize per order group or move to a web worker.

---

---

# COMBINED QUICK WINS TABLE

| Ref | Location | Issue | Severity | Effort |
|-----|----------|-------|----------|--------|
| B-5 | `notifications.routes.ts` | SQL injection via `sequelize.literal()` | 🔴 High | Low |
| B-3 | `driver.routes.ts` | Triple N+1 in `/my-deliveries` | 🔴 High | Low |
| B-4 | `driver.routes.ts` | Dual N+1 sequential loop in `/available-orders` | 🔴 High | Low |
| B-6 | `public.routes.ts` | Full table store fetch + JS geo-filter | 🔴 High | Low |
| B-1 | `admin.routes.ts` | Full-table scans + N+1 in analytics | 🔴 High | Medium |
| B-2 | `admin.routes.ts` | Unbounded orders fetch + N+1 | 🔴 High | Low |
| B-7 | `customer.routes.ts` | N+1 in cancellation loop | 🔴 High | Low |
| F-8 | `LanguageContext.tsx` | O(n) `t()` linear scan on 200+ labels | 🔴 High | Low |
| F-9 | `AuthContext.tsx`, `LanguageContext.tsx` | Context values recreated every render | 🔴 High | Low |
| F-1 | `App.tsx` | No code splitting on any route | 🔴 High | Medium |
| F-2 | `DriverDashboard.tsx` | Leaflet always bundled (~140 KB) | 🔴 High | Low |
| F-3 | `Index.tsx` | N parallel API calls per category | 🔴 High | Medium |
| F-4 | `DriverDashboard.tsx` | Double `loadData` on mount | 🔴 High | Low |
| F-5 | `AdminProducts.tsx` | `limit=1000` products fetched upfront | 🔴 High | Medium |
| F-6 | `StorePage.tsx` | Fetches all stores to display one | 🔴 High | Low |
| F-7 | Multiple | No `AbortController` on fetches | 🔴 High | Low |
| B-8 | `customer.routes.ts` | N+1 item loop in order creation | 🟠 Medium | Low |
| B-9 | `config/database.ts` | No connection pool config | 🟠 Medium | Low |
| B-10 | `config/database.ts` | `sync({ alter: true })` in production | 🟠 Medium | Low |
| B-11 | `helpers.ts` | No caching on `getSettings()` | 🟠 Medium | Low |
| B-12 | `auth.middleware.ts` | DB hit on every authenticated request | 🟠 Medium | Medium |
| B-13 | Multiple routes | No pagination on 6 list endpoints | 🟠 Medium | Low |
| B-17 | All models | Missing DB indexes on all queried columns | 🟡 Low | Medium |
| F-10 | `AdminLanguages.tsx` | 200+ inputs without virtualization | 🔴 High | Medium |
| F-13 | `Index.tsx`, `StorePage.tsx` | Cart totals not memoized | 🟠 Medium | Low |
| F-14 | `OrdersPage.tsx` | Tracking steps rebuilt every render | 🟠 Medium | Low |
| F-21 | `App.tsx` | `QueryClient` missing `staleTime`/`retry` | 🟠 Medium | Low |
| F-19 | `Index.tsx`, `StorePage.tsx` | Images missing `loading="lazy"` | 🟠 Medium | Low |
| F-25 | `OrdersPage.tsx` | `console.log` in production | 🟡 Low | Low |

---

## Recommended Fix Order

1. **Immediate (security + correctness):** B-5 (SQL injection in notifications)
2. **Highest ROI backend:** B-3, B-4, B-6, B-7 — eliminate N+1 patterns in driver/customer routes with eager loading
3. **Highest ROI frontend:** F-8 (`t()` lookup), F-9 (context memoization), F-1 (lazy routing) — these affect every page
4. **DB health:** B-9, B-10 — fix pool config and remove `sync({ alter: true })`
5. **Admin stability:** B-13 (add pagination), F-5 (remove `limit=1000`), F-10 (virtualize language editor)
6. **Remaining medium issues** in order of user-facing impact
