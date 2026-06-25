import { execSync } from "node:child_process";
import { ensureDatabaseUrlForGenerate } from "./validate-env.mjs";

ensureDatabaseUrlForGenerate();

execSync("npx prisma generate", { stdio: "inherit" });
