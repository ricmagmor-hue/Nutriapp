import { emptyState } from "./pantry";
import { EQUIVALENT_GROUP_LABEL } from "../data/equivalents";
import { hasEquivalentTargets, limitingPortion, recipeGroupCounts } from "./equivalents";
import { roundQty } from "./units";
import type {
  Account,
  AccountRole,
  AppState,
  Diet,
  DietMeal,
  EquivalentCounts,
  EquivalentGroup,
  HouseholdMember,
  Invite,
  Kitchen,
  MealKind,
  MealTag,
  ProfessionalKind,
  Recipe,
  RecipeFavorite,
} from "../types";

export type PortionBasis = "equivalentes" | "kcal" | "receta";

export type PersonPortion = {
  memberId: string;
  name: string;
  servings: number;
  mealKcal: number | null;
  dietName: string | null;
  basis: PortionBasis;
  limitLabel: string | null;
};

export type MealPlan = {
  people: PersonPortion[];
  totalServings: number;
};

export type MealChoice = {
  key: string;
  kind: MealKind;
  name: string;
  tag: MealTag;
};

export const FAVORITE_LIMIT = 5;

const MEAL_KINDS = new Set<MealKind>(["desayuno", "comida", "cena", "colacion"]);

const BASE_CHOICES: MealChoice[] = [
  { key: "desayuno", kind: "desayuno", name: "Desayuno", tag: "Desayuno" },
  { key: "comida", kind: "comida", name: "Comida", tag: "Comida" },
  { key: "cena", kind: "cena", name: "Cena", tag: "Cena" },
];

export function emptyApp(): AppState {
  return {
    accounts: [],
    activeAccountId: "",
    members: [],
    diets: [],
    links: [],
    invites: [],
    favorites: [],
    cookingFor: {},
    kitchens: {},
  };
}

export function activeAccount(state: AppState): Account | undefined {
  return state.accounts.find((account) => account.id === state.activeAccountId);
}

export function activeKitchen(state: AppState): Kitchen {
  return state.kitchens[state.activeAccountId] ?? emptyState();
}

export function withKitchen(state: AppState, kitchen: Kitchen): AppState {
  if (!state.activeAccountId) return state;
  return { ...state, kitchens: { ...state.kitchens, [state.activeAccountId]: kitchen } };
}

export function roleLabel(role: AccountRole): string {
  if (role === "nutritionist") return "Nutriólogo";
  return "Día a día";
}

export function professionalKind(role: AccountRole): ProfessionalKind | null {
  if (role === "daily") return null;
  return "nutritionist";
}

export function membersOf(state: AppState, accountId = state.activeAccountId): HouseholdMember[] {
  return state.members.filter((member) => member.accountId === accountId);
}

export function selectedMemberIds(state: AppState, accountId = state.activeAccountId): string[] {
  const saved = state.cookingFor[accountId];
  if (saved) return saved;
  return membersOf(state, accountId)
    .filter((member) => member.kind === "self")
    .map((member) => member.id);
}

export function createAccount(state: AppState, name: string, role: AccountRole): AppState {
  const accountId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const trimmed = name.trim();
  return {
    ...state,
    accounts: [...state.accounts, { id: accountId, name: trimmed, role }],
    activeAccountId: accountId,
    members: [...state.members, { id: memberId, accountId, name: trimmed, kind: "self" }],
    cookingFor: { ...state.cookingFor, [accountId]: [memberId] },
    kitchens: { ...state.kitchens, [accountId]: emptyState() },
  };
}

export function setActiveAccount(state: AppState, accountId: string): AppState {
  if (!state.accounts.some((account) => account.id === accountId)) return state;
  return { ...state, activeAccountId: accountId };
}

export function renameAccount(state: AppState, accountId: string, name: string): AppState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  return {
    ...state,
    accounts: state.accounts.map((account) => (account.id === accountId ? { ...account, name: trimmed } : account)),
  };
}

export function addFamilyMember(state: AppState, name: string): AppState {
  const trimmed = name.trim();
  if (!trimmed || !state.activeAccountId) return state;
  const member: HouseholdMember = {
    id: crypto.randomUUID(),
    accountId: state.activeAccountId,
    name: trimmed,
    kind: "family",
  };
  const selected = selectedMemberIds(state);
  return {
    ...state,
    members: [...state.members, member],
    cookingFor: { ...state.cookingFor, [state.activeAccountId]: [...selected, member.id] },
  };
}

export function updateMember(state: AppState, memberId: string, patch: Partial<HouseholdMember>): AppState {
  return {
    ...state,
    members: state.members.map((member) => (member.id === memberId ? { ...member, ...patch, id: member.id, accountId: member.accountId, kind: member.kind } : member)),
  };
}

export function removeMember(state: AppState, memberId: string): AppState {
  const member = state.members.find((item) => item.id === memberId);
  if (!member || member.kind === "self") return state;
  return {
    ...state,
    members: state.members.filter((item) => item.id !== memberId),
    diets: state.diets.filter((diet) => diet.memberId !== memberId),
    cookingFor: Object.fromEntries(
      Object.entries(state.cookingFor).map(([accountId, ids]) => [accountId, ids.filter((id) => id !== memberId)]),
    ),
  };
}

export function toggleCookingFor(state: AppState, memberId: string): AppState {
  const accountId = state.activeAccountId;
  const current = selectedMemberIds(state, accountId);
  const next = current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId];
  return { ...state, cookingFor: { ...state.cookingFor, [accountId]: next } };
}

export type DietInput = Omit<Diet, "id" | "active">;

export function assignDiet(state: AppState, input: DietInput): AppState {
  const diet: Diet = { ...input, id: crypto.randomUUID(), active: true, notes: input.notes.trim(), meals: input.meals };
  return {
    ...state,
    diets: [...state.diets.map((item) => (item.memberId === diet.memberId ? { ...item, active: false } : item)), diet],
  };
}

export function activateDiet(state: AppState, dietId: string): AppState {
  const diet = state.diets.find((item) => item.id === dietId);
  if (!diet) return state;
  return {
    ...state,
    diets: state.diets.map((item) => (item.memberId === diet.memberId ? { ...item, active: item.id === dietId } : item)),
  };
}

export function removeDiet(state: AppState, dietId: string): AppState {
  return { ...state, diets: state.diets.filter((diet) => diet.id !== dietId) };
}

export function mealKeyOf(meal: Pick<DietMeal, "kind" | "name">): string {
  if (meal.kind !== "colacion") return meal.kind;
  return `colacion:${meal.name.trim().toLocaleLowerCase("es")}`;
}

export function mealChoices(diets: Diet[], memberIds: string[]): MealChoice[] {
  const extras: MealChoice[] = [];
  const seen = new Set<string>();
  for (const diet of diets) {
    if (!diet.active || !memberIds.includes(diet.memberId)) continue;
    for (const meal of diet.meals) {
      if (meal.kind !== "colacion") continue;
      const key = mealKeyOf(meal);
      if (seen.has(key)) continue;
      seen.add(key);
      extras.push({ key, kind: "colacion", name: meal.name, tag: "Colación" });
    }
  }
  if (extras.length === 0) extras.push({ key: "colacion:colación", kind: "colacion", name: "Colación", tag: "Colación" });
  return [...BASE_CHOICES, ...extras];
}

export function favoriteScore(favorites: RecipeFavorite[], recipeId: string, mealKey: string): number {
  return new Set(favorites.filter((item) => item.recipeId === recipeId && item.mealKey === mealKey).map((item) => item.accountId)).size;
}

export function favoritesInMeal(favorites: RecipeFavorite[], accountId: string, mealKey: string): number {
  return favorites.filter((item) => item.accountId === accountId && item.mealKey === mealKey).length;
}

export function isFavorite(favorites: RecipeFavorite[], accountId: string, recipeId: string, mealKey: string): boolean {
  return favorites.some((item) => item.accountId === accountId && item.recipeId === recipeId && item.mealKey === mealKey);
}

export function toggleFavorite(
  state: AppState,
  recipeId: string,
  mealKey: string,
): { state: AppState; message: string; changed: boolean } {
  const accountId = state.activeAccountId;
  if (!accountId) return { state, message: "Entra a un perfil para marcar favoritos.", changed: false };
  const mine = state.favorites.filter((item) => item.accountId === accountId && item.mealKey === mealKey);
  if (mine.some((item) => item.recipeId === recipeId)) {
    return {
      changed: true,
      message: "La quité de tus favoritos. La calificación de esta comida ya cambió.",
      state: {
        ...state,
        favorites: state.favorites.filter((item) => !(item.accountId === accountId && item.mealKey === mealKey && item.recipeId === recipeId)),
      },
    };
  }
  if (mine.length >= FAVORITE_LIMIT) {
    return {
      state,
      changed: false,
      message: `Ya tienes ${FAVORITE_LIMIT} favoritos en esta comida. Quita uno para agregar otro.`,
    };
  }
  return {
    changed: true,
    message: "Quedó entre tus favoritos y suma a la calificación de esta comida.",
    state: { ...state, favorites: [...state.favorites, { accountId, recipeId, mealKey }] },
  };
}

function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asPortions(raw: unknown): EquivalentCounts {
  if (!raw || typeof raw !== "object") return {};
  const portions: EquivalentCounts = {};
  for (const group of Object.keys(EQUIVALENT_GROUP_LABEL) as EquivalentGroup[]) {
    if (group === "libre") continue;
    const value = Number((raw as Record<string, unknown>)[group]);
    if (Number.isFinite(value) && value > 0) portions[group] = value;
  }
  return portions;
}

function mealName(kind: MealKind): string {
  if (kind === "desayuno") return "Desayuno";
  if (kind === "comida") return "Comida";
  if (kind === "cena") return "Cena";
  return "Colación";
}

function orderMeals(meals: DietMeal[]): DietMeal[] {
  const rank: Record<MealKind, number> = { desayuno: 0, comida: 1, cena: 2, colacion: 3 };
  return [...meals].sort((a, b) => rank[a.kind] - rank[b.kind]);
}

export function normalizeDiet(raw: unknown): Diet | null {
  if (!raw || typeof raw !== "object") return null;
  const diet = raw as Record<string, unknown>;
  if (typeof diet.id !== "string" || typeof diet.memberId !== "string" || typeof diet.name !== "string") return null;

  const fromList = Array.isArray(diet.meals)
    ? diet.meals.flatMap((item, index): DietMeal[] => {
        if (!item || typeof item !== "object") return [];
        const meal = item as Record<string, unknown>;
        if (typeof meal.kind !== "string" || !MEAL_KINDS.has(meal.kind as MealKind)) return [];
        const kind = meal.kind as MealKind;
        const name = typeof meal.name === "string" && meal.name.trim() ? meal.name.trim() : mealName(kind);
        return [
          {
            id: typeof meal.id === "string" && meal.id ? meal.id : `${diet.id}-${kind}-${index}`,
            name,
            kind,
            portions: asPortions(meal.portions),
          },
        ];
      })
    : [];

  let meals: DietMeal[];
  if (fromList.length > 0) {
    const present = new Set(fromList.map((meal) => meal.kind));
    const missing = (["desayuno", "comida", "cena"] as MealKind[])
      .filter((kind) => !present.has(kind))
      .map((kind) => ({ id: `${diet.id}-${kind}`, name: mealName(kind), kind, portions: {} }));
    meals = orderMeals([...missing, ...fromList]);
  } else {
    const count = Math.min(8, Math.max(3, Math.round(numberOr(diet.mealsPerDay, 3))));
    const split: EquivalentCounts = {};
    for (const [group, value] of Object.entries(asPortions(diet.equivalents)) as [EquivalentGroup, number][]) {
      split[group] = roundQty(value / count);
    }
    meals = [];
    for (let index = 0; index < count; index += 1) {
      const kind: MealKind = index === 0 ? "desayuno" : index === 1 ? "comida" : index === 2 ? "cena" : "colacion";
      meals.push({
        id: `${diet.id}-${kind}-${index}`,
        name: kind === "colacion" ? `Colación ${index - 2}` : mealName(kind),
        kind,
        portions: { ...split },
      });
    }
  }

  return {
    id: diet.id,
    memberId: diet.memberId,
    name: diet.name,
    calories: numberOr(diet.calories, 0),
    proteinG: numberOr(diet.proteinG, 0),
    carbsG: numberOr(diet.carbsG, 0),
    fatG: numberOr(diet.fatG, 0),
    notes: typeof diet.notes === "string" ? diet.notes : "",
    active: Boolean(diet.active),
    assignedById: typeof diet.assignedById === "string" ? diet.assignedById : undefined,
    assignedByName: typeof diet.assignedByName === "string" ? diet.assignedByName : undefined,
    meals,
  };
}

function freshCode(existing: Invite[]): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const code = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
    if (!existing.some((invite) => invite.code === code)) return code;
  }
  return crypto.randomUUID().slice(0, 6).toUpperCase();
}

export function createInvite(state: AppState): { state: AppState; code: string | null } {
  const account = activeAccount(state);
  const kind = account ? professionalKind(account.role) : null;
  if (!account || !kind) return { state, code: null };
  const code = freshCode(state.invites);
  const invite: Invite = { code, professionalId: account.id, kind, createdAt: new Date().toISOString() };
  return { code, state: { ...state, invites: [invite, ...state.invites].slice(0, 12) } };
}

export function acceptInvite(state: AppState, rawCode: string, memberId: string): { state: AppState; message: string } {
  const client = activeAccount(state);
  const code = rawCode.trim().toUpperCase();
  const invite = state.invites.find((item) => item.code.toUpperCase() === code);
  const member = state.members.find((item) => item.id === memberId && item.accountId === client?.id);
  if (!client) return { state, message: "Crea un perfil antes de aceptar una invitación." };
  if (client.role !== "daily") return { state, message: "La invitación se acepta desde un perfil de día a día." };
  if (!invite) return { state, message: "Ese código no está disponible." };
  if (!member) return { state, message: "Elige a quién corresponde este código." };
  if (invite.professionalId === client.id) return { state, message: "Ese código es de este mismo perfil." };
  const samePair = state.links.some((link) => link.professionalId === invite.professionalId && link.memberId === member.id);
  if (samePair) return { state, message: `${member.name} ya está con este nutriólogo.` };
  const professional = state.accounts.find((account) => account.id === invite.professionalId);
  return {
    message: professional ? `${member.name} ya puede seguir el plan de ${professional.name}.` : "Nutriólogo vinculado.",
    state: {
      ...state,
      links: [
        ...state.links.filter((link) => link.memberId !== member.id),
        { id: crypto.randomUUID(), professionalId: invite.professionalId, clientAccountId: client.id, memberId: member.id, kind: "nutritionist" },
      ],
      invites: state.invites.filter((item) => item.code !== invite.code),
    },
  };
}

export function removeLink(state: AppState, linkId: string): AppState {
  return { ...state, links: state.links.filter((link) => link.id !== linkId) };
}

export function setUseEquivalents(state: AppState, enabled: boolean): AppState {
  const accountId = state.activeAccountId;
  return {
    ...state,
    accounts: state.accounts.map((account) => (account.id === accountId ? { ...account, useEquivalents: enabled } : account)),
  };
}

export function usesEquivalentSystem(state: AppState, accountId = state.activeAccountId): boolean {
  return Boolean(state.accounts.find((account) => account.id === accountId)?.useEquivalents);
}

export function guidedMemberIds(state: AppState, accountId = state.activeAccountId): string[] {
  return state.links.filter((link) => link.clientAccountId === accountId).map((link) => link.memberId);
}

export function portionsForRecipe(
  recipe: Recipe,
  members: HouseholdMember[],
  diets: Diet[],
  selectedIds: string[],
  options?: { useEquivalents?: boolean; guidedMemberIds?: string[]; mealKey?: string },
): MealPlan {
  const selected = members.filter((member) => selectedIds.includes(member.id));
  const selectedMeal = options?.mealKey ?? "desayuno";
  const guided = new Set(options?.guidedMemberIds ?? []);
  if (selected.length === 0) return { people: [], totalServings: recipe.servings };
  const perPlate = recipeGroupCounts(recipe, 1);

  const people = selected.map((member) => {
    const diet = diets.find((item) => item.memberId === member.id && item.active);
    const meals = diet?.meals ?? [];
    const guide = Boolean(options?.useEquivalents) || guided.has(member.id);
    if (!diet || diet.calories <= 0 || recipe.kcalPerServing <= 0) {
      return { memberId: member.id, name: member.name, servings: 1, mealKcal: null, dietName: null, basis: "receta" as const, limitLabel: null };
    }
    const mealKcal = Math.round(diet.calories / Math.max(meals.length, 1));
    const meal = meals.find((item) => mealKeyOf(item) === selectedMeal);
    if (guide && meal && hasEquivalentTargets(meal.portions)) {
      const limit = limitingPortion(perPlate, meal.portions);
      if (limit) {
        const servings = Math.min(6, Math.max(0.25, limit.servings));
        return {
          memberId: member.id,
          name: member.name,
          servings,
          mealKcal,
          dietName: diet.name,
          basis: "equivalentes" as const,
          limitLabel: EQUIVALENT_GROUP_LABEL[limit.group],
        };
      }
    }
    const servings = Math.min(6, Math.max(0.25, roundQty(mealKcal / recipe.kcalPerServing)));
    return { memberId: member.id, name: member.name, servings, mealKcal, dietName: diet.name, basis: "kcal" as const, limitLabel: null };
  });

  return {
    people,
    totalServings: Math.min(24, roundQty(people.reduce((sum, person) => sum + person.servings, 0))),
  };
}
