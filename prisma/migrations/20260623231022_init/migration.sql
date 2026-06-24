-- CreateTable
CREATE TABLE "allowed_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "status" TEXT NOT NULL DEFAULT 'active',
    "employee_id" TEXT,
    "invited_by_id" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "last_login_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "allowed_users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "allowed_users_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "allowed_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "joining_date" DATETIME NOT NULL,
    "base_salary" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "role" TEXT NOT NULL DEFAULT 'employee',
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "bank_routing_number" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "base_salary" REAL NOT NULL DEFAULT 0,
    "bonuses" REAL NOT NULL DEFAULT 0,
    "commissions" REAL NOT NULL DEFAULT 0,
    "deductions" REAL NOT NULL DEFAULT 0,
    "loan_recovery" REAL NOT NULL DEFAULT 0,
    "savings_contribution" REAL NOT NULL DEFAULT 0,
    "final_salary" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" DATETIME,
    "notes" TEXT,
    "created_by_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payrolls_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payroll_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "is_addition" BOOLEAN NOT NULL DEFAULT true,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "savings_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "savings_type" TEXT NOT NULL DEFAULT 'fixed',
    "fixed_amount" REAL NOT NULL DEFAULT 0,
    "percentage_rate" REAL NOT NULL DEFAULT 0,
    "current_balance" REAL NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "savings_accounts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "savings_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "savings_account_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "balance_after" REAL NOT NULL,
    "notes" TEXT,
    "transaction_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "savings_transactions_savings_account_id_fkey" FOREIGN KEY ("savings_account_id") REFERENCES "savings_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "savings_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "loan_amount" REAL NOT NULL,
    "interest_rate" REAL NOT NULL,
    "interest_type" TEXT NOT NULL DEFAULT 'daily_diminishing',
    "loan_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_months" INTEGER,
    "repayment_method" TEXT NOT NULL DEFAULT 'payroll_deduction',
    "monthly_installment" REAL,
    "remaining_principal" REAL NOT NULL,
    "total_interest_paid" REAL NOT NULL DEFAULT 0,
    "total_principal_paid" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_by_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "loans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "loan_repayments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loan_id" TEXT NOT NULL,
    "payment_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount_paid" REAL NOT NULL,
    "principal_paid" REAL NOT NULL DEFAULT 0,
    "interest_paid" REAL NOT NULL DEFAULT 0,
    "remaining_principal" REAL NOT NULL,
    "remaining_interest" REAL NOT NULL DEFAULT 0,
    "payment_source" TEXT NOT NULL DEFAULT 'manual',
    "payroll_id" TEXT,
    "notes" TEXT,
    "created_by_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_repayments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_repayments_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "loan_interest_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loan_id" TEXT NOT NULL,
    "entry_date" DATETIME NOT NULL,
    "principal_balance" REAL NOT NULL,
    "daily_rate" REAL NOT NULL,
    "interest_amount" REAL NOT NULL,
    "accrued_interest" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_interest_entries_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lead_commissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lead_owner_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "deal_value" REAL NOT NULL,
    "commission_percent" REAL NOT NULL,
    "commission_amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_date" DATETIME,
    "notes" TEXT,
    "created_by_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "lead_commissions_lead_owner_id_fkey" FOREIGN KEY ("lead_owner_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "co_lead_commissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "main_lead_id" TEXT NOT NULL,
    "co_lead_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "deal_value" REAL NOT NULL,
    "split_percent" REAL NOT NULL,
    "main_commission" REAL NOT NULL,
    "co_lead_commission" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "co_lead_commissions_main_lead_id_fkey" FOREIGN KEY ("main_lead_id") REFERENCES "lead_commissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "co_lead_commissions_co_lead_id_fkey" FOREIGN KEY ("co_lead_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "revenues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_name" TEXT NOT NULL,
    "project_name" TEXT,
    "amount" REAL NOT NULL,
    "revenue_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "invoice_number" TEXT,
    "notes" TEXT,
    "created_by_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "expense_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_url" TEXT,
    "notes" TEXT,
    "created_by_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_email" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "login_activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failure_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_email" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by_email" TEXT,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "allowed_users_email_key" ON "allowed_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "allowed_users_employee_id_key" ON "allowed_users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_employee_id_period_month_period_year_key" ON "payrolls"("employee_id", "period_month", "period_year");

-- CreateIndex
CREATE UNIQUE INDEX "savings_accounts_employee_id_key" ON "savings_accounts"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "loan_interest_entries_loan_id_entry_date_key" ON "loan_interest_entries"("loan_id", "entry_date");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
