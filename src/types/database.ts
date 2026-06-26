export type UserRole = "super_admin" | "admin" | "finance_manager" | "employee" | "viewer" | "director";
export type UserStatus = "active" | "inactive" | "suspended";
export type PayrollStatus = "pending" | "paid" | "cancelled";
export type InterestType = "daily_diminishing" | "monthly_diminishing" | "flat";
export type LoanStatus = "active" | "paid" | "defaulted" | "cancelled";
export type CommissionStatus = "pending" | "approved" | "paid" | "cancelled";
export type ExpenseCategory =
  | "salaries"
  | "office_rent"
  | "marketing"
  | "utilities"
  | "equipment"
  | "software"
  | "miscellaneous";

export interface AllowedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  employee_id: string | null;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  user_id: string | null;
  allowed_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  joining_date: string;
  base_salary: number;
  status: string;
  role: UserRole;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_routing_number: string | null;
  total_lifetime_earnings: number;
  total_company_share_generated: number;
  total_freelancer_share_received: number;
  current_loan_balance: number;
  total_savings: number;
  total_lead_commissions: number;
  total_co_lead_commissions: number;
  net_available_balance: number;
  lead_commission_wallet: number;
  co_lead_commission_wallet: number;
  created_at: string;
  updated_at: string;
}

export interface IncomeEntry {
  id: string;
  employee_id: string;
  project_name: string;
  client_name: string;
  project_type: string;
  project_value: number;
  company_share: number;
  freelancer_share: number;
  savings_contribution: number;
  loan_payment: number;
  lead_commission_total: number;
  co_lead_commission_total: number;
  net_payout: number;
  currency: "PKR" | "USD" | "EUR" | "GBP" | "AED";
  payment_received_date: string;
  notes: string | null;
  employee?: Employee;
}

export interface Payroll {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  bonuses: number;
  commissions: number;
  deductions: number;
  loan_recovery: number;
  savings_contribution: number;
  final_salary: number;
  status: PayrollStatus;
  paid_at: string | null;
  notes: string | null;
  employees?: Employee;
}

export interface Loan {
  id: string;
  employee_id: string;
  loan_amount: number;
  interest_rate: number;
  interest_type: InterestType;
  loan_date: string;
  duration_months: number | null;
  repayment_method: string;
  monthly_installment: number | null;
  remaining_principal: number;
  total_interest_paid: number;
  total_principal_paid: number;
  status: LoanStatus;
  notes: string | null;
  employees?: Employee;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  payment_date: string;
  amount_paid: number;
  principal_paid: number;
  interest_paid: number;
  remaining_principal: number;
  remaining_interest: number;
  payment_source: string;
  notes: string | null;
}

export interface SavingsAccount {
  id: string;
  employee_id: string;
  savings_type: "fixed" | "percentage" | "manual";
  fixed_amount: number;
  percentage_rate: number;
  current_balance: number;
  is_active: boolean;
  employees?: Employee;
}

export interface Revenue {
  id: string;
  client_name: string;
  project_name: string | null;
  amount: number;
  revenue_date: string;
  payment_method: string;
  invoice_number: string | null;
  notes: string | null;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  notes: string | null;
}

export interface LeadCommission {
  id: string;
  lead_owner_id: string;
  client_name: string;
  deal_value: number;
  commission_percent: number;
  commission_amount: number;
  status: CommissionStatus;
  payment_date: string | null;
  employees?: Employee;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalCompanyShare: number;
  totalEmployeeEarnings: number;
  totalSavings: number;
  totalActiveLoans: number;
  outstandingLoanAmount: number;
  totalLeadCommissions: number;
  totalCoLeadCommissions: number;
  topPerformingEmployee: string;
  topRevenueProject: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
  fullName: string | null;
}

export interface AmortizationEntry {
  period: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  dailyInterest: number;
}

export interface LoanCalculationResult {
  dailyRate: number;
  monthlyRate: number;
  dailyInterest: number;
  monthlyInterest: number;
  totalPayable: number;
  totalInterest: number;
  schedule: AmortizationEntry[];
}
