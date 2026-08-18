import type { SeatDto } from "@ticket-seller/shared";

export interface PositionedSeat {
  seat: SeatDto;
  x: number;
  y: number;
}

export interface SeatRowLayout {
  row: string;
  seats: PositionedSeat[];
  labelY: number;
}

export interface SeatMapLayout {
  rows: SeatRowLayout[];
  width: number;
  height: number;
  stageWidth: number;
}

export const SEAT_SIZE = 30;
const SEAT_GAP = 8;
const ROW_GAP = 14;
const ROW_LABEL_WIDTH = 32;
const AISLE_GAP = 32;
const CURVE_AMPLITUDE = 20;
const STAGE_MARGIN = 96;
const SIDE_MARGIN = 36;

export function buildSeatMapLayout(seats: SeatDto[]): SeatMapLayout {
  const byRow = new Map<string, SeatDto[]>();
  for (const seat of seats) {
    const list = byRow.get(seat.row) ?? [];
    list.push(seat);
    byRow.set(seat.row, list);
  }
  const rowNames = Array.from(byRow.keys()).sort();

  let maxRowWidth = 0;
  const rowSeatLists = rowNames.map((row) => {
    const rowSeats = byRow.get(row)!.sort((a, b) => a.number - b.number);
    const width = rowSeats.length * SEAT_SIZE + (rowSeats.length - 1) * SEAT_GAP + AISLE_GAP;
    maxRowWidth = Math.max(maxRowWidth, width);
    return { row, rowSeats };
  });

  const width = maxRowWidth + ROW_LABEL_WIDTH + SIDE_MARGIN * 2;
  const centerX = width / 2;
  let cursorY = STAGE_MARGIN;

  const rows: SeatRowLayout[] = rowSeatLists.map(({ row, rowSeats }) => {
    const count = rowSeats.length;
    const splitIndex = Math.ceil(count / 2);
    const rowWidth = count * SEAT_SIZE + (count - 1) * SEAT_GAP + AISLE_GAP;
    let cursorX = centerX - rowWidth / 2;

    const positioned: PositionedSeat[] = rowSeats.map((seat, i) => {
      if (i === splitIndex) cursorX += AISLE_GAP;
      const x = cursorX;
      cursorX += SEAT_SIZE + SEAT_GAP;

      const mid = (count - 1) / 2;
      const normalized = mid === 0 ? 0 : (i - mid) / mid;
      const y = cursorY + normalized * normalized * CURVE_AMPLITUDE;

      return { seat, x, y };
    });

    const labelY = positioned[0].y + SEAT_SIZE / 2;
    cursorY += SEAT_SIZE + ROW_GAP;
    return { row, seats: positioned, labelY };
  });

  return { rows, width, height: cursorY + 12, stageWidth: Math.min(maxRowWidth * 0.7, 480) };
}
