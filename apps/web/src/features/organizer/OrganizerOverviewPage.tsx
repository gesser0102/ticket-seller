import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { OrganizerOverviewDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { formatCents, formatDateTime } from "../../lib/format";
import { MessageBar } from "../../ui/MessageBar";
import { Spinner } from "../../ui/Spinner";

export function OrganizerOverviewPage() {
  const [overview, setOverview] = useState<OrganizerOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<OrganizerOverviewDto>("/organizer/overview")
      .then(setOverview)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar visão geral."));
  }, []);

  if (error) return <MessageBar tone="danger">{error}</MessageBar>;
  if (!overview) return <Spinner label="Carregando visão geral…" />;

  return (
    <div className="organizer-page">
      <h1 className="organizer-page-title">Visão geral</h1>

      <div className="organizer-stat-row">
        <div className="organizer-stat-tile">
          <span className="organizer-stat-value">{overview.movieCount}</span>
          <span className="organizer-stat-label">Filme(s)</span>
        </div>
        <div className="organizer-stat-tile">
          <span className="organizer-stat-value">{overview.screeningCount}</span>
          <span className="organizer-stat-label">Sessão(ões) publicada(s)</span>
        </div>
      </div>

      <div className="organizer-section">
        <h2 className="organizer-section-title">Próximas sessões</h2>
        {overview.upcomingScreenings.length === 0 ? (
          <p className="organizer-empty-hint">
            Nenhuma sessão publicada ainda. Vá em <Link to="/organizer/filmes">Filmes</Link> pra adicionar um filme e
            depois publicar sessões.
          </p>
        ) : (
          <table className="organizer-table mono">
            <thead>
              <tr>
                <th>Filme</th>
                <th>Sala</th>
                <th>Quando</th>
                <th>Preço</th>
              </tr>
            </thead>
            <tbody>
              {overview.upcomingScreenings.map((s) => (
                <tr key={s.id}>
                  <td>{s.movieTitle}</td>
                  <td>{s.venue}</td>
                  <td>{formatDateTime(s.startsAt)}</td>
                  <td>{formatCents(s.priceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
