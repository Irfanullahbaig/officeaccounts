import { PrismaClient } from "@prisma/client";
import { ensureDefaultAdminOnClient } from "../src/lib/auth/admin-credentials";

const prisma = new PrismaClient();

async function main() {
  await ensureDefaultAdminOnClient(prisma);

  const settings = [
    { key: "company_name", value: JSON.stringify("N9Accounts") },
    { key: "session_timeout_minutes", value: JSON.stringify(480) },
    { key: "default_loan_interest_type", value: JSON.stringify("daily_diminishing") },
    { key: "two_factor_required", value: JSON.stringify(false) },
    {
      key: "earnings_active_period",
      value: JSON.stringify({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      }),
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log("Seed complete.");
  console.log("Login: admin@northnine.pk / N9Accounts@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
