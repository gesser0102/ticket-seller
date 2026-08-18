import type { TicketDto } from "@ticket-seller/shared";
import { formatDateTime } from "../../lib/format";

const STATUS_LABEL: Record<TicketDto["status"], string> = {
  valid: "Válido",
  used: "Utilizado",
  cancelled: "Cancelado",
};

export function TicketPreviewCard({ ticket, onClick }: { ticket: TicketDto; onClick: () => void }) {
  const used = ticket.status !== "valid";

  return (
    <button type="button" className="ticket-preview-card" onClick={onClick}>
      <div className="ticket-preview-poster">
        <img
          src={ticket.screening.moviePosterUrl}
          alt=""
          loading="lazy"
          className={used ? "ticket-preview-poster-img-dim" : ""}
        />
        {ticket.status !== "used" && (
          <span className={`badge ${ticket.status === "valid" ? "badge-success" : "badge-muted"} ticket-preview-badge`}>
            {STATUS_LABEL[ticket.status]}
          </span>
        )}
        {ticket.status === "used" && <span className="ticket-preview-ribbon">Utilizado</span>}
      </div>
      <div className="ticket-preview-info">
        <h3>{ticket.screening.movieTitle}</h3>
        <p className="ticket-preview-venue">{ticket.screening.venue}</p>
        <p className="mono ticket-preview-date">{formatDateTime(ticket.screening.startsAt)}</p>
        <p className="ticket-preview-seat">
          Fileira {ticket.seat.row} · Assento {ticket.seat.number} · {ticket.type === "meia" ? "Meia" : "Inteira"}
        </p>
      </div>
    </button>
  );
}
