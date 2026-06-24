"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireRole, createAuditLog, getCurrentUser } from "@/lib/auth/session";
import {
  accrueInterestForPeriod,
  allocatePayment,
  initialAccrualDate,
  startOfDayUTC,
} from "@/lib/loans/ledger";
import type {
  UserRole,
  ExpenseCategory,
} from "@/types/database";

const COMPANY_SHARE_PERCENT = 30;
const FREELANCER_SHARE_PERCENT = 70;

export async function createEmployee(data: {
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  joining_date: string;
  base_salary: number;
  role: UserRole;
}) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  const employee = await prisma.employee.create({
    data: {
      employeeCode: data.employee_code,
      fullName: data.full_name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      department: data.department,
      designation: data.designation,
      joiningDate: new Date(data.joining_date),
      baseSalary: data.base_salary,
      role: data.role,
      status: "active",
    },
  });

  await createAuditLog({
    userEmail: user?.email,
    action: "CREATE",
    entityType: "employee",
    entityId: employee.id,
    newValue: { employeeCode: employee.employeeCode, email: employee.email },
  });

  revalidatePath("/employees");
  return { success: true };
}


export async function createRevenue(data: {
  client_name: string;
  project_name?: string;
  amount: number;
  revenue_date: string;
  payment_method: string;
  invoice_number?: string;
  notes?: string;
}) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  await prisma.revenue.create({
    data: {
      clientName: data.client_name,
      projectName: data.project_name,
      amount: data.amount,
      revenueDate: new Date(data.revenue_date),
      paymentMethod: data.payment_method as "bank_transfer",
      invoiceNumber: data.invoice_number,
      notes: data.notes,
      createdByEmail: user?.email,
    },
  });

  revalidatePath("/revenue");
  revalidatePath("/dashboard");
  return { success: true };
}

type CommissionInput = {
  employee_id: string;
  percent: number;
};

export async function createIncomeEntry(data: {
  employee_id: string;
  project_name: string;
  client_name: string;
  project_type: string;
  project_value: number;
  payment_received_date: string;
  currency: "PKR" | "USD" | "EUR" | "GBP" | "AED";
  savings_contribution?: number;
  loan_payment?: number;
  notes?: string;
  lead_assignments?: CommissionInput[];
  co_lead_assignments?: CommissionInput[];
}) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  const projectValue = round2(data.project_value);
  const savingsContribution = round2(data.savings_contribution ?? 0);
  const requestedLoanPayment = round2(data.loan_payment ?? 0);
  const leadAssignments = normalizeAssignments(data.lead_assignments);
  const coLeadAssignments = normalizeAssignments(data.co_lead_assignments);

  if (projectValue <= 0) throw new Error("Project value must be greater than 0");
  if (savingsContribution < 0 || requestedLoanPayment < 0) {
    throw new Error("Savings and loan payment cannot be negative");
  }

  const companyShare = round2(projectValue * (COMPANY_SHARE_PERCENT / 100));
  const freelancerShare = round2(projectValue * (FREELANCER_SHARE_PERCENT / 100));

  const leadCommissionTotal = round2(
    leadAssignments.reduce((sum, row) => sum + projectValue * (row.percent / 100), 0)
  );
  const coLeadCommissionTotal = round2(
    coLeadAssignments.reduce((sum, row) => sum + projectValue * (row.percent / 100), 0)
  );

  const maxDeductions = freelancerShare - leadCommissionTotal - coLeadCommissionTotal;
  if (maxDeductions < 0) {
    throw new Error("Lead/Co-Lead commissions exceed freelancer share");
  }
  if (savingsContribution + requestedLoanPayment > maxDeductions) {
    throw new Error("Savings + loan payment exceed available freelancer share");
  }

  const netPayout = round2(
    freelancerShare -
      savingsContribution -
      requestedLoanPayment -
      leadCommissionTotal -
      coLeadCommissionTotal
  );

  const result = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: data.employee_id } });
    if (!employee) throw new Error("Employee not found");

    const project = await tx.project.upsert({
      where: {
        id: `${employee.id}:${data.project_name}:${data.client_name}`,
      },
      update: {
        totalValue: { increment: projectValue },
        totalReceived: { increment: projectValue },
        projectType: data.project_type,
        currency: data.currency,
      },
      create: {
        id: `${employee.id}:${data.project_name}:${data.client_name}`,
        employeeId: employee.id,
        name: data.project_name,
        clientName: data.client_name,
        projectType: data.project_type,
        currency: data.currency,
        totalValue: projectValue,
        totalReceived: projectValue,
      },
    });

    const incomeEntry = await tx.incomeEntry.create({
      data: {
        employeeId: employee.id,
        projectId: project.id,
        projectName: data.project_name,
        clientName: data.client_name,
        projectType: data.project_type,
        projectValue,
        companyShare: companyShare,
        freelancerShare,
        savingsContribution,
        loanPayment: requestedLoanPayment,
        leadCommissionTotal,
        coLeadCommissionTotal,
        netPayout,
        currency: data.currency,
        paymentReceivedDate: new Date(data.payment_received_date),
        notes: data.notes,
        createdByEmail: user?.email,
      },
    });

    if (leadAssignments.length) {
      await tx.commissionAssignment.createMany({
        data: leadAssignments.map((row) => ({
          incomeEntryId: incomeEntry.id,
          employeeId: row.employee_id,
          role: "lead",
          percent: row.percent,
          amount: round2(projectValue * (row.percent / 100)),
        })),
      });
    }
    if (coLeadAssignments.length) {
      await tx.commissionAssignment.createMany({
        data: coLeadAssignments.map((row) => ({
          incomeEntryId: incomeEntry.id,
          employeeId: row.employee_id,
          role: "co_lead",
          percent: row.percent,
          amount: round2(projectValue * (row.percent / 100)),
        })),
      });
    }

    const leadRows = leadAssignments.map((row) => ({
      leadOwnerId: row.employee_id,
      clientName: data.client_name,
      dealValue: projectValue,
      commissionPercent: row.percent,
      commissionAmount: round2(projectValue * (row.percent / 100)),
      status: "paid" as const,
      paymentDate: new Date(data.payment_received_date),
      notes: `Project ${data.project_name}`,
      createdByEmail: user?.email,
    }));
    if (leadRows.length) await tx.leadCommission.createMany({ data: leadRows });

    const coLeadRows = coLeadAssignments.map((row) => ({
      mainLeadId: undefined,
      coLeadId: row.employee_id,
      clientName: data.client_name,
      dealValue: projectValue,
      splitPercent: row.percent,
      mainCommission: 0,
      coLeadCommission: round2(projectValue * (row.percent / 100)),
      status: "paid" as const,
      paymentDate: new Date(data.payment_received_date),
    }));
    // Co-lead legacy table requires mainLeadId; create against first lead record when available.
    if (coLeadRows.length && leadRows.length) {
      const createdLeadRows = await tx.leadCommission.findMany({
        where: { clientName: data.client_name, createdByEmail: user?.email },
        orderBy: { createdAt: "desc" },
        take: leadRows.length,
      });
      const fallbackLeadId = createdLeadRows[0]?.id;
      if (!fallbackLeadId) {
        throw new Error("Unable to resolve lead commission for co-lead assignment");
      }
      await tx.coLeadCommission.createMany({
        data: coLeadRows.map((row) => ({
          ...row,
          mainLeadId: fallbackLeadId,
        })),
      });
    }

    let loanPaymentApplied = 0;
    if (requestedLoanPayment > 0) {
      const loans = await tx.loan.findMany({
        where: { employeeId: employee.id, status: "active" },
        orderBy: { loanDate: "asc" },
      });
      const paymentDate = startOfDayUTC(new Date(data.payment_received_date));
      let remaining = requestedLoanPayment;

      for (const loan of loans) {
        if (remaining <= 0) break;

        const lastAccrual = loan.lastAccrualDate ?? initialAccrualDate(loan.loanDate);
        const { accruedAmount, daysAccrued, newLastAccrualDate } = accrueInterestForPeriod({
          principal: loan.remainingPrincipal,
          annualRatePercent: loan.interestRate,
          lastAccrualDate: lastAccrual,
          asOfDate: paymentDate,
        });

        let currentPrincipal = loan.remainingPrincipal;
        let currentAccrued = loan.accruedInterest;

        if (accruedAmount > 0) {
          currentAccrued = round2(loan.accruedInterest + accruedAmount);
          await tx.loan.update({
            where: { id: loan.id },
            data: {
              accruedInterest: currentAccrued,
              lastAccrualDate: newLastAccrualDate,
            },
          });
          await tx.loanLedgerEntry.create({
            data: {
              loanId: loan.id,
              transactionDate: paymentDate,
              transactionType: "interest_accrued",
              amount: accruedAmount,
              interestPortion: accruedAmount,
              principalPortion: 0,
              remainingPrincipal: currentPrincipal,
              accruedInterestAfter: currentAccrued,
              remarks: `Daily interest accrued (${daysAccrued} day${daysAccrued !== 1 ? "s" : ""} @ ${loan.interestRate}% p.a.)`,
              createdByEmail: user?.email,
            },
          });
        }

        const maxPayoff = round2(currentPrincipal + currentAccrued);
        const payment = round2(Math.min(maxPayoff, remaining));
        if (payment <= 0) continue;

        const allocation = allocatePayment(
          { remainingPrincipal: currentPrincipal, accruedInterest: currentAccrued },
          payment
        );
        const principalPart = round2(allocation.principalPaid);
        const interestPart = round2(allocation.interestPaid);
        const nextPrincipal = round2(allocation.newPrincipal);
        const nextAccrued = round2(allocation.newAccruedInterest);

        await tx.loan.update({
          where: { id: loan.id },
          data: {
            remainingPrincipal: nextPrincipal,
            accruedInterest: nextAccrued,
            totalPrincipalPaid: { increment: principalPart },
            totalInterestPaid: { increment: interestPart },
            status: nextPrincipal <= 0 && nextAccrued <= 0 ? "paid" : "active",
            closedAt: nextPrincipal <= 0 && nextAccrued <= 0 ? paymentDate : null,
          },
        });
        await tx.loanRepayment.create({
          data: {
            loanId: loan.id,
            paymentDate: new Date(data.payment_received_date),
            amountPaid: payment,
            principalPaid: principalPart,
            interestPaid: interestPart,
            remainingPrincipal: nextPrincipal,
            remainingInterest: nextAccrued,
            paymentSource: "income_entry",
            notes: `From income entry ${incomeEntry.id}`,
            createdByEmail: user?.email,
          },
        });
        await tx.loanPayment.create({
          data: {
            loanId: loan.id,
            employeeId: employee.id,
            incomeEntryId: incomeEntry.id,
            amount: payment,
            paymentDate: new Date(data.payment_received_date),
            notes: `From project ${data.project_name}`,
            createdByEmail: user?.email,
          },
        });
        await tx.loanLedgerEntry.create({
          data: {
            loanId: loan.id,
            transactionDate: new Date(data.payment_received_date),
            transactionType: "payment",
            amount: payment,
            interestPortion: interestPart,
            principalPortion: principalPart,
            remainingPrincipal: nextPrincipal,
            accruedInterestAfter: nextAccrued,
            remarks: `Income entry payment (${data.project_name})`,
            createdByEmail: user?.email,
          },
        });
        remaining = round2(remaining - payment);
        loanPaymentApplied = round2(loanPaymentApplied + payment);
      }
    }

    if (savingsContribution > 0) {
      let account = await tx.savingsAccount.findUnique({
        where: { employeeId: employee.id },
      });
      if (!account) {
        account = await tx.savingsAccount.create({
          data: {
            employeeId: employee.id,
            savingsType: "manual",
            currentBalance: 0,
            isActive: true,
          },
        });
      }
      const balanceAfter = round2(account.currentBalance + savingsContribution);
      await tx.savingsAccount.update({
        where: { id: account.id },
        data: { currentBalance: balanceAfter },
      });
      await tx.savingsTransaction.create({
        data: {
          savingsAccountId: account.id,
          employeeId: employee.id,
          transactionType: "deposit",
          amount: savingsContribution,
          balanceAfter,
          notes: `Income entry ${incomeEntry.id}`,
          transactionDate: new Date(data.payment_received_date),
          createdByEmail: user?.email,
        },
      });
    }

    await tx.financialTransaction.createMany({
      data: [
        {
          employeeId: employee.id,
          incomeEntryId: incomeEntry.id,
          type: "project_income",
          amount: projectValue,
          currency: data.currency,
          transactionDate: new Date(data.payment_received_date),
          description: `Project ${data.project_name}`,
          createdByEmail: user?.email,
        },
        {
          employeeId: employee.id,
          incomeEntryId: incomeEntry.id,
          type: "company_share",
          amount: companyShare,
          currency: data.currency,
          transactionDate: new Date(data.payment_received_date),
          description: "Company share 30%",
          createdByEmail: user?.email,
        },
        {
          employeeId: employee.id,
          incomeEntryId: incomeEntry.id,
          type: "freelancer_share",
          amount: freelancerShare,
          currency: data.currency,
          transactionDate: new Date(data.payment_received_date),
          description: "Freelancer share 70%",
          createdByEmail: user?.email,
        },
        ...(savingsContribution > 0
          ? [{
              employeeId: employee.id,
              incomeEntryId: incomeEntry.id,
              type: "savings_deposit" as const,
              amount: savingsContribution,
              currency: data.currency,
              transactionDate: new Date(data.payment_received_date),
              description: "Savings contribution",
              createdByEmail: user?.email,
            }]
          : []),
        ...(loanPaymentApplied > 0
          ? [{
              employeeId: employee.id,
              incomeEntryId: incomeEntry.id,
              type: "loan_payment" as const,
              amount: loanPaymentApplied,
              currency: data.currency,
              transactionDate: new Date(data.payment_received_date),
              description: "Loan payment",
              createdByEmail: user?.email,
            }]
          : []),
      ],
    });

    for (const row of leadAssignments) {
      const amount = round2(projectValue * (row.percent / 100));
      await tx.employee.update({
        where: { id: row.employee_id },
        data: {
          totalLeadCommissions: { increment: amount },
          leadCommissionWallet: { increment: amount },
          netAvailableBalance: { increment: amount },
        },
      });
      await tx.financialTransaction.create({
        data: {
          employeeId: row.employee_id,
          incomeEntryId: incomeEntry.id,
          type: "lead_commission",
          amount,
          currency: data.currency,
          transactionDate: new Date(data.payment_received_date),
          description: `Lead commission ${row.percent}%`,
          createdByEmail: user?.email,
        },
      });
    }

    for (const row of coLeadAssignments) {
      const amount = round2(projectValue * (row.percent / 100));
      await tx.employee.update({
        where: { id: row.employee_id },
        data: {
          totalCoLeadCommissions: { increment: amount },
          coLeadCommissionWallet: { increment: amount },
          netAvailableBalance: { increment: amount },
        },
      });
      await tx.financialTransaction.create({
        data: {
          employeeId: row.employee_id,
          incomeEntryId: incomeEntry.id,
          type: "co_lead_commission",
          amount,
          currency: data.currency,
          transactionDate: new Date(data.payment_received_date),
          description: `Co-lead commission ${row.percent}%`,
          createdByEmail: user?.email,
        },
      });
    }

    const outstandingLoans = await tx.loan.aggregate({
      where: { employeeId: employee.id, status: "active" },
      _sum: { remainingPrincipal: true, accruedInterest: true },
    });
    const totalSavings = await tx.savingsAccount.findUnique({
      where: { employeeId: employee.id },
      select: { currentBalance: true },
    });
    const latestCommissions = await tx.employee.findUnique({
      where: { id: employee.id },
      select: { totalLeadCommissions: true, totalCoLeadCommissions: true },
    });

    await tx.employee.update({
      where: { id: employee.id },
      data: {
        totalLifetimeEarnings: { increment: projectValue },
        totalCompanyShareGenerated: { increment: companyShare },
        totalFreelancerShareReceived: { increment: freelancerShare },
        totalSavings: totalSavings?.currentBalance ?? 0,
        currentLoanBalance:
          round2(
            (outstandingLoans._sum.remainingPrincipal ?? 0) +
              (outstandingLoans._sum.accruedInterest ?? 0)
          ) ?? 0,
        netAvailableBalance: round2(
          employee.netAvailableBalance +
            netPayout +
            (latestCommissions?.totalLeadCommissions ?? 0) * 0 +
            (latestCommissions?.totalCoLeadCommissions ?? 0) * 0
        ),
      },
    });

    return incomeEntry;
  });

  await createAuditLog({
    userEmail: user?.email,
    action: "INCOME_ENTRY_CREATE",
    entityType: "income_entry",
    entityId: result.id,
    newValue: {
      employeeId: data.employee_id,
      projectName: data.project_name,
      projectValue,
      companyShare,
      freelancerShare,
      savingsContribution,
      loanPayment: requestedLoanPayment,
      leadCommissionTotal,
      coLeadCommissionTotal,
      netPayout,
    },
  });

  revalidatePath("/revenue");
  revalidatePath("/employees");
  revalidatePath("/loans");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true, incomeEntryId: result.id };
}

export type IncomeEntryInput = {
  employee_id: string;
  project_name: string;
  client_name: string;
  project_type: string;
  project_value: number;
  payment_received_date: string;
  currency: "PKR" | "USD" | "EUR" | "GBP" | "AED";
  savings_contribution?: number;
  loan_payment?: number;
  notes?: string;
  lead_assignments?: CommissionInput[];
  co_lead_assignments?: CommissionInput[];
};

export async function updateEmployee(
  id: string,
  data: {
    employee_code?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    department?: string;
    designation?: string;
    joining_date?: string;
    status?: "active" | "inactive" | "terminated" | "on_leave";
    role?: UserRole;
  }
) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw new Error("Employee not found");

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      employeeCode: data.employee_code,
      fullName: data.full_name,
      email: data.email?.toLowerCase(),
      phone: data.phone,
      department: data.department,
      designation: data.designation,
      joiningDate: data.joining_date ? new Date(data.joining_date) : undefined,
      status: data.status,
      role: data.role,
    },
  });

  await createAuditLog({
    userEmail: user?.email,
    action: "UPDATE",
    entityType: "employee",
    entityId: id,
    oldValue: { employeeCode: existing.employeeCode, email: existing.email, status: existing.status },
    newValue: { employeeCode: employee.employeeCode, email: employee.email, status: employee.status },
  });

  revalidatePath("/employees");
  return { success: true };
}

export async function deleteEmployee(id: string) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new Error("Employee not found");

  const [incomeCount, loanCount] = await Promise.all([
    prisma.incomeEntry.count({ where: { employeeId: id } }),
    prisma.loan.count({ where: { employeeId: id, status: "active" } }),
  ]);

  if (incomeCount > 0 || loanCount > 0) {
    await prisma.employee.update({
      where: { id },
      data: { status: "inactive" },
    });
    await createAuditLog({
      userEmail: user?.email,
      action: "DEACTIVATE",
      entityType: "employee",
      entityId: id,
      newValue: { reason: "Has financial records — set inactive" },
    });
    revalidatePath("/employees");
    return { success: true, deactivated: true };
  }

  await prisma.employee.delete({ where: { id } });
  await createAuditLog({
    userEmail: user?.email,
    action: "DELETE",
    entityType: "employee",
    entityId: id,
    oldValue: { employeeCode: employee.employeeCode, email: employee.email },
  });

  revalidatePath("/employees");
  return { success: true, deactivated: false };
}

export async function deleteIncomeEntry(id: string) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  await prisma.$transaction(async (tx) => {
    await reverseIncomeEntryTx(tx, id, user?.email);
  });

  await createAuditLog({
    userEmail: user?.email,
    action: "DELETE",
    entityType: "income_entry",
    entityId: id,
  });

  revalidatePath("/revenue");
  revalidatePath("/employees");
  revalidatePath("/loans");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true };
}

export async function updateIncomeEntry(id: string, data: IncomeEntryInput) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  const existing = await prisma.incomeEntry.findUnique({ where: { id } });
  if (!existing) throw new Error("Income entry not found");

  await prisma.$transaction(async (tx) => {
    await reverseIncomeEntryTx(tx, id, user?.email);
  });

  const result = await createIncomeEntry(data);

  await createAuditLog({
    userEmail: user?.email,
    action: "UPDATE",
    entityType: "income_entry",
    entityId: id,
    newValue: { replacedBy: result.incomeEntryId, projectName: data.project_name },
  });

  return result;
}

async function reverseIncomeEntryTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  incomeEntryId: string,
  userEmail?: string | null
) {
  const entry = await tx.incomeEntry.findUnique({
    where: { id: incomeEntryId },
    include: { commissionAssignments: true },
  });
  if (!entry) throw new Error("Income entry not found");

  await tx.employee.update({
    where: { id: entry.employeeId },
    data: {
      totalLifetimeEarnings: { decrement: entry.projectValue },
      totalCompanyShareGenerated: { decrement: entry.companyShare },
      totalFreelancerShareReceived: { decrement: entry.freelancerShare },
      netAvailableBalance: { decrement: entry.netPayout },
    },
  });

  for (const assignment of entry.commissionAssignments) {
    const commissionUpdate =
      assignment.role === "lead"
        ? {
            totalLeadCommissions: { decrement: assignment.amount },
            leadCommissionWallet: { decrement: assignment.amount },
          }
        : {
            totalCoLeadCommissions: { decrement: assignment.amount },
            coLeadCommissionWallet: { decrement: assignment.amount },
          };

    await tx.employee.update({
      where: { id: assignment.employeeId },
      data: {
        ...commissionUpdate,
        netAvailableBalance: { decrement: assignment.amount },
      },
    });
  }

  if (entry.savingsContribution > 0) {
    const account = await tx.savingsAccount.findUnique({
      where: { employeeId: entry.employeeId },
    });
    if (account) {
      const balanceAfter = round2(account.currentBalance - entry.savingsContribution);
      await tx.savingsAccount.update({
        where: { id: account.id },
        data: { currentBalance: balanceAfter },
      });
      await tx.savingsTransaction.create({
        data: {
          savingsAccountId: account.id,
          employeeId: entry.employeeId,
          transactionType: "withdrawal",
          amount: entry.savingsContribution,
          balanceAfter,
          notes: `Reversal of income entry ${entry.id}`,
          transactionDate: new Date(),
          createdByEmail: userEmail,
        },
      });
    }
  }

  const loanPayments = await tx.loanPayment.findMany({
    where: { incomeEntryId },
  });

  for (const loanPayment of loanPayments) {
    const repayment = await tx.loanRepayment.findFirst({
      where: {
        loanId: loanPayment.loanId,
        notes: { contains: incomeEntryId },
      },
      orderBy: { createdAt: "desc" },
    });

    if (repayment) {
      const loan = await tx.loan.findUnique({ where: { id: loanPayment.loanId } });
      if (loan) {
        const restoredPrincipal = round2(loan.remainingPrincipal + repayment.principalPaid);
        const restoredAccrued = round2(loan.accruedInterest + repayment.interestPaid);

        await tx.loan.update({
          where: { id: loan.id },
          data: {
            remainingPrincipal: restoredPrincipal,
            accruedInterest: restoredAccrued,
            totalPrincipalPaid: { decrement: repayment.principalPaid },
            totalInterestPaid: { decrement: repayment.interestPaid },
            status: "active",
            closedAt: null,
          },
        });

        await tx.loanLedgerEntry.create({
          data: {
            loanId: loan.id,
            transactionDate: new Date(),
            transactionType: "payment_reversal",
            amount: -repayment.amountPaid,
            interestPortion: -repayment.interestPaid,
            principalPortion: -repayment.principalPaid,
            remainingPrincipal: restoredPrincipal,
            accruedInterestAfter: restoredAccrued,
            remarks: `Reversal of income entry ${incomeEntryId}`,
            createdByEmail: userEmail,
          },
        });

        await tx.loanRepayment.delete({ where: { id: repayment.id } });
      }
    }

    await tx.loanPayment.delete({ where: { id: loanPayment.id } });
  }

  await tx.financialTransaction.create({
    data: {
      employeeId: entry.employeeId,
      incomeEntryId: entry.id,
      type: "refund",
      amount: entry.projectValue,
      currency: entry.currency,
      transactionDate: new Date(),
      description: `Income entry deleted — ${entry.projectName}`,
      createdByEmail: userEmail,
    },
  });

  await tx.commissionAssignment.deleteMany({ where: { incomeEntryId } });
  await tx.incomeEntry.delete({ where: { id: incomeEntryId } });

  const outstandingLoans = await tx.loan.aggregate({
    where: { employeeId: entry.employeeId, status: "active" },
    _sum: { remainingPrincipal: true, accruedInterest: true },
  });
  const savingsAccount = await tx.savingsAccount.findUnique({
    where: { employeeId: entry.employeeId },
    select: { currentBalance: true },
  });

  await tx.employee.update({
    where: { id: entry.employeeId },
    data: {
      currentLoanBalance: round2(
        (outstandingLoans._sum.remainingPrincipal ?? 0) +
          (outstandingLoans._sum.accruedInterest ?? 0)
      ),
      totalSavings: savingsAccount?.currentBalance ?? 0,
    },
  });
}

export async function createExpense(data: {
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  notes?: string;
}) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  await prisma.expense.create({
    data: {
      category: data.category,
      amount: data.amount,
      expenseDate: new Date(data.expense_date),
      notes: data.notes,
      createdByEmail: user?.email,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addAllowedUser(data: {
  email: string;
  role: UserRole;
  password: string;
}) {
  await requireRole(["super_admin"]);
  const user = await getCurrentUser();

  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.allowedUser.create({
    data: {
      email: data.email.toLowerCase(),
      role: data.role,
      status: "active",
      passwordHash,
    },
  });

  await createAuditLog({
    userEmail: user?.email,
    action: "CREATE",
    entityType: "allowed_user",
    newValue: { email: data.email, role: data.role },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function removeAllowedUser(id: string) {
  await requireRole(["super_admin"]);
  await prisma.allowedUser.delete({ where: { id } });
  revalidatePath("/users");
  return { success: true };
}

export async function updateUserRole(id: string, role: UserRole) {
  await requireRole(["super_admin"]);
  await prisma.allowedUser.update({ where: { id }, data: { role } });
  revalidatePath("/users");
  return { success: true };
}

export async function updateSetting(key: string, value: unknown) {
  await requireRole(["super_admin"]);
  await prisma.systemSetting.update({
    where: { key },
    data: { value: JSON.stringify(value) },
  });
  revalidatePath("/settings");
  return { success: true };
}

export async function getIncomeEntryDetails(id: string) {
  await requireRole(["super_admin", "finance_manager"]);
  return prisma.incomeEntry.findUnique({
    where: { id },
    include: {
      commissionAssignments: {
        include: { employee: { select: { id: true, fullName: true } } },
      },
    },
  });
}

export async function getActiveEmployees() {
  await requireRole(["super_admin", "finance_manager"]);
  return prisma.employee.findMany({
    where: { status: "active" },
    select: {
      id: true,
      fullName: true,
      baseSalary: true,
      currentLoanBalance: true,
      totalSavings: true,
      leadCommissionWallet: true,
      coLeadCommissionWallet: true,
    },
    orderBy: { fullName: "asc" },
  });
}

function normalizeAssignments(rows?: CommissionInput[]) {
  return (rows ?? [])
    .filter((row) => row.employee_id && row.percent > 0)
    .map((row) => ({ employee_id: row.employee_id, percent: round2(row.percent) }));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
