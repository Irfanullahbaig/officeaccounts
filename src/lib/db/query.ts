import { Prisma } from "@prisma/client";
import { isDatabaseConfigured } from "@/lib/db/config";

export const DATABASE_REQUIRED_MESSAGE =
  "Database is not configured. Set DATABASE_URL to save employees and other records.";

export async function queryDatabase<T>(
  fallback: T,
  query: () => Promise<T>
): Promise<T> {
  if (!isDatabaseConfigured()) return fallback;

  try {
    return await query();
  } catch (error) {
    console.error("Database query failed:", error);
    return fallback;
  }
}

export function assertDatabaseConfigured(): void {
  if (!isDatabaseConfigured()) {
    throw new Error(DATABASE_REQUIRED_MESSAGE);
  }
}

export function formatDatabaseError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : "field";
      return `A record with this ${target} already exists.`;
    }
    if (error.code === "P2021" || error.code === "P2022") {
      return "Database schema is out of date. Run prisma db push locally or redeploy with migrations.";
    }
  }

  if (error instanceof Error) {
    if (error.message === "Unauthorized") return "Your session expired. Please sign in again.";
    if (error.message === "Forbidden") return "You do not have permission to perform this action.";

    const lower = error.message.toLowerCase();
    if (
      lower.includes("authentication failed") ||
      lower.includes("provided database credentials") ||
      error.name === "PrismaClientInitializationError"
    ) {
      return [
        "Database login failed. Check DATABASE_URL in .env.local (local) or Vercel Environment Variables (production).",
        "Use the Supabase pooler URL (port 6543) with username postgres.rzeouxflwqiprffkdccs and your database password.",
        "Reset the password in Supabase → Project Settings → Database if needed.",
      ].join(" ");
    }

    return error.message;
  }

  return "Database operation failed. Please try again.";
}
