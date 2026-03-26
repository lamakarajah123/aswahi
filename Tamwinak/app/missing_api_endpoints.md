# Missing API Endpoints Report

The following API endpoints are called by the frontend but are not yet implemented in the Node.js backend.

## Authorization & User Management
| Endpoint | Method | Component | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth-info/test-accounts` | `GET` | `LoginPage.tsx` | Show predefined test accounts on the login page |
| `/api/v1/seed/accounts` | `POST` | `LoginPage.tsx` | Button to initialize/seed the database with test accounts |

## RBAC (Role-Based Access Control)
| Endpoint | Method | Component | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/rbac/user-roles` | `GET` | `SuperAdminDashboard.tsx` | List all user-role assignments |
| `/api/v1/rbac/audit-logs` | `GET` | `SuperAdminDashboard.tsx` | Show system audit logs |

## Grocery & Store Management
| Endpoint | Method | Component | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/grocery/driver/my-deliveries` | `GET` | `DriverDashboard.tsx` | List current and past deliveries for the logged-in driver |
| `/api/v1/grocery/driver/orders/:id/status` | `PUT` | `DriverDashboard.tsx` | Update delivery status (e.g., 'delivering', 'delivered'). Backend currently has a different endpoint layout for this. |

## Administrative
| Endpoint | Method | Component | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v2/products/sync` | `POST` | `AdminPage.tsx` | Some legacy calls might exist for bulk sync (to be verified) |
