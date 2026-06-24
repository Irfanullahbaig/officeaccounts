"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, cnStatusColor } from "@/lib/utils/format";

interface CoLeadCommission {
  id: string;
  client_name: string;
  deal_value: number;
  split_percent: number;
  main_commission: number;
  co_lead_commission: number;
  status: string;
  payment_date: string | null;
  employees: { full_name: string } | null;
}

export function CoLeadCommissionsTable({ commissions }: { commissions: CoLeadCommission[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Co-Lead</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Deal Value</TableHead>
            <TableHead>Split %</TableHead>
            <TableHead>Main Commission</TableHead>
            <TableHead>Co-Lead Commission</TableHead>
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
              <TableCell>{Number(c.split_percent)}%</TableCell>
              <TableCell>{formatCurrency(Number(c.main_commission))}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(Number(c.co_lead_commission))}</TableCell>
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
