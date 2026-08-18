import { useEffect, useRef, useState } from "react";
import { IconCheck } from "./icons";
import { subscribeToToasts } from "./toast";
import "./toast.css";

interface ToastEntry {
  id: number;
  message: string;
}

const DISMISS_MS = 3000;

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    return subscribeToToasts((message) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, DISMISS_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-host" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <IconCheck width={16} height={16} color="var(--color-success)" />
          {t.message}
        </div>
      ))}
    </div>
  );
}
