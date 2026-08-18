import { useEffect, useState, type FormEvent } from "react";
import type { OrganizerScreeningDto, RoomDto, ScreeningSummaryDto, UpdateScreeningRequest } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { centsToReaisInput, parseReaisToCents } from "../../lib/format";
import { Modal } from "../../ui/Modal";
import { MessageBar } from "../../ui/MessageBar";

interface EditScreeningModalProps {
  screening: OrganizerScreeningDto | null;
  onClose: () => void;
  onUpdated: (screening: ScreeningSummaryDto) => void;
}

export function EditScreeningModal({ screening, onClose, onUpdated }: EditScreeningModalProps) {
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);
  const [roomId, setRoomId] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!screening) return;
    setVenue(screening.venue);
    const startsAt = new Date(screening.startsAt);
    setDate(startsAt.toISOString().slice(0, 10));
    setTime(startsAt.toTimeString().slice(0, 5));
    setPrice(centsToReaisInput(screening.priceCents));
    setError(null);
    apiClient
      .get<RoomDto[]>("/organizer/rooms")
      .then(setRooms)
      .catch(() => setError("Falha ao carregar salas."));
  }, [screening]);

  useEffect(() => {
    if (!screening || !rooms) return;
    const match = rooms.find((r) => r.name === screening.venue);
    setRoomId(match?.id ?? "");
  }, [screening, rooms]);

  function handleRoomChange(newRoomId: string) {
    setRoomId(newRoomId);
    const room = rooms?.find((r) => r.id === newRoomId);
    if (room) {
      setVenue(room.name);
      setPrice(centsToReaisInput(room.priceCents));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!screening) return;
    const priceCents = parseReaisToCents(price);
    const startsAt = new Date(`${date}T${time}:00`);
    if (!venue.trim() || Number.isNaN(startsAt.getTime()) || !Number.isFinite(priceCents) || priceCents <= 0) {
      setError("Confira sala, data/hora e preço.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: UpdateScreeningRequest = { venue: venue.trim(), startsAt: startsAt.toISOString(), priceCents };
      const updated = await apiClient.patch<ScreeningSummaryDto>(`/organizer/screenings/${screening.id}`, payload);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao atualizar sessão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={screening !== null}
      title="Editar sessão"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="edit-screening-form" className="btn btn-primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar alterações"}
          </button>
        </>
      }
    >
      <form id="edit-screening-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={{ color: "var(--color-text-muted)" }}>{screening?.movieTitle}</p>
        <div className="field">
          <label htmlFor="edit-room">Sala</label>
          <select id="edit-room" value={roomId} onChange={(e) => handleRoomChange(e.target.value)} disabled={busy || !rooms}>
            {!rooms && <option>Carregando…</option>}
            {rooms && roomId === "" && <option value="">{venue} (não cadastrada)</option>}
            {rooms?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="edit-date">Data</label>
          <input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={busy} />
        </div>
        <div className="field">
          <label htmlFor="edit-time">Horário</label>
          <input id="edit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={busy} />
        </div>
        <div className="field">
          <label htmlFor="edit-price">Preço (Inteira)</label>
          <input id="edit-price" className="mono" value={price} onChange={(e) => setPrice(e.target.value)} disabled={busy} />
        </div>
        {error && <MessageBar tone="danger">{error}</MessageBar>}
      </form>
    </Modal>
  );
}
