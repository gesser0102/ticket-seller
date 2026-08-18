import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type {
  CreateScreeningsBatchRequest,
  OrganizerMovieDto,
  RoomDto,
  ScreeningSlot,
  ScreeningSummaryDto,
} from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { centsToReaisInput, formatCents, formatDateTime, parseReaisToCents } from "../../lib/format";
import { Modal } from "../../ui/Modal";
import { MessageBar } from "../../ui/MessageBar";
import { IconX } from "../../ui/icons";

interface CreateSessionsModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (screenings: ScreeningSummaryDto[]) => void;
  preselectedMovieId?: string;
}

type Step = "details" | "sessions" | "review";
const MAX_PER_BATCH = 60;

function sortSlots(slots: ScreeningSlot[]): ScreeningSlot[] {
  return [...slots].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export function CreateSessionsModal({ open, onClose, onCreated, preselectedMovieId }: CreateSessionsModalProps) {
  const [step, setStep] = useState<Step>("details");
  const [movies, setMovies] = useState<OrganizerMovieDto[] | null>(null);
  const [movieId, setMovieId] = useState("");
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);
  const [roomId, setRoomId] = useState("");
  const [price, setPrice] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slots, setSlots] = useState<ScreeningSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slotListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    slotListRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [slots.length]);

  useEffect(() => {
    if (!open) return;
    apiClient
      .get<OrganizerMovieDto[]>("/organizer/movies")
      .then((list) => {
        setMovies(list);
        setMovieId((current) => current || preselectedMovieId || list[0]?.id || "");
      })
      .catch(() => setError("Falha ao carregar filmes."));
    apiClient
      .get<RoomDto[]>("/organizer/rooms")
      .then((list) => {
        setRooms(list);
        setRoomId((current) => {
          const next = current || list[0]?.id || "";
          const room = list.find((r) => r.id === next);
          if (room) setPrice(centsToReaisInput(room.priceCents));
          return next;
        });
      })
      .catch(() => setError("Falha ao carregar salas."));
  }, [open, preselectedMovieId]);

  function resetForm() {
    setStep("details");
    setRoomId("");
    setPrice("");
    setSlotDate("");
    setSlotTime("");
    setSlots([]);
    setError(null);
  }

  function handleRoomChange(newRoomId: string) {
    setRoomId(newRoomId);
    const room = rooms?.find((r) => r.id === newRoomId);
    if (room) setPrice(centsToReaisInput(room.priceCents));
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  const selectedRoom = rooms?.find((r) => r.id === roomId);
  const priceCents = parseReaisToCents(price);
  const detailsValid = Boolean(movieId && selectedRoom && Number.isFinite(priceCents) && priceCents > 0);

  function goToSessions() {
    if (!detailsValid) {
      setError("Confira filme, sala e preço antes de continuar.");
      return;
    }
    setError(null);
    setStep("sessions");
  }

  function addSlot() {
    if (!slotDate || !slotTime) return;
    if (slots.some((s) => s.date === slotDate && s.time === slotTime)) {
      setError("Essa sessão já está na lista.");
      return;
    }
    setError(null);
    setSlots((prev) => [...prev, { date: slotDate, time: slotTime }]);
    setSlotTime("");
  }

  function handleSlotKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSlot();
    }
  }

  const overLimit = slots.length > MAX_PER_BATCH;

  function goToReview() {
    if (slots.length === 0) {
      setError("Adicione pelo menos uma sessão.");
      return;
    }
    if (overLimit) {
      setError(`${slots.length} sessões — acima do máximo de ${MAX_PER_BATCH} por lote.`);
      return;
    }
    setError(null);
    setStep("review");
  }

  async function handleSubmit() {
    if (!selectedRoom) return;
    setBusy(true);
    setError(null);
    try {
      const payload: CreateScreeningsBatchRequest = {
        venue: selectedRoom.name,
        priceCents,
        slots,
      };
      const created = await apiClient.post<ScreeningSummaryDto[]>(`/organizer/movies/${movieId}/screenings`, payload);
      onCreated(created);
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao publicar sessões.");
    } finally {
      setBusy(false);
    }
  }

  const selectedMovie = movies?.find((m) => m.id === movieId);
  const stepLabel = { details: "Detalhes", sessions: "Sessões", review: "Resumo" }[step];
  const stepNumber = { details: 1, sessions: 2, review: 3 }[step];

  function renderFooter() {
    if (step === "details") {
      return (
        <>
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={goToSessions} disabled={!detailsValid}>
            Próximo
          </button>
        </>
      );
    }
    if (step === "sessions") {
      return (
        <>
          <button type="button" className="btn btn-ghost" onClick={() => setStep("details")} disabled={busy}>
            Voltar
          </button>
          <button type="button" className="btn btn-primary" onClick={goToReview} disabled={slots.length === 0 || overLimit}>
            Revisar {slots.length > 0 ? `(${slots.length})` : ""}
          </button>
        </>
      );
    }
    return (
      <>
        <button type="button" className="btn btn-ghost" onClick={() => setStep("sessions")} disabled={busy}>
          Voltar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
          {busy ? "Publicando…" : `Confirmar e publicar ${slots.length} sessão(ões)`}
        </button>
      </>
    );
  }

  return (
    <Modal open={open} title="Publicar sessões" onClose={handleClose} footer={renderFooter()} wide>
      <p className="organizer-wizard-step">
        Passo {stepNumber} de 3 — {stepLabel}
      </p>

      {step === "details" && (
        <>
          <div className="field">
            <label htmlFor="session-movie">Filme</label>
            <select id="session-movie" value={movieId} onChange={(e) => setMovieId(e.target.value)} disabled={busy || !movies}>
              {!movies && <option>Carregando…</option>}
              {movies?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="session-room">Sala</label>
            {rooms && rooms.length === 0 ? (
              <p className="organizer-empty-hint">
                Nenhuma sala cadastrada — vá em <Link to="/organizer/salas">Salas</Link> e cadastre uma primeiro.
              </p>
            ) : (
              <select id="session-room" value={roomId} onChange={(e) => handleRoomChange(e.target.value)} disabled={busy || !rooms}>
                {!rooms && <option>Carregando…</option>}
                {rooms?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label htmlFor="session-price">Preço (Inteira)</label>
            <input id="session-price" className="mono" placeholder="Ex.: 32,00" value={price} onChange={(e) => setPrice(e.target.value)} disabled={busy} />
          </div>
        </>
      )}

      {step === "sessions" && (
        <>
          <p className="organizer-wizard-context">
            {selectedMovie?.title} · {selectedRoom?.name} · {formatCents(priceCents)}
          </p>

          <div className="field">
            <label htmlFor="session-date">Adicionar sessão (data + horário)</label>
            <div className="organizer-chip-input">
              <input
                id="session-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                onKeyDown={handleSlotKeyDown}
                disabled={busy}
              />
              <input
                id="session-time"
                type="time"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                onKeyDown={handleSlotKeyDown}
                disabled={busy}
              />
              <button type="button" className="btn btn-secondary" onClick={addSlot} disabled={busy || !slotDate || !slotTime}>
                Adicionar sessão
              </button>
            </div>
          </div>

          <div className="organizer-chip-list organizer-chip-list-tall" ref={slotListRef}>
            {slots.length === 0 ? (
              <span className="organizer-chip-list-empty">Nenhuma sessão adicionada ainda.</span>
            ) : (
              sortSlots(slots).map((slot) => (
                <span key={`${slot.date}T${slot.time}`} className="organizer-chip">
                  {formatDateTime(`${slot.date}T${slot.time}:00`)}
                  <button
                    type="button"
                    onClick={() => setSlots((prev) => prev.filter((s) => !(s.date === slot.date && s.time === slot.time)))}
                    disabled={busy}
                    aria-label={`Remover sessão de ${formatDateTime(`${slot.date}T${slot.time}:00`)}`}
                  >
                    <IconX width={11} height={11} />
                  </button>
                </span>
              ))
            )}
          </div>

          {overLimit && (
            <p className="organizer-batch-preview danger">
              {slots.length} sessões — acima do máximo de {MAX_PER_BATCH} por lote. Remova algumas antes de continuar.
            </p>
          )}
        </>
      )}

      {step === "review" && (
        <>
          <p className="organizer-wizard-context">
            {selectedMovie?.title} · {selectedRoom?.name} · {formatCents(priceCents)} por sessão
          </p>
          <p style={{ marginTop: "var(--space-2)", color: "var(--color-text-muted)" }}>
            {slots.length} sessão(ões) serão publicadas, cada uma com sua própria grade de assentos:
          </p>
          <div className="organizer-chip-list organizer-chip-list-tall">
            {sortSlots(slots).map((slot) => (
              <span key={`${slot.date}T${slot.time}`} className="organizer-chip">
                {formatDateTime(`${slot.date}T${slot.time}:00`)}
              </span>
            ))}
          </div>
        </>
      )}

      {error && <MessageBar tone="danger">{error}</MessageBar>}
    </Modal>
  );
}
