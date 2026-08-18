import { useState, type FormEvent } from "react";
import type { CreateRoomRequest, RoomDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { parseReaisToCents } from "../../lib/format";
import { Modal } from "../../ui/Modal";
import { MessageBar } from "../../ui/MessageBar";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (room: RoomDto) => void;
}

export function CreateRoomModal({ open, onClose, onCreated }: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setPrice("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const priceCents = parseReaisToCents(price);
    if (!name.trim() || !Number.isFinite(priceCents) || priceCents <= 0) {
      setError("Confira o nome da sala e o preço.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: CreateRoomRequest = { name: name.trim(), priceCents };
      const room = await apiClient.post<RoomDto>("/organizer/rooms", payload);
      onCreated(room);
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao cadastrar sala.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Cadastrar sala"
      onClose={handleClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="create-room-form" className="btn btn-primary" disabled={busy}>
            {busy ? "Cadastrando…" : "Cadastrar sala"}
          </button>
        </>
      }
    >
      <form id="create-room-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="field">
          <label htmlFor="room-name">Nome da sala</label>
          <input id="room-name" placeholder="Ex.: Sala 1" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="room-price">Preço do ingresso (Inteira)</label>
          <input
            id="room-price"
            className="mono"
            placeholder="Ex.: 32,00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={busy}
          />
        </div>
        {error && <MessageBar tone="danger">{error}</MessageBar>}
      </form>
    </Modal>
  );
}
