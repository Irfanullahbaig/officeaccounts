"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Employee } from "@/types/database";
import { formatCurrency, cnStatusColor } from "@/lib/utils/format";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { getEmployeeStatusLabel } from "@/lib/employees/status";
import { EditEmployeeDialog } from "@/components/employees/edit-employee-dialog";

export function EmployeesTable({
  employees,
  readOnly = false,
}: {
  employees: Employee[];
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Lifetime Earnings</TableHead>
            <TableHead>Loan Balance</TableHead>
            <TableHead>Savings</TableHead>
            <TableHead>Commission Wallet</TableHead>
            <TableHead>Net Available</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            {!readOnly && <TableHead className="w-[60px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell>
                <Link href={`/employees/${emp.id}`} className="font-mono text-sm hover:underline">
                  {emp.employee_code}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{emp.full_name}</TableCell>
              <TableCell>{emp.email}</TableCell>
              <TableCell>{emp.department ?? "—"}</TableCell>
              <TableCell>{emp.designation ?? "—"}</TableCell>
              <TableCell>{formatCurrency(Number(emp.total_lifetime_earnings))}</TableCell>
              <TableCell>{formatCurrency(Number(emp.current_loan_balance))}</TableCell>
              <TableCell>{formatCurrency(Number(emp.total_savings))}</TableCell>
              <TableCell>{formatCurrency(Number(emp.lead_commission_wallet + emp.co_lead_commission_wallet))}</TableCell>
              <TableCell>{formatCurrency(Number(emp.net_available_balance))}</TableCell>
              <TableCell>{ROLE_LABELS[emp.role]}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cnStatusColor(emp.status)}>
                  {getEmployeeStatusLabel(emp.status)}
                </Badge>
              </TableCell>
              {!readOnly && (
                <TableCell>
                  <EditEmployeeDialog employee={emp} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
