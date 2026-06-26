"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser, createAuditLog } from "@/lib/auth/session";
import {
  accrueInterestForPeriod,
  allocatePayment,
  calculatePayoffAmount,
  initialAccrualDate,
  startOfDayUTC,
} from "@/lib/loans/ledger";
import type { InterestType } from "@/types/database";
import type { LoanTransactionType } from "@prisma/client";

async function getLoanOrThrow(loanId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { employee: true },
  });
  if (!loan) throw new Error("Loan not found");
  return loan;
}

async function accrueToDate(
  loanId: string,
  asOfDate: Date,
  userEmail?: string | null,
  remarks?: string
) {
  const loan = await getLoanOrThrow(loanId);
  if (loan.status !== "active") return loan;

  const lastAccrual = loan.lastAccrualDate ?? initialAccrualDate(loan.loanDate);
  const { accruedAmount, daysAccrued, newLastAccrualDate } = accrueInterestForPeriod({
    principal: loan.remainingPrincipal,
    annualRatePercent: loan.interestRate,
    lastAccrualDate: lastAccrual,
    asOfDate: startOfDayUTC(asOfDate),
  });

  if (accruedAmount <= 0) return loan;

  const newAccrued = loan.accruedInterest + accruedAmount;

  await prisma.$transaction([
    prisma.loan.update({
      where: { id: loanId },
      data: {
        accruedInterest: newAccrued,
        lastAccrualDate: newLastAccrualDate,
      },
    }),
    prisma.loanLedgerEntry.create({
      data: {
        loanId,
        transactionDate: startOfDayUTC(asOfDate),
        transactionType: "interest_accrued",
        amount: accruedAmount,
        interestPortion: accruedAmount,
        principalPortion: 0,
        remainingPrincipal: loan.remainingPrincipal,
        accruedInterestAfter: newAccrued,
        remarks:
          remarks ??
          `Daily interest accrued (${daysAccrued} day${daysAccrued !== 1 ? "s" : ""} @ ${loan.interestRate}% p.a.)`,
        createdByEmail: userEmail,
      },
    }),
  ]);

  return getLoanOrThrow(loanId);
}

const PRINCIPAL_TOLERANCE = 0.01;

function isPrincipalCleared(principal: number) {
  return principal <= PRINCIPAL_TOLERANCE;
}

/** When principal is fully repaid, clear any leftover accrued interest and close the loan. */
async function finalizeLoanWhenPrincipalCleared(
  loanId: string,
  userEmail?: string | null,
  asOfDate: Date = new Date(),
  waivedInterestOverride?: number
) {
  const loan = await getLoanOrThrow(loanId);
  if (loan.status !== "active" && loan.status !== "paid") return loan;
  if (!isPrincipalCleared(loan.remainingPrincipal)) return loan;

  const waivedInterest = round2(
    waivedInterestOverride !== undefined ? waivedInterestOverride : loan.accruedInterest
  );
  if (waivedInterest <= PRINCIPAL_TOLERANCE && loan.status === "paid") {
    return loan;
  }
  const settlementDate = startOfDayUTC(asOfDate);
  const ledgerWrites = [];

  if (waivedInterest > PRINCIPAL_TOLERANCE) {
    ledgerWrites.push(
      prisma.loanLedgerEntry.create({
        data: {
          loanId,
          transactionDate: settlementDate,
          transactionType: "adjustment",
          amount: 0,
          interestPortion: 0,
          principalPortion: 0,
          remainingPrincipal: 0,
          accruedInterestAfter: 0,
          remarks: `Accrued interest cleared — principal fully repaid (Rs ${waivedInterest.toLocaleString()} waived)`,
          createdByEmail: userEmail,
        },
      })
    );
  }

  ledgerWrites.push(
    prisma.loanLedgerEntry.create({
      data: {
        loanId,
        transactionDate: settlementDate,
        transactionType: "loan_closed",
        amount: 0,
        remainingPrincipal: 0,
        accruedInterestAfter: 0,
        remarks:
          waivedInterest > PRINCIPAL_TOLERANCE
            ? "Loan closed — principal settled, remaining accrued interest waived"
            : "Loan fully settled",
        createdByEmail: userEmail,
      },
    })
  );

  await prisma.$transaction([
    prisma.loan.update({
      where: { id: loanId },
      data: {
        remainingPrincipal: 0,
        accruedInterest: 0,
        status: "paid",
        closedAt: loan.closedAt ?? settlementDate,
      },
    }),
    ...ledgerWrites,
  ]);

  const outstandingLoans = await prisma.loan.aggregate({
    where: { employeeId: loan.employeeId, status: "active" },
    _sum: { remainingPrincipal: true, accruedInterest: true },
  });
  await prisma.employee.update({
    where: { id: loan.employeeId },
    data: {
      currentLoanBalance: round2(
        (outstandingLoans._sum.remainingPrincipal ?? 0) +
          (outstandingLoans._sum.accruedInterest ?? 0)
      ),
    },
  });

  return getLoanOrThrow(loanId);
}

export async function getLoanDetail(loanId: string) {
  await requireRole(["super_admin", "admin", "finance_manager", "director"]);

  let loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      employee: true,
      ledgerEntries: { orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!loan) throw new Error("Loan not found");

  if (loan.status === "active" && isPrincipalCleared(loan.remainingPrincipal)) {
    await finalizeLoanWhenPrincipalCleared(loanId);
    loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        employee: true,
        ledgerEntries: { orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!loan) throw new Error("Loan not found");
  }

  let displayAccrued = 0;
  if (loan.status === "active" && !isPrincipalCleared(loan.remainingPrincipal)) {
    displayAccrued = loan.accruedInterest;
    const lastAccrual = loan.lastAccrualDate ?? initialAccrualDate(loan.loanDate);
    const { accruedAmount } = accrueInterestForPeriod({
      principal: loan.remainingPrincipal,
      annualRatePercent: loan.interestRate,
      lastAccrualDate: lastAccrual,
      asOfDate: startOfDayUTC(new Date()),
    });
    displayAccrued = loan.accruedInterest + accruedAmount;
  }

  const totalPaid = loan.totalPrincipalPaid + loan.totalInterestPaid;

  return {
    loan,
    summary: {
      originalAmount: loan.loanAmount,
      outstandingPrincipal: loan.remainingPrincipal,
      accruedInterest: displayAccrued,
      totalPaid,
      payoffAmount: isPrincipalCleared(loan.remainingPrincipal)
        ? 0
        : round2(loan.remainingPrincipal + displayAccrued),
      status: loan.status,
      closedAt: loan.closedAt,
    },
  };
}

export async function getPayoffQuote(loanId: string) {
  await requireRole(["super_admin", "finance_manager"]);
  let loan = await getLoanOrThrow(loanId);
  if (loan.status !== "active") {
    return { principal: 0, accruedInterest: 0, total: 0 };
  }

  loan = await accrueToDate(loanId, new Date());
  return {
    principal: loan.remainingPrincipal,
    accruedInterest: loan.accruedInterest,
    total: calculatePayoffAmount({
      remainingPrincipal: loan.remainingPrincipal,
      accruedInterest: loan.accruedInterest,
      totalInterestPaid: loan.totalInterestPaid,
      totalPrincipalPaid: loan.totalPrincipalPaid,
      lastAccrualDate: loan.lastAccrualDate ?? initialAccrualDate(loan.loanDate),
    }),
  };
}

export async function recordLoanPayment(data: {
  loanId: string;
  amount: number;
  paymentDate: string;
  remarks?: string;
  payrollId?: string;
  paymentSource?: "manual" | "payroll_deduction" | "bank_transfer";
}) {
  await requireRole(["super_admin", "admin", "finance_manager"]);
  const user = await getCurrentUser();
  const paymentDate = startOfDayUTC(new Date(data.paymentDate));

  if (data.amount <= 0) throw new Error("Payment amount must be greater than zero");

  let loan = await getLoanOrThrow(data.loanId);
  if (loan.status !== "active") throw new Error("Loan is not active");

  loan = await accrueToDate(data.loanId, paymentDate, user?.email);

  const allocation = allocatePayment(
    { remainingPrincipal: loan.remainingPrincipal, accruedInterest: loan.accruedInterest },
    data.amount
  );

  const newPrincipal = allocation.newPrincipal;
  const newAccrued = allocation.newAccruedInterest;
  const principalSettled = isPrincipalCleared(newPrincipal);
  const waivedOnSettlement =
    principalSettled && newAccrued > PRINCIPAL_TOLERANCE ? round2(newAccrued) : 0;

  await prisma.$transaction([
    prisma.loan.update({
      where: { id: data.loanId },
      data: {
        remainingPrincipal: principalSettled ? 0 : newPrincipal,
        accruedInterest: principalSettled ? 0 : newAccrued,
        totalInterestPaid: { increment: allocation.interestPaid },
        totalPrincipalPaid: { increment: allocation.principalPaid },
        status: principalSettled ? "paid" : "active",
        closedAt: principalSettled ? paymentDate : null,
      },
    }),
    prisma.loanLedgerEntry.create({
      data: {
        loanId: data.loanId,
        transactionDate: paymentDate,
        transactionType: "payment",
        amount: data.amount,
        interestPortion: allocation.interestPaid,
        principalPortion: allocation.principalPaid,
        remainingPrincipal: principalSettled ? 0 : newPrincipal,
        accruedInterestAfter: principalSettled ? 0 : newAccrued,
        remarks:
          data.remarks ??
          (data.paymentSource === "bank_transfer"
            ? "Bank deposit installment"
            : data.payrollId
              ? "Payroll deduction"
              : "Employee payment"),
        createdByEmail: user?.email,
      },
    }),
    ...(principalSettled && waivedOnSettlement <= PRINCIPAL_TOLERANCE
      ? [
          prisma.loanLedgerEntry.create({
            data: {
              loanId: data.loanId,
              transactionDate: paymentDate,
              transactionType: "loan_closed",
              amount: 0,
              remainingPrincipal: 0,
              accruedInterestAfter: 0,
              remarks: "Loan fully settled",
              createdByEmail: user?.email,
            },
          }),
        ]
      : []),
    prisma.loanRepayment.create({
      data: {
        loanId: data.loanId,
        paymentDate,
        amountPaid: data.amount,
        principalPaid: allocation.principalPaid,
        interestPaid: allocation.interestPaid,
        remainingPrincipal: principalSettled ? 0 : newPrincipal,
        remainingInterest: principalSettled ? 0 : newAccrued,
        paymentSource: data.paymentSource ?? (data.payrollId ? "payroll_deduction" : "manual"),
        payrollId: data.payrollId ?? null,
        notes: data.remarks,
        createdByEmail: user?.email,
      },
    }),
  ]);

  if (principalSettled) {
    if (waivedOnSettlement > PRINCIPAL_TOLERANCE) {
      await finalizeLoanWhenPrincipalCleared(
        data.loanId,
        user?.email,
        paymentDate,
        waivedOnSettlement
      );
    } else {
      const outstandingLoans = await prisma.loan.aggregate({
        where: { employeeId: loan.employeeId, status: "active" },
        _sum: { remainingPrincipal: true, accruedInterest: true },
      });
      await prisma.employee.update({
        where: { id: loan.employeeId },
        data: {
          currentLoanBalance: round2(
            (outstandingLoans._sum.remainingPrincipal ?? 0) +
              (outstandingLoans._sum.accruedInterest ?? 0)
          ),
        },
      });
    }
  }

  await createAuditLog({
    userEmail: user?.email,
    action: "LOAN_PAYMENT",
    entityType: "loan",
    entityId: data.loanId,
    newValue: {
      amount: data.amount,
      interestPaid: allocation.interestPaid,
      principalPaid: allocation.principalPaid,
      remainingPrincipal: principalSettled ? 0 : newPrincipal,
      waivedInterest: waivedOnSettlement,
    },
  });

  revalidatePath(`/loans/${data.loanId}`);
  revalidatePath("/loans");
  return { success: true, closed: principalSettled };
}

export async function closeLoanPayoff(loanId: string, remarks?: string) {
  await requireRole(["super_admin", "finance_manager"]);
  const quote = await getPayoffQuote(loanId);
  if (quote.total <= 0) throw new Error("Loan is already closed");
  return recordLoanPayment({
    loanId,
    amount: quote.total,
    paymentDate: new Date().toISOString().split("T")[0],
    remarks: remarks ?? "Full loan payoff — early closure",
  });
}

export async function reverseLoanPayment(ledgerEntryId: string) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  const entry = await prisma.loanLedgerEntry.findUnique({
    where: { id: ledgerEntryId },
    include: { loan: true },
  });

  if (!entry || entry.isReversed) throw new Error("Entry not found or already reversed");
  if (entry.transactionType !== "payment") {
    throw new Error("Only payment entries can be reversed");
  }

  const loan = entry.loan;
  if (loan.status === "paid") {
    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: "active", closedAt: null },
    });
  }

  const restoredPrincipal = entry.remainingPrincipal + entry.principalPortion;
  const restoredAccrued = entry.accruedInterestAfter + entry.interestPortion;

  await prisma.$transaction([
    prisma.loanLedgerEntry.update({
      where: { id: ledgerEntryId },
      data: { isReversed: true },
    }),
    prisma.loan.update({
      where: { id: loan.id },
      data: {
        remainingPrincipal: restoredPrincipal,
        accruedInterest: restoredAccrued,
        totalInterestPaid: { decrement: entry.interestPortion },
        totalPrincipalPaid: { decrement: entry.principalPortion },
        status: "active",
        closedAt: null,
      },
    }),
    prisma.loanLedgerEntry.create({
      data: {
        loanId: loan.id,
        transactionDate: new Date(),
        transactionType: "payment_reversal",
        amount: -entry.amount,
        interestPortion: -entry.interestPortion,
        principalPortion: -entry.principalPortion,
        remainingPrincipal: restoredPrincipal,
        accruedInterestAfter: restoredAccrued,
        remarks: `Reversal of payment on ${entry.transactionDate.toISOString().split("T")[0]}`,
        reversalOfId: entry.id,
        createdByEmail: user?.email,
      },
    }),
  ]);

  await createAuditLog({
    userEmail: user?.email,
    action: "LOAN_PAYMENT_REVERSAL",
    entityType: "loan",
    entityId: loan.id,
    oldValue: { entryId: ledgerEntryId, amount: entry.amount },
  });

  revalidatePath(`/loans/${loan.id}`);
  revalidatePath("/loans");
  return { success: true };
}

export async function updateLoan(
  loanId: string,
  data: {
    loan_amount?: number;
    loan_date?: string;
    interest_rate?: number;
    interest_type?: InterestType;
    monthly_installment?: number | null;
    duration_months?: number | null;
    notes?: string;
  }
) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();
  const existing = await getLoanOrThrow(loanId);

  const hasPayments = existing.totalPrincipalPaid > 0 || existing.totalInterestPaid > 0;
  if (hasPayments && (data.loan_amount !== undefined || data.loan_date !== undefined)) {
    throw new Error("Cannot change loan amount or date after payments have been recorded");
  }

  const loanAmount = data.loan_amount ?? existing.loanAmount;
  const loanDate = data.loan_date ? startOfDayUTC(new Date(data.loan_date)) : existing.loanDate;

  const updated = await prisma.loan.update({
    where: { id: loanId },
    data: {
      loanAmount,
      loanDate,
      interestRate: data.interest_rate ?? existing.interestRate,
      interestType: data.interest_type ?? existing.interestType,
      monthlyInstallment: data.monthly_installment,
      durationMonths: data.duration_months,
      notes: data.notes ?? existing.notes,
      remainingPrincipal: hasPayments ? existing.remainingPrincipal : loanAmount,
      repaymentMethod: data.monthly_installment ? "payroll_deduction" : "manual",
      lastAccrualDate: hasPayments ? existing.lastAccrualDate : initialAccrualDate(loanDate),
    },
  });

  if (!hasPayments && (data.loan_amount !== undefined || data.loan_date !== undefined)) {
    await prisma.loanLedgerEntry.deleteMany({
      where: { loanId, transactionType: "loan_created" },
    });
    await prisma.loanLedgerEntry.create({
      data: {
        loanId,
        transactionDate: loanDate,
        transactionType: "loan_created",
        amount: loanAmount,
        principalPortion: loanAmount,
        remainingPrincipal: loanAmount,
        accruedInterestAfter: 0,
        remarks: "Loan disbursed (updated)",
        createdByEmail: user?.email,
      },
    });
  }

  await createAuditLog({
    userEmail: user?.email,
    action: "LOAN_UPDATE",
    entityType: "loan",
    entityId: loanId,
    oldValue: {
      loanAmount: existing.loanAmount,
      interestRate: existing.interestRate,
      monthlyInstallment: existing.monthlyInstallment,
    },
    newValue: {
      loanAmount: updated.loanAmount,
      interestRate: updated.interestRate,
      monthlyInstallment: updated.monthlyInstallment,
    },
  });

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/loans");
  return { success: true };
}

export async function deleteLoan(loanId: string) {
  await requireRole(["super_admin", "admin", "finance_manager"]);
  const user = await getCurrentUser();
  const loan = await getLoanOrThrow(loanId);

  await prisma.$transaction([
    prisma.loanPayment.deleteMany({ where: { loanId } }),
    prisma.loanInterestEntry.deleteMany({ where: { loanId } }),
    prisma.loanLedgerEntry.deleteMany({ where: { loanId } }),
    prisma.loanRepayment.deleteMany({ where: { loanId } }),
    prisma.loan.delete({ where: { id: loanId } }),
  ]);

  const outstandingLoans = await prisma.loan.aggregate({
    where: { employeeId: loan.employeeId, status: "active" },
    _sum: { remainingPrincipal: true, accruedInterest: true },
  });
  await prisma.employee.update({
    where: { id: loan.employeeId },
    data: {
      currentLoanBalance: round2(
        (outstandingLoans._sum.remainingPrincipal ?? 0) +
          (outstandingLoans._sum.accruedInterest ?? 0)
      ),
    },
  });

  await createAuditLog({
    userEmail: user?.email,
    action: "LOAN_DELETE",
    entityType: "loan",
    entityId: loanId,
    oldValue: {
      loanAmount: loan.loanAmount,
      employeeId: loan.employeeId,
      status: loan.status,
      totalPrincipalPaid: loan.totalPrincipalPaid,
      totalInterestPaid: loan.totalInterestPaid,
    },
  });

  revalidatePath("/loans");
  revalidatePath("/employees");
  return { success: true };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function createLoanWithLedger(data: {
  employee_id: string;
  loan_amount: number;
  interest_rate: number;
  interest_type: InterestType;
  loan_date: string;
  duration_months?: number;
  monthly_installment?: number;
  notes?: string;
}) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();
  const loanDate = startOfDayUTC(new Date(data.loan_date));

  const loan = await prisma.loan.create({
    data: {
      employeeId: data.employee_id,
      loanAmount: data.loan_amount,
      interestRate: data.interest_rate,
      interestType: data.interest_type,
      loanDate,
      durationMonths: data.duration_months ?? null,
      monthlyInstallment: data.monthly_installment ?? null,
      remainingPrincipal: data.loan_amount,
      accruedInterest: 0,
      lastAccrualDate: initialAccrualDate(loanDate),
      notes: data.notes,
      status: "active",
      repaymentMethod: data.monthly_installment ? "payroll_deduction" : "manual",
      createdByEmail: user?.email,
    },
  });

  await prisma.loanLedgerEntry.create({
    data: {
      loanId: loan.id,
      transactionDate: loanDate,
      transactionType: "loan_created",
      amount: data.loan_amount,
      principalPortion: data.loan_amount,
      remainingPrincipal: data.loan_amount,
      accruedInterestAfter: 0,
      remarks: "Loan disbursed",
      createdByEmail: user?.email,
    },
  });

  await createAuditLog({
    userEmail: user?.email,
    action: "LOAN_CREATE",
    entityType: "loan",
    entityId: loan.id,
    newValue: { amount: data.loan_amount, employeeId: data.employee_id },
  });

  revalidatePath("/loans");
  return { success: true, loanId: loan.id };
}

export async function getLoanStatementData(loanId: string) {
  await requireRole(["super_admin", "finance_manager"]);
  const { loan, summary } = await getLoanDetail(loanId);
  const rows = loan.ledgerEntries
    .filter((e) => !e.isReversed)
    .map((e) => ({
      Date: e.transactionDate.toISOString().split("T")[0],
      Type: e.transactionType.replace(/_/g, " "),
      Amount: e.amount,
      "Interest Portion": e.interestPortion,
      "Principal Portion": e.principalPortion,
      "Remaining Balance": e.remainingPrincipal,
      Remarks: e.remarks ?? "",
    }));
  return { loan, summary, rows };
}
