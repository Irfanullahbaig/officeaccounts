"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveNextEmployeeCode } from "@/lib/employees/code";
import {
  EARNINGS_PERIOD_SETTING_KEY,
  getCurrentCalendarPeriod,
  parseEarningsPeriod,
  type EarningsPeriod,
} from "@/lib/earnings/period";
import { requireRole, createAuditLog, getCurrentUser } from "@/lib/auth/session";
import {
  deleteSupabaseAuthUser,
  updateSupabaseAuthMetadata,
  upsertSupabaseAuthUser,
} from "@/lib/auth/supabase-users";
import {
  assertDatabaseConfigured,
  formatDatabaseError,
} from "@/lib/db/query";
import {
  accrueInterestForPeriod,
  allocatePayment,
  initialAccrualDate,
  startOfDayUTC,
} from "@/lib/loans/ledger";
import { getLoanDisplayName } from "@/lib/loans/display";
import type {
  UserRole,
  ExpenseCategory,
} from "@/types/database";

const COMPANY_SHARE_PERCENT = 30;
const FREELANCER_SHARE_PERCENT = 70;
const PRINCIPAL_TOLERANCE = 0.01;

type FinanceTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type ActionResult =
  | { success: true; employeeCode?: string }
  | { success: false; error: string };

export async function getNextEmployeeCode(): Promise<string> {
  await requireRole(["super_admin", "finance_manager"]);
  assertDatabaseConfigured();
  return resolveNextEmployeeCode(prisma);
}

export async function createEmployee(data: {
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  joining_date: string;
  base_salary: number;
  role: UserRole;
  status?: "active" | "inactive" | "terminated" | "on_leave";
}): Promise<ActionResult> {
  try {
    await requireRole(["super_admin", "finance_manager"]);
    assertDatabaseConfigured();

    const baseSalary = Number(data.base_salary);
    if (!Number.isFinite(baseSalary) || baseSalary < 0) {
      return { success: false, error: "Base salary must be a valid number." };
    }

    const joiningDate = new Date(data.joining_date);
    if (Number.isNaN(joiningDate.getTime())) {
      return { success: false, error: "Joining date is invalid." };
    }

    const user = await getCurrentUser();

    const employee = await prisma.$transaction(async (tx) => {
      const employeeCode = await resolveNextEmployeeCode(tx);
      return tx.employee.create({
        data: {
          employeeCode,
          fullName: data.full_name.trim(),
          email: data.email.toLowerCase().trim(),
          phone: data.phone?.trim() || undefined,
          department: data.department?.trim() || undefined,
          designation: data.designation?.trim() || undefined,
          joiningDate,
          baseSalary,
          role: data.role,
          status: data.status ?? "active",
        },
      });
    });

    await createAuditLog({
      userEmail: user?.email,
      action: "CREATE",
      entityType: "employee",
      entityId: employee.id,
      newValue: { employeeCode: employee.employeeCode, email: employee.email },
    });

    revalidatePath("/employees");
    return { success: true, employeeCode: employee.employeeCode };
  } catch (error) {
    console.error("createEmployee failed:", error);
    return { success: false, error: formatDatabaseError(error) };
  }
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
  target_loan_id?: string;
  notes?: string;
  lead_assignments?: CommissionInput[];
  co_lead_assignments?: CommissionInput[];
}) {
  await requireRole(["super_admin", "finance_manager"]);
  const user = await getCurrentUser();

  const projectValue = round2(data.project_value);
  const savingsContribution = round2(data.savings_contribution ?? 0);
  const requestedLoanPayment = round2(data.loan_payment ?? 0);
  const targetLoanId = data.target_loan_id;
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
    let loanOverflowToSavings = 0;
    if (requestedLoanPayment > 0) {
      const activeLoans = await tx.loan.findMany({
        where: { employeeId: employee.id, status: "active" },
        orderBy: [{ loanDate: "asc" }, { createdAt: "asc" }],
      });

      if (activeLoans.length > 1 && !targetLoanId) {
        throw new Error("Select which loan this repayment applies to");
      }
      if (targetLoanId && !activeLoans.some((loan) => loan.id === targetLoanId)) {
        throw new Error("Selected loan is not active for this employee");
      }

      const orderedLoans = orderLoansForRepayment(activeLoans, targetLoanId);
      const paymentDate = startOfDayUTC(new Date(data.payment_received_date));
      let remaining = requestedLoanPayment;

      for (const loan of orderedLoans) {
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
        const principalSettled = isPrincipalCleared(nextPrincipal);
        const waivedOnSettlement =
          principalSettled && nextAccrued > PRINCIPAL_TOLERANCE ? round2(nextAccrued) : 0;
        const finalPrincipal = principalSettled ? 0 : nextPrincipal;
        const finalAccrued = principalSettled ? 0 : nextAccrued;

        await tx.loan.update({
          where: { id: loan.id },
          data: {
            remainingPrincipal: finalPrincipal,
            accruedInterest: finalAccrued,
            totalPrincipalPaid: { increment: principalPart },
            totalInterestPaid: { increment: interestPart },
            status: principalSettled ? "paid" : "active",
            closedAt: principalSettled ? paymentDate : null,
          },
        });
        await tx.loanRepayment.create({
          data: {
            loanId: loan.id,
            paymentDate: new Date(data.payment_received_date),
            amountPaid: payment,
            principalPaid: principalPart,
            interestPaid: interestPart,
            remainingPrincipal: finalPrincipal,
            remainingInterest: finalAccrued,
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
            remainingPrincipal: finalPrincipal,
            accruedInterestAfter: finalAccrued,
            remarks: `Income entry payment (${data.project_name})`,
            createdByEmail: user?.email,
          },
        });

        if (principalSettled) {
          if (waivedOnSettlement > PRINCIPAL_TOLERANCE) {
            await tx.loanLedgerEntry.create({
              data: {
                loanId: loan.id,
                transactionDate: paymentDate,
                transactionType: "adjustment",
                amount: 0,
                interestPortion: 0,
                principalPortion: 0,
                remainingPrincipal: 0,
                accruedInterestAfter: 0,
                remarks: `Accrued interest cleared — principal fully repaid (Rs ${waivedOnSettlement.toLocaleString()} waived)`,
                createdByEmail: user?.email,
              },
            });
          }
          await tx.loanLedgerEntry.create({
            data: {
              loanId: loan.id,
              transactionDate: paymentDate,
              transactionType: "loan_closed",
              amount: 0,
              remainingPrincipal: 0,
              accruedInterestAfter: 0,
              remarks:
                waivedOnSettlement > PRINCIPAL_TOLERANCE
                  ? "Loan closed — principal settled, remaining accrued interest waived"
                  : "Loan fully settled",
              createdByEmail: user?.email,
            },
          });
        }

        remaining = round2(remaining - payment);
        loanPaymentApplied = round2(loanPaymentApplied + payment);
      }

      if (remaining > 0) {
        loanOverflowToSavings = remaining;
      }
    }

    const paymentReceivedDate = new Date(data.payment_received_date);
    if (savingsContribution > 0) {
      await depositSavingsInTx(tx, {
        employeeId: employee.id,
        amount: savingsContribution,
        paymentDate: paymentReceivedDate,
        notes: `Income entry ${incomeEntry.id}`,
        userEmail: user?.email,
      });
    }
    if (loanOverflowToSavings > 0) {
      await depositSavingsInTx(tx, {
        employeeId: employee.id,
        amount: loanOverflowToSavings,
        paymentDate: paymentReceivedDate,
        notes: `Excess loan repayment — income entry ${incomeEntry.id}`,
        userEmail: user?.email,
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
        ...(loanOverflowToSavings > 0
          ? [{
              employeeId: employee.id,
              incomeEntryId: incomeEntry.id,
              type: "savings_deposit" as const,
              amount: loanOverflowToSavings,
              currency: data.currency,
              transactionDate: new Date(data.payment_received_date),
              description: "Excess loan repayment transferred to savings",
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
  revalidatePath("/savings");
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
  target_loan_id?: string;
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

  const savingsDeposits = await tx.savingsTransaction.findMany({
    where: {
      employeeId: entry.employeeId,
      transactionType: "deposit",
      notes: { contains: entry.id },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const deposit of savingsDeposits) {
    const account = await tx.savingsAccount.findUnique({
      where: { id: deposit.savingsAccountId },
    });
    if (!account) continue;

    const balanceAfter = round2(account.currentBalance - deposit.amount);
    await tx.savingsAccount.update({
      where: { id: account.id },
      data: { currentBalance: balanceAfter },
    });
    await tx.savingsTransaction.create({
      data: {
        savingsAccountId: account.id,
        employeeId: entry.employeeId,
        transactionType: "withdrawal",
        amount: deposit.amount,
        balanceAfter,
        notes: `Reversal of income entry ${entry.id}`,
        transactionDate: new Date(),
        createdByEmail: userEmail,
      },
    });
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

export async function updateExpense(
  id: string,
  data: {
    category: ExpenseCategory;
    amount: number;
    expense_date: string;
    notes?: string;
  }
): Promise<ActionResult> {
  try {
    await requireRole(["super_admin", "finance_manager"]);
    const user = await getCurrentUser();

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Expense not found." };
    }

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Amount must be a valid number greater than zero." };
    }

    const expenseDate = new Date(data.expense_date);
    if (Number.isNaN(expenseDate.getTime())) {
      return { success: false, error: "Expense date is invalid." };
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        category: data.category,
        amount,
        expenseDate,
        notes: data.notes?.trim() || null,
      },
    });

    await createAuditLog({
      userEmail: user?.email,
      action: "UPDATE",
      entityType: "expense",
      entityId: expense.id,
      oldValue: {
        category: existing.category,
        amount: existing.amount,
        expenseDate: existing.expenseDate.toISOString(),
      },
      newValue: {
        category: expense.category,
        amount: expense.amount,
        expenseDate: expense.expenseDate.toISOString(),
      },
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("updateExpense failed:", error);
    return { success: false, error: formatDatabaseError(error) };
  }
}

export async function addAllowedUser(data: {
  email: string;
  role: UserRole;
  password: string;
}) {
  await requireRole(["super_admin"]);
  const user = await getCurrentUser();
  const email = data.email.toLowerCase();

  const passwordHash = await bcrypt.hash(data.password, 12);

  const allowedUser = await prisma.allowedUser.create({
    data: {
      email,
      role: data.role,
      status: "active",
      passwordHash,
    },
  });

  try {
    await upsertSupabaseAuthUser({
      email,
      password: data.password,
      role: data.role,
    });
  } catch (error) {
    await prisma.allowedUser.delete({ where: { id: allowedUser.id } });
    throw error;
  }

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
  const allowedUser = await prisma.allowedUser.findUnique({ where: { id } });
  if (!allowedUser) throw new Error("User not found");

  await prisma.allowedUser.delete({ where: { id } });
  try {
    await deleteSupabaseAuthUser(allowedUser.email);
  } catch (error) {
    console.error("Failed to delete Supabase auth user:", error);
  }
  revalidatePath("/users");
  return { success: true };
}

export async function updateUserRole(id: string, role: UserRole) {
  await requireRole(["super_admin"]);
  const allowedUser = await prisma.allowedUser.update({
    where: { id },
    data: { role },
    include: { employee: true },
  });

  try {
    await updateSupabaseAuthMetadata(allowedUser.email, role);
  } catch (error) {
    console.error("Failed to update Supabase auth metadata:", error);
  }

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

export async function getEarningsActivePeriod(): Promise<EarningsPeriod> {
  await requireRole(["super_admin", "finance_manager"]);
  const row = await prisma.systemSetting.findUnique({
    where: { key: EARNINGS_PERIOD_SETTING_KEY },
  });
  return parseEarningsPeriod(row?.value) ?? getCurrentCalendarPeriod();
}

export async function startNewEarningsMonth(): Promise<EarningsPeriod> {
  await requireRole(["super_admin", "finance_manager"]);
  const period = getCurrentCalendarPeriod();

  await prisma.systemSetting.upsert({
    where: { key: EARNINGS_PERIOD_SETTING_KEY },
    create: { key: EARNINGS_PERIOD_SETTING_KEY, value: JSON.stringify(period) },
    update: { value: JSON.stringify(period) },
  });

  revalidatePath("/revenue");
  return period;
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

export async function getEmployeeActiveLoans(employeeId: string) {
  await requireRole(["super_admin", "finance_manager"]);
  if (!employeeId) return [];

  const loans = await prisma.loan.findMany({
    where: { employeeId, status: "active" },
    orderBy: [{ loanDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      notes: true,
      loanAmount: true,
      loanDate: true,
      remainingPrincipal: true,
      accruedInterest: true,
    },
  });

  return loans.map((loan) => ({
    id: loan.id,
    label: getLoanDisplayName(loan),
    remainingBalance: round2(loan.remainingPrincipal + loan.accruedInterest),
    loanDate: loan.loanDate.toISOString(),
  }));
}

function isPrincipalCleared(principal: number) {
  return principal <= PRINCIPAL_TOLERANCE;
}

function orderLoansForRepayment<T extends { id: string }>(loans: T[], targetLoanId?: string) {
  if (!targetLoanId || loans.length <= 1) return loans;
  const selected = loans.find((loan) => loan.id === targetLoanId);
  if (!selected) return loans;
  return [selected, ...loans.filter((loan) => loan.id !== targetLoanId)];
}

async function depositSavingsInTx(
  tx: FinanceTx,
  params: {
    employeeId: string;
    amount: number;
    paymentDate: Date;
    notes: string;
    userEmail?: string | null;
  }
) {
  if (params.amount <= 0) return;

  let account = await tx.savingsAccount.findUnique({
    where: { employeeId: params.employeeId },
  });
  if (!account) {
    account = await tx.savingsAccount.create({
      data: {
        employeeId: params.employeeId,
        savingsType: "manual",
        currentBalance: 0,
        isActive: true,
      },
    });
  }

  const balanceAfter = round2(account.currentBalance + params.amount);
  await tx.savingsAccount.update({
    where: { id: account.id },
    data: { currentBalance: balanceAfter },
  });
  await tx.savingsTransaction.create({
    data: {
      savingsAccountId: account.id,
      employeeId: params.employeeId,
      transactionType: "deposit",
      amount: params.amount,
      balanceAfter,
      notes: params.notes,
      transactionDate: params.paymentDate,
      createdByEmail: params.userEmail,
    },
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
