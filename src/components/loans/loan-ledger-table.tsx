"use client";

import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, cnStatusColor } from "@/lib/utils/format";
import { reverseLoanPayment } from "@/lib/actions/loans";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, Undo2, X } from "lucide-react";
import type { LoanTransactionType } from "@prisma/client";

const TYPE_LABELS: Record<LoanTransactionType, string> = {
  loan_created: "Loan Created",
  interest_accrued: "Interest Accrued",
  payment: "Payment",
  payment_reversal: "Payment Reversal",
  adjustment: "Adjustment",
  loan_closed: "Loan Closed",
};

const TYPE_OPTIONS: { value: LoanTransactionType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "loan_created", label: TYPE_LABELS.loan_created },
  { value: "payment", label: TYPE_LABELS.payment },
  { value: "interest_accrued", label: TYPE_LABELS.interest_accrued },
  { value: "payment_reversal", label: TYPE_LABELS.payment_reversal },
  { value: "adjustment", label: TYPE_LABELS.adjustment },
  { value: "loan_closed", label: TYPE_LABELS.loan_closed },
];

interface LedgerEntry {
  id: string;
  transactionDate: Date | string;
  createdAt?: Date | string;
  transactionType: LoanTransactionType;
  amount: number;
  interestPortion: number;
  principalPortion: number;
  remainingPrincipal: number;
  accruedInterestAfter: number;
  remarks: string | null;
  isReversed: boolean;
}

function toTime(value: Date | string | undefined) {
  if (!value) return 0;
  return new Date(value).getTime();
}

function sortEntriesOldToNew(entries: LedgerEntry[]) {
  return [...entries].sort((a, b) => {
    const dateDiff = toTime(a.transactionDate) - toTime(b.transactionDate);
    if (dateDiff !== 0) return dateDiff;
    return toTime(a.createdAt) - toTime(b.createdAt);
  });
}

const defaultFilters = {
  type: "all" as LoanTransactionType | "all",
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
  remarks: "",
  hideReversed: true,
};

export function LoanLedgerTable({
  entries,
  isAdmin,
}: {
  entries: LedgerEntry[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);

  const sortedEntries = useMemo(() => sortEntriesOldToNew(entries), [entries]);

  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((entry) => {
      if (filters.hideReversed && entry.isReversed) return false;

      if (filters.type !== "all" && entry.transactionType !== filters.type) {
        return false;
      }

      const entryDate = new Date(entry.transactionDate);
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        from.setHours(0, 0, 0, 0);
        if (entryDate < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (entryDate > to) return false;
      }

      if (filters.minAmount) {
        const min = Number(filters.minAmount);
        if (!Number.isNaN(min) && entry.amount < min) return false;
      }
      if (filters.maxAmount) {
        const max = Number(filters.maxAmount);
        if (!Number.isNaN(max) && entry.amount > max) return false;
      }

      if (filters.remarks.trim()) {
        const query = filters.remarks.trim().toLowerCase();
        const text = (entry.remarks ?? "").toLowerCase();
        if (!text.includes(query)) return false;
      }

      return true;
    });
  }, [sortedEntries, filters]);

  const hasActiveFilters =
    filters.type !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.minAmount !== "" ||
    filters.maxAmount !== "" ||
    filters.remarks !== "" ||
    !filters.hideReversed;

  async function handleReverse(id: string) {
    if (!confirm("Reverse this payment? Balances will be restored.")) return;
    try {
      await reverseLoanPayment(id);
      toast.success("Payment reversed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reverse");
    }
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No ledger entries yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredEntries.length} of {sortedEntries.length} entries · oldest first
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Advanced Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                Active
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Filter ledger entries</p>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowFilters(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Transaction type</Label>
              <Select
                value={filters.type}
                onValueChange={(v) =>
                  v && setFilters((f) => ({ ...f, type: v as LoanTransactionType | "all" }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date from</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Date to</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Min amount (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={filters.minAmount}
                onChange={(e) => setFilters((f) => ({ ...f, minAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max amount (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Any"
                value={filters.maxAmount}
                onChange={(e) => setFilters((f) => ({ ...f, maxAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Search remarks</Label>
              <Input
                placeholder="e.g. bank deposit, payroll"
                value={filters.remarks}
                onChange={(e) => setFilters((f) => ({ ...f, remarks: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hideReversed}
                  onChange={(e) => setFilters((f) => ({ ...f, hideReversed: e.target.checked }))}
                  className="rounded border-input"
                />
                Hide reversed entries
              </label>
            </div>
          </div>
        </div>
      )}

      {filteredEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
          No entries match your filters.
        </p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Accrued Int.</TableHead>
                <TableHead>Remarks</TableHead>
                {isAdmin && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((e) => (
                <TableRow key={e.id} className={e.isReversed ? "opacity-50" : ""}>
                  <TableCell>{formatDate(String(e.transactionDate))}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cnStatusColor(e.transactionType === "payment" ? "paid" : "pending")}>
                      {TYPE_LABELS[e.transactionType]}
                    </Badge>
                    {e.isReversed && (
                      <span className="text-xs text-muted-foreground ml-1">(reversed)</span>
                    )}
                  </TableCell>
                  <TableCell>{e.amount !== 0 ? formatCurrency(e.amount) : "—"}</TableCell>
                  <TableCell>{e.interestPortion !== 0 ? formatCurrency(e.interestPortion) : "—"}</TableCell>
                  <TableCell>{e.principalPortion !== 0 ? formatCurrency(e.principalPortion) : "—"}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(e.remainingPrincipal)}</TableCell>
                  <TableCell>{formatCurrency(e.accruedInterestAfter)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[220px]">
                    <span className="line-clamp-2" title={e.remarks ?? undefined}>
                      {e.remarks ?? "—"}
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {e.transactionType === "payment" && !e.isReversed && (
                        <Button variant="ghost" size="icon" onClick={() => handleReverse(e.id)} title="Reverse payment">
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
