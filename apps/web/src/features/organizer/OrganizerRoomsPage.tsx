import { useEffect, useState } from "react";
import type { RoomDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { formatCents } from "../../lib/format";
import { MessageBar } from "../../ui/MessageBar";
import { Spinner } from "../../ui/Spinner";
import { IconDoor, IconPlus } from "../../ui/icons";
import { CreateRoomModal } from "./CreateRoomModal";

export function OrganizerRoomsPage() {
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  function loadRooms() {
    apiClient
      .get<RoomDto[]>("/organizer/rooms")
      .then(setRooms)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar salas."));
  }

  function handleCreated(room: RoomDto) {
    setRooms((prev) => [...(prev ?? []), room].sort((a, b) => a.name.localeCompare(b.name)));
  }

  return (
    <div className="organizer-page">
      <div className="organizer-page-header">
        <h1 className="organizer-page-title">Salas</h1>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <IconPlus width={16} height={16} />
          Cadastrar sala
        </button>
      </div>

      <p className="organizer-empty-hint">
        Cadastre suas salas com o preço padrão do ingresso — na hora de publicar sessões, é só selecionar a sala e o
        preço vem preenchido sozinho.
      </p>

      {error && <MessageBar tone="danger">{error}</MessageBar>}

      {!rooms ? (
        <Spinner label="Carregando salas…" />
      ) : rooms.length === 0 ? (
        <p className="organizer-empty-hint">Nenhuma sala cadastrada ainda — clique em "Cadastrar sala".</p>
      ) : (
        <div className="organizer-room-list">
          {rooms.map((room) => (
            <div key={room.id} className="organizer-room-row">
              <IconDoor width={20} height={20} color="var(--color-text-faint)" />
              <span className="organizer-room-name">{room.name}</span>
              <span className="organizer-room-price mono">{formatCents(room.priceCents)}</span>
            </div>
          ))}
        </div>
      )}

      <CreateRoomModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </div>
  );
}
