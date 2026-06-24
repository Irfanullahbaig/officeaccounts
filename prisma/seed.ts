import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.allowedUser.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      passwordHash,
      role: "super_admin",
      status: "active",
    },
  });

  const settings = [
    { key: "company_name", value: JSON.stringify("N9Accounts") },
    { key: "session_timeout_minutes", value: JSON.stringify(480) },
    { key: "default_loan_interest_type", value: JSON.stringify("daily_diminishing") },
    { key: "two_factor_required", value: JSON.stringify(false) },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log("Seed complete.");
  console.log("Login: admin@company.com / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
