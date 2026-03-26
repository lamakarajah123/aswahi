# Code Audit — Tamwinak App
> Generated: March 10, 2026  
> Audited against: `seniorreact.instructions.md`  
> Scope: `backend_node/src/` + `frontend/src/`

---

## Legend
| Symbol | Severity |
|--------|----------|
| 🔴 | **Critical** — Security risk or active data-loss path |
| 🟠 | **High** — Performance bottleneck or correctness issue |
| 🟡 | **Medium** — Code quality / maintainability |
| 🔵 | **Low** — Convention / structure violation |

---

# BACKEND

---

## 🔴 Critical

### SEC-1 · Sensitive columns fetched in every authenticated request — `middlewares/auth.middleware.ts` line 41
`User.findByPk(userId)` has no `attributes` restriction. `password_hash`, `reset_otp`, and `reset_otp_expires` are loaded into `req.user` on every request.

### SEC-2 · Sensitive columns leaked via `/me` endpoint — `routes/auth.routes.ts` line 104
`GET /me` does `res.json(req.user)`. Because the middleware fetches all columns, this returns `password_hash` and `reset_otp` directly to the caller.

### SEC-3 · Plaintext password logged — `routes/auth.routes.ts` line 58
`console.log("Signup payload received:", req.body)` logs the entire signup body including the plaintext `password` field.

### TRANS-1 · Multi-step write without transaction — `routes/grocery/admin.routes.ts` ~line 230
`PUT /admin/stores/:id/industries` runs `StoreIndustry.destroy(...)` then `StoreIndustry.bulkCreate(...)` with no transaction. If `bulkCreate` throws, the delete is already committed — the store ends up with zero industries.

### TRANS-2 · Multi-step write without transaction — `routes/grocery/customer.routes.ts` ~line 274
`POST /orders/:id/rate` runs `Rating.create(...)` then `store.update({ rating, total_ratings })` with no transaction. A failed store update leaves a dangling rating with no score update.

### TRANS-3 · Multi-step write without transaction — `routes/product.routes.ts` ~line 197
`PUT /:id/units` runs `ProductUnit.destroy(...)` then `ProductUnit.bulkCreate(...)` with no transaction. Partial failure leaves a product with no units.

### TRANS-4 · Concurrent writes without transaction — `routes/store-product.routes.ts` ~lines 55, 117
Both `POST /:storeId/add` and `POST /:storeId/add-all` write product mappings with no transaction. Partial failures leave the store in an inconsistent state.

---

## 🟠 High

### QUERY-1 · JS geo-filter after full-table fetch — `routes/grocery/driver.routes.ts` line 22
`Order.findAll({ where: { status:'ready', driver_id:null } })` fetches ALL unassigned ready orders, then `haversineDistance()` is called in JS and filtered by distance. Must be pushed to PostgreSQL SQL (same pattern already used correctly in `public.routes.ts`).

### QUERY-2 · Unbounded fetch + JS aggregation — `routes/grocery/store.routes.ts` lines 247–252
`Order.findAll({ where:{ store_id, status:'delivered' } })` and `Order.findAll({ where:{ store_id } })` load entire order history to compute revenue and status counts via `reduce`/`forEach`. Replace with `fn('SUM',...)` / `fn('COUNT',...)` with `GROUP BY` in SQL.

### QUERY-3 · Per-row queries inside `for...of` loops — multiple files
| File | Line | Description |
|------|------|-------------|
| `routes/grocery/driver.routes.ts` | 311 | `for (const go of groupOrders) { await go.update(...) }` — use `Order.update(data, { where: { id: ids } })` |
| `routes/grocery/driver.routes.ts` | 335, 348 | `for (const admin of admins) { await createNotification(...) }` — use `Notification.bulkCreate` |
| `routes/grocery/store.routes.ts` | 157 | `for (const driver of drivers) { await createNotification(...) }` — use `Notification.bulkCreate` |
| `routes/grocery/customer.routes.ts` | ~430 | `for (const go of groupOrders) { await Store.findByPk(go.store_id, ...) }` — batch-fetch stores before loop |
| `routes/grocery/customer.routes.ts` | ~540 | `for (const subOrder of allOrders) { await Store.findByPk(...) }` — same N+1 pattern |
| `routes/grocery/customer.routes.ts` | ~486 | `for (const item of missingItems) { await item.update({ status:'unavailable' }) }` — use bulk update |
| `routes/store-product.routes.ts` | 55–66 | `Promise.all(product_ids.map(async pid => StoreProduct.findOrCreate(...)))` — use bulk upsert |

### QUERY-4 · Two sequential queries instead of one JOIN — multiple files
| File | Lines | Description |
|------|-------|-------------|
| `routes/grocery/admin.routes.ts` | 127–138 | `Store.findAndCountAll(...)` then `User.findAll({ where:{ id: userIds } })` — use `include: [{ model: User }]` |
| `routes/grocery/public.routes.ts` | 220–228 | `StoreProduct.findAll(...)` then `Product.findAll({ where:{ id: productIds } })` — use `include` via association |

### QUERY-5 · `findAll` without `limit` on large/growing tables — multiple files
| File | Line | Endpoint |
|------|------|----------|
| `routes/grocery/driver.routes.ts` | 22, 35, 151 | Available orders + driver deliveries history |
| `routes/grocery/store.routes.ts` | 247, 250 | Sales report |
| `routes/grocery/admin.routes.ts` | 109 | `GET /admin/settings` |
| `routes/grocery/notifications.routes.ts` | 24 | Notifications list |
| `routes/rbac.routes.ts` | 107 | UserRole list |
| `routes/category.routes.ts` | 22, 101 | Categories + products by category |
| `routes/industry.routes.ts` | 22 | Industries list |
| `routes/unit.routes.ts` | 11 | Units list |
| `routes/store-product.routes.ts` | 117 | `add-all` fetches every product globally |

### QUERY-6 · Dynamic `import()` inside request hot path — multiple files
| File | Line | Description |
|------|------|-------------|
| `config/database.ts` | 22 | `require('../models')` inside `connectDB()` — move to top-level import |
| `routes/grocery/public.routes.ts` | ~174 | `const { QueryTypes } = await import('sequelize')` evaluated on every request |
| `routes/grocery/customer.routes.ts` | ~178 | `const { OrderDistributionService } = await import('...')` evaluated on every `POST /orders/smart` |

---

## 🟡 Medium

### INDEX-1 · Missing Sequelize indexes on heavily queried models
| Model | Missing Indexes |
|-------|----------------|
| `Rating.ts` | `user_id`, `order_id`, `store_id`, `driver_id` — zero indexes defined |
| `ProductUnit.ts` | `product_id`, `unit_id` — zero indexes defined |
| `UserAddress.ts` | `user_id` — zero indexes defined |
| `AuditLog.ts` | `user_id`, `created_at` — zero indexes defined |
| `RolePermission.ts` | `role_id`, `permission_id` FK columns — zero indexes |
| `Permission.ts` | `module` explicitly queried — zero indexes |
| `Role.ts` | `is_active` — zero indexes |
| `StoreProduct.ts` | `is_available`, `product_id` solo lookup — no dedicated indexes |
| `StoreIndustry.ts` | `industry_id` reverse lookups — no index |
| `Notification.ts` | Composite `(user_id, is_read)` and `(user_id, created_at)` needed |
| `Store.ts` | `created_at` used in `ORDER BY` on every paginated list — no index |
| `User.ts` | `is_available` used in every driver availability check — no index |
| `Category.ts` | `is_active`, `sort_order` — no indexes |
| `Industry.ts` | `is_active` — no index |

---

---

# FRONTEND

---

## 🟠 High

### FETCH-1 · No `AbortController` in `useEffect` API calls — 19 files
Every file below fires API calls inside `useEffect` without an `AbortController`. Navigating away before the response arrives causes state updates on unmounted components.

| File | Description |
|------|-------------|
| `pages/Index.tsx` | `fetchCategories()` in `useEffect` — no AbortController |
| `pages/StoreDashboard.tsx` | `loadData()` — 4 API calls, no abort capability |
| `pages/SuperAdminDashboard.tsx` | `loadData` — `Promise.all` over 4 calls, no abort |
| `pages/CategoryPage.tsx` | `fetchPage` (`useCallback`) — does not accept or pass `AbortSignal` |
| `pages/admin/AdminStores.tsx` | `loadStores` — no AbortController |
| `pages/admin/AdminProducts.tsx` | `loadData` (`useCallback`) — no AbortSignal param |
| `pages/admin/AdminOrders.tsx` | `loadOrders` — no AbortController |
| `pages/admin/AdminAnalytics.tsx` | `loadAnalytics` — no AbortController |
| `pages/admin/AdminSettings.tsx` | `loadSettings` — no AbortController |
| `pages/admin/AdminIndustries.tsx` | `loadIndustries` — no AbortController |
| `pages/admin/AdminCategories.tsx` | `loadCategories` — no AbortController |
| `pages/admin/AdminLanguages.tsx` | `fetchLanguages` — no AbortController |
| `pages/admin/AdminStoreProducts.tsx` | `loadInitialData` — multiple calls, no abort |
| `pages/admin/AdminDrivers.tsx` | `loadDrivers` — no AbortController |
| `pages/admin/AdminPendingUsers.tsx` | `loadUsers` — no AbortController |
| `pages/admin/AdminProductForm.tsx` | `loadData` — no AbortController |
| `pages/admin/AdminUnits.tsx` | `loadUnits` line 31 — no AbortController |
| `contexts/LanguageContext.tsx` | `fetchLanguages` (`useEffect`) — native `fetch`, no AbortController |
| `hooks/useNotifications.ts` | Two parallel API calls inside polling interval — no abort signal |

### FETCH-2 · `limit=1000` / unbounded data fetch
| File | Line | Description |
|------|------|-------------|
| `pages/AdminPanel.tsx` | 141 | `/api/v1/entities/products?limit=1000` to load all products just to extract category list |
| `pages/admin/AdminProductForm.tsx` | 68 | Same — `limit=1000` to derive a category dropdown |
| `pages/admin/AdminOrders.tsx` | ~65 | `/api/v1/grocery/admin/orders` fetched with no `limit` or pagination |

### MEMO-1 · Data-fetch functions not in `useCallback` — 15 files
Plain `async function` declarations inside component body — recreated on every render, cause unstable `useEffect` dependency references.

| File | Function |
|------|----------|
| `pages/OrdersPage.tsx` ~122 | `fetchOrders` |
| `pages/AdminPanel.tsx` ~138 | `loadData` |
| `pages/admin/AdminStores.tsx` ~45 | `loadStores` |
| `pages/admin/AdminOrders.tsx` ~55 | `loadOrders` |
| `pages/admin/AdminAnalytics.tsx` ~25 | `loadAnalytics` |
| `pages/admin/AdminSettings.tsx` ~25 | `loadSettings` |
| `pages/admin/AdminIndustries.tsx` ~30 | `loadIndustries` |
| `pages/admin/AdminCategories.tsx` ~30 | `loadCategories` |
| `pages/admin/AdminLanguages.tsx` ~30 | `fetchLanguages` |
| `pages/admin/AdminStoreProducts.tsx` ~70 | `loadStoreProducts` |
| `pages/admin/AdminDrivers.tsx` ~50 | `loadDrivers` |
| `pages/admin/AdminPendingUsers.tsx` ~40 | `loadUsers` |
| `pages/admin/AdminProductForm.tsx` ~63 | `loadData` |
| `pages/admin/AdminUnits.tsx` ~33 | `loadUnits` |
| `contexts/LanguageContext.tsx` ~765 | `fetchLanguages` |

### PERF-1 · `array.find()` inside render loops
| File | Line | Description |
|------|------|-------------|
| `pages/Index.tsx` | ~380 | `cart.find(c => c.product.id === product.id)` inside product `.map()` — use pre-computed `Set` |
| `pages/StorePage.tsx` | ~500 | Same pattern — use `useMemo(() => new Set(...), [cart])` |

### PERF-2 · `setTimeout` without `clearTimeout` cleanup
| File | Line | Description |
|------|------|-------------|
| `pages/StorePage.tsx` | 140 | `setTimeout(...)` return value not stored, no `clearTimeout` in cleanup |
| `pages/LogoutCallbackPage.tsx` | 8 | `setTimeout(() => { window.location.href = '/' }, 2000)` — no cleanup |

---

## 🟡 Medium

### MEMO-2 · Expensive derived values not in `useMemo`
| File | Line | Description |
|------|------|-------------|
| `pages/StorePage.tsx` | ~300 | `cartTotal` and `cartCount` computed inline on every render — wrap in `useMemo([cart])` |
| `pages/OrdersPage.tsx` | ~195 | Grouped orders computed via inline IIFE in JSX on every render — move to `useMemo([orders])` |

### QUALITY-1 · `window.confirm()` for destructive actions — 8 instances
| File | Line | Description |
|------|------|-------------|
| `pages/AdminPanel.tsx` | 184 | `window.confirm()` in `archiveStore` |
| `pages/AdminPanel.tsx` | ~362, ~376, ~390 | Three more `window.confirm()` calls in destructive handlers |
| `pages/admin/AdminDrivers.tsx` | 33 | `window.confirm()` in `handleApprove` |
| `pages/admin/AdminDrivers.tsx` | 44 | `window.confirm()` in `handleReject` |
| `pages/admin/AdminLanguages.tsx` | ~70 | Bare `confirm()` in `handleDelete` |
| `pages/admin/AdminUnits.tsx` | ~90 | Bare `confirm()` in `handleDelete` |

### QUALITY-2 · `console.log` / `console.error` in production code
| File | Line | Description |
|------|------|-------------|
| `pages/StoreDashboard.tsx` | 230 | `console.error('Update Product Error:', ...)` |
| `pages/StoreDashboard.tsx` | 286 | `console.error('Toggle error:', ...)` |
| `contexts/LanguageContext.tsx` | 785 | `console.error('Failed to fetch languages', error)` |

### QUALITY-3 · `useState<any>` / untyped `any`
| File | Line | Description |
|------|------|-------------|
| `pages/DriverDashboard.tsx` | ~62 | `useState<any \| null>(null)` for `mapOrderInfo` — define a typed interface |
| `pages/SignupPage.tsx` | ~44 | `const payload: any = {...}` — use a typed interface |
| `pages/admin/AdminProductForm.tsx` | ~77 | `.filter((u: any) => ...)` — use the already-defined `Unit` interface |

### QUALITY-4 · `<img>` missing `loading="lazy"` and explicit dimensions — 17 instances
| File | Line |
|------|------|
| `pages/StorePage.tsx` | ~401, ~448, ~503, ~565 |
| `pages/StoreDashboard.tsx` | ~698, ~728 |
| `pages/CategoryPage.tsx` | ~268, ~327 |
| `pages/AdminPanel.tsx` | ~623, ~963, ~1026 |
| `pages/admin/AdminAddStore.tsx` | ~369, ~471 |
| `pages/admin/AdminEditStore.tsx` | ~167, ~263 |
| `pages/admin/AdminProductForm.tsx` | ~320 |
| `pages/admin/AdminProducts.tsx` | ~205 |

---

## 🔵 Low (Structure & Architecture)

### STRUCT-1 · God components (>300 lines)
| File | Lines | What to extract |
|------|-------|-----------------|
| `pages/AdminPanel.tsx` | ~1100 | Analytics, stores, orders, users, drivers, products, settings all in one file — split into dedicated route-level page per section |
| `pages/StoreDashboard.tsx` | ~750 | Extract `ProductManagement`, `OrderList`, `StoreForm` sub-components / hooks |
| `pages/StorePage.tsx` | ~650 | Extract `ProductGrid`, `CartSheet`, `StoreHeader`, `useCart` hook |
| `pages/OrdersPage.tsx` | ~600 | Extract `OrderCard`, `TrackingStepper`, `StatusBadge` |
| `pages/Index.tsx` | ~600 | Extract `CategorySection` (done), cart logic → `useCart`, geolocation → `useGeolocation` |
| `pages/DriverDashboard.tsx` | ~550 | Extract `AvailableOrdersList`, `ActiveDeliveryPanel`, `MapDialog` |
| `pages/admin/AdminStoreProducts.tsx` | ~400 | Extract product-mapping panel and filter toolbar |

### STRUCT-2 · Interfaces/types defined inside page or component files — 12 files
These types are duplicated across pages (`Product`, `CartItem` defined separately in `Index.tsx`, `StorePage.tsx`, and `CategoryPage.tsx`). All should be moved to `src/types/`.

| File | Types to move |
|------|--------------|
| `pages/AdminPanel.tsx` lines 20–83 | `Analytics`, `Product`, `AdminUser`, `AdminStore`, `AdminOrder`, `AppSetting` |
| `pages/StoreDashboard.tsx` lines 23–65 | `Product`, `StoreOrder`, `SalesReport`, `MyStore` |
| `pages/SuperAdminDashboard.tsx` lines 21–52 | `Role`, `Permission`, `UserRoleAssignment`, `AuditLog` |
| `pages/Index.tsx` lines 30–55 | `Product`, `CartItem`, `CategorySectionProps` |
| `pages/StorePage.tsx` lines 25–53 | `Product`, `CartItem`, `StoreInfo` (**duplicates Index.tsx**) |
| `pages/CategoryPage.tsx` lines 22–42 | `Product`, `CartItem` (**triplicates Index.tsx**) |
| `pages/DriverDashboard.tsx` lines 21–50 | `AvailableOrder`, `Delivery` |
| `pages/OrdersPage.tsx` lines 19–40 | `OrderItem`, `Order` |
| `pages/LoginPage.tsx` line 45 | `TestAccount` |
| `pages/admin/AdminProductForm.tsx` lines 14–25 | `Unit`, `ProductUnit` (duplicates `admin/types.ts`) |
| `pages/admin/AdminProductUnitsDialog.tsx` lines 10–28 | `Unit`, `ProductUnit`, `Props` |
| `pages/admin/AdminUnits.tsx` line 11 | `Unit` |

### STRUCT-3 · No `src/helpers/` or `src/utils/` folder — duplicated logic
`haversineDistance`, price formatting, cart total calculations, and date formatting are implemented inline in multiple components. These should be extracted to `src/helpers/` and imported.

---

## Summary

| Category | Violations |
|----------|-----------|
| 🔴 Security / data integrity (BE) | 7 |
| 🟠 Query N+1 / unbounded fetches (BE) | 25+ |
| 🟡 Missing DB indexes (BE) | 14 models |
| 🟠 No AbortController on fetch (FE) | 19 files |
| 🟠 limit=1000 / no pagination (FE) | 3 files |
| 🟡 Missing useCallback on loadData (FE) | 15 files |
| 🟡 Missing useMemo on derived values (FE) | 2 files |
| 🟡 array.find() in render loop (FE) | 2 files |
| 🟡 setTimeout without clearTimeout (FE) | 2 files |
| 🟡 img missing lazy/dimensions (FE) | 17 instances |
| 🟡 window.confirm() usage (FE) | 8 instances |
| 🟡 console.log in production (FE) | 3 instances |
| 🟡 useState<any> / untyped (FE) | 3 instances |
| 🔵 God components >300 lines (FE) | 7 files |
| 🔵 Types defined in page files (FE) | 12 files |
| 🔵 No helpers/utils folder (FE) | — |
| **Total** | **~140 violations** |
