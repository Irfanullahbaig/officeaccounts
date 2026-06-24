"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { LeadCommission } from "@/types/database";
import { formatCurrency, formatDate, cnStatusColor } from "@/lib/utils/format";

interface LeadWithEmployee extends Omit<LeadCommission, "employees"> {
  employees: { full_name: string } | null;
}

export function CommissionsTable({ commissions }: { commissions: LeadWithEmployee[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead Owner</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Deal Value</TableHead>
            <TableHead>Commission %</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.employees?.full_name}</TableCell>
              <TableCell>{c.client_name}</TableCell>
              <TableCell>{formatCurrency(Number(c.deal_value))}</TableCell>
              <TableCell>{Number(c.commission_percent)}%</TableCell>
              <TableCell className="font-semibold">{formatCurrency(Number(c.commission_amount))}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cnStatusColor(c.status)}>{c.status}</Badge>
              </TableCell>
              <TableCell>{c.payment_date ? formatDate(c.payment_date) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
