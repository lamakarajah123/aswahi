# Tamwinak — cPanel Shared Hosting Deployment Guide

## Stack Overview

| Layer    | Technology                         |
|----------|------------------------------------|
| Frontend | React 18 + Vite (SPA, static build)|
| Backend  | Node.js 18+ + Express 5 + TypeScript|
| Database | PostgreSQL                         |
| ORM      | Sequelize 6                        |

---

## Prerequisites — Hosting Requirements

Before choosing a shared host, verify it supports:

- **Node.js** via cPanel's **"Setup Node.js App"** feature (CloudLinux + Phusion Passenger)
- **PostgreSQL** database creation in cPanel  
  *(if only MySQL is offered, you must migrate or use an external Postgres service like Neon, Supabase, or Railway)*
- **SSL/TLS** via Let's Encrypt (free, built into most cPanel hosts)
- SSH access (recommended for running migrations)

Tested-compatible hosts: Hostinger Business, A2 Hosting, SiteGround, NameHero.

---

## Part 1 — Database Setup

### 1.1 Create a PostgreSQL Database

1. Log into cPanel → **PostgreSQL Databases**.
2. Create a new database, e.g. `cpanelusername_tamwinak`.
3. Create a new database user with a strong password.
4. Add the user to the database with **all privileges**.
5. Note down:
   - Host: `localhost` (or the remote host shown in cPanel)
   - Database name
   - Username
   - Password
   - Port: `5432`

Your `DATABASE_URL` will be:
```
postgres://DB_USER:DB_PASSWORD@localhost:5432/DB_NAME
```

---

## Part 2 — Backend Deployment

### 2.1 Build Locally

On your development machine:

```bash
cd app/backend_node
pnpm install
pnpm build        # runs: tsc  →  outputs to dist/
```

Verify the `dist/` folder was created with `dist/index.js` as the entry point.

### 2.2 Upload Backend Files

Upload the following to a directory **outside** `public_html`, e.g. `/home/cpanelusername/tamwinak_api/`:

```
dist/                   ← compiled JS (required)
node_modules/           ← dependencies (or install on server, see below)
package.json
.sequelizerc            ← required for db:migrate to load .env automatically
config/
  config.json
src/
  db/
    migrations/         ← all migration .js files (required for db:migrate)
    seeders/            ← seeder files if any
.env                    ← filled in with production values (see 2.3)
```

> **Recommended:** Upload everything except `node_modules/`, then install on the server via SSH:
> ```bash
> cd ~/tamwinak_api
> npm install --omit=dev
> ```

### 2.3 Create the Backend `.env` File

Create `/home/cpanelusername/tamwinak_api/.env`:

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgres://DB_USER:DB_PASSWORD@localhost:5432/DB_NAME

JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING_AT_LEAST_64_CHARS

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Tamwinak" <your-email@gmail.com>

FRONTEND_URL=https://yourdomain.com
```

> Generate a secure JWT secret:  
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 2.4 Set Up Node.js App in cPanel

1. cPanel → **Software** → **Setup Node.js App** → **Create Application**.
2. Fill in:
   - **Node.js version**: `18.x` or `20.x`
   - **Application mode**: `Production`
   - **Application root**: `tamwinak_api`
   - **Application URL**: `api.yourdomain.com` *(create a subdomain first — see 2.5)*
   - **Application startup file**: `dist/index.js`
3. Click **Create**.
4. In the app settings, add environment variables from your `.env` file  
   *(or rely on the `.env` file read by dotenv — both work)*.
5. Click **Run NPM Install** if you haven't installed via SSH.
6. Click **Start** to launch the app.

Phusion Passenger will keep the process running and auto-restart on crash.

### 2.5 Create the API Subdomain

1. cPanel → **Domains** → **Subdomains**.
2. Create `api.yourdomain.com` pointing to a folder like `public_html/api` or the app root.  
   *(The actual routing is handled by Passenger, not this folder.)*

### 2.6 Run Database Migrations

Via SSH:

```bash
cd ~/tamwinak_api
npx sequelize-cli db:migrate
```

> `.sequelizerc` calls `require('dotenv').config()`, so it picks up `DATABASE_URL` from your `.env` file automatically.  
> If you get **"Error parsing url: undefined"**, it means `.sequelizerc` is missing from the server. Either upload it, or pass the URL inline:
> ```bash
> DATABASE_URL=postgres://DB_USER:DB_PASSWORD@localhost:5432/DB_NAME npx sequelize-cli db:migrate
> ```

---

## Part 3 — Frontend Deployment

### 3.1 Configure the API URL

In `app/frontend/.env.production` (create if it doesn't exist):

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 3.2 Build Locally

```bash
cd app/frontend
pnpm install
pnpm build        # outputs to dist/
```

### 3.3 Upload Frontend Files

Upload **everything inside** `app/frontend/dist/` to `public_html/` on the server.

Final structure on the server:
```
public_html/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── images/
└── robots.txt
```

### 3.4 Configure Apache for SPA Routing

React Router requires all routes to serve `index.html`. Create `/public_html/.htaccess`:

```apache
Options -MultiViews
RewriteEngine On

# Handle HTTPS redirect
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Serve static files directly
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# All other requests → index.html (SPA fallback)
RewriteRule ^ index.html [L]
```

---

## Part 4 — SSL / HTTPS

1. cPanel → **Security** → **SSL/TLS Status**.
2. For both `yourdomain.com` and `api.yourdomain.com`, click **Run AutoSSL** or issue a Let's Encrypt certificate.
3. Wait a few minutes for propagation.
4. Verify HTTPS works for both the main domain and the API subdomain.

---

## Part 5 — CORS Configuration

Update the CORS origin in the backend to match your live domain.

In `app/backend_node/src/app.ts`, ensure the CORS config allows your frontend domain:

```typescript
cors({
  origin: process.env.FRONTEND_URL,   // reads from .env → https://yourdomain.com
  credentials: true,
})
```

---

## Part 6 — Post-Deployment Checklist

- [ ] PostgreSQL database created and user has all privileges
- [ ] Backend `.env` has correct `DATABASE_URL` and a strong `JWT_SECRET`
- [ ] `NODE_ENV=production` is set
- [ ] Migrations ran successfully (`db:migrate`)
- [ ] Node.js app is running in cPanel (status = **Running**)
- [ ] Frontend `dist/` uploaded to `public_html/`
- [ ] `.htaccess` SPA fallback is in place
- [ ] SSL active on `yourdomain.com` and `api.yourdomain.com`
- [ ] `VITE_API_BASE_URL` points to `https://api.yourdomain.com` in the production build
- [ ] CORS `origin` in backend matches the live frontend URL
- [ ] Test login, registration, and at least one API request in the browser

---

## Part 7 — Updating the App

### Update backend:
```bash
# local
pnpm build
# upload dist/ to server, then via SSH:
cd ~/tamwinak_api
NODE_ENV=production npx sequelize-cli db:migrate   # if there are new migrations
# restart in cPanel → Setup Node.js App → Restart
```

### Update frontend:
```bash
# local
pnpm build
# upload contents of dist/ to public_html/
# no server restart needed — static files are served directly by Apache
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| API returns 502 / "Application is not running" | Node process not started or crashed | cPanel → Setup Node.js App → check logs → Restart |
| React routes return 404 on hard refresh | `.htaccess` missing or incorrect | Re-upload the `.htaccess` from Part 3.4 |
| CORS error in browser console | `FRONTEND_URL` env var wrong | Fix `.env` on server, restart Node app |
| Database connection refused | Wrong `DATABASE_URL` or PostgreSQL not running | Verify credentials in cPanel PostgreSQL, test with `psql` via SSH |
| JWT errors after deployment | `JWT_SECRET` differs from what signed old tokens | Expected on first deploy — users log in again |
| SMTP emails not sending | Gmail requires App Password (2FA must be on) | Generate App Password at myaccount.google.com → Security |
| Static assets (JS/CSS) return 404 | File paths in `dist/` differ from upload location | Make sure you uploaded the **contents** of `dist/`, not the folder itself |
