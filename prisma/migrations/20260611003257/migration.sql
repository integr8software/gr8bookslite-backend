ALTER TABLE "audit_logs" ADD COLUMN "platformModuleId" INTEGER;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_platformModuleId_fkey"
FOREIGN KEY ("platformModuleId") REFERENCES "platform_modules"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
