import type { InterestType, LoanCalculationResult, AmortizationEntry } from "@/types/database";
import { addDays, format } from "date-fns";

export function getDailyRate(annualRatePercent: number): number {
  return annualRatePercent / 100 / 365;
}

export function getMonthlyRate(annualRatePercent: number): number {
  return annualRatePercent / 100 / 12;
}

export function calculateDailyInterest(
  remainingPrincipal: number,
  annualRatePercent: number
): number {
  return remainingPrincipal * getDailyRate(annualRatePercent);
}

export function calculateMonthlyDiminishingInterest(
  remainingPrincipal: number,
  annualRatePercent: number
): number {
  return remainingPrincipal * getMonthlyRate(annualRatePercent);
}

export function calculateFlatInterest(
  principal: number,
  annualRatePercent: number,
  durationMonths: number
): number {
  return principal * (annualRatePercent / 100) * (durationMonths / 12);
}

/** Principal-first allocation: reduce outstanding principal, then settle accrued interest. */
export function applyRepayment(
  remainingPrincipal: number,
  accruedInterest: number,
  paymentAmount: number
): {
  principalPaid: number;
  interestPaid: number;
  newPrincipal: number;
  newAccruedInterest: number;
} {
  const principalPaid = Math.min(paymentAmount, remainingPrincipal);
  const remaining = paymentAmount - principalPaid;
  const interestPaid = Math.min(remaining, accruedInterest);

  return {
    principalPaid,
    interestPaid,
    newPrincipal: Math.max(0, remainingPrincipal - principalPaid),
    newAccruedInterest: Math.max(0, accruedInterest - interestPaid),
  };
}

export function generateAmortizationSchedule(params: {
  principal: number;
  annualRatePercent: number;
  interestType: InterestType;
  repaymentAmount: number;
  startDate?: Date;
  maxPeriods?: number;
}): LoanCalculationResult {
  const {
    principal,
    annualRatePercent,
    interestType,
    repaymentAmount,
    startDate = new Date(),
    maxPeriods = 360,
  } = params;

  const dailyRate = getDailyRate(annualRatePercent);
  const monthlyRate = getMonthlyRate(annualRatePercent);
  const schedule: AmortizationEntry[] = [];
  let balance = principal;
  let accruedInterest = 0;
  let totalInterest = 0;
  let period = 0;

  if (interestType === "flat") {
    const flatInterest = calculateFlatInterest(principal, annualRatePercent, maxPeriods / 30);
    const totalPayable = principal + flatInterest;
    const payment = repaymentAmount || totalPayable / (maxPeriods / 30);
    let remaining = totalPayable;

    for (let i = 0; i < Math.ceil(totalPayable / payment) && i < maxPeriods; i++) {
      const pay = Math.min(payment, remaining);
      const interestPortion = (flatInterest / totalPayable) * pay;
      const principalPortion = pay - interestPortion;
      balance = Math.max(0, balance - principalPortion);
      remaining -= pay;
      totalInterest += interestPortion;
      period++;
      schedule.push({
        period,
        date: format(addDays(startDate, i * 30), "yyyy-MM-dd"),
        payment: pay,
        principal: principalPortion,
        interest: interestPortion,
        balance,
        dailyInterest: flatInterest / maxPeriods,
      });
      if (remaining <= 0) break;
    }

    return {
      dailyRate,
      monthlyRate,
      dailyInterest: calculateDailyInterest(principal, annualRatePercent),
      monthlyInterest: calculateMonthlyDiminishingInterest(principal, annualRatePercent),
      totalPayable: principal + flatInterest,
      totalInterest: flatInterest,
      schedule,
    };
  }

  const daysPerPeriod = interestType === "daily_diminishing" ? 1 : 30;

  while (balance > 0.01 && period < maxPeriods) {
    period++;
    const date = addDays(startDate, (period - 1) * daysPerPeriod);

    if (interestType === "daily_diminishing") {
      const dayInterest = balance * dailyRate;
      accruedInterest += dayInterest;
    } else {
      accruedInterest = balance * monthlyRate;
    }

    const payment = Math.min(repaymentAmount, balance + accruedInterest);
    const result = applyRepayment(balance, accruedInterest, payment);

    totalInterest += result.interestPaid;
    balance = result.newPrincipal;
    accruedInterest = result.newAccruedInterest;

    schedule.push({
      period,
      date: format(date, "yyyy-MM-dd"),
      payment,
      principal: result.principalPaid,
      interest: result.interestPaid,
      balance,
      dailyInterest: balance * dailyRate,
    });

    if (payment <= 0) break;
  }

  return {
    dailyRate,
    monthlyRate,
    dailyInterest: calculateDailyInterest(principal, annualRatePercent),
    monthlyInterest: calculateMonthlyDiminishingInterest(principal, annualRatePercent),
    totalPayable: principal + totalInterest,
    totalInterest,
    schedule,
  };
}

export function calculatePayrollFinalSalary(params: {
  baseSalary: number;
  bonuses?: number;
  commissions?: number;
  deductions?: number;
  loanRecovery?: number;
  savingsContribution?: number;
}): number {
  const {
    baseSalary,
    bonuses = 0,
    commissions = 0,
    deductions = 0,
    loanRecovery = 0,
    savingsContribution = 0,
  } = params;

  return (
    baseSalary + bonuses + commissions - deductions - loanRecovery - savingsContribution
  );
}
