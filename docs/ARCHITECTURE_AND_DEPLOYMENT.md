# NexusCore Architecture, Security & Production Deployment Guide

## 1. System Architecture

NexusCore uses a decoupled architecture separating the Next.js frontend client application from the backend FastAPI REST services and relational storage.

```mermaid
flowchart TD
    ConsumerApp[Next.js Consumer Portal - Vercel] -->|HTTP / JWT| BackendAPI[FastAPI Gateway - Render]
    ClientApp[Next.js Owner Control Panel - Vercel] -->|HTTP / JWT| BackendAPI
    AdminApp[Next.js Admin Command Center - Vercel] -->|HTTP / JWT| BackendAPI

    BackendAPI --> FinanceEngine[Finance Engine: 10% Fee / 90% Net]
    BackendAPI --> PaymentProvider[Payment Provider Abstraction]
    BackendAPI --> NotificationEngine[Notification Engine]
    BackendAPI --> AuditLogger[Audit Logging Subsystem]

    BackendAPI -->|Async SQLAlchemy / asyncpg| Database[(Managed PostgreSQL / Render DB)]
```

---

## 2. Security & RBAC Model

### Authentication & Tokens
- **JSON Web Tokens (JWT)** signed via HMAC-SHA256 (`HS256`).
- Access tokens expire in 60 minutes; refresh tokens expire in 7 days.
- Automatic sliding refresh session interceptor in frontend (`api.ts`).

### Role-Based Access Control (RBAC)
- Roles: `admin`, `client`, `consumer`.
- Guard middleware `require_roles(["role_name"])` enforced on every protected backend route.
- Suspended user tokens (`User.status == 'SUSPENDED'`) are blocked server-side.

### IDOR & Data Isolation
- **Consumers (Clients/Buyers)**: Can only read and modify their own orders, profile, receipts, and reviews.
- **Owners (Providers)**: Can only mutate services and orders matching `client_id == profile.id`.
- **Admins**: Granted platform-wide governance access; all administrative mutations write immutable entries to `AuditLog`.

---

## 3. Financial Engine & Payment Abstraction

### Financial Rule
$$\text{Gross Order Total} \longrightarrow \text{Platform Commission Fee (10\%)} + \text{Owner Net Earnings (90\%)}$$
- All fee computations are calculated exclusively server-side using 2-decimal precision quantizing in `app/core/finance.py`.

### Payment Strategy Interface
- Pluggable Strategy pattern (`PaymentGatewayStrategy`) defined in `app/core/payment_provider.py`.
- Supported modes:
  - `test` / `sandbox`: Simulates gateway payment intents, HMAC signature verification, and test refund processing without real financial credentials.
  - `stripe` / `razorpay`: Live integration interfaces configured strictly through environment variables.

---

## 4. Production Deployment — Vercel + Render + PostgreSQL

> [!IMPORTANT]
> **PREPARATION GUIDE ONLY — DO NOT DEPLOY AUTOMATICALLY.**
> Follow this exact step-by-step sequence when deploying NexusCore to production. Never store production credentials, database passwords, or JWT secrets in source code.

### Step-by-Step Production Deployment Sequence

#### STEP 1: Create Managed PostgreSQL Database
- In Render Dashboard (or Supabase/Neon/AWS RDS), create a **PostgreSQL Database**.
- Set database name to `nexuscore` and note the connection string.
- The connection string will look like `postgres://nexuscore:<password>@<host>:5432/nexuscore`.
- *Note*: NexusCore automatically normalizes `postgres://` or `postgresql://` URLs to use the asynchronous `postgresql+asyncpg://` driver.

#### STEP 2: Configure Render Backend Environment Variables
Create a new **Web Service** on Render connected to your repository with root directory `backend`. Configure the following environment variables:
```env
PROJECT_NAME=NexusCore Platform
ENVIRONMENT=production
DEBUG=false

DATABASE_URL=<Managed PostgreSQL connection string from Step 1>

SECRET_KEY=<Generate a strong 32-byte secret: openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

BACKEND_CORS_ORIGINS=http://localhost:3000

PLATFORM_COMMISSION_PERCENTAGE=10.0

FIRST_SUPERUSER_EMAIL=<Production Admin Email, e.g. admin@yourdomain.com>
FIRST_SUPERUSER_PASSWORD=<Strong Unique Admin Password>

PAYMENT_PROVIDER=test
SEED_DEMO_DATA=false
```

#### STEP 3: Deploy FastAPI Backend to Render
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT app.main:app` (or `uvicorn app.main:app --host 0.0.0.0 --port $PORT`)
- **Health Check Path**: `/api/health`
- On first startup, the application's lifespan automatically executes `init_db()`:
  - Creates relational tables if they do not exist.
  - Seeds mandatory system roles (`admin`, `client`, `consumer`).
  - Seeds initial platform superuser from `FIRST_SUPERUSER_EMAIL` / `FIRST_SUPERUSER_PASSWORD`.
  - Seeds standard categories (Wellness, Home Services, etc.).
  - Skips mock test orders/fixtures because `ENVIRONMENT=production` and `SEED_DEMO_DATA=false`.

#### STEP 4: Verify Backend Health Endpoint
- Navigate to your Render service URL in a browser or curl:
  ```bash
  curl https://<your-render-service>.onrender.com/api/health
  ```
- **Expected Response**:
  ```json
  {"status": "healthy", "service": "NexusCore Platform", "environment": "production"}
  ```

#### STEP 5: Copy Render Backend URL
- Note your live production API URL: `https://<your-render-service>.onrender.com`.

#### STEP 6: Configure Vercel Frontend
- In the Vercel Dashboard, import the repository and set the **Root Directory** to `frontend`.
- In **Environment Variables**, add:
  ```env
  NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com
  ```
- *Note*: The frontend automatically normalizes the URL to append `/api/v1`.

#### STEP 7: Deploy Next.js Frontend to Vercel
- **Build Command**: `npm run build` (or `next build`)
- **Output Directory**: `.next`
- Trigger deployment and confirm all 32 static routes compile successfully.
- Copy your assigned Vercel URL: `https://<your-app>.vercel.app`.

#### STEP 8: Update Render CORS to Allow Vercel Frontend
- Return to Render Web Service settings → **Environment Variables**.
- Update `BACKEND_CORS_ORIGINS` to include your Vercel production domain:
  ```env
  BACKEND_CORS_ORIGINS=https://<your-app>.vercel.app,http://localhost:3000
  ```
- Save changes. Render will automatically redeploy with the updated CORS policy.

#### STEP 9: Test Authentication
- Visit `https://<your-app>.vercel.app/login`.
- Log in using your production superuser credentials configured in Step 2 (`FIRST_SUPERUSER_EMAIL` and `FIRST_SUPERUSER_PASSWORD`).
- Confirm successful authentication and redirection to the `/admin/dashboard`.

#### STEP 10: Test Client → Owner → Admin Flows
- Register a new Client (Consumer) account and verify browsing catalog.
- Register an Owner (Service Provider) account and submit an offering.
- Log in as Admin and approve the Owner in `/admin/client-approval`.
- Place a test booking from Client account and verify sandbox escrow transaction.
- As Owner, view the booking request, accept it, and verify the 10% platform / 90% owner fee split ledger in `/client/payments`.

#### STEP 11: Configure Production Payment Provider (Optional)
- Only after all end-to-end flows pass, configure live payment credentials in Render environment variables:
  ```env
  PAYMENT_PROVIDER=stripe # or razorpay
  PAYMENT_KEY_ID=<live_key_id>
  PAYMENT_KEY_SECRET=<live_secret_key>
  PAYMENT_WEBHOOK_SECRET=<live_webhook_signing_secret>
  ```
- Set up payment provider webhook forwarding to:
  `https://<your-render-service>.onrender.com/api/v1/payments/webhook`

---

## 5. Database Management: Initialization vs Migrations

### Current Startup Initialization Strategy
- Handled via `app/database_init.py` inside FastAPI's async lifespan handler.
- Performs `Base.metadata.create_all` to idempotently ensure all tables (`roles`, `users`, `consumer_profiles`, `client_profiles`, `categories`, `services_products`, `orders`, `order_items`, `payments`, `reviews`, `notifications`, `audit_logs`) exist.
- Inspects and adds missing non-breaking columns (e.g. `is_test_fixture`).
- Safely bootstraps core roles and the primary administrator without overwriting existing data.

### Recommended Production Migration Strategy (Alembic)
For zero-downtime production schema evolution:
1. Initialize an Alembic environment: `alembic init -t async migrations`.
2. Configure `migrations/env.py` to import `Base` from `app.database` and `settings.DATABASE_URL`.
3. Generate baseline revision: `alembic revision --autogenerate -m "initial_schema"`.
4. Run migrations in Render pre-deploy hook: `alembic upgrade head`.

---

## 6. Environment Variables Reference

### Backend (`backend/.env.example`)
| Variable | Description | Production Example |
|---|---|---|
| `PROJECT_NAME` | Name of the platform | `NexusCore Platform` |
| `ENVIRONMENT` | Runtime environment | `production` |
| `DEBUG` | Enable debug logging | `false` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@host:5432/nexuscore` |
| `SECRET_KEY` | HMAC signing key (min 32 bytes) | `e2a8...` (openssl rand -hex 32) |
| `ALGORITHM` | Token signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Access token lifetime | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | `7` |
| `BACKEND_CORS_ORIGINS` | Comma-separated allowed URLs | `https://nexuscore.vercel.app,http://localhost:3000` |
| `PLATFORM_COMMISSION_PERCENTAGE`| Commission percentage | `10.0` |
| `FIRST_SUPERUSER_EMAIL` | Initial admin email | `admin@yourdomain.com` |
| `FIRST_SUPERUSER_PASSWORD` | Initial admin password | `SecureProductionPassword123!` |
| `PAYMENT_PROVIDER` | Gateway provider | `test`, `stripe`, `razorpay` |
| `SEED_DEMO_DATA` | Seed mock marketplace data | `false` |

### Frontend (`frontend/.env.example`)
| Variable | Description | Production Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL on Render | `https://nexuscore-backend.onrender.com` |
