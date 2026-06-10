ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "editLockedByUserId" INTEGER;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "editLockedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "Contract"
    ADD CONSTRAINT "Contract_editLockedByUserId_fkey"
    FOREIGN KEY ("editLockedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
