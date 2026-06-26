import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const url =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const secret =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "";

if (!url || !publishable) {
  console.error("\n❌ Missing SUPABASE_URL or publishable key in .env.local\n");
  process.exit(1);
}

async function check(label, key) {
  const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
    headers: { apikey: key },
  });
  const body = res.ok ? null : await res.json().catch(() => ({}));
  const ok = res.ok;
  console.log(`${ok ? "✓" : "❌"} ${label}: ${ok ? "valid" : body?.message ?? res.status}`);
  if (!ok && body?.hint) console.log(`   hint: ${body.hint}`);
  return ok;
}

console.log(`\nSupabase project: ${url}\n`);

const pubOk = await check("Publishable / anon key", publishable);
const secOk = secret ? await check("Secret / service_role key", secret) : false;

if (!pubOk || !secOk) {
  console.log(
    "\nFix: Supabase Dashboard → Project Settings → API Keys → copy current keys into .env.local and Vercel.\n"
  );
  process.exit(1);
}

console.log("\n✓ All Supabase API keys are registered for this project.\n");
