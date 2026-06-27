export const EARNINGS_PERIOD_SETTING_KEY = "earnings_active_period";

export type EarningsPeriod = { month: number; year: number };

export function getCurrentCalendarPeriod(): EarningsPeriod {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function formatEarningsPeriod(period: EarningsPeriod): string {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
    new Date(period.year, period.month - 1, 1)
  );
}

export function isInEarningsPeriod(date: string | Date, period: EarningsPeriod): boolean {
  const d = new Date(date);
  return d.getMonth() + 1 === period.month && d.getFullYear() === period.year;
}

export function parseEarningsPeriod(value: string | undefined): EarningsPeriod | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as EarningsPeriod;
    if (
      typeof parsed.month === "number" &&
      typeof parsed.year === "number" &&
      parsed.month >= 1 &&
      parsed.month <= 12
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}
