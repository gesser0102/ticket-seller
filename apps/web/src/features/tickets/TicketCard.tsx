import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { TicketDto } from "@ticket-seller/shared";
import { formatDateTime } from "../../lib/format";
import { IconShare, IconCheck } from "../../ui/icons";
import { showToast } from "../../ui/toast";
import "./tickets.css";

const STATUS_LABEL: Record<TicketDto["status"], string> = {
  valid: "Válido",
  used: "Utilizado",
  cancelled: "Cancelado",
};

export function TicketCard({ ticket, allowShare = true }: { ticket: TicketDto; allowShare?: boolean }) {
  const [copied, setCopied] = useState(false);
  const used = ticket.status !== "valid";

  async function handleShare() {
    const url = `${window.location.origin}/i/${ticket.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("Link copiado para a área de trabalho!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie o link do ingresso:", url);
    }
  }

  return (
    <div className={`ticket-card ${used ? "ticket-card-used" : ""}`}>
      <div className="ticket-card-info">
        {ticket.status !== "used" && (
          <span className={`badge ${ticket.status === "valid" ? "badge-success" : "badge-muted"}`}>
            {STATUS_LABEL[ticket.status]}
          </span>
        )}
        <h3 style={{ marginTop: "var(--space-2)" }}>{ticket.screening.movieTitle}</h3>
        <p className="ticket-card-venue">{ticket.screening.venue}</p>
        <p className="mono ticket-card-date">{formatDateTime(ticket.screening.startsAt)}</p>
        <p className="ticket-card-seat">
          Fileira {ticket.seat.row} · Assento {ticket.seat.number} ·{" "}
          {ticket.type === "meia" ? "Meia" : "Inteira"}
        </p>
        {ticket.usedAt && <p className="ticket-card-used-at">Utilizado em {formatDateTime(ticket.usedAt)}</p>}

        {allowShare && (
          <button className="btn btn-ghost ticket-card-share" onClick={handleShare}>
            {copied ? <IconCheck width={16} height={16} /> : <IconShare width={16} height={16} />}
            {copied ? "Link copiado" : "Compartilhar ingresso"}
          </button>
        )}
      </div>

      <div className="ticket-card-qr">
        <div className={`ticket-card-qr-inner ${used ? "ticket-card-qr-dim" : ""}`}>
          <QRCodeSVG value={ticket.token} size={128} bgColor="var(--color-qr-bg)" fgColor="var(--color-qr-ink)" level="M" />
          <span className="mono ticket-card-token">{ticket.shortCode}</span>
        </div>
        {ticket.status === "used" && <span className="ticket-card-ribbon">Utilizado</span>}
      </div>
    </div>
  );
}
