# N9Accounts — Internal Finance Management System

Private company finance platform for payroll, loans, savings, commissions, revenue, expenses, and reporting.

## Tech Stack

- **Next.js 15+** (App Router) · TypeScript · Tailwind CSS · Shadcn UI
- **Prisma ORM** · PostgreSQL (local + production)
- **NextAuth.js** · Credentials-based auth with RBAC
- **React Hook Form** · Zod · Recharts

## Features

- **Private access only** — no public registration; `allowed_users` gate
- **RBAC** — Super Admin, Finance Manager, Employee
- **Dashboard** — KPIs, revenue vs expenses, payroll/loan/savings trends
- **Employee Management** — profiles, bank details, financial history
- **Payroll** — auto loan/savings deductions, bonuses, commissions
- **Advanced Loans** — daily/monthly diminishing balance, amortization calculator
- **Savings** — fixed, percentage, manual contributions
- **Commissions** — lead & co-lead tracking
- **Revenue & Expenses** — categorized tracking
- **Reports** — CSV, Excel, PDF export
- **Audit Logs** — every financial action logged
- **Dark/Light mode**

## Quick Start

```bash
npm install
cp .env.example .env
docker compose up -d
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default login:** `admin@northnine.pk` / `N9Accounts@123`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (use Vercel Postgres in production) |
| `AUTH_SECRET` | Random secret for NextAuth sessions |
| `NEXTAUTH_URL` | App URL (e.g. `https://your-app.vercel.app`) |
| `DEFAULT_ADMIN_EMAIL` | Optional — defaults to `admin@northnine.pk` |
| `DEFAULT_ADMIN_PASSWORD` | Optional — defaults to `N9Accounts@123` |

## Vercel Deployment

1. Create a **Postgres** database (Vercel Postgres, Neon, or Supabase).
2. Set these environment variables in Vercel → Project → Settings → Environment Variables:
   - `DATABASE_URL` — Postgres connection string
   - `AUTH_SECRET` — run `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your production URL (e.g. `https://your-app.vercel.app`)
3. Redeploy. The build creates tables and seeds the admin user.
4. If login still fails after deploy, open once:
   `https://your-app.vercel.app/api/setup?secret=YOUR_AUTH_SECRET`
   This re-initializes the database and admin account.
5. Sign in with `admin@northnine.pk` / `N9Accounts@123`

## Security

| Layer | Implementation |
|-------|----------------|
| Auth | NextAuth credentials, bcrypt password hashing |
| Authorization | `allowed_users` table + role checks |
| Routes | Next.js middleware + server-side role guards |
| Audit | `audit_logs` on all financial changes |
| 2FA | Architecture ready on `allowed_users` |

## Roles

| Role | Access |
|------|--------|
| **Super Admin** | Full system access, user management, settings |
| **Finance Manager** | All financial modules, reports, audit logs |
| **Employee** | Own payroll, savings, loans, commissions only |

## Production (PostgreSQL)

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run `npm run db:migrate`.

## Loan Interest — Daily Diminishing Balance

Interest is calculated daily on **remaining principal only**:

```
Daily Rate = Annual Rate / 365
After each payment, future interest uses the new balance — never the original amount.
```

Use **Loans → Loan Calculator** for interactive amortization schedules.

---

**N9Accounts** — Authorized personnel only. All access is monitored and logged.
