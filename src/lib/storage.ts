import { emptyState } from "./pantry";
import { emptyApp, normalizeDiet } from "./profiles";
import type { Account, AppState, ClientLink, Diet, HouseholdMember, InventoryItem, Invite, Kitchen, RecipeFavorite, Unit } from "../types";

const STORAGE_KEY = "despensa-v2";
const LEGACY_KEY = "despensa-v1";

const UNITS = new Set<Unit>(["pza", "g", "kg", "ml", "l", "taza", "cda", "cdita"]);

function cleanItem(raw: unknown): InventoryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<InventoryItem>;
  if (!item.id || !item.name || !item.unit || !UNITS.has(item.unit)) return null;
  return {
    id: item.id,
    catalogId: item.catalogId,
    name: item.name,
    quantity: Number(item.quantity) || 0,
    unit: item.unit,
    minQuantity: Number(item.minQuantity) || 0,
    buyQuantity: Number(item.buyQuantity) || 1,
  };
}

function asKitchen(raw: unknown): Kitchen {
  if (!raw || typeof raw !== "object") return emptyState();
  const value = raw as Partial<Kitchen>;
  return {
    inventory: Array.isArray(value.inventory) ? value.inventory.map(cleanItem).filter((item): item is InventoryItem => item !== null) : [],
    extras: Array.isArray(value.extras) ? value.extras : [],
    cooked: Array.isArray(value.cooked) ? value.cooked : [],
  };
}

function normalizeAccount(raw: unknown): Account | null {
  if (!raw || typeof raw !== "object") return null;
  const account = raw as Partial<Account> & { role?: string };
  if (!account.id || !account.name) return null;
  return {
    id: account.id,
    name: account.name,
    role: account.role === "nutritionist" ? "nutritionist" : "daily",
    useEquivalents: Boolean(account.useEquivalents),
  };
}

function normalizeLink(raw: unknown, members: HouseholdMember[]): ClientLink | null {
  if (!raw || typeof raw !== "object") return null;
  const link = raw as { id?: string; professionalId?: string; clientAccountId?: string; memberId?: string; kind?: string };
  if (!link.id || !link.professionalId || !link.clientAccountId || link.kind === "trainer") return null;
  const memberId =
    link.memberId && members.some((member) => member.id === link.memberId)
      ? link.memberId
      : members.find((member) => member.accountId === link.clientAccountId && member.kind === "self")?.id;
  if (!memberId) return null;
  return { id: link.id, professionalId: link.professionalId, clientAccountId: link.clientAccountId, memberId, kind: "nutritionist" };
}

function normalizeInvite(raw: unknown): Invite | null {
  if (!raw || typeof raw !== "object") return null;
  const invite = raw as { code?: string; professionalId?: string; createdAt?: string; kind?: string };
  if (!invite.code || !invite.professionalId || !invite.createdAt || invite.kind === "trainer") return null;
  return { code: invite.code, professionalId: invite.professionalId, kind: "nutritionist", createdAt: invite.createdAt };
}

function normalizeFavorite(raw: unknown): RecipeFavorite | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<RecipeFavorite>;
  if (!item.accountId || !item.recipeId || !item.mealKey) return null;
  const known = item.mealKey === "desayuno" || item.mealKey === "comida" || item.mealKey === "cena" || item.mealKey.startsWith("colacion:");
  if (!known) return null;
  return { accountId: item.accountId, recipeId: item.recipeId, mealKey: item.mealKey };
}

function fromLegacy(raw: string): AppState {
  const kitchen = asKitchen(JSON.parse(raw) as unknown);
  const accountId = "hogar";
  const memberId = "hogar-yo";
  return {
    ...emptyApp(),
    accounts: [{ id: accountId, name: "Mi hogar", role: "daily" }],
    activeAccountId: accountId,
    members: [{ id: memberId, accountId, name: "Yo", kind: "self" }],
    cookingFor: { [accountId]: [memberId] },
    kitchens: { [accountId]: kitchen },
  };
}

function normalize(parsed: Partial<AppState> & { accounts?: unknown[] }): AppState {
  const accounts = Array.isArray(parsed.accounts) ? parsed.accounts.map(normalizeAccount).filter((account): account is Account => account !== null) : [];
  if (accounts.length === 0) return emptyApp();
  const base = emptyApp();
  const active = accounts.some((account) => account.id === parsed.activeAccountId) ? parsed.activeAccountId || accounts[0].id : accounts[0].id;
  const members = Array.isArray(parsed.members) ? (parsed.members as HouseholdMember[]) : [];
  const links = Array.isArray(parsed.links)
    ? parsed.links.map((link) => normalizeLink(link, members)).filter((link): link is ClientLink => link !== null)
    : [];
  const seenMembers = new Set<string>();
  return {
    ...base,
    accounts,
    activeAccountId: active,
    members,
    diets: Array.isArray(parsed.diets) ? parsed.diets.map(normalizeDiet).filter((diet): diet is Diet => diet !== null) : [],
    links: links.filter((link) => {
      if (seenMembers.has(link.memberId)) return false;
      seenMembers.add(link.memberId);
      return true;
    }),
    invites: Array.isArray(parsed.invites) ? parsed.invites.map(normalizeInvite).filter((invite): invite is Invite => invite !== null) : [],
    favorites: Array.isArray(parsed.favorites) ? parsed.favorites.map(normalizeFavorite).filter((item): item is RecipeFavorite => item !== null) : [],
    cookingFor: parsed.cookingFor && typeof parsed.cookingFor === "object" ? parsed.cookingFor : {},
    kitchens: parsed.kitchens && typeof parsed.kitchens === "object" ? parsed.kitchens : {},
  };
}

export function loadState(): AppState {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalize(JSON.parse(current) as Partial<AppState>);
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return fromLegacy(legacy);
    return emptyApp();
  } catch {
    return emptyApp();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
