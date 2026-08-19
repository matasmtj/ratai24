-- Allow admin manual reservations without a registered user account.
ALTER TABLE "Contract" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Contract" ADD COLUMN "guestName" TEXT;
ALTER TABLE "Contract" ADD COLUMN "guestPhone" TEXT;
ALTER TABLE "Contract" ADD COLUMN "guestEmail" TEXT;
