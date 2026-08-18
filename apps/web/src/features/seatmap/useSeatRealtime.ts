import { useEffect, useRef } from "react";
import {
  REALTIME_EVENTS,
  type SeatHeldPayload,
  type SeatReleasedPayload,
  type SeatSoldPayload,
} from "@ticket-seller/shared";
import { getSocket } from "../../lib/socketClient";

interface SeatRealtimeHandlers {
  onHeld: (payload: SeatHeldPayload) => void;
  onReleased: (payload: SeatReleasedPayload) => void;
  onSold: (payload: SeatSoldPayload) => void;
  onNeedsRefetch: () => void;
}

export function useSeatRealtime(screeningId: string, handlers: SeatRealtimeHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = getSocket();
    const room = { screeningId };

    const join = () => socket.emit("screening:join", room);
    const handleHeld = (payload: SeatHeldPayload) => handlersRef.current.onHeld(payload);
    const handleReleased = (payload: SeatReleasedPayload) => handlersRef.current.onReleased(payload);
    const handleSold = (payload: SeatSoldPayload) => handlersRef.current.onSold(payload);
    const handleReconnect = () => {
      join();
      handlersRef.current.onNeedsRefetch();
    };

    join();
    socket.on("connect", handleReconnect);
    socket.on(REALTIME_EVENTS.SEAT_HELD, handleHeld);
    socket.on(REALTIME_EVENTS.SEAT_RELEASED, handleReleased);
    socket.on(REALTIME_EVENTS.SEAT_SOLD, handleSold);

    document.addEventListener("visibilitychange", handleVisibility);
    function handleVisibility() {
      if (document.visibilityState === "visible" && socket.connected) {
        handlersRef.current.onNeedsRefetch();
      }
    }

    return () => {
      socket.emit("screening:leave", room);
      socket.off("connect", handleReconnect);
      socket.off(REALTIME_EVENTS.SEAT_HELD, handleHeld);
      socket.off(REALTIME_EVENTS.SEAT_RELEASED, handleReleased);
      socket.off(REALTIME_EVENTS.SEAT_SOLD, handleSold);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [screeningId]);
}
