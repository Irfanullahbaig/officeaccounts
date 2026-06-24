import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeesTable } from "@/components/employees/employees-table";
import { EmptyState } from "@/components/shared/empty-state";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { mapEmployee } from "@/lib/mappers";

export default async function EmployeesPage() {
  await requireRole(["super_admin", "finance_manager"]);

  const rows = await prisma.employee.findMany({ orderBy: { createdAt: "desc" } });
  const employees = rows.map(mapEmployee);

  return (
    <div>
      <PageHeader
        title="Employee Management"
        description="Manage employee profiles and revenue-sharing financial summaries"
        action={<AddEmployeeDialog />}
      />
      {employees.length ? (
        <EmployeesTable employees={employees} />
      ) : (
        <EmptyState
          title="No employees yet"
          description="Add your first employee to start managing project earnings, savings, loans, and commissions."
          action={<AddEmployeeDialog />}
        />
      )}
    </div>
  );
}
