import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("N9Accounts@123", 12);

  await prisma.allowedUser.upsert({
    where: { email: "admin@northnine.pk" },
    update: {
      passwordHash,
      role: "super_admin",
      status: "active",
    },
    create: {
      email: "admin@northnine.pk",
      passwordHash,
      role: "super_admin",
      status: "active",
    },
  });

  await prisma.allowedUser.deleteMany({
    where: { email: "admin@company.com" },
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
  console.log("Login: admin@northnine.pk / N9Accounts@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
