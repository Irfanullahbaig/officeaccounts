import type { Employee, Payroll, Loan, SavingsAccount, LeadCommission, Revenue, Expense, AllowedUser, IncomeEntry } from "@/types/database";
import type {
  Employee as PrismaEmployee,
  Payroll as PrismaPayroll,
  Loan as PrismaLoan,
  SavingsAccount as PrismaSavings,
  LeadCommission as PrismaLead,
  Revenue as PrismaRevenue,
  IncomeEntry as PrismaIncomeEntry,
  Expense as PrismaExpense,
  AllowedUser as PrismaAllowedUser,
} from "@prisma/client";

export function mapEmployee(e: PrismaEmployee): Employee {
  return {
    id: e.id,
    employee_code: e.employeeCode,
    user_id: null,
    allowed_user_id: null,
    full_name: e.fullName,
    email: e.email,
    phone: e.phone,
    department: e.department,
    designation: e.designation,
    joining_date: e.joiningDate.toISOString(),
    base_salary: e.baseSalary,
    status: e.status,
    role: e.role,
    bank_name: e.bankName,
    bank_account_number: e.bankAccountNumber,
    bank_routing_number: e.bankRoutingNumber,
    total_lifetime_earnings: e.totalLifetimeEarnings,
    total_company_share_generated: e.totalCompanyShareGenerated,
    total_freelancer_share_received: e.totalFreelancerShareReceived,
    current_loan_balance: e.currentLoanBalance,
    total_savings: e.totalSavings,
    total_lead_commissions: e.totalLeadCommissions,
    total_co_lead_commissions: e.totalCoLeadCommissions,
    net_available_balance: e.netAvailableBalance,
    lead_commission_wallet: e.leadCommissionWallet,
    co_lead_commission_wallet: e.coLeadCommissionWallet,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
  };
}

export function mapIncomeEntry(
  row: PrismaIncomeEntry & { employee?: PrismaEmployee | null }
): IncomeEntry {
  return {
    id: row.id,
    employee_id: row.employeeId,
    project_name: row.projectName,
    client_name: row.clientName,
    project_type: row.projectType,
    project_value: row.projectValue,
    company_share: row.companyShare,
    freelancer_share: row.freelancerShare,
    savings_contribution: row.savingsContribution,
    loan_payment: row.loanPayment,
    lead_commission_total: row.leadCommissionTotal,
    co_lead_commission_total: row.coLeadCommissionTotal,
    net_payout: row.netPayout,
    currency: row.currency,
    payment_received_date: row.paymentReceivedDate.toISOString(),
    notes: row.notes,
    employee: row.employee ? mapEmployee(row.employee) : undefined,
  };
}

export function mapPayroll(
  p: PrismaPayroll & { employee?: PrismaEmployee | null }
) {
  return {
    id: p.id,
    employee_id: p.employeeId,
    period_month: p.periodMonth,
    period_year: p.periodYear,
    base_salary: p.baseSalary,
    bonuses: p.bonuses,
    commissions: p.commissions,
    deductions: p.deductions,
    loan_recovery: p.loanRecovery,
    savings_contribution: p.savingsContribution,
    final_salary: p.finalSalary,
    status: p.status,
    paid_at: p.paidAt?.toISOString() ?? null,
    notes: p.notes,
    employees: p.employee
      ? { full_name: p.employee.fullName, employee_code: p.employee.employeeCode }
      : null,
  };
}

export function mapLoan(
  l: PrismaLoan & { employee?: PrismaEmployee | null }
) {
  return {
    id: l.id,
    employee_id: l.employeeId,
    loan_amount: l.loanAmount,
    interest_rate: l.interestRate,
    interest_type: l.interestType,
    loan_date: l.loanDate.toISOString(),
    duration_months: l.durationMonths,
    repayment_method: l.repaymentMethod,
    monthly_installment: l.monthlyInstallment,
    remaining_principal: l.remainingPrincipal,
    total_interest_paid: l.totalInterestPaid,
    total_principal_paid: l.totalPrincipalPaid,
    status: l.status,
    notes: l.notes,
    employees: l.employee
      ? { full_name: l.employee.fullName, employee_code: l.employee.employeeCode }
      : null,
  };
}

export function mapSavings(
  s: PrismaSavings & { employee?: PrismaEmployee | null }
) {
  return {
    id: s.id,
    employee_id: s.employeeId,
    savings_type: s.savingsType,
    fixed_amount: s.fixedAmount,
    percentage_rate: s.percentageRate,
    current_balance: s.currentBalance,
    is_active: s.isActive,
    employees: s.employee
      ? { full_name: s.employee.fullName, employee_code: s.employee.employeeCode }
      : null,
  };
}

export function mapLeadCommission(
  c: PrismaLead & { leadOwner?: PrismaEmployee | null }
) {
  return {
    id: c.id,
    lead_owner_id: c.leadOwnerId,
    client_name: c.clientName,
    deal_value: c.dealValue,
    commission_percent: c.commissionPercent,
    commission_amount: c.commissionAmount,
    status: c.status,
    payment_date: c.paymentDate?.toISOString() ?? null,
    employees: c.leadOwner ? { full_name: c.leadOwner.fullName } : null,
  };
}

export function mapRevenue(r: PrismaRevenue): Revenue {
  return {
    id: r.id,
    client_name: r.clientName,
    project_name: r.projectName,
    amount: r.amount,
    revenue_date: r.revenueDate.toISOString(),
    payment_method: r.paymentMethod,
    invoice_number: r.invoiceNumber,
    notes: r.notes,
  };
}

export function mapExpense(e: PrismaExpense): Expense {
  return {
    id: e.id,
    category: e.category,
    amount: e.amount,
    expense_date: e.expenseDate.toISOString(),
    receipt_url: e.receiptUrl,
    notes: e.notes,
  };
}

export function mapAllowedUser(u: PrismaAllowedUser): AllowedUser {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    employee_id: u.employeeId,
    two_factor_enabled: u.twoFactorEnabled,
    last_login_at: u.lastLoginAt?.toISOString() ?? null,
    created_at: u.createdAt.toISOString(),
  };
}
