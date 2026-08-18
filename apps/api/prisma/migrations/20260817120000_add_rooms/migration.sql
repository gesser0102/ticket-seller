CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "organizer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rooms_organizer_id_name_key" ON "rooms"("organizer_id", "name");

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
