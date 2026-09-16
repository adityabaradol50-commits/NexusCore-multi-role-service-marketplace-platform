# NexusCore Enterprise Platform

NexusCore is an enterprise-grade multi-role marketplace and service booking platform built with FastAPI (Python 3.14+), SQLAlchemy 2 (Async), PostgreSQL/SQLite, and Next.js 16 (React 19, Turbopack, Tailwind CSS).

---

## Key Features

- **Multi-Role RBAC**: Scoped operational spaces for Consumers, Client Service Providers, and System Administrators.
- **Consumer Portal**: Service catalog discovery, booking flow, order tracking, payment processing, server-side receipts, and verified reviews.
- **Client/Business Control Panel**: Service offering CRUD, request/order lifecycle management, customer directory, payment settlement ledger, and revenue analytics.
- **Admin Command Center**: Real-time platform operational metrics, client application vetting/approval queue, account suspension moderation, global catalog governance, and immutable audit logs.
- **Financial Architecture**: Server-side fee split calculation (**10% Platform Fee / 90% Client Net Earnings**).
- **Payment Provider Abstraction**: Modular gateway strategy supporting sandbox development testing and live provider integrations (Stripe, Razorpay).
- **Centralized Notification Engine**: Event-driven notification dispatch with deep links and backend recipient isolation.

---

## Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # Linux/macOS

pip install -r requirements.txt
python -m pytest            # Run backend test suite (34/34 passing)
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Application: `http://localhost:3000`

---

## Environment Configuration

Copy `.env.example` in `backend/` to `.env`:
```env
PROJECT_NAME="NexusCore Platform"
ENVIRONMENT="development"
DEBUG=true

# Database (SQLite for dev, PostgreSQL for production)
DATABASE_URL="sqlite+aiosqlite:///./nexuscore.db"

# Security (Set 32-byte secret in production)
SECRET_KEY="supersecret-nexuscore-dev-key-change-in-production-min32chars"
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Fee Structure
PLATFORM_COMMISSION_PERCENTAGE=10.0

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# Payment Provider Integration
PAYMENT_PROVIDER="test" # "test", "stripe", "razorpay"
PAYMENT_KEY_ID="your_payment_provider_key_id"
PAYMENT_KEY_SECRET="your_payment_provider_key_secret"
PAYMENT_WEBHOOK_SECRET="your_payment_webhook_secret"
```

Frontend Environment (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL="http://127.0.0.1:8000/api/v1"
```

---

## Production Deployment — Vercel + Render + PostgreSQL

NexusCore is configured for continuous production deployment using **Vercel** (Frontend), **Render** (Backend API), and **Managed PostgreSQL**:

```
[Vercel: Next.js Frontend]  ──(HTTPS)──>  [Render: FastAPI Backend]  ──(asyncpg)──>  [Render / Cloud PostgreSQL]
```

### 11-Step Deployment Order:
1. **STEP 1**: Create managed PostgreSQL database (Render PostgreSQL / Supabase / AWS RDS).
2. **STEP 2**: Configure Render backend environment variables (`DATABASE_URL`, `SECRET_KEY`, `FIRST_SUPERUSER_EMAIL`, etc.).
3. **STEP 3**: Deploy FastAPI backend to Render using `render.yaml` or Web Service with `gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT app.main:app`.
4. **STEP 4**: Verify health endpoint: `curl https://<your-render-service>.onrender.com/api/health`.
5. **STEP 5**: Copy the live Render backend URL.
6. **STEP 6**: Configure Vercel frontend environment variable: `NEXT_PUBLIC_API_URL=<Render backend URL>`.
7. **STEP 7**: Deploy Next.js frontend to Vercel (`npm run build`).
8. **STEP 8**: Update Render backend `BACKEND_CORS_ORIGINS` to include your Vercel frontend domain.
9. **STEP 9**: Test authentication at `/login` with production admin credentials.
10. **STEP 10**: Test Client (Booking) → Owner (Accept & Earnings) → Admin (Audit) full lifecycle.
11. **STEP 11**: Configure live payment provider credentials only after all E2E verification tests pass.

For detailed configuration parameters, connection string drivers, and migration documentation, see [docs/ARCHITECTURE_AND_DEPLOYMENT.md](docs/ARCHITECTURE_AND_DEPLOYMENT.md).

