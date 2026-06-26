import { isDatabaseConfigured } from "@/lib/db/config";

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
