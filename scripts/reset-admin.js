const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

(async () => {
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const adapter = new PrismaPg(
    new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  );
  const prisma = new PrismaClient({ adapter });
  const org = await prisma.organization.upsert({
    where: { id: "default-org" },
    update: {},
    create: { id: "default-org", name: "Default Org" },
  });
  const hash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@example.com" },
    update: { passwordHash: hash, orgId: org.id },
    create: {
      email: "admin@example.com",
      name: "Default Admin",
      passwordHash: hash,
      role: "OWNER",
      orgId: org.id,
    },
  });
  console.log(`Reset admin ${admin.email} to password ${password}`);
  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
