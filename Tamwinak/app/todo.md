# Tamweenak - Authentication & Test Account System

## Design Guidelines
- **Brand**: Tamweenak (تموينك) - Grocery Delivery PWA
- **Primary Color**: #16a34a (Green-600)
- **Secondary**: #f0fdf4 (Green-50)
- **Accent**: #059669 (Emerald-600)
- **Background**: #f9fafb (Gray-50)
- **Typography**: System default (Inter/sans-serif)

## Auth System Architecture
- Uses Atoms Cloud OIDC-based authentication (SSO)
- JWT access tokens issued by backend after OIDC callback
- Role-based access via RBAC tables (roles, permissions, user_roles, role_permissions)
- Auth flow: User clicks login → OIDC redirect → callback → JWT issued → role-based redirect

## Files to Create/Modify

### 1. Backend: Auth Info Endpoint
- `backend/routers/auth_info.py` - Test accounts info + auth flow documentation endpoint

### 2. Frontend Updates
- `frontend/src/components/AppHeader.tsx` - Rebrand to Tamweenak
- `frontend/src/pages/Index.tsx` - Rebrand hero section
- `frontend/src/pages/LoginPage.tsx` - NEW: Login page with test credentials display
- `frontend/src/App.tsx` - Add login route + role-based redirect
- `frontend/src/contexts/AuthContext.tsx` - Add role-based redirect helper
- `frontend/index.html` - Update title

## Test Accounts (All use Atoms Cloud OIDC - displayed for reference)
| Role | Email | Name | Phone |
|------|-------|------|-------|
| Super Admin | superadmin@tamweenak.com | Ahmad Al-Rashid | +966501000001 |
| Admin | admin@tamweenak.com | Fatima Al-Zahrani | +966501000002 |
| Store Owner 1 | store1@tamweenak.com | Khalid Al-Otaibi | +966501000003 |
| Store Owner 2 | store2@tamweenak.com | Noura Al-Dosari | +966501000004 |
| Store Staff 1 | staff1@tamweenak.com | Omar Al-Harbi | +966501000005 |
| Store Staff 2 | staff2@tamweenak.com | Layla Al-Qahtani | +966501000006 |
| Driver 1 | driver1@tamweenak.com | Saeed Al-Ghamdi | +966501000007 |
| Driver 2 | driver2@tamweenak.com | Youssef Al-Shehri | +966501000008 |
| Driver 3 | driver3@tamweenak.com | Hassan Al-Malki | +966501000009 |
| Customer 1 | customer1@tamweenak.com | Maryam Al-Subaie | +966501000010 |
| Customer 2 | customer2@tamweenak.com | Abdullah Al-Mutairi | +966501000011 |
| Customer 3 | customer3@tamweenak.com | Sara Al-Tamimi | +966501000012 |
| Customer 4 | customer4@tamweenak.com | Faisal Al-Dawsari | +966501000013 |
| Customer 5 | customer5@tamweenak.com | Huda Al-Juhani | +966501000014 |

## Role-Based Dashboard Redirect
- Super Admin → /super-admin
- Admin → /admin
- Store Owner → /store-dashboard
- Store Staff → /store-dashboard
- Driver → /driver
- Customer → / (homepage)

## Seeded Data
- 2 stores with full profiles
- 42 products across 9 categories
- 10 orders in various statuses (pending, preparing, on_the_way, delivered, cancelled)