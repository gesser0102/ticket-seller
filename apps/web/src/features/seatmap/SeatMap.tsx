import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { SeatDto } from "@ticket-seller/shared";
import { buildSeatMapLayout } from "./seatLayout";
import { IconCheck, IconLock, IconX } from "../../ui/icons";
import "./seatmap.css";

interface SeatMapProps {
  seats: SeatDto[];
  pendingSeatId: string | null;
  onSeatClick: (seat: SeatDto) => void;
}

const MOBILE_SEATMAP_QUERY = "(max-width: 640px)";

function isMobileSeatMap(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(MOBILE_SEATMAP_QUERY).matches
  );
}

export function SeatMap({ seats, pendingSeatId, onSeatClick }: SeatMapProps) {
  const [mobileLayout, setMobileLayout] = useState(isMobileSeatMap);
  const layout = useMemo(() => buildSeatMapLayout(seats, { mobile: mobileLayout }), [seats, mobileLayout]);
  const svgStyle = { "--seatmap-natural-width": `${layout.width}px` } as CSSProperties;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(MOBILE_SEATMAP_QUERY);
    const handleChange = () => setMobileLayout(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <div className="seatmap-wrap">
      <div className="seatmap-scroll">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          className="seatmap-svg"
          style={svgStyle}
          role="group"
          aria-label="Mapa de assentos"
        >
          <g transform={`translate(${layout.width / 2}, 34)`}>
            <path
              d={`M ${-layout.stageWidth / 2} 20 Q 0 -14 ${layout.stageWidth / 2} 20`}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.85}
            />
            <text textAnchor="middle" y={2} className="seatmap-stage-label">
              TELA
            </text>
          </g>

          {layout.rows.map((rowLayout) => (
            <g key={rowLayout.row}>
              <text x={mobileLayout ? 9 : 6} y={rowLayout.labelY + 4} className="seatmap-row-label">
                {rowLayout.row}
              </text>
              {rowLayout.seats.map(({ seat, x, y }) => (
                <SeatGlyph
                  key={seat.id}
                  seat={seat}
                  x={x}
                  y={y}
                  pending={pendingSeatId === seat.id}
                  size={layout.seatSize}
                  onClick={() => onSeatClick(seat)}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>

      <div className="seatmap-legend">
        <span className="seatmap-legend-item">
          <span className="seatmap-legend-swatch seatmap-legend-swatch-outline" />
          Disponível
        </span>
        <span className="seatmap-legend-item">
          <span className="seatmap-legend-swatch seatmap-legend-swatch-mine">
            <IconCheck width={11} height={11} />
          </span>
          Selecionado por você
        </span>
        <span className="seatmap-legend-item">
          <span className="seatmap-legend-swatch seatmap-legend-swatch-held">
            <IconLock width={11} height={11} />
          </span>
          Reservado por outra pessoa
        </span>
        <span className="seatmap-legend-item">
          <span className="seatmap-legend-swatch seatmap-legend-swatch-sold">
            <IconX width={11} height={11} />
          </span>
          Vendido
        </span>
      </div>
    </div>
  );
}

function SeatGlyph({
  seat,
  x,
  y,
  pending,
  size,
  onClick,
}: {
  seat: SeatDto;
  x: number;
  y: number;
  pending: boolean;
  size: number;
  onClick: () => void;
}) {
  const interactive = (seat.status === "available" || seat.heldByMe) && !pending;
  const label = `Assento ${seat.row}${seat.number} — ${stateLabel(seat)}${
    seat.heldByMe ? " — clique para desmarcar" : ""
  }`;

  let fill = "transparent";
  let stroke = "var(--color-accent)";
  let opacity = 1;

  if (seat.heldByMe) {
    fill = "var(--color-accent)";
    stroke = "var(--color-accent)";
  } else if (seat.status === "held") {
    fill = "var(--color-surface-muted)";
    stroke = "var(--color-border)";
    opacity = 0.75;
  } else if (seat.status === "sold") {
    fill = "var(--color-bg-elevated)";
    stroke = "var(--color-border)";
    opacity = 0.45;
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={interactive ? "seatmap-seat seatmap-seat-interactive" : "seatmap-seat"}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={label}
      aria-disabled={!interactive}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <g opacity={pending ? 0.5 : opacity}>
        <path d={seatPath(size)} fill={fill} stroke={stroke} strokeWidth={1.75} />
        <text
          x={size / 2}
          y={size / 2 + 3.5}
          textAnchor="middle"
          className="seatmap-seat-number"
          fill={seat.heldByMe ? "var(--color-accent-ink)" : "var(--color-text-muted)"}
        >
          {seat.number}
        </text>
        {seat.heldByMe && (
          <IconCheck
            x={size - 10}
            y={size - 10}
            width={9}
            height={9}
            color="var(--color-accent-ink)"
            strokeWidth={3}
          />
        )}
        {seat.status === "held" && !seat.heldByMe && (
          <IconLock x={size - 10} y={size - 10} width={9} height={9} color="var(--color-text-faint)" />
        )}
        {seat.status === "sold" && (
          <IconX x={size - 10} y={size - 10} width={9} height={9} color="var(--color-text-faint)" />
        )}
      </g>
    </g>
  );
}

function seatPath(size: number): string {
  const r = size * 0.32;
  return `M ${r} 0 H ${size - r} Q ${size} 0 ${size} ${r} V ${size} H 0 V ${r} Q 0 0 ${r} 0 Z`;
}

function stateLabel(seat: SeatDto): string {
  if (seat.heldByMe) return "selecionado por você";
  if (seat.status === "held") return "reservado por outra pessoa";
  if (seat.status === "sold") return "vendido";
  return "disponível";
}
