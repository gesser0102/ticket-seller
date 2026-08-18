import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const SEED_PASSWORD = "senha123";
const NOW_PLAYING_COUNT = 10;
const DEMO_TICKET_TOKEN = "seed-demo-ticket-token-0001";
const DEMO_TICKET_SHORT_CODE = "DEM-234";

interface MovieSeed {
  externalRef: string;
  title: string;
  posterUrl: string;
  backdropUrl: string | null;
  synopsis: string;
}

const FALLBACK_MOVIES: MovieSeed[] = [
  {
    externalRef: "550",
    title: "Clube da Luta",
    posterUrl: "https://image.tmdb.org/t/p/w500/mCICnh7QBH0gzYaTQChBDDVIKdm.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/c6OLXfKAk5BKeR6broC8pYiCquX.jpg",
    synopsis:
      "Um homem deprimido que sofre de insônia conhece um estranho vendedor de sabonetes chamado Tyler Durden. Eles formam um clube clandestino com regras rígidas onde lutam com outros homens cansados de suas vidas mundanas. Mas sua parceria perfeita é comprometida quando Marla chama a atenção de Tyler.",
  },
  {
    externalRef: "155",
    title: "Batman: O Cavaleiro das Trevas",
    posterUrl: "https://image.tmdb.org/t/p/w500/4lj1ikfsSmMZNyfdi8R8Tv5tsgb.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg",
    synopsis:
      "Após dois anos desde o surgimento do Batman, os criminosos de Gotham City têm muito o que temer. Com a ajuda do tenente James Gordon e do promotor público Harvey Dent, Batman luta contra o crime organizado. Acuados com o combate, os chefes do crime aceitam a proposta feita pelo Coringa e o contratam para combater o Homem-Morcego.",
  },
];

interface TmdbNowPlayingItem {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

interface TmdbNowPlayingResponse {
  results?: TmdbNowPlayingItem[];
}

async function fetchNowPlaying(count: number): Promise<MovieSeed[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn(
      "TMDB_API_KEY não configurada — usando o catálogo de exemplo fixo em vez do em cartaz real da TMDb.",
    );
    return FALLBACK_MOVIES;
  }

  try {
    const response = await fetch(
      "https://api.themoviedb.org/3/movie/now_playing?language=pt-BR&region=BR&page=1",
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!response.ok) {
      console.warn(
        `TMDb respondeu ${response.status} ao buscar "em cartaz" — usando o catálogo de exemplo fixo.`,
      );
      return FALLBACK_MOVIES;
    }

    const body = (await response.json()) as TmdbNowPlayingResponse;
    const items = (body.results ?? []).slice(0, count);
    if (items.length === 0) {
      console.warn('TMDb não retornou nenhum filme "em cartaz" — usando o catálogo de exemplo fixo.');
      return FALLBACK_MOVIES;
    }

    return items.map((item) => ({
      externalRef: String(item.id),
      title: item.title,
      posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
      synopsis: item.overview || "Sinopse não disponível.",
    }));
  } catch (error) {
    console.warn(
      `Falha ao buscar "em cartaz" na TMDb (${error instanceof Error ? error.message : "erro desconhecido"}) — usando o catálogo de exemplo fixo.`,
    );
    return FALLBACK_MOVIES;
  }
}

const ROOMS = ["Sala 1", "Sala 2"];
const TIMES_BY_ROOM: Record<string, string[]> = {
  "Sala 1": ["14:30", "20:30"],
  "Sala 2": ["17:00", "21:45"],
};
const DATE_OFFSETS_DAYS = [0, 1, 2];

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const SEATS_PER_ROW = 15;

async function upsertUser(
  email: string,
  role: "organizer" | "client" | "gate",
  name?: string,
) {
  const passwordHash = await argon2.hash(SEED_PASSWORD);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role, name },
  });
}

function startsAtFor(dayOffset: number, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function seatsFor(screeningId: string) {
  const seatsData = ROWS.flatMap((row) =>
    Array.from({ length: SEATS_PER_ROW }, (_, i) => ({
      screeningId,
      row,
      number: i + 1,
    })),
  );
  await prisma.seat.createMany({ data: seatsData });
}

async function main() {
  const organizer = await upsertUser("organizador@ticketseller.dev", "organizer");
  const client1 = await upsertUser("cliente1@ticketseller.dev", "client", "Ana Cliente");
  await upsertUser("cliente2@ticketseller.dev", "client", "Bruno Cliente");
  await upsertUser("portaria@ticketseller.dev", "gate");

  for (const room of ROOMS) {
    await prisma.room.upsert({
      where: { organizerId_name: { organizerId: organizer.id, name: room } },
      update: {},
      create: { organizerId: organizer.id, name: room, priceCents: 4500 },
    });
  }

  const movies = await fetchNowPlaying(NOW_PLAYING_COUNT);

  let firstScreeningId: string | null = null;

  for (const movieData of movies) {
    const existingMovie = await prisma.movie.findFirst({
      where: { organizerId: organizer.id, externalRef: movieData.externalRef },
    });

    const movie =
      existingMovie ??
      (await prisma.movie.create({
        data: {
          organizerId: organizer.id,
          source: "tmdb",
          externalRef: movieData.externalRef,
          title: movieData.title,
          posterUrl: movieData.posterUrl,
          backdropUrl: movieData.backdropUrl,
          synopsis: movieData.synopsis,
        },
      }));

    const existingScreeningCount = await prisma.screening.count({ where: { movieId: movie.id } });
    if (existingScreeningCount > 0) {
      const first = await prisma.screening.findFirst({ where: { movieId: movie.id }, orderBy: { startsAt: "asc" } });
      firstScreeningId ??= first?.id ?? null;
      continue;
    }

    for (const dayOffset of DATE_OFFSETS_DAYS) {
      for (const room of ROOMS) {
        for (const time of TIMES_BY_ROOM[room]) {
          const screening = await prisma.screening.create({
            data: {
              movieId: movie.id,
              venue: room,
              startsAt: startsAtFor(dayOffset, time),
              priceCents: 4500,
              status: "published",
            },
          });
          await seatsFor(screening.id);
          firstScreeningId ??= screening.id;
        }
      }
    }
  }

  const existingDemoTicket = await prisma.ticket.findUnique({ where: { token: DEMO_TICKET_TOKEN } });
  if (!existingDemoTicket && firstScreeningId) {
    const demoSeat = await prisma.seat.findFirst({
      where: { screeningId: firstScreeningId, row: "A", number: 1, status: "available" },
    });
    if (demoSeat) {
      const screening = await prisma.screening.findUniqueOrThrow({ where: { id: firstScreeningId } });
      const demoOrder = await prisma.order.create({
        data: { screeningId: firstScreeningId, clientId: client1.id, status: "paid", totalCents: screening.priceCents },
      });
      await prisma.seat.update({
        where: { id: demoSeat.id },
        data: { status: "sold", orderId: demoOrder.id, ticketType: "inteira" },
      });
      await prisma.payment.create({
        data: { orderId: demoOrder.id, status: "approved", amountCents: screening.priceCents },
      });
      await prisma.ticket.create({
        data: {
          orderId: demoOrder.id,
          screeningId: firstScreeningId,
          seatId: demoSeat.id,
          type: "inteira",
          token: DEMO_TICKET_TOKEN,
          shortCode: DEMO_TICKET_SHORT_CODE,
          status: "valid",
        },
      });
    }
  }

  const movieCount = await prisma.movie.count();
  const screeningCount = await prisma.screening.count();

  console.log("Seed concluído.");
  console.log(`Organizador: organizador@ticketseller.dev / ${SEED_PASSWORD}`);
  console.log(`Cliente 1:   cliente1@ticketseller.dev / ${SEED_PASSWORD}`);
  console.log(`Cliente 2:   cliente2@ticketseller.dev / ${SEED_PASSWORD}`);
  console.log(`Portaria:    portaria@ticketseller.dev / ${SEED_PASSWORD}`);
  console.log(`${movieCount} filme(s), ${screeningCount} sessão(ões) publicada(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
