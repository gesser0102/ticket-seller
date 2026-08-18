import { useEffect, useState } from "react";
import type { TicketDto } from "@ticket-seller/shared";
import { apiClient } from "../../lib/apiClient";
import { Spinner } from "../../ui/Spinner";
import { EmptyState } from "../../ui/EmptyState";
import { Modal } from "../../ui/Modal";
import { IconTicket } from "../../ui/icons";
import { TicketPreviewCard } from "./TicketPreviewCard";
import { TicketCard } from "./TicketCard";
import "./tickets.css";

export function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketDto[] | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDto | null>(null);

  useEffect(() => {
    apiClient.get<TicketDto[]>("/tickets/mine").then(setTickets);
  }, []);

  if (tickets === null) return <Spinner label="Carregando ingressos…" />;

  return (
    <div className="container" style={{ paddingBlock: "var(--space-6)" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Meus ingressos</h1>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<IconTicket width={40} height={40} color="var(--color-text-faint)" />}
          title="Você ainda não tem ingressos"
          hint="Escolha um evento e garanta seu assento."
        />
      ) : (
        <div className="tickets-grid">
          {tickets.map((ticket) => (
            <TicketPreviewCard key={ticket.id} ticket={ticket} onClick={() => setSelectedTicket(ticket)} />
          ))}
        </div>
      )}

      <Modal open={selectedTicket !== null} title="Ingresso" onClose={() => setSelectedTicket(null)}>
        {selectedTicket && <TicketCard ticket={selectedTicket} />}
      </Modal>
    </div>
  );
}
