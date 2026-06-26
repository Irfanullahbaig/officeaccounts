import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db/config";
import type { DashboardStats } from "@/types/database";

const EMPTY_STATS: DashboardStats = {
  totalRevenue: 0,
  totalCompanyShare: 0,
  totalEmployeeEarnings: 0,
  totalSavings: 0,
  totalActiveLoans: 0,
  outstandingLoanAmount: 0,
  totalLeadCommissions: 0,
  totalCoLeadCommissions: 0,
  topPerformingEmployee: "N/A",
  topRevenueProject: "N/A",
};

function emptyChartData() {
  const monthLabels = Array.from({ length: 12 }, (_, i) =>
    new Date(new Date().getFullYear(), i).toLocaleString("en", { month: "short" })
  );

  return {
    monthLabels,
    revenueVsExpenses: monthLabels.map((month) => ({ month, revenue: 0, expenses: 0 })),
    payrollTrend: monthLabels.map((month) => ({ month, payroll: 0 })),
    loanCollectionTrend: monthLabels.map((month) => ({ month, collections: 0 })),
    profitLossTrend: monthLabels.map((month) => ({ month, profit: 0 })),
    savingsTrend: monthLabels.map((month) => ({ month, savings: 0 })),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isDatabaseConfigured()) {
    return EMPTY_STATS;
  }

  try {
  const [
    incomeEntries,
    loans,
    employees,
    projects,
  ] = await Promise.all([
    prisma.incomeEntry.findMany({
      select: {
        projectValue: true,
        companyShare: true,
        freelancerShare: true,
        leadCommissionTotal: true,
        coLeadCommissionTotal: true,
      },
    }),
    prisma.loan.findMany({
      select: { remainingPrincipal: true, status: true },
    }),
    prisma.employee.findMany({
      select: {
        fullName: true,
        totalSavings: true,
        totalFreelancerShareReceived: true,
      },
    }),
    prisma.project.findMany({ select: { name: true, totalReceived: true } }),
  ]);

  const totalRevenue = incomeEntries.reduce((s, r) => s + r.projectValue, 0);
  const totalCompanyShare = incomeEntries.reduce((s, r) => s + r.companyShare, 0);
  const totalEmployeeEarnings = incomeEntries.reduce((s, r) => s + r.freelancerShare, 0);
  const totalSavings = employees.reduce((s, e) => s + e.totalSavings, 0);
  const totalActiveLoans = loans.filter((l) => l.status === "active").length;
  const outstandingLoanAmount = loans
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + l.remainingPrincipal, 0);
  const totalLeadCommissions = incomeEntries.reduce((s, r) => s + r.leadCommissionTotal, 0);
  const totalCoLeadCommissions = incomeEntries.reduce((s, r) => s + r.coLeadCommissionTotal, 0);

  const topEmployee = [...employees].sort(
    (a, b) => b.totalFreelancerShareReceived - a.totalFreelancerShareReceived
  )[0];
  const topProject = [...projects].sort((a, b) => b.totalReceived - a.totalReceived)[0];

  return {
    totalRevenue,
    totalCompanyShare,
    totalEmployeeEarnings,
    totalSavings,
    totalActiveLoans,
    outstandingLoanAmount,
    totalLeadCommissions,
    totalCoLeadCommissions,
    topPerformingEmployee: topEmployee?.fullName ?? "N/A",
    topRevenueProject: topProject?.name ?? "N/A",
  };
  } catch (error) {
    console.error("getDashboardStats failed:", error);
    return EMPTY_STATS;
  }
}

export async function getChartData() {
  if (!isDatabaseConfigured()) {
    return emptyChartData();
  }

  try {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);

  const [incomeEntries, financialTransactions] =
    await Promise.all([
      prisma.incomeEntry.findMany({
        where: { paymentReceivedDate: { gte: startOfYear, lte: endOfYear } },
      }),
      prisma.financialTransaction.findMany({
        where: { transactionDate: { gte: startOfYear, lte: endOfYear } },
      }),
    ]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthLabels = months.map((m) =>
    new Date(currentYear, m - 1).toLocaleString("en", { month: "short" })
  );

  const revenueByMonth = months.map(
    (m) =>
      incomeEntries
        .filter((r) => r.paymentReceivedDate.getMonth() + 1 === m)
        .reduce((s, r) => s + r.projectValue, 0)
  );
  const companyShareByMonth = months.map(
    (m) =>
      incomeEntries
        .filter((r) => r.paymentReceivedDate.getMonth() + 1 === m)
        .reduce((s, r) => s + r.companyShare, 0)
  );
  const employeeShareByMonth = months.map(
    (m) =>
      incomeEntries
        .filter((r) => r.paymentReceivedDate.getMonth() + 1 === m)
        .reduce((s, r) => s + r.freelancerShare, 0)
  );
  const loanPaymentByMonth = months.map(
    (m) =>
      financialTransactions
        .filter((l) => l.transactionDate.getMonth() + 1 === m && l.type === "loan_payment")
        .reduce((s, l) => s + l.amount, 0)
  );
  const savingsByMonth = months.map(
    (m) =>
      financialTransactions
        .filter((s) => s.transactionDate.getMonth() + 1 === m && s.type === "savings_deposit")
        .reduce((sum, s) => sum + s.amount, 0)
  );
  const commissionByMonth = months.map(
    (m) =>
      financialTransactions
        .filter(
          (s) =>
            s.transactionDate.getMonth() + 1 === m &&
            ["lead_commission", "co_lead_commission"].includes(s.type)
        )
        .reduce((sum, s) => sum + s.amount, 0)
  );
  const netCompanyShare = months.map(
    (_, i) => companyShareByMonth[i] - commissionByMonth[i]
  );

  return {
    monthLabels,
    revenueVsExpenses: monthLabels.map((label, i) => ({
      month: label,
      revenue: revenueByMonth[i],
      expenses: companyShareByMonth[i],
    })),
    payrollTrend: monthLabels.map((label, i) => ({
      month: label,
      payroll: employeeShareByMonth[i],
    })),
    loanCollectionTrend: monthLabels.map((label, i) => ({
      month: label,
      collections: loanPaymentByMonth[i],
    })),
    profitLossTrend: monthLabels.map((label, i) => ({
      month: label,
      profit: netCompanyShare[i],
    })),
    savingsTrend: monthLabels.map((label, i) => ({
      month: label,
      savings: savingsByMonth[i],
    })),
  };
  } catch (error) {
    console.error("getChartData failed:", error);
    return emptyChartData();
  }
}
