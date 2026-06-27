export function formatCurrency(amount: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getMonthName(month: number): string {
  return new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(2024, month - 1, 1)
  );
}

export function cnStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
    defaulted: "bg-red-500/10 text-red-600 dark:text-red-400",
    inactive: "bg-muted text-muted-foreground",
    on_leave: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    terminated: "bg-red-500/10 text-red-600 dark:text-red-400",
    approved: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}
