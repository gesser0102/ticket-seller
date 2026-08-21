import { expect, test, type Page, type Route } from "@playwright/test";

const apiOk = (data: unknown) => ({
  success: true,
  message: "ok",
  data,
});

async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

function makeSeat(row: string, number: number) {
  return {
    id: `seat-${row}-${number}`,
    row,
    number,
    status: "available",
    heldByMe: false,
    ticketType: null,
  };
}

function makeSeatGrid() {
  const rows = "ABCDEFGHIJ".split("");
  return rows.flatMap((row) => Array.from({ length: 15 }, (_, index) => makeSeat(row, index + 1)));
}

async function mockSeatSelectionApi(page: Page) {
  await page.route("**/socket.io/**", (route) => route.abort());

  await page.route("**/api/auth/me", (route) =>
    fulfillJson(
      route,
      apiOk({
        id: "client-1",
        email: "ana@example.com",
        name: "Ana Compradora",
        role: "client",
        registered: true,
      }),
    ),
  );

  await page.route("**/api/screenings/screening-1", (route) =>
    fulfillJson(
      route,
      apiOk({
        id: "screening-1",
        movieId: "movie-1",
        movieTitle: "Primeira Fila",
        moviePosterUrl:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 180'%3E%3Crect width='120' height='180' fill='%23100f18'/%3E%3Ctext x='16' y='95' fill='%23ffc947' font-size='14'%3EPoster%3C/text%3E%3C/svg%3E",
        venue: "Sala 2",
        startsAt: "2027-01-15T20:00:00.000Z",
        priceCents: 4500,
        status: "published",
      }),
    ),
  );

  await page.route("**/api/screenings/screening-1/seats", (route) => fulfillJson(route, apiOk(makeSeatGrid())));

  await page.route("**/api/seats/seat-A-1/hold", (route) =>
    fulfillJson(
      route,
      apiOk({
        ...makeSeat("A", 1),
        status: "held",
        heldByMe: true,
      }),
      201,
    ),
  );

  await page.route("**/api/orders", (route) =>
    fulfillJson(
      route,
      apiOk({
        id: "order-1",
        screeningId: "screening-1",
        status: "hold",
        totalCents: 4500,
        holdExpires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
      201,
    ),
  );
}

test("mobile: mapa de assentos cabe na tela e permite reservar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Cobre especificamente o viewport mobile.");
  await mockSeatSelectionApi(page);

  await page.goto("/sessoes/screening-1/assentos");

  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Primeira Fila" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Mapa de assentos" })).toBeVisible();
  await expect(page.locator(".seatmap-row-label").filter({ hasText: "A" })).toBeVisible();
  await expect(page.locator(".seatmap-row-label").filter({ hasText: "J" })).toBeVisible();

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: /^Assento A1\b.*dispon/ }).click();

  const summary = page.locator(".seat-summary-panel");
  await expect(summary.locator(".seat-summary-seats")).toContainText("A1");
  await expect(summary.getByRole("button", { name: "Continuar" })).toBeEnabled();

  await summary.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/checkout\/order-1\/tipo-ingresso$/);
});
