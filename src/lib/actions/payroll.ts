"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole, getCurrentUser, createAuditLog } from "@/lib/auth/session";
import { calculatePayrollFinalSalary } from "@/lib/loans/calculator";
import { recordLoanPayment } from "@/lib/actions/loans";
import {
  accrueInterestForPeriod,
  calculatePayoffAmount,
  initialAccrualDate,
  startOfDayUTC,
} from "@/lib/loans/ledger";

export interface LoanDeductionPreview {
  loanId: string;
  label: string;
  remainingPrincipal: number;
  accruedInterest: number;
  maxPayoff: number;
  monthlyInstallment: number | null;
  suggestedAmount: number;
}

export interface PayrollDeductionPreview {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  loans: LoanDeductionPreview[];
  savings: {
    hasAccount: boolean;
    isActive: boolean;
    savingsType: string | null;
    suggestedAmount: number;
    currentBalance: number;
  };
  suggestedLoanTotal: number;
  suggestedSavings: number;
}

export async function getPayrollDeductionPreview(
  employeeId: string
): Promise<PayrollDeductionPreview> {
  await requireRole(["super_admin", "finance_manager"]);

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("Employee not found");

  const today = startOfDayUTC(new Date());
  const activeLoans = await prisma.loan.findMany({
    where: { employeeId, status: "active" },
    orderBy: { createdAt: "asc" },
  });

  const loans: LoanDeductionPreview[] = activeLoans.map((loan) => {
    const lastAccrual = loan.lastAccrualDate ?? initialAccrualDate(loan.loanDate);
    const { accruedAmount } = accrueInterestForPeriod({
      principal: loan.remainingPrincipal,
      annualRatePercent: loan.interestRate,
      lastAccrualDate: lastAccrual,
      asOfDate: today,
    });
    const accruedInterest = loan.accruedInterest + accruedAmount;
    const maxPayoff = calculatePayoffAmount({
      remainingPrincipal: loan.remainingPrincipal,
      accruedInterest,
      totalInterestPaid: loan.totalInterestPaid,
      totalPrincipalPaid: loan.totalPrincipalPaid,
      lastAccrualDate: lastAccrual,
    });
    const suggestedAmount = loan.monthlyInstallment
      ? Math.min(loan.monthlyInstallment, maxPayoff)
      : 0;

    return {
      loanId: loan.id,
      label: `Loan — ${formatCurrencyShort(loan.loanAmount)} @ ${loan.interestRate}%`,
      remainingPrincipal: loan.remainingPrincipal,
      accruedInterest,
      maxPayoff,
      monthlyInstallment: loan.monthlyInstallment,
      suggestedAmount,
    };
  });

  const savingsAccount = await prisma.savingsAccount.findUnique({
    where: { employeeId },
  });

  let suggestedSavings = 0;
  if (savingsAccount?.isActive) {
    if (savingsAccount.savingsType === "fixed") {
      suggestedSavings = savingsAccount.fixedAmount;
    } else if (savingsAccount.savingsType === "percentage") {
      suggestedSavings = employee.baseSalary * (savingsAccount.percentageRate / 100);
    }
  }

  const suggestedLoanTotal = loans.reduce((s, l) => s + l.suggestedAmount, 0);

  return {
    employeeId,
    employeeName: employee.fullName,
    baseSalary: employee.baseSalary,
    loans,
    savings: {
      hasAccount: !!savingsAccount,
      isActive: savingsAccount?.isActive ?? false,
      savingsType: savingsAccount?.savingsType ?? null,
      suggestedAmount: Math.round(suggestedSavings * 100) / 100,
      currentBalance: savingsAccount?.currentBalance ?? 0,
    },
    suggestedLoanTotal,
    suggestedSavings: Math.round(suggestedSavings * 100) / 100,
  };
}

function formatCurrencyShort(n: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

export async function generatePayroll(data: {
  employee_id: string;
  period_month: number;
  period_year: number;
  deduct_loan?: boolean;
  deduct_savings?: boolean;
  loan_recovery?: number;
  loan_allocations?: { loanId: string; amount: number }[];
  savings_contribution?: number;
  bonuses?: number;
  deductions?: number;
}) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  const employee = await prisma.employee.findUnique({
    where: { id: data.employee_id },
  });
  if (!employee) throw new Error("Employee not found");

  const existing = await prisma.payroll.findUnique({
    where: {
      employeeId_periodMonth_periodYear: {
        employeeId: data.employee_id,
        periodMonth: data.period_month,
        periodYear: data.period_year,
      },
    },
  });
  if (existing) throw new Error("Payroll already exists for this period");

  const preview = await getPayrollDeductionPreview(data.employee_id);

  let loanRecovery = 0;
  let loanAllocations: { loanId: string; amount: number }[] = [];

  if (data.deduct_loan) {
    if (data.loan_allocations?.length) {
      loanAllocations = data.loan_allocations.filter((a) => a.amount > 0);
      loanRecovery = loanAllocations.reduce((s, a) => s + a.amount, 0);
    }
  }

  let savingsContribution = 0;
  if (data.deduct_savings && preview.savings.isActive) {
    savingsContribution = data.savings_contribution ?? preview.savings.suggestedAmount;
  }

  const bonuses = data.bonuses ?? 0;
  const deductions = data.deductions ?? 0;

  const finalSalary = calculatePayrollFinalSalary({
    baseSalary: employee.baseSalary,
    bonuses,
    deductions,
    loanRecovery,
    savingsContribution,
  });

  const payroll = await prisma.payroll.create({
    data: {
      employeeId: data.employee_id,
      periodMonth: data.period_month,
      periodYear: data.period_year,
      baseSalary: employee.baseSalary,
      bonuses,
      deductions,
      loanRecovery,
      savingsContribution,
      finalSalary,
      status: "pending",
      createdByEmail: user?.email,
      items: {
        create: [
          ...loanAllocations.map((a) => {
            const loan = preview.loans.find((l) => l.loanId === a.loanId);
            return {
              itemType: "loan_recovery",
              description: loan?.label ?? "Loan recovery",
              amount: a.amount,
              isAddition: false,
              referenceId: a.loanId,
              referenceType: "loan",
            };
          }),
          ...(savingsContribution > 0
            ? [
                {
                  itemType: "savings_contribution",
                  description: `Savings (${preview.savings.savingsType})`,
                  amount: savingsContribution,
                  isAddition: false,
                  referenceType: "savings",
                },
              ]
            : []),
        ],
      },
    },
  });

  await createAuditLog({
    userEmail: user?.email,
    action: "PAYROLL_GENERATE",
    entityType: "payroll",
    entityId: payroll.id,
    newValue: {
      employeeId: data.employee_id,
      loanRecovery,
      savingsContribution,
      finalSalary,
    },
  });

  revalidatePath("/payroll");
  return { success: true, payrollId: payroll.id };
}


export async function markPayrollAsPaid(payrollId: string) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      items: true,
      employee: true,
    },
  });

  if (!payroll) throw new Error("Payroll not found");
  if (payroll.status === "paid") throw new Error("Payroll already marked as paid");
  if (payroll.status === "cancelled") throw new Error("Payroll is cancelled");

  const paymentDate = new Date(
    payroll.periodYear,
    payroll.periodMonth,
    0
  ).toISOString().split("T")[0];

  const loanItems = payroll.items.filter(
    (i) => i.itemType === "loan_recovery" && i.referenceId
  );

  for (const item of loanItems) {
    if (item.amount <= 0) continue;
    await recordLoanPayment({
      loanId: item.referenceId!,
      amount: item.amount,
      paymentDate,
      remarks: `Payroll deduction — ${getMonthName(payroll.periodMonth)} ${payroll.periodYear}`,
      payrollId: payroll.id,
      paymentSource: "payroll_deduction",
    });
  }

  if (loanItems.length === 0 && payroll.loanRecovery > 0) {
    const activeLoans = await prisma.loan.findMany({
      where: { employeeId: payroll.employeeId, status: "active" },
      orderBy: { createdAt: "asc" },
    });
    let remaining = payroll.loanRecovery;
    for (const loan of activeLoans) {
      if (remaining <= 0) break;
      const amount = Math.min(remaining, loan.monthlyInstallment ?? remaining);
      if (amount > 0) {
        await recordLoanPayment({
          loanId: loan.id,
          amount,
          paymentDate,
          remarks: `Payroll deduction — ${getMonthName(payroll.periodMonth)} ${payroll.periodYear}`,
          payrollId: payroll.id,
          paymentSource: "payroll_deduction",
        });
        remaining -= amount;
      }
    }
  }

  if (payroll.savingsContribution > 0) {
    let account = await prisma.savingsAccount.findUnique({
      where: { employeeId: payroll.employeeId },
    });

    if (!account) {
      account = await prisma.savingsAccount.create({
        data: {
          employeeId: payroll.employeeId,
          savingsType: "fixed",
          fixedAmount: payroll.savingsContribution,
          currentBalance: 0,
          isActive: true,
        },
      });
    }

    const newBalance = account.currentBalance + payroll.savingsContribution;
    await prisma.$transaction([
      prisma.savingsAccount.update({
        where: { id: account.id },
        data: { currentBalance: newBalance },
      }),
      prisma.savingsTransaction.create({
        data: {
          savingsAccountId: account.id,
          employeeId: payroll.employeeId,
          transactionType: "payroll_deduction",
          amount: payroll.savingsContribution,
          balanceAfter: newBalance,
          transactionDate: new Date(paymentDate),
          notes: `Payroll — ${getMonthName(payroll.periodMonth)} ${payroll.periodYear}`,
          createdByEmail: user?.email,
        },
      }),
    ]);
  }

  await prisma.payroll.update({
    where: { id: payrollId },
    data: { status: "paid", paidAt: new Date() },
  });

  await createAuditLog({
    userEmail: user?.email,
    action: "PAYROLL_PAID",
    entityType: "payroll",
    entityId: payrollId,
    newValue: {
      loanRecovery: payroll.loanRecovery,
      savingsContribution: payroll.savingsContribution,
      finalSalary: payroll.finalSalary,
    },
  });

  revalidatePath("/payroll");
  revalidatePath("/loans");
  revalidatePath("/savings");
  return { success: true };
}

function getMonthName(month: number): string {
  return new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(2024, month - 1, 1)
  );
}
