-- CreateTable
CREATE TABLE "loan_ledger_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loan_id" TEXT NOT NULL,
    "transaction_date" DATETIME NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "interest_portion" REAL NOT NULL DEFAULT 0,
    "principal_portion" REAL NOT NULL DEFAULT 0,
    "remaining_principal" REAL NOT NULL,
    "accrued_interest_after" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversal_of_id" TEXT,
    "created_by_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_ledger_entries_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_loans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "loan_amount" REAL NOT NULL,
    "interest_rate" REAL NOT NULL DEFAULT 15,
    "interest_type" TEXT NOT NULL DEFAULT 'daily_diminishing',
    "loan_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_months" INTEGER,
    "repayment_method" TEXT NOT NULL DEFAULT 'manual',
    "monthly_installment" REAL,
    "remaining_principal" REAL NOT NULL,
    "accrued_interest" REAL NOT NULL DEFAULT 0,
    "last_accrual_date" DATETIME,
    "total_interest_paid" REAL NOT NULL DEFAULT 0,
    "total_principal_paid" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "closed_at" DATETIME,
    "notes" TEXT,
    "created_by_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "loans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_loans" ("created_at", "created_by_email", "duration_months", "employee_id", "id", "interest_rate", "interest_type", "loan_amount", "loan_date", "monthly_installment", "notes", "remaining_principal", "repayment_method", "status", "total_interest_paid", "total_principal_paid", "updated_at") SELECT "created_at", "created_by_email", "duration_months", "employee_id", "id", "interest_rate", "interest_type", "loan_amount", "loan_date", "monthly_installment", "notes", "remaining_principal", "repayment_method", "status", "total_interest_paid", "total_principal_paid", "updated_at" FROM "loans";
DROP TABLE "loans";
ALTER TABLE "new_loans" RENAME TO "loans";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "loan_ledger_entries_loan_id_transaction_date_idx" ON "loan_ledger_entries"("loan_id", "transaction_date");
