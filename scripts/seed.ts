// scripts/seed.ts
//
// One-off script to create the first ADMIN user, since this build has no
// public signup route. Run once with: npx tsx scripts/seed.ts
// Safe to run again later to add more users — just change the values below.

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@siege.local";
    const plainPassword = "ChangeMe123!"; // change this before/after running

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log(`User ${email} already exists, skipping.`);
        return;
    }

    const passwordHash = await hashPassword(plainPassword);

    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            role: "ADMIN",
        },
    });

    console.log("Created admin user:");
    console.log(`  email: ${user.email}`);
    console.log(`  password: ${plainPassword}`);
    console.log("Log in at /login with these, then consider changing the password.");
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());