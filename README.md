# N9Accounts — Internal Finance Management System

Private company finance platform for payroll, loans, savings, commissions, revenue, expenses, and reporting.

## Tech Stack

- **Next.js 15+** (App Router) · TypeScript · Tailwind CSS · Shadcn UI
- **Prisma ORM** · SQLite (local) / PostgreSQL (production)
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
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default login:** `admin@company.com` / `admin123`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite: `file:./dev.db` or PostgreSQL connection string |
| `AUTH_SECRET` | Random secret for NextAuth sessions |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |

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
