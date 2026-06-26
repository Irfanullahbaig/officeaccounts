# N9Accounts — Internal Finance Management System

Private company finance platform for payroll, loans, savings, commissions, revenue, expenses, and reporting.

## Tech Stack

- **Next.js 15+** (App Router) · TypeScript · Tailwind CSS · Shadcn UI
- **Prisma ORM** · Supabase PostgreSQL
- **Supabase Auth** · Email/password login with RBAC
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

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env` and fill in your Supabase keys + database URL
3. Run:

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

4. Initialize auth (creates admin in Supabase + database):

```
http://localhost:3000/api/setup?secret=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Open [http://localhost:3000](http://localhost:3000)

**Default login:** `admin@northnine.pk` / `N9Accounts@123`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable (or anon) key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Legacy alias for publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `DEFAULT_ADMIN_EMAIL` | No | Defaults to `admin@northnine.pk` |
| `DEFAULT_ADMIN_PASSWORD` | No | Defaults to `N9Accounts@123` |
| `SETUP_SECRET` | No | Secret for `/api/setup` (defaults to service role key) |

Get keys from **Supabase → Project Settings → API**  
Get database URL from **Supabase → Project Settings → Database → Connection string**

## Vercel Deployment

1. Connect your GitHub repo to Vercel.
2. Create a Supabase project (or use an existing one).
3. In **Vercel → Project → Settings → Environment Variables**, add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

4. Deploy. The build runs `prisma generate` + `next build` (no DB access during build).
5. After the first deploy, run setup once:

```
https://your-app.vercel.app/api/setup?secret=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

6. Sign in with `admin@northnine.pk` / `N9Accounts@123`

## Security

| Layer | Implementation |
|-------|----------------|
| Auth | Supabase Auth (email/password) |
| Authorization | `allowed_users` table + role checks |
| Routes | Next.js middleware + server-side role guards |
| Audit | `audit_logs` on all financial changes |

## Roles

| Role | Access |
|------|--------|
| **Super Admin** | Full system access, user management, settings |
| **Finance Manager** | All financial modules, reports, audit logs |
| **Employee** | Own payroll, savings, loans, commissions only |

## Production Database (Supabase)

Prisma connects to your Supabase PostgreSQL database via `DATABASE_URL`.  
Use the **Transaction pooler** connection string (port 6543) for Vercel/serverless.

## Loan Interest — Daily Diminishing Balance

Interest is calculated daily on **remaining principal only**:

```
Daily Rate = Annual Rate / 365
After each payment, future interest uses the new balance — never the original amount.
```

Use **Loans → Loan Calculator** for interactive amortization schedules.

---

**N9Accounts** — Authorized personnel only. All access is monitored and logged.

