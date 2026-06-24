import {
  differenceInCalendarDays,
  startOfDay,
  addDays,
  format,
} from "date-fns";
import { applyRepayment, calculateDailyInterest, getDailyRate } from "./calculator";

export interface LoanBalanceState {
  remainingPrincipal: number;
  accruedInterest: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  lastAccrualDate: Date;
}

export function startOfDayUTC(d: Date): Date {
  return startOfDay(d);
}

/** Accrue daily diminishing interest from day after lastAccrualDate through asOfDate (inclusive). */
export function accrueInterestForPeriod(params: {
  principal: number;
  annualRatePercent: number;
  lastAccrualDate: Date;
  asOfDate: Date;
}): { accruedAmount: number; daysAccrued: number; newLastAccrualDate: Date } {
  const { principal, annualRatePercent, lastAccrualDate, asOfDate } = params;
  if (principal <= 0) {
    return { accruedAmount: 0, daysAccrued: 0, newLastAccrualDate: asOfDate };
  }

  const from = startOfDayUTC(lastAccrualDate);
  const to = startOfDayUTC(asOfDate);
  const days = differenceInCalendarDays(to, from);

  if (days <= 0) {
    return { accruedAmount: 0, daysAccrued: 0, newLastAccrualDate: lastAccrualDate };
  }

  let accrued = 0;
  let balance = principal;
  const dailyRate = getDailyRate(annualRatePercent);

  for (let i = 1; i <= days; i++) {
    accrued += balance * dailyRate;
  }

  return {
    accruedAmount: Math.round(accrued * 100) / 100,
    daysAccrued: days,
    newLastAccrualDate: to,
  };
}

/** Apply payment against principal first; interest is settled from any remainder. */
export function allocatePayment(
  state: Pick<LoanBalanceState, "remainingPrincipal" | "accruedInterest">,
  paymentAmount: number
) {
  return applyRepayment(
    state.remainingPrincipal,
    state.accruedInterest,
    paymentAmount
  );
}

export function calculatePayoffAmount(state: LoanBalanceState): number {
  return (
    Math.round((state.remainingPrincipal + state.accruedInterest) * 100) / 100
  );
}

export function getNextDailyInterest(
  principal: number,
  annualRatePercent: number
): number {
  return Math.round(calculateDailyInterest(principal, annualRatePercent) * 100) / 100;
}

export function formatLedgerDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function initialAccrualDate(loanDate: Date): Date {
  return addDays(startOfDayUTC(loanDate), -1);
}
