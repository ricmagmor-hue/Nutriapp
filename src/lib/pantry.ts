import { CATEGORY_ORDER, CATALOG, getCatalog } from "../data/catalog";
import { RECIPES } from "../data/recipes";
import type {
  AssessedIngredient,
  CookedEntry,
  CookLine,
  IngredientStatus,
  InventoryItem,
  Kitchen,
  MatchLevel,
  Recipe,
  ShopLine,
  ShoppingExtra,
  Unit,
} from "../types";
import { convert, formatQty, norm, roundQty } from "./units";

export function emptyState(): Kitchen {
  return { inventory: [], extras: [], cooked: [] };
}

export function exampleState(): Kitchen {
  const amounts: Record<string, number> = {
    huevo: 6,
    leche: 800,
    queso: 250,
    mantequilla: 40,
    yogurt: 300,
    jamon: 6,
    jitomate: 5,
    cebolla: 3,
    ajo: 5,
    aguacate: 2,
    limon: 0,
    tortilla: 10,
    pan: 6,
    arroz: 800,
    pasta: 400,
    frijol: 500,
    avena: 200,
    aceite: 300,
    sal: 200,
    platano: 4,
  };

  const inventory: InventoryItem[] = Object.entries(amounts).map(([catalogId, quantity]) => {
    const catalog = getCatalog(catalogId);
    if (!catalog) throw new Error(`Ejemplo inválido: ${catalogId}`);
    return {
      id: `ej-${catalogId}`,
      catalogId,
      name: catalog.name,
      quantity,
      unit: catalog.unit,
      minQuantity: catalog.minQuantity,
      buyQuantity: catalog.buyQuantity,
    };
  });

  return { inventory, extras: [], cooked: [] };
}

function matchesItem(item: InventoryItem, catalogId: string, name: string): boolean {
  if (item.catalogId) return item.catalogId === catalogId;
  return norm(item.name) === norm(name);
}

function matchingItems(inventory: InventoryItem[], catalogId: string, name: string): InventoryItem[] {
  return inventory.filter((item) => matchesItem(item, catalogId, name));
}

export function assessRecipe(recipe: Recipe, inventory: InventoryItem[], servings = recipe.servings): AssessedIngredient[] {
  const factor = servings / recipe.servings;
  return recipe.ingredients.map((ingredient) => {
    const catalog = getCatalog(ingredient.catalogId);
    if (!catalog) throw new Error(`Ingrediente desconocido: ${ingredient.catalogId}`);
    const requested = roundQty(ingredient.quantity * factor);
    const items = matchingItems(inventory, catalog.id, catalog.name);
    let have = 0;
    let compatibleCount = 0;
    for (const item of items) {
      const converted = convert(item.quantity, item.unit, catalog.unit);
      if (converted === null) continue;
      compatibleCount += 1;
      have = roundQty(have + converted);
    }

    let status: IngredientStatus;
    let shortBy = 0;
    if (items.length > 0 && compatibleCount === 0) {
      status = "unit";
      shortBy = requested;
      have = 0;
    } else if (have <= 0) {
      status = "absent";
      shortBy = requested;
    } else if (have + 0.0001 < requested) {
      status = "short";
      shortBy = roundQty(requested - have);
    } else {
      status = "ok";
    }

    if (ingredient.optional && status !== "ok") status = "optional";

    return {
      catalogId: catalog.id,
      name: catalog.name,
      category: catalog.category,
      requested,
      unit: catalog.unit,
      optional: Boolean(ingredient.optional),
      status,
      have: items.length === 0 ? null : have,
      shortBy: status === "ok" || status === "optional" ? 0 : shortBy,
    };
  });
}

export function matchLevel(assessed: AssessedIngredient[]): MatchLevel {
  const problems = assessed.filter((line) => line.status === "short" || line.status === "absent" || line.status === "unit");
  if (problems.length === 0) return "ready";
  if (problems.length <= 2) return "close";
  return "missing";
}

export function countReady(inventory: InventoryItem[]): number {
  return RECIPES.filter((recipe) => matchLevel(assessRecipe(recipe, inventory)) === "ready").length;
}

export function buildCookLines(recipe: Recipe, inventory: InventoryItem[], servings: number): CookLine[] {
  return assessRecipe(recipe, inventory, servings).map((line) => {
    const items = matchingItems(inventory, line.catalogId, line.name);
    const compatible = line.status !== "unit";
    const deductUnit = compatible ? line.unit : (items[0]?.unit ?? line.unit);
    const available = line.status === "unit" ? (items[0]?.quantity ?? 0) : (line.have ?? 0);
    let deduct = 0;
    if (compatible && available > 0) {
      deduct = roundQty(Math.min(available, line.requested));
    }

    let haveLabel = "No está en tu inventario";
    if (line.status === "unit") haveLabel = "Lo tienes, pero la unidad no coincide";
    else if (line.have !== null) haveLabel = `Tienes ${formatQty(line.have, line.unit)}`;

    let hint = "";
    if (line.optional) hint = "Opcional: si no lo tienes, no se anota en el super.";
    else if (!compatible) hint = "La unidad no coincide. Ajusta el descuento a mano; no se anota solo en el super.";
    else if (line.status === "absent" || line.status === "short") hint = "Lo que falte se suma a la lista del super.";

    return {
      catalogId: line.catalogId,
      name: line.name,
      optional: line.optional,
      requested: line.requested,
      requestUnit: line.unit,
      available,
      deduct,
      deductUnit,
      haveLabel,
      compatible,
      hint,
    };
  });
}

export function missingFromLine(line: CookLine): number {
  if (line.optional || !line.compatible) return 0;
  return roundQty(Math.max(0, line.requested - line.deduct));
}

function applyDeduction(inventory: InventoryItem[], catalogId: string, name: string, amount: number, unit: Unit): InventoryItem[] {
  let remaining = amount;
  return inventory.map((item) => {
    if (remaining <= 0 || !matchesItem(item, catalogId, name)) return item;
    if (item.unit === unit) {
      const take = Math.min(item.quantity, remaining);
      remaining = roundQty(remaining - take);
      return { ...item, quantity: Math.max(0, roundQty(item.quantity - take)) };
    }
    const available = convert(item.quantity, item.unit, unit);
    if (available === null) return item;
    const take = Math.min(available, remaining);
    const takeInItem = convert(take, unit, item.unit);
    if (takeInItem === null) return item;
    remaining = roundQty(remaining - take);
    return { ...item, quantity: Math.max(0, roundQty(item.quantity - takeInItem)) };
  });
}

function mergeExtra(extras: ShoppingExtra[], extra: ShoppingExtra): ShoppingExtra[] {
  const index = extras.findIndex(
    (entry) => entry.catalogId === extra.catalogId && entry.unit === extra.unit && entry.note === extra.note && norm(entry.name) === norm(extra.name),
  );
  if (index === -1) return [...extras, extra];
  return extras.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, quantity: roundQty(entry.quantity + extra.quantity) } : entry,
  );
}

export function cookMeal(state: Kitchen, recipe: Recipe, servings: number, lines: CookLine[]): { state: Kitchen; missingCount: number } {
  let inventory = state.inventory;
  let extras = state.extras;
  let missingCount = 0;

  for (const line of lines) {
    if (line.deduct > 0) {
      inventory = applyDeduction(inventory, line.catalogId, line.name, line.deduct, line.deductUnit);
    }
    const missing = missingFromLine(line);
    if (missing > 0) {
      missingCount += 1;
      extras = mergeExtra(extras, {
        id: crypto.randomUUID(),
        catalogId: line.catalogId,
        name: line.name,
        quantity: missing,
        unit: line.requestUnit,
        note: `Para ${recipe.name}`,
      });
    }
  }

  const cooked: CookedEntry = {
    id: crypto.randomUUID(),
    recipeId: recipe.id,
    name: recipe.name,
    servings,
    at: new Date().toISOString(),
  };

  return {
    missingCount,
    state: {
      inventory,
      extras,
      cooked: [cooked, ...state.cooked].slice(0, 20),
    },
  };
}

export function planMissing(state: Kitchen, recipe: Recipe, servings: number): { state: Kitchen; added: number; unitIssues: number } {
  let extras = state.extras;
  let added = 0;
  let unitIssues = 0;
  for (const line of assessRecipe(recipe, state.inventory, servings)) {
    if (line.optional) continue;
    if (line.status === "unit") {
      unitIssues += 1;
      continue;
    }
    if (line.shortBy <= 0) continue;
    added += 1;
    extras = mergeExtra(extras, {
      id: crypto.randomUUID(),
      catalogId: line.catalogId,
      name: line.name,
      quantity: line.shortBy,
      unit: line.unit,
      note: `Para ${recipe.name}`,
    });
  }
  return { added, unitIssues, state: { ...state, extras } };
}

export type ItemDraft = {
  name: string;
  quantity: number;
  unit: Unit;
  minQuantity: number;
  buyQuantity: number;
  catalogId?: string;
};

export function saveItem(state: Kitchen, draft: ItemDraft, editingId: string | null): { state: Kitchen; merged: boolean } {
  if (editingId) {
    return {
      merged: false,
      state: {
        ...state,
        inventory: state.inventory.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: draft.name,
                quantity: draft.quantity,
                unit: draft.unit,
                minQuantity: draft.minQuantity,
                buyQuantity: draft.buyQuantity,
                catalogId: draft.catalogId,
              }
            : item,
        ),
      },
    };
  }

  const existing = state.inventory.find((item) => {
    const sameIdentity = draft.catalogId ? item.catalogId === draft.catalogId : norm(item.name) === norm(draft.name);
    return sameIdentity && item.unit === draft.unit;
  });

  if (existing) {
    return {
      merged: true,
      state: {
        ...state,
        inventory: state.inventory.map((item) =>
          item.id === existing.id ? { ...item, quantity: roundQty(item.quantity + draft.quantity) } : item,
        ),
      },
    };
  }

  const created: InventoryItem = {
    id: crypto.randomUUID(),
    catalogId: draft.catalogId,
    name: draft.name,
    quantity: draft.quantity,
    unit: draft.unit,
    minQuantity: draft.minQuantity,
    buyQuantity: draft.buyQuantity,
  };
  return { merged: false, state: { ...state, inventory: [...state.inventory, created] } };
}

export function updateQuantity(state: Kitchen, id: string, quantity: number): Kitchen {
  return {
    ...state,
    inventory: state.inventory.map((item) => (item.id === id ? { ...item, quantity: Math.max(0, roundQty(quantity)) } : item)),
  };
}

export function removeItem(state: Kitchen, id: string): Kitchen {
  return { ...state, inventory: state.inventory.filter((item) => item.id !== id) };
}

export function addManualExtra(state: Kitchen, draft: { name: string; quantity: number; unit: Unit; catalogId?: string }): Kitchen {
  return {
    ...state,
    extras: mergeExtra(state.extras, {
      id: crypto.randomUUID(),
      catalogId: draft.catalogId,
      name: draft.name,
      quantity: draft.quantity,
      unit: draft.unit,
      note: "Lo anotaste tú",
    }),
  };
}

export function removeExtras(state: Kitchen, ids: string[]): Kitchen {
  const drop = new Set(ids);
  return { ...state, extras: state.extras.filter((extra) => !drop.has(extra.id)) };
}

function shopKey(catalogId: string | undefined, name: string, unit: Unit): string {
  return `${catalogId ?? norm(name)}|${unit}`;
}

export function buildShoppingList(state: Kitchen): ShopLine[] {
  const groups = new Map<string, ShopLine & { stockQty: number; extraQty: number }>();

  const ensure = (key: string, seed: Omit<ShopLine, "quantity" | "notes" | "extraIds">) => {
    const current = groups.get(key);
    if (current) return current;
    const created = { ...seed, quantity: 0, notes: [], extraIds: [], stockQty: 0, extraQty: 0 };
    groups.set(key, created);
    return created;
  };

  for (const item of state.inventory) {
    if (item.quantity > item.minQuantity) continue;
    const catalog = item.catalogId ? getCatalog(item.catalogId) : undefined;
    const key = shopKey(item.catalogId, item.name, item.unit);
    const line = ensure(key, {
      key,
      catalogId: item.catalogId,
      name: item.name,
      unit: item.unit,
      category: catalog?.category ?? "Otros",
      inventoryId: item.id,
    });
    line.stockQty = Math.max(line.stockQty, item.buyQuantity > 0 ? item.buyQuantity : Math.max(item.minQuantity, 1));
    line.inventoryId = item.id;
    line.notes.push(`Quedan ${formatQty(item.quantity, item.unit)}`);
  }

  for (const extra of state.extras) {
    const catalog = extra.catalogId ? getCatalog(extra.catalogId) : undefined;
    const inventory = extra.catalogId
      ? state.inventory.find((item) => item.catalogId === extra.catalogId && item.unit === extra.unit)
      : state.inventory.find((item) => norm(item.name) === norm(extra.name) && item.unit === extra.unit);
    const key = shopKey(extra.catalogId, extra.name, extra.unit);
    const line = ensure(key, {
      key,
      catalogId: extra.catalogId,
      name: extra.name,
      unit: extra.unit,
      category: catalog?.category ?? "Otros",
      inventoryId: inventory?.id,
    });
    line.extraQty = roundQty(line.extraQty + extra.quantity);
    line.extraIds.push(extra.id);
    if (!line.notes.includes(extra.note)) line.notes.push(extra.note);
  }

  const lines = [...groups.values()].map((line) => ({
    key: line.key,
    catalogId: line.catalogId,
    name: line.name,
    quantity: line.stockQty > 0 ? Math.max(line.stockQty, line.extraQty) : line.extraQty,
    unit: line.unit,
    category: line.category,
    notes: line.notes,
    extraIds: line.extraIds,
    inventoryId: line.inventoryId,
  }));

  lines.sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    return a.name.localeCompare(b.name, "es");
  });
  return lines;
}

export function markPurchased(state: Kitchen, line: ShopLine, quantity: number): Kitchen {
  const next = removeExtras(state, line.extraIds);
  if (quantity <= 0) return next;

  const catalog = line.catalogId ? getCatalog(line.catalogId) : undefined;
  const existing = line.inventoryId
    ? next.inventory.find((item) => item.id === line.inventoryId)
    : next.inventory.find((item) => (line.catalogId ? item.catalogId === line.catalogId : norm(item.name) === norm(line.name)) && item.unit === line.unit);

  if (!existing) {
    const created: InventoryItem = {
      id: crypto.randomUUID(),
      catalogId: line.catalogId,
      name: line.name,
      quantity,
      unit: line.unit,
      minQuantity: catalog?.minQuantity ?? 1,
      buyQuantity: catalog?.buyQuantity ?? quantity,
    };
    return { ...next, inventory: [...next.inventory, created] };
  }

  if (existing.unit === line.unit) {
    return updateQuantity(next, existing.id, existing.quantity + quantity);
  }

  const converted = convert(quantity, line.unit, existing.unit);
  if (converted === null) {
    const created: InventoryItem = {
      id: crypto.randomUUID(),
      catalogId: line.catalogId,
      name: line.name,
      quantity,
      unit: line.unit,
      minQuantity: catalog?.minQuantity ?? existing.minQuantity,
      buyQuantity: catalog?.buyQuantity ?? quantity,
    };
    return { ...next, inventory: [...next.inventory, created] };
  }
  return updateQuantity(next, existing.id, existing.quantity + converted);
}

export function findCatalogByName(name: string) {
  const target = norm(name);
  if (!target) return undefined;
  return CATALOG.find((entry) => norm(entry.name) === target || entry.aliases?.some((alias) => norm(alias) === target));
}

export function searchCatalog(query: string) {
  const target = norm(query);
  if (!target) return [];
  return CATALOG.filter(
    (entry) => norm(entry.name).includes(target) || entry.aliases?.some((alias) => norm(alias).includes(target)),
  ).slice(0, 6);
}
