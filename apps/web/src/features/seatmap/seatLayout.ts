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
  seatSize: number;
}

export const SEAT_SIZE = 30;
const DEFAULT_LAYOUT = {
  seatSize: SEAT_SIZE,
  seatGap: 8,
  rowGap: 10,
  rowLabelWidth: 32,
  aisleGap: 32,
  curveAmplitude: 12,
  stageMargin: 64,
  sideMargin: 36,
};

const MOBILE_LAYOUT = {
  seatSize: 36,
  seatGap: 11,
  rowGap: 12,
  rowLabelWidth: 64,
  aisleGap: 12,
  curveAmplitude: 10,
  stageMargin: 82,
  sideMargin: 2,
};

export interface SeatMapLayoutOptions {
  mobile?: boolean;
}

export function buildSeatMapLayout(seats: SeatDto[], options: SeatMapLayoutOptions = {}): SeatMapLayout {
  const metrics = options.mobile ? MOBILE_LAYOUT : DEFAULT_LAYOUT;
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
    const width =
      rowSeats.length * metrics.seatSize + (rowSeats.length - 1) * metrics.seatGap + metrics.aisleGap;
    maxRowWidth = Math.max(maxRowWidth, width);
    return { row, rowSeats };
  });

  const width = maxRowWidth + metrics.rowLabelWidth + metrics.sideMargin * 2;
  const centerX = width / 2;
  let cursorY = metrics.stageMargin;

  const rows: SeatRowLayout[] = rowSeatLists.map(({ row, rowSeats }) => {
    const count = rowSeats.length;
    const splitIndex = Math.ceil(count / 2);
    const rowWidth = count * metrics.seatSize + (count - 1) * metrics.seatGap + metrics.aisleGap;
    let cursorX = centerX - rowWidth / 2;

    const positioned: PositionedSeat[] = rowSeats.map((seat, i) => {
      if (i === splitIndex) cursorX += metrics.aisleGap;
      const x = cursorX;
      cursorX += metrics.seatSize + metrics.seatGap;

      const mid = (count - 1) / 2;
      const normalized = mid === 0 ? 0 : (i - mid) / mid;
      const y = cursorY + normalized * normalized * metrics.curveAmplitude;

      return { seat, x, y };
    });

    const labelY = positioned[0].y + metrics.seatSize / 2;
    cursorY += metrics.seatSize + metrics.rowGap;
    return { row, seats: positioned, labelY };
  });

  return {
    rows,
    width,
    height: cursorY + 12,
    stageWidth: Math.min(maxRowWidth * 0.7, 480),
    seatSize: metrics.seatSize,
  };
}
