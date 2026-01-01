-- Make admin email unique per organization instead of globally
DROP INDEX IF EXISTS "Admin_email_key";
CREATE UNIQUE INDEX "Admin_orgId_email_key" ON "Admin"("orgId", "email");
