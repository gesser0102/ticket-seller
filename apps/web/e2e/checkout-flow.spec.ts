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

async function mockCheckoutApi(page: Page) {
  const holdExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  let paymentAttempts = 0;

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

  await page.route("**/api/orders/order-1/pay", (route) => {
    paymentAttempts += 1;
    return fulfillJson(
      route,
      apiOk({
        status: "approved",
        order: {
          id: "order-1",
          screeningId: "screening-1",
          status: "paid",
          totalCents: 4500,
          holdExpires: null,
        },
        tickets: [
          {
            id: "ticket-1",
            token: "ticket-token-1",
            shortCode: "ABC-123",
            type: "inteira",
            status: "valid",
            seat: { row: "A", number: 1 },
            screening: {
              movieTitle: "Primeira Fila",
              moviePosterUrl: "/poster.jpg",
              venue: "Sala 2",
              startsAt: "2027-01-15T20:00:00.000Z",
            },
            usedAt: null,
          },
        ],
      }),
      201,
    );
  });

  await page.route("**/api/orders/order-1", (route) =>
    fulfillJson(
      route,
      apiOk({
        id: "order-1",
        screeningId: "screening-1",
        status: "hold",
        totalCents: 4500,
        holdExpires,
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

  await page.route("**/api/screenings/screening-1/seats", (route) =>
    fulfillJson(
      route,
      apiOk([
        {
          id: "seat-a1",
          row: "A",
          number: 1,
          status: "held",
          heldByMe: true,
          ticketType: "inteira",
        },
        {
          id: "seat-a2",
          row: "A",
          number: 2,
          status: "available",
          heldByMe: false,
          ticketType: null,
        },
      ]),
    ),
  );

  return {
    paymentAttempts: () => paymentAttempts,
  };
}

test("checkout aprova Pix e mostra ingressos emitidos", async ({ page }) => {
  const api = await mockCheckoutApi(page);

  await page.goto("/checkout/order-1");

  const main = page.getByRole("main");
  await expect(page.getByRole("heading", { name: "Pagamento" })).toBeVisible();
  await expect(main.getByText("Primeira Fila")).toBeVisible();
  await expect(main.getByText("A1")).toBeVisible();
  await expect(page.getByRole("button", { name: /Pix/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /Pagar\s+R\$\s*45,00/ }).click();

  await expect(page.getByText("Pagamento aprovado")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ingressos emitidos!" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver meus ingressos" })).toHaveAttribute("href", "/tickets");
  expect(api.paymentAttempts()).toBe(1);
});
