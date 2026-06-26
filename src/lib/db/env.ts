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

function trimUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim();
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

export function isPostgresDatabaseUrl(url: string | undefined): boolean {
  const trimmed = trimUrl(url);
  return Boolean(
    trimmed?.startsWith("postgres://") || trimmed?.startsWith("postgresql://")
  );
}

function isUsablePostgresUrl(url: string | undefined): url is string {
  return isUsableDatabaseUrl(url) && isPostgresDatabaseUrl(url);
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

function getDatabaseUrlSourceOrder(): string[] {
  if (process.env.VERCEL) {
    return ["POSTGRES_PRISMA_URL", "DATABASE_URL", ...DATABASE_URL_ALIASES];
  }
  return ["DATABASE_URL", ...DATABASE_URL_ALIASES];
}

export function normalizeDirectDatabaseEnv(): void {
  const unpooled = trimUrl(process.env.DATABASE_URL_UNPOOLED);
  if (isUsablePostgresUrl(unpooled)) {
    process.env.DATABASE_URL_UNPOOLED = normalizeSupabasePostgresUrl(unpooled);
    return;
  }

  for (const key of DIRECT_URL_ALIASES) {
    const candidate = trimUrl(process.env[key]);
    if (!isUsablePostgresUrl(candidate)) continue;

    process.env.DATABASE_URL_UNPOOLED = normalizeSupabasePostgresUrl(candidate);
    return;
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
    if (!isUsableDatabaseUrl(candidate)) continue;

    process.env.DATABASE_URL = isPostgresDatabaseUrl(candidate)
      ? normalizeSupabasePostgresUrl(candidate)
      : candidate;
    normalizeDirectDatabaseEnv();
    return;
  }

  if (process.env.DATABASE_URL !== undefined && !isUsableDatabaseUrl(process.env.DATABASE_URL)) {
    delete process.env.DATABASE_URL;
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

export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

export function useStaticAuth(): boolean {
  return !isDatabaseConfigured();
}
