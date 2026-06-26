import { prisma } from "@/lib/prisma";
import { queryDatabase } from "@/lib/db/query";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { ExpenseTable, AddExpenseDialog } from "@/components/expenses/expense-table";
import { EmptyState } from "@/components/shared/empty-state";
import { mapExpense } from "@/lib/mappers";

export default async function ExpensesPage() {
  await requireRole(["super_admin", "finance_manager"]);

  const rows = await queryDatabase([], () =>
    prisma.expense.findMany({ orderBy: { expenseDate: "desc" } })
  );
  const expenses = rows.map(mapExpense);

  return (
    <div>
      <PageHeader title="Expense Management" description="Track company expenses by category" action={<AddExpenseDialog />} />
      {expenses.length ? <ExpenseTable expenses={expenses} /> : (
        <EmptyState title="No expenses recorded" description="Add your first expense entry." action={<AddExpenseDialog />} />
      )}
    </div>
  );
}
