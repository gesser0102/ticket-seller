import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { TicketDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { Spinner } from "../../ui/Spinner";
import { EmptyState } from "../../ui/EmptyState";
import { IconX } from "../../ui/icons";
import { TicketCard } from "./TicketCard";
import "./tickets.css";

export function SharedTicketPage() {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<TicketDto | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiClient
      .get<TicketDto>(`/tickets/share/${token}`)
      .then(setTicket)
      .catch((err) => {
        if (err instanceof ApiError) setNotFound(true);
      });
  }, [token]);

  if (notFound) {
    return (
      <div className="container shared-ticket-page">
        <EmptyState
          icon={<IconX width={40} height={40} color="var(--color-text-faint)" />}
          title="Ingresso não encontrado"
          hint="O link pode estar incorreto ou o ingresso não existe mais."
        />
      </div>
    );
  }

  if (!ticket) return <Spinner label="Carregando ingresso…" />;

  return (
    <div className="container shared-ticket-page">
      <h1 style={{ marginBottom: "var(--space-2)" }}>Ingresso</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-5)" }}>
        Apresente este QR na entrada. Quem escaneia primeiro valida o acesso.
      </p>
      <TicketCard ticket={ticket} allowShare={false} />
    </div>
  );
}
