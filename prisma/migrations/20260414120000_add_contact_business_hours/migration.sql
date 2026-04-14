-- Add configurable business hours for contacts page/footer.
ALTER TABLE "Contact"
ADD COLUMN "businessHoursWeekdays" TEXT NOT NULL DEFAULT '8:00 - 18:00',
ADD COLUMN "businessHoursWeekend" TEXT NOT NULL DEFAULT '9:00 - 15:00';
