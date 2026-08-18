import { useEffect, useRef, useState, type FocusEvent } from "react";
import { IconCalendar, IconChevronDown } from "./icons";
import "./datefield.css";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function isoToParts(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function partsToIso(y: number, m: number, d: number): string {
  return `${y.toString().padStart(4, "0")}-${pad2(m + 1)}-${pad2(d)}`;
}

function isoToBr(iso: string): string {
  const p = isoToParts(iso);
  if (!p) return "";
  return `${pad2(p.d)}/${pad2(p.m + 1)}/${p.y}`;
}

function maskBrInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `/${digits.slice(2, 4)}`;
  if (digits.length > 4) out += `/${digits.slice(4, 8)}`;
  return out;
}

function brTextToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return partsToIso(y, m - 1, d);
}

interface DateFieldProps {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export function DateField({ id, value, onChange, required, disabled }: DateFieldProps) {
  const today = new Date();
  const initialParts = isoToParts(value);
  const defaultViewY = today.getFullYear() - 30;
  const defaultViewM = today.getMonth();

  const [text, setText] = useState(() => (value ? isoToBr(value) : ""));
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [viewY, setViewY] = useState(initialParts?.y ?? defaultViewY);
  const [viewM, setViewM] = useState(initialParts?.m ?? defaultViewM);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function handleTextChange(raw: string) {
    const masked = maskBrInput(raw);
    setText(masked);
    setInvalid(false);
    if (masked === "") {
      onChange("");
      return;
    }
    const iso = brTextToIso(masked);
    if (iso) {
      onChange(iso);
      const p = isoToParts(iso)!;
      setViewY(p.y);
      setViewM(p.m);
    }
  }

  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setOpen(false);
    setInvalid(text !== "" && brTextToIso(text) === null);
  }

  function shiftMonth(delta: number) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewY(y);
    setViewM(m);
  }

  function pick(d: number) {
    const iso = partsToIso(viewY, viewM, d);
    setText(isoToBr(iso));
    setInvalid(false);
    onChange(iso);
    setOpen(false);
  }

  const selected = isoToParts(value);
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const firstWeekday = new Date(viewY, viewM, 1).getDay();
  const years = Array.from({ length: today.getFullYear() - (today.getFullYear() - 120) + 1 }, (_, i) => today.getFullYear() - i);

  function isFuture(d: number): boolean {
    return new Date(viewY, viewM, d) > today;
  }

  return (
    <div className="date-field" ref={rootRef} onBlur={handleBlur}>
      <div className={`date-field-input-wrap ${invalid ? "date-field-invalid" : ""}`}>
        <input
          id={id}
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onFocus={() => setOpen(true)}
          required={required}
          disabled={disabled}
          autoComplete="bday"
        />
        <button
          type="button"
          className="date-field-icon-btn"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          aria-label="Abrir calendário"
        >
          <IconCalendar width={18} height={18} />
        </button>
      </div>
      {invalid && <p className="field-error">Data inválida.</p>}

      {open && (
        <div className="date-field-panel" role="dialog" aria-label="Selecionar data de nascimento">
          <div className="date-field-panel-header">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
              className="date-field-arrow"
            >
              <IconChevronDown width={16} height={16} style={{ transform: "rotate(90deg)" }} />
            </button>
            <div className="date-field-panel-selects">
              <select aria-label="Mês" value={viewM} onChange={(e) => setViewM(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select aria-label="Ano" value={viewY} onChange={(e) => setViewY(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => shiftMonth(1)}
              aria-label="Próximo mês"
              className="date-field-arrow"
            >
              <IconChevronDown width={16} height={16} style={{ transform: "rotate(-90deg)" }} />
            </button>
          </div>

          <div className="date-field-weekdays">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>

          <div className="date-field-grid">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const isSelected = Boolean(selected && selected.y === viewY && selected.m === viewM && selected.d === d);
              return (
                <button
                  key={d}
                  type="button"
                  className={`date-field-day ${isSelected ? "selected" : ""}`}
                  disabled={isFuture(d)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(d)}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
