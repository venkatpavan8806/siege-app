// scripts/create-user.ts
//
// Creates a new user with a given email/password/role.
// Usage: npx tsx scripts/create-user.ts <email> <password> <ADMIN|ANALYST>
//
// This does NOT print the password back to the terminal after creation,
// unlike seed.ts — avoid echoing real credentials in scrollback/logs.

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
  const [, , email, plainPassword, roleArg] = process.argv;

  if (!email || !plainPassword || !roleArg) {
    console.error(
      "Usage: npx tsx scripts/create-user.ts <email> <password> <ADMIN|ANALYST>"
    );
    process.exit(1);
  }

  const role = roleArg.toUpperCase();
  if (role !== "ADMIN" && role !== "ANALYST") {
    console.error(`Invalid role "${roleArg}" — must be ADMIN or ANALYST.`);
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists — no changes made.`);
    return;
  }

  const passwordHash = await hashPassword(plainPassword);
  const user = await prisma.user.create({
    data: { email, passwordHash, role: role as "ADMIN" | "ANALYST" },
  });

  console.log(`Created user: ${user.email} (role: ${user.role})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());