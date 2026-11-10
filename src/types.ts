export type Unit = "pza" | "g" | "kg" | "ml" | "l" | "taza" | "cda" | "cdita";

export type AccountRole = "daily" | "nutritionist";

export type ProfessionalKind = "nutritionist";

export type MealKind = "desayuno" | "comida" | "cena" | "colacion";

export type EquivalentGroup =
  | "fruta"
  | "verdura"
  | "cerealSinGrasa"
  | "cerealConGrasa"
  | "grasaConProteina"
  | "grasaSinProteina"
  | "aoaMuyBajo"
  | "aoaBajo"
  | "aoaModerado"
  | "leguminosa"
  | "leche"
  | "azucar"
  | "libre";

export type EquivalentCounts = Partial<Record<EquivalentGroup, number>>;

export type Account = {
  id: string;
  name: string;
  role: AccountRole;
  useEquivalents?: boolean;
};

export type HouseholdMember = {
  id: string;
  accountId: string;
  name: string;
  kind: "self" | "family";
  age?: number;
  sex?: "femenino" | "masculino";
  weightKg?: number;
};

export type DietMeal = {
  id: string;
  name: string;
  kind: MealKind;
  portions: EquivalentCounts;
};

export type Diet = {
  id: string;
  memberId: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
  active: boolean;
  assignedById?: string;
  assignedByName?: string;
  meals: DietMeal[];
};

export type ClientLink = {
  id: string;
  professionalId: string;
  clientAccountId: string;
  memberId: string;
  kind: ProfessionalKind;
};

export type Invite = {
  code: string;
  professionalId: string;
  kind: ProfessionalKind;
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  catalogId?: string;
  name: string;
  quantity: number;
  unit: Unit;
  minQuantity: number;
  buyQuantity: number;
};

export type ShoppingExtra = {
  id: string;
  catalogId?: string;
  name: string;
  quantity: number;
  unit: Unit;
  note: string;
};

export type CookedEntry = {
  id: string;
  recipeId: string;
  name: string;
  servings: number;
  at: string;
};

export type Kitchen = {
  inventory: InventoryItem[];
  extras: ShoppingExtra[];
  cooked: CookedEntry[];
};

export type RecipeFavorite = {
  accountId: string;
  recipeId: string;
  mealKey: string;
};

export type AppState = {
  accounts: Account[];
  activeAccountId: string;
  members: HouseholdMember[];
  diets: Diet[];
  links: ClientLink[];
  invites: Invite[];
  favorites: RecipeFavorite[];
  cookingFor: Record<string, string[]>;
  kitchens: Record<string, Kitchen>;
};

export type CatalogItem = {
  id: string;
  name: string;
  unit: Unit;
  minQuantity: number;
  buyQuantity: number;
  category: string;
  aliases?: string[];
};

export type RecipeIngredient = {
  catalogId: string;
  quantity: number;
  optional?: boolean;
};

export type MealTag = "Desayuno" | "Comida" | "Cena" | "Colación";

export type Recipe = {
  id: string;
  name: string;
  emoji: string;
  summary: string;
  minutes: number;
  servings: number;
  tags: MealTag[];
  ingredients: RecipeIngredient[];
  steps: string[];
  kcalPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
};

export type IngredientStatus = "ok" | "short" | "absent" | "unit" | "optional";

export type AssessedIngredient = {
  catalogId: string;
  name: string;
  category: string;
  requested: number;
  unit: Unit;
  optional: boolean;
  status: IngredientStatus;
  have: number | null;
  shortBy: number;
};

export type MatchLevel = "ready" | "close" | "missing";

export type CookLine = {
  catalogId: string;
  name: string;
  optional: boolean;
  requested: number;
  requestUnit: Unit;
  available: number;
  deduct: number;
  deductUnit: Unit;
  haveLabel: string;
  compatible: boolean;
  hint: string;
};

export type ShopLine = {
  key: string;
  catalogId?: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: string;
  notes: string[];
  extraIds: string[];
  inventoryId?: string;
};
