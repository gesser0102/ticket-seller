import type { ScreeningDetailDto, SeatDto } from "@ticket-seller/shared";
import { formatCents, formatDateTime } from "../../lib/format";
import "./seatmap.css";

interface SeatSummaryPanelProps {
  screening: ScreeningDetailDto;
  selectedSeats: SeatDto[];
  onContinue: () => void;
  continuing: boolean;
}

export function SeatSummaryPanel({ screening, selectedSeats, onContinue, continuing }: SeatSummaryPanelProps) {
  const total = selectedSeats.length * screening.priceCents;

  return (
    <aside className="seat-summary-panel">
      <h2 className="seat-summary-title">Resumo da compra</h2>

      <div className="seat-summary-block">
        <span className="seat-summary-label">Filme</span>
        <div className="seat-summary-movie">
          <img src={screening.moviePosterUrl} alt="" />
          <span>{screening.movieTitle}</span>
        </div>
      </div>

      <div className="seat-summary-block">
        <span className="seat-summary-label">Sessão</span>
        <p>{screening.venue}</p>
        <p className="mono seat-summary-date">{formatDateTime(screening.startsAt)}</p>
      </div>

      <div className="seat-summary-block">
        <span className="seat-summary-label">Assentos</span>
        {selectedSeats.length === 0 ? (
          <p className="seat-summary-empty">Nenhum assento selecionado ainda.</p>
        ) : (
          <ul className="seat-summary-seats">
            {selectedSeats.map((seat) => (
              <li key={seat.id}>
                {seat.row}
                {seat.number}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="seat-summary-total">
        <span>Total</span>
        <strong>{formatCents(total)}</strong>
      </div>

      <button
        className="btn btn-primary btn-block"
        disabled={selectedSeats.length === 0 || continuing}
        onClick={onContinue}
      >
        {continuing ? "Criando reserva…" : "Continuar"}
      </button>
    </aside>
  );
}
