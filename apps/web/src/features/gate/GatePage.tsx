import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { GateCheckResponseDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";
import { formatDateTime } from "../../lib/format";
import { IconCheck, IconClock, IconKeyboard, IconScan, IconX } from "../../ui/icons";
import { QrScanner } from "./QrScanner";
import "./gate.css";

const SCAN_RESUME_DELAY_MS = 2500;

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
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<GateCheckResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function runValidate(rawCode: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await apiClient.post<GateCheckResponseDto>("/gate/validate", {
        code: rawCode,
      });
      setResult(response);
      setHistory((prev) => [
        { time: new Date().toLocaleTimeString("pt-BR"), code: rawCode, result: response.result },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao validar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized || busy) return;
    await runValidate(normalized);
    setCode("");
    inputRef.current?.focus();
  }

  async function handleScan(rawCode: string) {
    if (busy) return;
    await runValidate(rawCode.trim());
  }

  function switchMode(next: "camera" | "manual") {
    setMode(next);
    setResult(null);
    setError(null);
  }

  useEffect(() => {
    if (!result || mode !== "camera") return;
    const timer = setTimeout(() => setResult(null), SCAN_RESUME_DELAY_MS);
    return () => clearTimeout(timer);
  }, [result, mode]);

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
        <div className="gate-mode-toggle" role="tablist" aria-label="Forma de validação">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "camera"}
            className={`gate-mode-btn ${mode === "camera" ? "gate-mode-btn-active" : ""}`}
            onClick={() => switchMode("camera")}
          >
            <IconScan width={16} height={16} />
            Câmera
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "manual"}
            className={`gate-mode-btn ${mode === "manual" ? "gate-mode-btn-active" : ""}`}
            onClick={() => switchMode("manual")}
          >
            <IconKeyboard width={16} height={16} />
            Digitar código
          </button>
        </div>

        {mode === "camera" ? (
          <div className="gate-scan-panel">
            <QrScanner active={!busy && !result} onScan={handleScan} />
            {busy && <p className="gate-form-label">Validando…</p>}
            {error && <p className="field-error">{error}</p>}
          </div>
        ) : (
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
        )}

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
            {mode === "camera" && (
              <button type="button" className="btn btn-secondary" onClick={() => setResult(null)}>
                Escanear próximo
              </button>
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
