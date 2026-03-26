# Security Issues Report — Tamwinak
> Generated: 2026-03-11 | Scan covers `backend_node/` and `frontend/`

---

## CRITICAL 🔴

### SEC-01 · Plaintext credentials exposed in a public API endpoint
**File:** `backend_node/src/routes/auth.routes.ts : L128–135`

```ts
router.get('/auth-info/test-accounts', (req, res) => {
    res.json([
        { role: 'Admin',       email: 'admin@tamweenak.com',    password: 'Password123!' },
        { role: 'Store Owner', email: 'store@tamweenak.com',    password: 'Password123!' },
        { role: 'Driver',      email: 'driver@tamweenak.com',   password: 'Password123!' },
        { role: 'Customer',    email: 'customer@tamweenak.com', password: 'Password123!' },
    ]);
});
```

**Risk:** Any unauthenticated user can call this endpoint and receive the plaintext passwords for every role, including admin.

**Fix:** Delete this endpoint entirely. Never hardcode or return passwords from any endpoint.

---

### SEC-02 · Weak, hardcoded JWT secret
**File:** `backend_node/.env : L4`

```
JWT_SECRET=secret-key-replace-me
```

**Risk:** The placeholder is publicly visible and trivially guessable, allowing an attacker to forge any JWT and authenticate as any user including admin.

**Fix:** Set `JWT_SECRET` to a cryptographically random 256-bit string (e.g., `openssl rand -hex 32`). Never commit `.env` to source control; add it to `.gitignore`.

---

### SEC-03 · SMTP password committed to `.env`
**File:** `backend_node/.env : L10`

```
SMTP_PASS=frpkqiffpqkqieaf
```

**Risk:** The real Google App Password is checked into a file that is likely committed to version control. Anyone with repo access can send email from the account or access Google services.

**Fix:** Rotate the App Password immediately, add `.env` to `.gitignore`, and use a secrets manager or CI secrets for the value.

---

### SEC-04 · Unauthenticated `/login-dev` endpoint allows impersonation of any user
**File:** `backend_node/src/routes/auth.routes.ts : L82–98`

```ts
router.post('/login-dev', async (req, res) => {
    const { platform_sub, email, name } = req.body;
    const user = await authService.getOrCreateUser(platform_sub, email, name);
    const { token } = await authService.issueAppToken(user);
    res.json({ token, expires_at });
});
```

**Risk:** Anyone who knows this endpoint can create or log in as any user (including admin) without a password. No authentication or environment guard is in place.

**Fix:** Remove from production builds. At minimum add:
```ts
if (env.NODE_ENV !== 'development') return res.status(404).json({ error: 'Not found' });
```

---

### SEC-05 · Unauthenticated `/seed/accounts` endpoint creates privileged users
**File:** `backend_node/src/routes/auth.routes.ts : L138–155`

```ts
router.post('/seed/accounts', async (req, res) => { ... }); // no auth middleware
```

**Risk:** Any anonymous caller can trigger account seeding, potentially creating or resetting admin accounts.

**Fix:** Remove from production. If kept, guard with `authenticateJWT` + `requireRoles(['super_admin'])`.

---

### SEC-06 · Admin store-approval endpoints missing authorization check
**File:** `backend_node/src/routes/grocery/admin.routes.ts : L290–310`

```ts
// These two routes lack role-check middleware:
router.put('/admin/stores/:id/approve', async (req: AuthRequest, res) => { ... });
router.put('/admin/stores/:id/reject',  async (req: AuthRequest, res) => { ... });
```

Only `authenticateJWT` is applied at the router level. Any authenticated user (customer, driver) can approve or reject stores.

**Fix:** Add `requireRoles(['admin', 'super_admin'])` to both routes, matching the pattern used on `/admin/stores/:id` and `/admin/stores/:id/industries`.

---

## HIGH 🟠

### SEC-07 · CORS is open to all origins
**File:** `backend_node/src/app.ts : L13`

```ts
app.use(cors()); // no origin restriction
```

**Risk:** Any website can make cross-origin requests including authenticated ones if `withCredentials` is used. Increases the attack surface for CSRF and data exfiltration.

**Fix:**
```ts
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
```

---

### SEC-08 · Internal error messages leaked to API clients
**Files:** All route files (e.g., `admin.routes.ts`, `customer.routes.ts`, …)

**Pattern:**
```ts
catch (e: any) {
    res.status(500).json({ detail: e.message }); // raw exception text
}
```

This appears **50+ times** across all route files. Stack traces and DB error messages can expose table names, column names, and query structure.

**Fix:** Log the full error server-side and return a generic message to the client:
```ts
catch (e: any) {
    console.error('[ERROR]', e);
    res.status(500).json({ detail: 'An internal error occurred' });
}
```

---

### SEC-09 · OTP generated with non-cryptographic RNG (`Math.random`)
**File:** `backend_node/src/services/auth.service.ts : L168`

```ts
const otp = Math.floor(100000 + Math.random() * 900000).toString();
```

**Risk:** `Math.random()` is not cryptographically secure. An attacker with statistical information about timing could predict the OTP and reset any user's password.

**Fix:** Use `crypto.randomInt`:
```ts
import { randomInt } from 'crypto';
const otp = randomInt(100000, 1000000).toString();
```

---

### SEC-10 · `request` body limit is 50 MB — enables easy DoS
**File:** `backend_node/src/app.ts : L14–15`

```ts
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

**Risk:** Any anonymous caller (before rate-limit socket reads body) can flood memory with 50 MB per request.

**Fix:** Use a sensible limit (e.g., `'1mb'`). If image upload is needed, handle large payloads only on dedicated upload routes using `multipart/form-data` with size checks.

---

### SEC-11 · `require()` inside a hot-path request handler
**File:** `backend_node/src/app.ts : L76`

```ts
const { Op } = require('sequelize'); // inside async route handler
```

**Risk:** `require()` inside a hot-path bypasses module-level caching on some runtimes and can cause subtle import breakages. This is also a code-quality red flag if it's worked around to hide a circular dependency.

**Fix:** Move the import to the top of the file:
```ts
import { Op } from 'sequelize'; // at module top
```

---

### SEC-12 · No brute-force protection on the login or reset-password endpoints
**File:** `backend_node/src/routes/auth.routes.ts`

The global rate limiter allows **200 requests per 15 minutes per IP**. Login and reset-password endpoints have no tighter per-email or per-route limit.

**Risk:** An attacker can attempt 200 password guesses per 15-minute window against any account, or enumerate 200 OTPs (6-digit = 1 000 000 space → brute-force in ~7.5 hours with 200/15 min rate).

**Fix:** Add per-route limiters:
```ts
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5 });
router.post('/login', authLimiter, ...);
router.post('/reset-password', authLimiter, ...);
```

---

### SEC-13 · JWT has no revocation mechanism (logout is a no-op)
**File:** `backend_node/src/routes/auth.routes.ts : L106–111`

```ts
router.post('/logout', authenticateJWT, (req, res) => {
    // With stateless JWTs, frontend usually throws it away.
    res.json({ message: 'Successfully logged out' });
});
```

**Risk:** Stolen tokens remain valid for their full 24-hour lifetime. There is no blocklist, no short expiry, and no refresh-token rotation.

**Fix (pragmatic short-term):** Reduce token lifetime to 15–60 minutes and implement a refresh-token pattern, or maintain a server-side token blocklist (e.g., a Redis `SET` of invalidated JTIs).

---

## MEDIUM 🟡

### SEC-14 · Duplicate public route handler — potential logic shadowing
**File:** `backend_node/src/routes/grocery/public.routes.ts : L276–298`

The route `GET /stores/:id` is registered **twice** with identical logic. Only the first registration is reachable; the second is dead code. If the two handlers were to diverge (e.g., one added auth, the other didn't), this creates an exploitable bypass.

**Fix:** Remove the duplicate route.

---

### SEC-15 · Cleartext password emailed to store owner on account creation
**File:** `backend_node/src/routes/grocery/admin.routes.ts : L199`

```ts
emailService.sendStoreWelcomeEmail(email, owner_name, store_name, password)
```

The admin-created plaintext password is transmitted over SMTP to the store owner.

**Risk:** Email is unencrypted in transit and at rest. Anyone with access to the mailbox or mail server logs obtains the password.

**Fix:** Instead of sending the password, generate a one-time password-reset link (signed token) and email that link. The user sets their own password on first login.

---

### SEC-16 · `rbac/user-roles` and `rbac/audit-logs` endpoints have no pagination
**File:** `backend_node/src/routes/rbac.routes.ts : L105–126`

```ts
const userRoles = await UserRole.findAll({ order: [['assigned_at', 'DESC']] }); // no limit
```

**Risk:** As the user-role table grows, this will fetch unbounded rows into memory. A large table will cause memory pressure or a timeout that denial-of-services the API.

**Fix:** Add `limit`/`offset` with `findAndCountAll` matching the pattern used in `/users/pending`.

---

### SEC-17 · `.gitignore` status — `.env` files may be committed
Both `backend_node/.env` and `frontend/.env` contain real credentials. Ensure they are listed in `.gitignore`.

**Check command:**
```bash
git ls-files --error-unmatch backend_node/.env
```
If this returns a path, the file is tracked and must be removed with `git rm --cached`.

---

## Summary Table

| ID     | Severity | Area              | Issue |
|--------|----------|-------------------|-------|
| SEC-01 | 🔴 Critical | Auth Routes   | Plaintext credentials in public endpoint |
| SEC-02 | 🔴 Critical | Config        | Weak hardcoded JWT secret |
| SEC-03 | 🔴 Critical | Config        | Real SMTP password committed to `.env` |
| SEC-04 | 🔴 Critical | Auth Routes   | Unauthenticated `login-dev` impersonation |
| SEC-05 | 🔴 Critical | Auth Routes   | Unauthenticated `seed/accounts` endpoint |
| SEC-06 | 🔴 Critical | Admin Routes  | Store approve/reject missing role check |
| SEC-07 | 🟠 High   | App Config    | CORS open to all origins |
| SEC-08 | 🟠 High   | All Routes    | Raw error messages leaked to clients |
| SEC-09 | 🟠 High   | Auth Service  | OTP via non-cryptographic `Math.random` |
| SEC-10 | 🟠 High   | App Config    | 50 MB body limit enables DoS |
| SEC-11 | 🟠 High   | App Config    | `require()` inside request handler |
| SEC-12 | 🟠 High   | Auth Routes   | No brute-force protection on login/reset |
| SEC-13 | 🟠 High   | Auth          | JWT has no revocation / logout is no-op |
| SEC-14 | 🟡 Medium | Public Routes | Duplicate route handler creates dead code |
| SEC-15 | 🟡 Medium | Admin Routes  | Cleartext password emailed to store owner |
| SEC-16 | 🟡 Medium | RBAC Routes   | Unbounded `findAll` on user-roles/audit-logs |
| SEC-17 | 🟡 Medium | Config        | `.env` files may be committed to git |
