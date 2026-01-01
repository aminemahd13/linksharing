/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

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
