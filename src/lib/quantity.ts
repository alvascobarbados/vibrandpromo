/** Quantity rules shared by the card, the lightbox and the quote list. */
export const QTY_STEP = 25;

export function qtyFloor(moq: number | null | undefined) {
  return moq && moq > 0 ? moq : 1;
}

/** Snaps a typed value back up to the product's MOQ floor. */
export function clampQty(value: number, moq: number | null | undefined) {
  const floor = qtyFloor(moq);
  if (!Number.isFinite(value)) return floor;
  return Math.max(floor, Math.round(value));
}

export function stepQty(value: number, direction: 1 | -1, moq: number | null | undefined) {
  return clampQty(value + direction * QTY_STEP, moq);
}