/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set for seeding");
}

const adapter = new PrismaPg(
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })
);

const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const org = await prisma.organization.upsert({
    where: { id: "default-org" },
    update: { name: "Default Org" },
    create: { id: "default-org", name: "Default Org" },
  });

  const admin = await prisma.admin.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Default Admin",
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER",
      orgId: org.id,
    },
  });

  console.log(`Seeded admin ${admin.email} with password ${password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
