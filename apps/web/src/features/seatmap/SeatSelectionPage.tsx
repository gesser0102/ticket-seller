import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { OrderDto, ScreeningDetailDto, SeatDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { Spinner } from "../../ui/Spinner";
import { MessageBar } from "../../ui/MessageBar";
import { SeatMap } from "./SeatMap";
import { SeatSummaryPanel } from "./SeatSummaryPanel";
import { useSeatRealtime } from "./useSeatRealtime";
import "./seatmap.css";

export function SeatSelectionPage() {
  const { screeningId } = useParams<{ screeningId: string }>();
  const navigate = useNavigate();
  const [screening, setScreening] = useState<ScreeningDetailDto | null>(null);
  const [seats, setSeats] = useState<SeatDto[] | null>(null);
  const [pendingSeatId, setPendingSeatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const refetchSeats = useCallback(() => {
    if (!screeningId) return;
    apiClient.get<SeatDto[]>(`/screenings/${screeningId}/seats`).then(setSeats);
  }, [screeningId]);

  useEffect(() => {
    if (!screeningId) return;
    apiClient.get<ScreeningDetailDto>(`/screenings/${screeningId}`).then(setScreening);
    refetchSeats();
  }, [screeningId, refetchSeats]);

  useSeatRealtime(screeningId ?? "", {
    onHeld: ({ seatId }) => {
      setSeats((prev) => (prev ? prev.map((s) => (s.id === seatId && !s.heldByMe ? { ...s, status: "held" } : s)) : prev));
    },
    onReleased: ({ seatId }) => {
      setSeats((prev) =>
        prev ? prev.map((s) => (s.id === seatId ? { ...s, status: "available", heldByMe: false } : s)) : prev,
      );
    },
    onSold: ({ seatId }) => {
      setSeats((prev) => (prev ? prev.map((s) => (s.id === seatId ? { ...s, status: "sold", heldByMe: false } : s)) : prev));
    },
    onNeedsRefetch: refetchSeats,
  });

  async function handleSeatClick(seat: SeatDto) {
    setPendingSeatId(seat.id);
    setError(null);
    try {
      const updated = seat.heldByMe
        ? await apiClient.delete<SeatDto>(`/seats/${seat.id}/hold`)
        : await apiClient.post<SeatDto>(`/seats/${seat.id}/hold`);
      setSeats((prev) => (prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar este assento.");
      refetchSeats();
    } finally {
      setPendingSeatId(null);
    }
  }

  async function handleContinue() {
    if (!screeningId || !seats) return;
    const mySeatIds = seats.filter((s) => s.heldByMe).map((s) => s.id);
    if (mySeatIds.length === 0) return;

    setCreatingOrder(true);
    setError(null);
    try {
      const order = await apiClient.post<OrderDto>("/orders", { screeningId, seatIds: mySeatIds });
      navigate(`/checkout/${order.id}/tipo-ingresso`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a reserva.");
      setCreatingOrder(false);
      refetchSeats();
    }
  }

  if (!screening || !seats) return <Spinner label="Carregando mapa de assentos…" />;

  const mySeats = seats.filter((s) => s.heldByMe);

  return (
    <div className="seat-selection-page">
      <div className="container seat-selection-header">
        <Link to={`/filmes/${screening.movieId}`} className="nav-link" style={{ fontSize: "0.85rem" }}>
          ← Voltar pro filme
        </Link>
        <h1>{screening.movieTitle}</h1>
        <p>{screening.venue}</p>
      </div>

      {error && (
        <div className="container" style={{ marginBlock: "var(--space-4)" }}>
          <MessageBar tone="danger">{error}</MessageBar>
        </div>
      )}

      <div className="container seat-selection-layout">
        <SeatMap seats={seats} pendingSeatId={pendingSeatId} onSeatClick={handleSeatClick} />
        <SeatSummaryPanel
          screening={screening}
          selectedSeats={mySeats}
          onContinue={handleContinue}
          continuing={creatingOrder}
        />
      </div>
    </div>
  );
}
