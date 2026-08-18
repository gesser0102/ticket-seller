CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "Role" AS ENUM ('organizer', 'client', 'gate');

CREATE TYPE "MovieSource" AS ENUM ('tmdb');

CREATE TYPE "ScreeningStatus" AS ENUM ('draft', 'published');

CREATE TYPE "SeatStatus" AS ENUM ('available', 'held', 'sold');

CREATE TYPE "OrderStatus" AS ENUM ('hold', 'paid', 'cancelled');

CREATE TYPE "TicketType" AS ENUM ('inteira', 'meia');

CREATE TYPE "TicketStatus" AS ENUM ('valid', 'used', 'cancelled');

CREATE TYPE "PaymentStatus" AS ENUM ('approved', 'declined');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "name" TEXT,
    "cpf" TEXT,
    "phone" TEXT,
    "birth_date" TIMESTAMP(3),
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movies" (
    "id" TEXT NOT NULL,
    "organizer_id" TEXT NOT NULL,
    "source" "MovieSource" NOT NULL DEFAULT 'tmdb',
    "external_ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "poster_url" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "screenings" (
    "id" TEXT NOT NULL,
    "movie_id" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "status" "ScreeningStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screenings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seats" (
    "id" TEXT NOT NULL,
    "screening_id" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'available',
    "held_by" TEXT,
    "hold_expires" TIMESTAMP(3),
    "order_id" TEXT,
    "ticket_type" "TicketType",

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "screening_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'hold',
    "total_cents" INTEGER NOT NULL,
    "hold_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "screening_id" TEXT NOT NULL,
    "seat_id" TEXT NOT NULL,
    "type" "TicketType" NOT NULL DEFAULT 'inteira',
    "token" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'valid',
    "used_at" TIMESTAMP(3),
    "used_by_gate_id" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

CREATE INDEX "screenings_movie_id_status_idx" ON "screenings"("movie_id", "status");

CREATE INDEX "seats_screening_id_status_idx" ON "seats"("screening_id", "status");

CREATE INDEX "seats_order_id_idx" ON "seats"("order_id");

CREATE UNIQUE INDEX "seats_screening_id_row_number_key" ON "seats"("screening_id", "row", "number");

CREATE INDEX "orders_status_hold_expires_idx" ON "orders"("status", "hold_expires");

CREATE UNIQUE INDEX "tickets_token_key" ON "tickets"("token");

CREATE INDEX "IDX_session_expire" ON "session"("expire");

ALTER TABLE "movies" ADD CONSTRAINT "movies_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "screenings" ADD CONSTRAINT "screenings_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seats" ADD CONSTRAINT "seats_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seats" ADD CONSTRAINT "seats_held_by_fkey" FOREIGN KEY ("held_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "seats" ADD CONSTRAINT "seats_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_used_by_gate_id_fkey" FOREIGN KEY ("used_by_gate_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

