"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SavingsAccount } from "@/types/database";
import { formatCurrency } from "@/lib/utils/format";

interface SavingsWithEmployee extends Omit<SavingsAccount, "employees"> {
  employees: { full_name: string; employee_code: string } | null;
}

export function SavingsTable({ accounts }: { accounts: SavingsWithEmployee[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Fixed Amount</TableHead>
            <TableHead>Percentage</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((acc) => (
            <TableRow key={acc.id}>
              <TableCell>
                <p className="font-medium">{acc.employees?.full_name}</p>
                <p className="text-xs text-muted-foreground">{acc.employees?.employee_code}</p>
              </TableCell>
              <TableCell className="capitalize">{acc.savings_type}</TableCell>
              <TableCell>{formatCurrency(Number(acc.fixed_amount))}</TableCell>
              <TableCell>{Number(acc.percentage_rate)}%</TableCell>
              <TableCell className="font-semibold">{formatCurrency(Number(acc.current_balance))}</TableCell>
              <TableCell>
                <Badge variant={acc.is_active ? "default" : "secondary"}>
                  {acc.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
