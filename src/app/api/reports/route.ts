import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    await requireRole(["super_admin", "finance_manager"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "revenue";
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  let rows: Record<string, unknown>[] = [];

  switch (type) {
    case "savings": {
      const data = await prisma.savingsTransaction.findMany({
        where: { transactionDate: { gte: start, lte: end } },
        include: { employee: true },
      });
      rows = data.map((t) => ({
        Employee: t.employee.fullName,
        Type: t.transactionType,
        Amount: t.amount,
        BalanceAfter: t.balanceAfter,
        Date: t.transactionDate.toISOString().split("T")[0],
      }));
      break;
    }
    case "loans": {
      const data = await prisma.loanRepayment.findMany({
        where: { paymentDate: { gte: start, lte: end } },
        include: { loan: { include: { employee: true } } },
      });
      rows = data.map((r) => ({
        Employee: r.loan.employee.fullName,
        AmountPaid: r.amountPaid,
        PrincipalPaid: r.principalPaid,
        InterestPaid: r.interestPaid,
        RemainingPrincipal: r.remainingPrincipal,
        Date: r.paymentDate.toISOString().split("T")[0],
      }));
      break;
    }
    case "employee_earnings": {
      const data = await prisma.employee.findMany({
        orderBy: { totalFreelancerShareReceived: "desc" },
      });
      rows = data.map((e) => ({
        Employee: e.fullName,
        EmployeeCode: e.employeeCode,
        LifetimeEarnings: e.totalLifetimeEarnings,
        CompanyShareGenerated: e.totalCompanyShareGenerated,
        FreelancerShareReceived: e.totalFreelancerShareReceived,
        TotalSavings: e.totalSavings,
        CurrentLoanBalance: e.currentLoanBalance,
        NetAvailableBalance: e.netAvailableBalance,
      }));
      break;
    }
    case "commission": {
      const assignments = await prisma.commissionAssignment.findMany({
        where: {
          incomeEntry: { paymentReceivedDate: { gte: start, lte: end } },
        },
        include: {
          employee: true,
          incomeEntry: true,
        },
      });
      rows = assignments.map((row) => ({
        Employee: row.employee.fullName,
        Role: row.role,
        Percent: row.percent,
        Amount: row.amount,
        Project: row.incomeEntry.projectName,
        Client: row.incomeEntry.clientName,
        Date: row.incomeEntry.paymentReceivedDate.toISOString().split("T")[0],
      }));
      break;
    }
    case "revenue": {
      const data = await prisma.incomeEntry.findMany({
        where: { paymentReceivedDate: { gte: start, lte: end } },
        include: { employee: true },
      });
      rows = data.map((r) => ({
        Employee: r.employee.fullName,
        Client: r.clientName,
        Project: r.projectName,
        ProjectType: r.projectType,
        ProjectValue: r.projectValue,
        CompanyShare: r.companyShare,
        FreelancerShare: r.freelancerShare,
        SavingsContribution: r.savingsContribution,
        LoanPayment: r.loanPayment,
        LeadCommissionTotal: r.leadCommissionTotal,
        CoLeadCommissionTotal: r.coLeadCommissionTotal,
        NetPayout: r.netPayout,
        Currency: r.currency,
        Date: r.paymentReceivedDate.toISOString().split("T")[0],
      }));
      break;
    }
    case "expenses": {
      const data = await prisma.expense.findMany({
        where: { expenseDate: { gte: start, lte: end } },
      });
      rows = data.map((e) => ({
        Category: e.category,
        Amount: e.amount,
        Date: e.expenseDate.toISOString().split("T")[0],
        Notes: e.notes,
      }));
      break;
    }
    case "pnl": {
      const [rev, exp, comm] = await Promise.all([
        prisma.incomeEntry.findMany({ where: { paymentReceivedDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) } } }),
        prisma.expense.findMany({ where: { expenseDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) } } }),
        prisma.financialTransaction.findMany({
          where: {
            transactionDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
            type: { in: ["lead_commission", "co_lead_commission"] },
          },
        }),
      ]);
      const totalRev = rev.reduce((s, r) => s + r.projectValue, 0);
      const totalCompanyShare = rev.reduce((s, r) => s + r.companyShare, 0);
      const totalExp = exp.reduce((s, e) => s + e.amount, 0);
      const totalCommissions = comm.reduce((s, c) => s + c.amount, 0);
      rows = [{
        Revenue: totalRev,
        CompanyShare: totalCompanyShare,
        Expenses: totalExp,
        Commissions: totalCommissions,
        NetProfit: totalCompanyShare - totalExp - totalCommissions,
        Year: year,
      }];
      break;
    }
    default:
      rows = [];
  }

  return NextResponse.json({ rows });
}
