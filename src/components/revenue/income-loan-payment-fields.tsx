"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEmployeeActiveLoans } from "@/lib/actions/finance";
import { formatCurrency } from "@/lib/utils/format";
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";

type ActiveLoan = {
  id: string;
  label: string;
  remainingBalance: number;
  loanDate: string;
};

type LoanFormFields = {
  employee_id: string;
  loan_payment: number;
  target_loan_id?: string;
};

export function IncomeLoanPaymentFields<T extends LoanFormFields>({
  employeeId,
  loanPayment,
  targetLoanId,
  register,
  setValue,
}: {
  employeeId?: string;
  loanPayment: number;
  targetLoanId?: string;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
}) {
  const [loans, setLoans] = useState<ActiveLoan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);

  useEffect(() => {
    if (!employeeId) {
      setLoans([]);
      setValue("target_loan_id" as never, undefined as never);
      return;
    }

    setLoadingLoans(true);
    getEmployeeActiveLoans(employeeId)
      .then((rows) => {
        setLoans(rows);
        if (rows.length === 1) {
          setValue("target_loan_id" as never, rows[0].id as never);
        } else if (targetLoanId && !rows.some((row) => row.id === targetLoanId)) {
          setValue("target_loan_id" as never, undefined as never);
        }
      })
      .catch(() => setLoans([]))
      .finally(() => setLoadingLoans(false));
  }, [employeeId, setValue]);

  const showLoanSelect = loans.length > 1 && loanPayment > 0;

  return (
    <>
      <div className="space-y-2">
        <Label>Loan Payment</Label>
        <Input type="number" {...register("loan_payment" as never, { valueAsNumber: true })} />
        <p className="text-xs text-muted-foreground">
          Interest is paid first, then principal. Excess rolls to the employee&apos;s next active loan
          in date order, then any remainder is deposited to savings.
        </p>
      </div>
      {showLoanSelect && (
        <div className="space-y-2">
          <Label>Repay Loan</Label>
          <Select
            value={targetLoanId ?? ""}
            onValueChange={(value) =>
              setValue("target_loan_id" as never, (value || undefined) as never)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingLoans ? "Loading loans..." : "Select loan"} />
            </SelectTrigger>
            <SelectContent>
              {loans.map((loan) => (
                <SelectItem key={loan.id} value={loan.id}>
                  {loan.label} — {formatCurrency(loan.remainingBalance)} outstanding
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Required when the employee has multiple active loans.
          </p>
        </div>
      )}
    </>
  );
}
