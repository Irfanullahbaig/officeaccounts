import { formatCurrency, formatDate } from "@/lib/utils/format";

type LoanLabelInput = {
  notes?: string | null;
  loanAmount: number;
  loanDate: Date | string;
};

export function getLoanDisplayName(loan: LoanLabelInput): string {
  const label = loan.notes?.trim();
  if (label) return label;
  const date =
    typeof loan.loanDate === "string" ? loan.loanDate : loan.loanDate.toISOString();
  return `${formatCurrency(loan.loanAmount)} loan (${formatDate(date)})`;
}
