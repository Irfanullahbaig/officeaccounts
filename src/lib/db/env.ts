const BUILD_PLACEHOLDER = "postgresql://build:build@127.0.0.1:5432/build";

const DATABASE_URL_ALIASES = [
  "POSTGRES_PRISMA_URL",
  "SUPABASE_DB_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

const DIRECT_URL_ALIASES = [
  "DATABASE_URL_UNPOOLED",
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
] as const;

let envNormalized = false;

/** Strip whitespace and surrounding quotes copied from .env files into Vercel UI. */
function unquoteEnv(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function trimUrl(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  const trimmed = unquoteEnv(url);
  return trimmed || undefined;
}

export function isBuildPlaceholderUrl(url: string | undefined): boolean {
  const trimmed = trimUrl(url);
  if (!trimmed) return false;
  return trimmed.includes(BUILD_PLACEHOLDER);
}

export function isUsableDatabaseUrl(url: string | undefined): url is string {
  const trimmed = trimUrl(url);
  if (!trimmed) return false;
  return !isBuildPlaceholderUrl(trimmed);
}

export function isPostgresDatabaseUrl(url: string | undefined): url is string {
  if (!isUsableDatabaseUrl(url)) return false;
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

function isUsablePostgresUrl(url: string | undefined): url is string {
  return isPostgresDatabaseUrl(url);
}

export function isSupabasePostgresUrl(url: string): boolean {
  return (
    url.includes("pooler.supabase.com") ||
    url.includes(".supabase.co") ||
    /^postgres(?:ql)?:\/\/postgres\.[^@]+@/i.test(url)
  );
}

/** Skip Vercel/Neon integration URLs when this app is configured for Supabase. */
function shouldUsePostgresCandidate(url: string, sourceKey: string): boolean {
  if (sourceKey === "DATABASE_URL") return true;
  if (!getSupabaseProjectRef()) return true;
  return isSupabasePostgresUrl(url);
}

export function getSupabaseProjectRef(): string | undefined {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const fromUrl = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/i)?.[1];
  if (fromUrl) return fromUrl;

  return process.env.SUPABASE_PROJECT_REF?.trim() || undefined;
}

/** Supabase pooler requires username `postgres.<project_ref>`, not plain `postgres`. */
export function normalizeSupabasePostgresUrl(url: string): string {
  if (!isPostgresDatabaseUrl(url)) return url;

  let projectRef = getSupabaseProjectRef();

  try {
    const parsed = new URL(url.replace(/^postgresql:/, "postgres:"));
    if (!projectRef) {
      projectRef =
        parsed.hostname.match(/db\.([^.]+)\.supabase\.co/)?.[1] ??
        parsed.username.match(/^postgres\.(.+)$/)?.[1];
    }

    if (projectRef && parsed.username === "postgres") {
      parsed.username = `postgres.${projectRef}`;
      return parsed.toString().replace(/^postgres:/, "postgresql:");
    }

    return url;
  } catch {
    if (!projectRef) return url;
    return url.replace(
      /^(postgres(?:ql)?:\/\/)postgres:/,
      `$1postgres.${projectRef}:`
    );
  }
}

/** Ensure SSL, pooler flags, and serverless-friendly limits for Supabase on Vercel. */
export function finalizePostgresUrl(url: string): string {
  const normalized = normalizeSupabasePostgresUrl(url);

  try {
    const parsed = new URL(normalized.replace(/^postgresql:/, "postgres:"));
    const password = parsed.password;
    if (password) {
      parsed.password = decodeURIComponent(password);
    }

    if (!parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }

    const port = parsed.port || (parsed.protocol === "postgres:" ? "5432" : "5432");
    if (port === "6543" || parsed.hostname.includes("pooler.supabase.com")) {
      parsed.searchParams.set("pgbouncer", "true");
    }

    if (process.env.VERCEL) {
      parsed.searchParams.set("connection_limit", "1");
    }

    const finalized = parsed.toString().replace(/^postgres:/, "postgresql:");
    return finalized;
  } catch {
    return normalized;
  }
}

function getDatabaseUrlSourceOrder(): string[] {
  return ["DATABASE_URL", ...DATABASE_URL_ALIASES];
}

export function normalizeDirectDatabaseEnv(): void {
  const unpooled = trimUrl(process.env.DATABASE_URL_UNPOOLED);
  if (isUsablePostgresUrl(unpooled)) {
    process.env.DATABASE_URL_UNPOOLED = finalizePostgresUrl(
      unpooled.replace(/\?pgbouncer=true/, "").replace(":6543/", ":5432/")
    );
    return;
  }

  for (const key of DIRECT_URL_ALIASES) {
    const candidate = trimUrl(process.env[key]);
    if (candidate === undefined || !isUsablePostgresUrl(candidate)) continue;

    process.env.DATABASE_URL_UNPOOLED = finalizePostgresUrl(
      candidate.replace(/\?pgbouncer=true/, "").replace(":6543/", ":5432/")
    );
    return;
  }

  const pooled = trimUrl(process.env.DATABASE_URL);
  if (isUsablePostgresUrl(pooled)) {
    const derived = pooled
      .replace(":6543/", ":5432/")
      .replace(/\?pgbouncer=true/, "");
    process.env.DATABASE_URL_UNPOOLED = finalizePostgresUrl(derived);
  }
}

/** Edge-safe env normalization (no Node.js fs/path). */
export function normalizeDatabaseEnv(): void {
  if (envNormalized) return;
  envNormalized = true;

  const seen = new Set<string>();
  for (const key of getDatabaseUrlSourceOrder()) {
    if (seen.has(key)) continue;
    seen.add(key);

    const candidate = trimUrl(process.env[key]);
    if (candidate === undefined || !isUsableDatabaseUrl(candidate)) continue;
    if (isPostgresDatabaseUrl(candidate) && !shouldUsePostgresCandidate(candidate, key)) {
      continue;
    }

    process.env.DATABASE_URL = isPostgresDatabaseUrl(candidate)
      ? finalizePostgresUrl(candidate)
      : candidate;
    normalizeDirectDatabaseEnv();
    return;
  }

  if (process.env.DATABASE_URL !== undefined && !isUsableDatabaseUrl(process.env.DATABASE_URL)) {
    delete process.env.DATABASE_URL;
  } else {
    normalizeDirectDatabaseEnv();
  }
}

export function resolveDatabaseUrl(): string | undefined {
  normalizeDatabaseEnv();

  const url = trimUrl(process.env.DATABASE_URL);
  if (!isUsableDatabaseUrl(url)) {
    return undefined;
  }

  return url;
}

export function getDatabaseConnectionInfo(): {
  host?: string;
  port?: string;
  user?: string;
  database?: string;
  pooled: boolean;
} | undefined {
  const url = resolveDatabaseUrl();
  if (!url || !isPostgresDatabaseUrl(url)) return undefined;

  try {
    const parsed = new URL(url.replace(/^postgresql:/, "postgres:"));
    return {
      host: parsed.hostname,
      port: parsed.port || "5432",
      user: parsed.username,
      database: parsed.pathname.replace(/^\//, "") || "postgres",
      pooled: parsed.port === "6543" || parsed.searchParams.get("pgbouncer") === "true",
    };
  } catch {
    return undefined;
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

export function useStaticAuth(): boolean {
  return !isDatabaseConfigured();
}
