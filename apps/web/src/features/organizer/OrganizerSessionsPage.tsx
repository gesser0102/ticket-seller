import { useEffect, useMemo, useState } from "react";
import type { OrganizerScreeningDto, ScreeningSummaryDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { formatCents, formatDateTime } from "../../lib/format";
import { MessageBar } from "../../ui/MessageBar";
import { Spinner } from "../../ui/Spinner";
import { IconBan, IconChevronDown, IconPencil, IconPlus, IconSearch, IconTrash } from "../../ui/icons";
import { CreateSessionsModal } from "./CreateSessionsModal";
import { EditScreeningModal } from "./EditScreeningModal";

const STATUS_META: Record<OrganizerScreeningDto["status"], { label: string; badge: string }> = {
  published: { label: "publicada", badge: "badge-success" },
  draft: { label: "rascunho", badge: "badge-muted" },
  cancelled: { label: "cancelada", badge: "badge-danger" },
};

const PAGE_SIZE = 20;

export function OrganizerSessionsPage() {
  const [screenings, setScreenings] = useState<OrganizerScreeningDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizerScreeningDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadScreenings();
  }, []);

  function loadScreenings() {
    apiClient
      .get<OrganizerScreeningDto[]>("/organizer/screenings")
      .then(setScreenings)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar sessões."));
  }

  function handleUpdated(updated: ScreeningSummaryDto) {
    setScreenings((prev) => (prev ?? []).map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
  }

  async function handleDelete(screening: OrganizerScreeningDto) {
    const confirmed = window.confirm(
      `Excluir a sessão de "${screening.movieTitle}" em ${screening.venue}, ${formatDateTime(screening.startsAt)}?`,
    );
    if (!confirmed) return;
    setDeletingId(screening.id);
    setError(null);
    try {
      await apiClient.delete(`/organizer/screenings/${screening.id}`);
      setScreenings((prev) => (prev ?? []).filter((s) => s.id !== screening.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao excluir sessão.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCancel(screening: OrganizerScreeningDto) {
    const confirmed = window.confirm(
      `Cancelar a sessão de "${screening.movieTitle}" em ${screening.venue}, ${formatDateTime(screening.startsAt)}? Pedidos e ingressos vinculados serão cancelados e os assentos, liberados.`,
    );
    if (!confirmed) return;
    setCancellingId(screening.id);
    setError(null);
    try {
      const updated = await apiClient.post<ScreeningSummaryDto>(`/organizer/screenings/${screening.id}/cancel`);
      handleUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao cancelar sessão.");
    } finally {
      setCancellingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!screenings) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return screenings;
    return screenings.filter((s) => s.movieTitle.toLowerCase().includes(q) || s.venue.toLowerCase().includes(q));
  }, [screenings, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  return (
    <div className="organizer-page">
      <div className="organizer-page-header">
        <h1 className="organizer-page-title">Sessões</h1>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <IconPlus width={16} height={16} />
          Nova sessão
        </button>
      </div>

      {error && <MessageBar tone="danger">{error}</MessageBar>}

      {!screenings ? (
        <Spinner label="Carregando sessões…" />
      ) : (
        <>
          <div className="organizer-filter-row">
            <IconSearch width={16} height={16} color="var(--color-text-faint)" />
            <input
              className="organizer-filter-input"
              placeholder="Filtrar por filme ou sala…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="organizer-empty-hint">
              {screenings.length === 0
                ? "Nenhuma sessão publicada ainda — clique em \"Nova sessão\"."
                : "Nenhuma sessão corresponde ao filtro."}
            </p>
          ) : (
            <>
              <table className="organizer-table mono">
                <thead>
                  <tr>
                    <th>Filme</th>
                    <th>Sala</th>
                    <th>Quando</th>
                    <th>Preço</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s) => (
                    <tr key={s.id}>
                      <td>{s.movieTitle}</td>
                      <td>{s.venue}</td>
                      <td>{formatDateTime(s.startsAt)}</td>
                      <td>{formatCents(s.priceCents)}</td>
                      <td>
                        <span className={`badge ${STATUS_META[s.status].badge}`}>{STATUS_META[s.status].label}</span>
                      </td>
                      <td className="organizer-table-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          onClick={() => setEditing(s)}
                          disabled={deletingId === s.id || cancellingId === s.id}
                          aria-label="Editar sessão"
                        >
                          <IconPencil width={15} height={15} />
                        </button>
                        {s.status !== "cancelled" && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-icon-danger"
                            onClick={() => handleCancel(s)}
                            disabled={cancellingId === s.id || deletingId === s.id}
                            aria-label="Cancelar sessão"
                          >
                            <IconBan width={15} height={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-icon-danger"
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s.id || cancellingId === s.id}
                          aria-label="Excluir sessão"
                        >
                          <IconTrash width={15} height={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pageCount > 1 && (
                <div className="organizer-pagination">
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={safePage === 1}
                    aria-label="Página anterior"
                  >
                    <IconChevronDown width={15} height={15} style={{ transform: "rotate(90deg)" }} />
                  </button>
                  <span className="organizer-pagination-label mono">
                    Página {safePage} de {pageCount}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={safePage === pageCount}
                    aria-label="Próxima página"
                  >
                    <IconChevronDown width={15} height={15} style={{ transform: "rotate(-90deg)" }} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <CreateSessionsModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={loadScreenings} />
      <EditScreeningModal screening={editing} onClose={() => setEditing(null)} onUpdated={handleUpdated} />
    </div>
  );
}
