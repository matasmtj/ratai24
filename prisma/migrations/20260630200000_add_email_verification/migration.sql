-- Add email verification fields to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerified"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- Grandfather admins only: existing admins keep access without verifying,
-- everyone else must verify on next login.
UPDATE "User"
SET "emailVerified" = true,
    "emailVerifiedAt" = NOW()
WHERE "role" = 'ADMIN';

-- Email verification token table (mirrors PasswordResetToken)
CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
  "id"        SERIAL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "userId"    INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationToken_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "EmailVerificationToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx"
  ON "EmailVerificationToken"("userId");
