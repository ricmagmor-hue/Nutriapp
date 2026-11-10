import { COUNTABLE_GROUPS, EQUIVALENT_GROUP_LABEL, EQUIVALENTS, type EquivalentFood } from "../data/equivalents";
import { getCatalog } from "../data/catalog";
import type { EquivalentCounts, EquivalentGroup, Recipe, Unit } from "../types";
import { convert, roundQty } from "./units";

const KITCHEN_UNITS = new Set<Unit>(["pza", "g", "kg", "ml", "l", "taza", "cda", "cdita"]);

const byCatalog = new Map<string, EquivalentFood>();
for (const item of EQUIVALENTS) {
  for (const catalogId of item.catalogIds ?? []) byCatalog.set(catalogId, item);
}

export function equivalentForCatalog(catalogId: string): EquivalentFood | undefined {
  return byCatalog.get(catalogId);
}

export function equivalentsForIngredient(catalogId: string, quantity: number, unit: Unit): { group: EquivalentGroup; count: number } | null {
  const item = byCatalog.get(catalogId);
  if (!item) return null;
  if (item.free || item.quantity <= 0) return { group: item.group, count: 0 };
  if (!KITCHEN_UNITS.has(item.unit as Unit)) return null;
  const converted = convert(quantity, unit, item.unit as Unit);
  if (converted === null) return null;
  return { group: item.group, count: roundQty(converted / item.quantity) };
}

export function recipeGroupCounts(recipe: Recipe, servings: number, includeOptional = false): EquivalentCounts {
  const factor = servings / recipe.servings;
  const totals: EquivalentCounts = {};
  for (const ingredient of recipe.ingredients) {
    if (ingredient.optional && !includeOptional) continue;
    const unit = getCatalog(ingredient.catalogId)?.unit ?? "pza";
    const hit = equivalentsForIngredient(ingredient.catalogId, ingredient.quantity * factor, unit);
    if (!hit || hit.count <= 0 || hit.group === "libre") continue;
    totals[hit.group] = roundQty((totals[hit.group] ?? 0) + hit.count);
  }
  return totals;
}

export function hasEquivalentTargets(counts: EquivalentCounts | undefined): boolean {
  if (!counts) return false;
  return Object.values(counts).some((value) => value !== undefined && Number.isFinite(value));
}

export function limitingPortion(perPlate: EquivalentCounts, allowed: EquivalentCounts): { servings: number; group: EquivalentGroup } | null {
  let best: { servings: number; group: EquivalentGroup } | null = null;
  for (const group of Object.keys(EQUIVALENT_GROUP_LABEL) as EquivalentGroup[]) {
    const used = perPlate[group] ?? 0;
    const cap = allowed[group];
    if (used < 0.05 || cap === undefined || cap <= 0) continue;
    const servings = roundQty(cap / used);
    if (!best || servings < best.servings) best = { servings, group };
  }
  return best;
}

export function formatGroupCounts(counts: EquivalentCounts): string {
  const parts = (Object.keys(EQUIVALENT_GROUP_LABEL) as EquivalentGroup[])
    .filter((group) => (counts[group] ?? 0) >= 0.05)
    .map((group) => {
      const amount = counts[group] ?? 0;
      const word = amount === 1 ? "equivalente" : "equivalentes";
      const formatted = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(amount);
      return `${formatted} ${word} de ${EQUIVALENT_GROUP_LABEL[group].toLowerCase()}`;
    });
  if (parts.length === 0) return "Ningún ingrediente obligatorio de esta receta está en la lista de equivalentes.";
  return `Usa ${parts.join(", ")}.`;
}

export function cookedGuideNote(recipe: Recipe): string | null {
  const names = recipe.ingredients
    .map((ingredient) => byCatalog.get(ingredient.catalogId))
    .filter((item): item is EquivalentFood => Boolean(item?.prep === "cocido"))
    .map((item) => item.name.toLowerCase());
  if (names.length === 0) return null;
  return `La guía mide ${names.join(", ")} ya cocido.`;
}

export function formatTargets(counts: EquivalentCounts | undefined): string {
  if (!counts) return "";
  return COUNTABLE_GROUPS.filter((group) => (counts[group] ?? 0) > 0)
    .map((group) => `${counts[group]} ${EQUIVALENT_GROUP_LABEL[group].toLowerCase()}`)
    .join(" · ");
}
