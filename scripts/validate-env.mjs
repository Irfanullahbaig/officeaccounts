import { loadEnvFiles } from "./load-env.mjs";

/** Placeholder used only for `prisma generate` when DATABASE_URL is not set at build time. */
export const PRISMA_GENERATE_PLACEHOLDER_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

const DATABASE_URL_ALIASES = [
  "POSTGRES_PRISMA_URL",
  "SUPABASE_DB_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
];

function unquoteEnv(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function trimUrl(url) {
  if (url === undefined) return undefined;
  const trimmed = unquoteEnv(url);
  return trimmed || undefined;
}

function isSupabasePostgresUrl(url) {
  return (
    url.includes("pooler.supabase.com") ||
    url.includes(".supabase.co") ||
    /^postgres(?:ql)?:\/\/postgres\.[^@]+@/i.test(url)
  );
}

function getSupabaseProjectRef() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const fromUrl = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/i)?.[1];
  if (fromUrl) return fromUrl;
  return process.env.SUPABASE_PROJECT_REF?.trim() || undefined;
}

function shouldUsePostgresCandidate(url, sourceKey) {
  if (sourceKey === "DATABASE_URL") return true;
  if (!getSupabaseProjectRef()) return true;
  return isSupabasePostgresUrl(url);
}

function finalizePostgresUrl(url) {
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

    const port = parsed.port || "5432";
    if (port === "6543" || parsed.hostname.includes("pooler.supabase.com")) {
      parsed.searchParams.set("pgbouncer", "true");
    }

    if (process.env.VERCEL) {
      parsed.searchParams.set("connection_limit", "1");
    }

    return parsed.toString().replace(/^postgres:/, "postgresql:");
  } catch {
    return normalized;
  }
}

export function isBuildPlaceholderUrl(url) {
  const trimmed = trimUrl(url);
  if (!trimmed) return false;
  return trimmed.includes("postgresql://build:build@127.0.0.1:5432/build");
}

export function isUsableDatabaseUrl(url) {
  const trimmed = trimUrl(url);
  if (!trimmed) return false;
  return !isBuildPlaceholderUrl(trimmed);
}

/** Mirror runtime alias resolution so build scripts see the same DATABASE_URL. */
export function normalizeSupabasePostgresUrl(url) {
  if (!url?.startsWith("postgres")) return url;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  let projectRef =
    supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/i)?.[1] ??
    process.env.SUPABASE_PROJECT_REF?.trim();

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

export function normalizeDirectDatabaseEnv() {
  const unpooled = trimUrl(process.env.DATABASE_URL_UNPOOLED);
  if (unpooled !== undefined && isUsableDatabaseUrl(unpooled) && unpooled.startsWith("postgres")) {
    process.env.DATABASE_URL_UNPOOLED = finalizePostgresUrl(
      unpooled.replace(/\?pgbouncer=true/, "").replace(":6543/", ":5432/")
    );
    return process.env.DATABASE_URL_UNPOOLED;
  }

  for (const key of ["DIRECT_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL"]) {
    const candidate = trimUrl(process.env[key]);
    if (candidate === undefined || !isUsableDatabaseUrl(candidate) || !candidate.startsWith("postgres")) {
      continue;
    }
    process.env.DATABASE_URL_UNPOOLED = finalizePostgresUrl(
      candidate.replace(/\?pgbouncer=true/, "").replace(":6543/", ":5432/")
    );
    return process.env.DATABASE_URL_UNPOOLED;
  }

  deriveUnpooledFromPooled();
  return trimUrl(process.env.DATABASE_URL_UNPOOLED);
}

export function normalizeDatabaseEnv() {
  const order = ["DATABASE_URL", ...DATABASE_URL_ALIASES];

  const seen = new Set();
  for (const key of order) {
    if (seen.has(key)) continue;
    seen.add(key);

    const candidate = trimUrl(process.env[key]);
    if (!isUsableDatabaseUrl(candidate)) continue;
    if (candidate.startsWith("postgres") && !shouldUsePostgresCandidate(candidate, key)) {
      continue;
    }

    process.env.DATABASE_URL = candidate.startsWith("postgres")
      ? finalizePostgresUrl(candidate)
      : candidate;
    normalizeDirectDatabaseEnv();
    return process.env.DATABASE_URL;
  }

  normalizeDirectDatabaseEnv();
  return trimUrl(process.env.DATABASE_URL);
}

function deriveUnpooledFromPooled() {
  const pooled = trimUrl(process.env.DATABASE_URL);
  if (!isUsableDatabaseUrl(pooled) || !pooled.startsWith("postgres")) return;
  const derived = pooled.replace(":6543/", ":5432/").replace(/\?pgbouncer=true/, "");
  process.env.DATABASE_URL_UNPOOLED = finalizePostgresUrl(derived);
}

const isBuild = process.argv.includes("--build");
const isVercel = Boolean(process.env.VERCEL);

loadEnvFiles();
normalizeDatabaseEnv();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    "";
}

function hasSupabaseAuthEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key);
}

function hasSupabaseServiceRole() {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  );
}

export function isPostgresUrl(url) {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function ensureDatabaseUrlForGenerate() {
  if (isUsableDatabaseUrl(process.env.DATABASE_URL)) {
    return process.env.DATABASE_URL;
  }

  process.env.DATABASE_URL = PRISMA_GENERATE_PLACEHOLDER_URL;
  console.warn(
    "\n⚠️  DATABASE_URL is not set. Using a placeholder for prisma generate only.\n"
  );
  return process.env.DATABASE_URL;
}

if (isBuild) {
  const databaseUrl = isUsableDatabaseUrl(process.env.DATABASE_URL)
    ? process.env.DATABASE_URL
    : "";

  if (hasSupabaseAuthEnv()) {
    console.log("✓ Supabase Auth env detected");
    if (!hasSupabaseServiceRole()) {
      console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY missing — user sync & /api/setup will fail");
    }
  }

  if (!databaseUrl) {
    console.log("✓ Static auth mode — DATABASE_URL not required");
  } else if (isVercel && isPostgresUrl(databaseUrl)) {
    console.log("✓ Supabase/Postgres DATABASE_URL validated for Vercel build");
  } else if (isPostgresUrl(databaseUrl)) {
    console.log("✓ Postgres DATABASE_URL detected");
  }
}
