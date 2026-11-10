import type { Unit } from "../types";

type Dimension = "count" | "mass" | "volume";

const UNIT_META: Record<Unit, { dim: Dimension; toBase: number; singular: string; plural: string }> = {
  pza: { dim: "count", toBase: 1, singular: "pieza", plural: "piezas" },
  g: { dim: "mass", toBase: 1, singular: "g", plural: "g" },
  kg: { dim: "mass", toBase: 1000, singular: "kg", plural: "kg" },
  ml: { dim: "volume", toBase: 1, singular: "ml", plural: "ml" },
  l: { dim: "volume", toBase: 1000, singular: "l", plural: "l" },
  taza: { dim: "volume", toBase: 240, singular: "taza", plural: "tazas" },
  cda: { dim: "volume", toBase: 15, singular: "cucharada", plural: "cucharadas" },
  cdita: { dim: "volume", toBase: 5, singular: "cucharadita", plural: "cucharaditas" },
};

export const UNIT_OPTIONS: Unit[] = ["pza", "g", "kg", "ml", "l", "taza", "cda", "cdita"];

export function unitLabel(unit: Unit, quantity = 2): string {
  const meta = UNIT_META[unit];
  return quantity === 1 ? meta.singular : meta.plural;
}

export function roundQty(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function parseQty(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return roundQty(value);
}

export function formatQty(quantity: number, unit: Unit): string {
  const amount = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(quantity);
  return `${amount} ${unitLabel(unit, quantity)}`;
}

export function convert(quantity: number, from: Unit, to: Unit): number | null {
  const source = UNIT_META[from];
  const target = UNIT_META[to];
  if (source.dim !== target.dim) return null;
  return roundQty((quantity * source.toBase) / target.toBase);
}

export function clampServings(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(24, roundQty(value));
}

export function stepFor(unit: Unit): number {
  switch (unit) {
    case "pza":
      return 1;
    case "g":
      return 25;
    case "kg":
      return 0.1;
    case "ml":
      return 50;
    case "l":
      return 0.1;
    case "taza":
      return 0.25;
    case "cda":
    case "cdita":
      return 1;
  }
}

export function norm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
