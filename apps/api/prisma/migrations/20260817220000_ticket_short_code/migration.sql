ALTER TABLE "tickets" ADD COLUMN "short_code" TEXT;

UPDATE "tickets" SET "short_code" = 'DEM-001' WHERE "short_code" IS NULL;

ALTER TABLE "tickets" ALTER COLUMN "short_code" SET NOT NULL;

CREATE UNIQUE INDEX "tickets_short_code_key" ON "tickets"("short_code");
