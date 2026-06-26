"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LoansTable } from "@/components/loans/loans-table";
import { EmptyState } from "@/components/shared/empty-state";
import { AddLoanDialog } from "@/components/loans/add-loan-dialog";
import type { Loan } from "@/types/database";

interface LoanWithEmployee extends Omit<Loan, "employees"> {
  employees: { full_name: string; employee_code: string } | null;
}

const PRINCIPAL_TOLERANCE = 0.01;

type LoanTab = "all" | "active" | "pending" | "completed" | "defaulted" | "cancelled";

const TAB_CONFIG: {
  value: LoanTab;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
  filter: (loan: LoanWithEmployee) => boolean;
}[] = [
  {
    value: "all",
    label: "All Loans",
    emptyTitle: "No loans recorded",
    emptyDescription: "Create employee loans with diminishing balance interest.",
    filter: () => true,
  },
  {
    value: "active",
    label: "Active",
    emptyTitle: "No active loans",
    emptyDescription: "Active loans currently accruing interest will appear here.",
    filter: (loan) => loan.status === "active",
  },
  {
    value: "pending",
    label: "Pending",
    emptyTitle: "No pending repayments",
    emptyDescription: "Loans with outstanding principal awaiting repayment appear here.",
    filter: (loan) =>
      loan.status === "active" && Number(loan.remaining_principal) > PRINCIPAL_TOLERANCE,
  },
  {
    value: "completed",
    label: "Completed",
    emptyTitle: "No completed loans",
    emptyDescription: "Fully settled loans will appear here.",
    filter: (loan) => loan.status === "paid",
  },
  {
    value: "defaulted",
    label: "Defaulted",
    emptyTitle: "No defaulted loans",
    emptyDescription: "Loans marked as defaulted will appear here.",
    filter: (loan) => loan.status === "defaulted",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    emptyTitle: "No cancelled loans",
    emptyDescription: "Cancelled loans will appear here.",
    filter: (loan) => loan.status === "cancelled",
  },
];

function isValidTab(value: string | null): value is LoanTab {
  return TAB_CONFIG.some((tab) => tab.value === value);
}

export function LoansTabs({
  loans,
  defaultTab = "all",
  readOnly = false,
  detailBasePath = "/loans",
}: {
  loans: LoanWithEmployee[];
  defaultTab?: string;
  readOnly?: boolean;
  detailBasePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = isValidTab(searchParams.get("tab"))
    ? searchParams.get("tab")!
    : isValidTab(defaultTab)
      ? defaultTab
      : "all";

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const query = params.toString();
    router.push(query ? `/loans?${query}` : "/loans", { scroll: false });
  }

  const counts = Object.fromEntries(
    TAB_CONFIG.map((tab) => [tab.value, loans.filter(tab.filter).length])
  ) as Record<LoanTab, number>;

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
        {TAB_CONFIG.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-2 px-3 py-1.5">
            {tab.label}
            <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-xs">
              {counts[tab.value]}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {TAB_CONFIG.map((tab) => {
        const filtered = loans.filter(tab.filter);
        return (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {filtered.length ? (
              <LoansTable loans={filtered} readOnly={readOnly} detailBasePath={detailBasePath} />
            ) : (
              <EmptyState
                title={tab.emptyTitle}
                description={tab.emptyDescription}
                action={!readOnly && tab.value === "all" ? <AddLoanDialog /> : undefined}
              />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
