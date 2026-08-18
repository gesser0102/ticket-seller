import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { GateCheckResponseDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { formatDateTime } from "../../lib/format";
import { IconCheck, IconClock, IconScan, IconX } from "../../ui/icons";
import "./gate.css";

interface HistoryEntry {
  time: string;
  code: string;
  result: GateCheckResponseDto["result"];
}

const RESULT_META: Record<GateCheckResponseDto["result"], { label: string; tone: "valid" | "invalid"; icon: ReactNode }> = {
  valid: { label: "VÁLIDO — ENTRADA LIBERADA", tone: "valid", icon: <IconCheck width={48} height={48} /> },
  already_used: { label: "JÁ UTILIZADO", tone: "invalid", icon: <IconClock width={48} height={48} /> },
  invalid: { label: "CÓDIGO INVÁLIDO", tone: "invalid", icon: <IconX width={48} height={48} /> },
  cancelled: { label: "SESSÃO CANCELADA", tone: "invalid", icon: <IconX width={48} height={48} /> },
};

export function GatePage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<GateCheckResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiClient.post<GateCheckResponseDto>("/gate/validate", {
        code: normalized,
      });
      setResult(response);
      setHistory((prev) => [
        { time: new Date().toLocaleTimeString("pt-BR"), code: normalized, result: response.result },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao validar. Tente novamente.");
    } finally {
      setCode("");
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const meta = result ? RESULT_META[result.result] : null;

  function handleCodeChange(raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const formatted = clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
    setCode(formatted);
  }

  return (
    <div className="gate-console">
      <div className="gate-topbar">
        <div className="container gate-topbar-inner">
          <span className="gate-topbar-icon">
            <IconScan width={20} height={20} />
          </span>
          <span className="gate-topbar-label">VALIDAÇÃO DE INGRESSOS — TODOS OS EVENTOS</span>
        </div>
      </div>

      <div className="gate-main">
        <form onSubmit={handleSubmit} className="gate-form">
          <label htmlFor="gate-code" className="gate-form-label">
            Código do ingresso
          </label>
          <input
            id="gate-code"
            ref={inputRef}
            autoFocus
            className="mono gate-input"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="XXX-XXX"
            disabled={busy}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={!code.trim() || busy}>
            {busy ? "Validando…" : "Validar"}
          </button>
          {error && <p className="field-error">{error}</p>}
        </form>

        {meta && (
          <div className={`gate-result gate-result-${meta.tone}`} role="status">
            {meta.icon}
            <strong>{meta.label}</strong>
            {result?.ticket && (
              <div className="gate-result-details mono">
                <span>{result.ticket.screening.movieTitle}</span>
                <span>
                  {formatDateTime(result.ticket.screening.startsAt)} · {result.ticket.screening.venue}
                </span>
                <span>
                  Assento {result.ticket.seat.row}
                  {result.ticket.seat.number}
                </span>
                <span>{result.ticket.buyerName}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="gate-history">
        <span className="gate-topbar-label">ÚLTIMAS VALIDAÇÕES</span>
        <table className="gate-history-table mono">
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--color-text-faint)" }}>
                  Nenhuma validação nesta sessão.
                </td>
              </tr>
            )}
            {history.map((entry, i) => (
              <tr key={i}>
                <td>{entry.time}</td>
                <td>{entry.code.slice(0, 14)}</td>
                <td className={RESULT_META[entry.result].tone === "valid" ? "gate-history-ok" : "gate-history-fail"}>
                  {RESULT_META[entry.result].label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
