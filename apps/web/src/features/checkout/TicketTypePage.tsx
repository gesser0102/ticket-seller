import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { OrderDto, ScreeningDetailDto, SeatDto, TicketType } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { formatCents } from "../../lib/format";
import { Spinner } from "../../ui/Spinner";
import { MessageBar } from "../../ui/MessageBar";
import "./checkout.css";

export function TicketTypePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [screening, setScreening] = useState<ScreeningDetailDto | null>(null);
  const [seats, setSeats] = useState<SeatDto[] | null>(null);
  const [types, setTypes] = useState<Record<string, TicketType>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    apiClient.get<OrderDto>(`/orders/${orderId}`).then(async (fetchedOrder) => {
      setOrder(fetchedOrder);
      const [screeningData, seatsData] = await Promise.all([
        apiClient.get<ScreeningDetailDto>(`/screenings/${fetchedOrder.screeningId}`),
        apiClient.get<SeatDto[]>(`/screenings/${fetchedOrder.screeningId}/seats`),
      ]);
      setScreening(screeningData);
      const mySeats = seatsData.filter((s) => s.heldByMe);
      setSeats(mySeats);
      setTypes(Object.fromEntries(mySeats.map((s) => [s.id, s.ticketType ?? "inteira"])));
    });
  }, [orderId]);

  if (!order || !screening || !seats) return <Spinner label="Carregando ingressos…" />;

  const fullPrice = screening.priceCents;
  const halfPrice = Math.round(fullPrice / 2);
  const total = seats.reduce((sum, seat) => sum + (types[seat.id] === "meia" ? halfPrice : fullPrice), 0);

  async function handleSubmit() {
    if (!orderId) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/orders/${orderId}/ticket-types`, {
        items: seats!.map((seat) => ({ seatId: seat.id, type: types[seat.id] ?? "inteira" })),
      });
      navigate(`/checkout/${orderId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o tipo de ingresso.");
      setSaving(false);
    }
  }

  return (
    <div className="container checkout-page">
      <h1>Tipo de ingresso</h1>
      <p style={{ color: "var(--color-text-muted)" }}>{screening.movieTitle}</p>

      <div className="ticket-type-list">
        {seats.map((seat) => (
          <div key={seat.id} className="surface ticket-type-row">
            <span className="ticket-type-seat">
              {seat.row}
              {seat.number}
            </span>
            <div className="ticket-type-options">
              <button
                type="button"
                className={`ticket-type-option ${types[seat.id] === "inteira" ? "active" : ""}`}
                onClick={() => setTypes((prev) => ({ ...prev, [seat.id]: "inteira" }))}
                disabled={saving}
              >
                Inteira
                <span>{formatCents(fullPrice)}</span>
              </button>
              <button
                type="button"
                className={`ticket-type-option ${types[seat.id] === "meia" ? "active" : ""}`}
                onClick={() => setTypes((prev) => ({ ...prev, [seat.id]: "meia" }))}
                disabled={saving}
              >
                Meia
                <span>{formatCents(halfPrice)}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <MessageBar tone="danger">{error}</MessageBar>}

      <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={saving}>
        {saving ? "Salvando…" : `Finalizar compra — ${formatCents(total)}`}
      </button>
    </div>
  );
}
