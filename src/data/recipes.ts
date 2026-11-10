import { getCatalog, validateCatalog } from "./catalog";
import type { MealTag, Recipe, RecipeIngredient } from "../types";

const NUTRITION: Record<string, { kcal: number; protein: number; carbs: number; fat: number }> = {
  "huevos-revueltos": { kcal: 220, protein: 14, carbs: 2, fat: 17 },
  "huevo-aguacate": { kcal: 430, protein: 16, carbs: 12, fat: 36 },
  "avena-leche": { kcal: 290, protein: 13, carbs: 42, fat: 8 },
  "licuado-platano": { kcal: 230, protein: 9, carbs: 38, fat: 5 },
  quesadillas: { kcal: 340, protein: 15, carbs: 34, fat: 15 },
  "sandwich-jamon": { kcal: 360, protein: 18, carbs: 34, fat: 15 },
  "pasta-jitomate": { kcal: 490, protein: 15, carbs: 74, fat: 14 },
  "arroz-rojo": { kcal: 280, protein: 5, carbs: 50, fat: 6 },
  "ensalada-atun": { kcal: 230, protein: 26, carbs: 8, fat: 9 },
  "pollo-verduras": { kcal: 340, protein: 42, carbs: 10, fat: 14 },
  "tacos-pollo": { kcal: 430, protein: 36, carbs: 42, fat: 12 },
  "sopa-lentejas": { kcal: 250, protein: 16, carbs: 38, fat: 4 },
  "frijoles-olla": { kcal: 220, protein: 13, carbs: 36, fat: 2 },
  "yogurt-fruta": { kcal: 240, protein: 11, carbs: 38, fat: 5 },
};

function recipe(
  id: string,
  name: string,
  emoji: string,
  summary: string,
  minutes: number,
  servings: number,
  tags: MealTag[],
  ingredients: RecipeIngredient[],
  steps: string[],
): Recipe {
  const nutrition = NUTRITION[id];
  if (!nutrition) throw new Error(`Falta el cálculo nutricional de ${id}`);
  return {
    id,
    name,
    emoji,
    summary,
    minutes,
    servings,
    tags,
    ingredients,
    steps,
    kcalPerServing: nutrition.kcal,
    proteinPerServing: nutrition.protein,
    carbsPerServing: nutrition.carbs,
    fatPerServing: nutrition.fat,
  };
}

export const RECIPES: Recipe[] = [
  recipe(
    "huevos-revueltos",
    "Huevos revueltos",
    "🍳",
    "Desayuno rápido con lo que casi siempre hay en casa.",
    10,
    2,
    ["Desayuno"],
    [
      { catalogId: "huevo", quantity: 4 },
      { catalogId: "mantequilla", quantity: 15, optional: true },
      { catalogId: "sal", quantity: 2, optional: true },
    ],
    [
      "Bate los huevos con una pizca de sal.",
      "Calienta la mantequilla a fuego medio. Si no tienes, usa unas gotas de aceite.",
      "Vierte los huevos y muévelos hasta que cuajen, todavía jugosos.",
    ],
  ),
  recipe(
    "huevo-aguacate",
    "Huevo con aguacate",
    "🥑",
    "Plato salado, fresco y listo en pocos minutos.",
    12,
    1,
    ["Desayuno"],
    [
      { catalogId: "huevo", quantity: 2 },
      { catalogId: "aguacate", quantity: 1 },
      { catalogId: "limon", quantity: 0.5, optional: true },
      { catalogId: "sal", quantity: 1, optional: true },
    ],
    [
      "Cocina los huevos estrellados o pasados por agua.",
      "Parte el aguacate y aplástalo con sal. Si tienes limón, agrega unas gotas.",
      "Sirve el aguacate junto a los huevos.",
    ],
  ),
  recipe(
    "avena-leche",
    "Avena con leche",
    "🥣",
    "Un desayuno caliente con avena y leche.",
    8,
    1,
    ["Desayuno"],
    [
      { catalogId: "avena", quantity: 50 },
      { catalogId: "leche", quantity: 250 },
      { catalogId: "platano", quantity: 1, optional: true },
      { catalogId: "azucar", quantity: 8, optional: true },
    ],
    [
      "Calienta la leche con la avena a fuego medio, moviendo de vez en cuando.",
      "Cuando espese, retira del fuego.",
      "Endulza si quieres y corona con plátano en rodajas.",
    ],
  ),
  recipe(
    "licuado-platano",
    "Licuado de plátano",
    "🥛",
    "Para cuando quieres algo frío y no hay tiempo de cocinar.",
    5,
    1,
    ["Desayuno", "Colación"],
    [
      { catalogId: "platano", quantity: 1 },
      { catalogId: "leche", quantity: 300 },
      { catalogId: "miel", quantity: 10, optional: true },
    ],
    [
      "Pela el plátano y córtalo en trozos.",
      "Licúa con la leche hasta que quede liso.",
      "Prueba y, si lo quieres más dulce, agrega miel.",
    ],
  ),
  recipe(
    "quesadillas",
    "Quesadillas de queso",
    "🧀",
    "Cena o comida express si tienes tortillas y queso.",
    15,
    2,
    ["Comida", "Cena"],
    [
      { catalogId: "tortilla", quantity: 4 },
      { catalogId: "queso", quantity: 120 },
    ],
    [
      "Reparte el queso sobre las tortillas.",
      "Dóblalas y cuécelas en un comal caliente, volteando hasta que el queso funda.",
      "Sirve de inmediato.",
    ],
  ),
  recipe(
    "sandwich-jamon",
    "Sándwich de jamón y queso",
    "🥪",
    "Arma dos sándwiches con pan de caja y fiambre.",
    10,
    2,
    ["Comida", "Cena"],
    [
      { catalogId: "pan", quantity: 4 },
      { catalogId: "jamon", quantity: 4 },
      { catalogId: "queso", quantity: 60 },
      { catalogId: "jitomate", quantity: 1, optional: true },
    ],
    [
      "Tuesta el pan si quieres.",
      "Arma cada sándwich con jamón y queso. Suma jitomate en rebanadas si tienes.",
      "Ciérralos y córtalos por la mitad.",
    ],
  ),
  recipe(
    "pasta-jitomate",
    "Pasta al jitomate",
    "🍝",
    "Salsa rápida con jitomate, cebolla y ajo.",
    25,
    2,
    ["Comida", "Cena"],
    [
      { catalogId: "pasta", quantity: 180 },
      { catalogId: "jitomate", quantity: 3 },
      { catalogId: "cebolla", quantity: 0.5 },
      { catalogId: "ajo", quantity: 1 },
      { catalogId: "aceite", quantity: 15 },
      { catalogId: "sal", quantity: 3, optional: true },
    ],
    [
      "Hierve la pasta en agua con sal hasta que esté al dente.",
      "Sofríe cebolla y ajo picados en el aceite. Agrega el jitomate picado y cocina hasta que suelte su jugo.",
      "Mezcla la pasta con la salsa y ajusta de sal.",
    ],
  ),
  recipe(
    "arroz-rojo",
    "Arroz rojo",
    "🍚",
    "Arroz de olla para acompañar casi cualquier comida. Rinde para guardar.",
    35,
    4,
    ["Comida"],
    [
      { catalogId: "arroz", quantity: 400 },
      { catalogId: "jitomate", quantity: 2 },
      { catalogId: "cebolla", quantity: 0.5 },
      { catalogId: "ajo", quantity: 1 },
      { catalogId: "aceite", quantity: 20 },
      { catalogId: "sal", quantity: 4, optional: true },
    ],
    [
      "Licúa el jitomate con la cebolla, el ajo y una taza de agua.",
      "Sofríe el arroz en el aceite un par de minutos, sin quemarlo.",
      "Agrega el licuado y sal. Cuece tapado a fuego bajo unos 18 minutos, hasta que el arroz absorba el líquido.",
      "Deja reposar 5 minutos y suelta los granos con un tenedor.",
    ],
  ),
  recipe(
    "ensalada-atun",
    "Ensalada de atún",
    "🥗",
    "Fresca, sin estufa, buena para comida o cena ligera.",
    15,
    2,
    ["Comida", "Cena"],
    [
      { catalogId: "atun", quantity: 2 },
      { catalogId: "jitomate", quantity: 2 },
      { catalogId: "cebolla", quantity: 0.25 },
      { catalogId: "limon", quantity: 1 },
      { catalogId: "cilantro", quantity: 0.5, optional: true },
    ],
    [
      "Escurre el atún.",
      "Pica jitomate, cebolla y, si tienes, cilantro.",
      "Mezcla todo con el jugo del limón y sirve frío.",
    ],
  ),
  recipe(
    "pollo-verduras",
    "Pollo con zanahoria",
    "🍗",
    "Pechuga en tiras con zanahoria y cebolla.",
    25,
    2,
    ["Comida", "Cena"],
    [
      { catalogId: "pollo", quantity: 400 },
      { catalogId: "zanahoria", quantity: 2 },
      { catalogId: "cebolla", quantity: 0.5 },
      { catalogId: "aceite", quantity: 15 },
      { catalogId: "sal", quantity: 3, optional: true },
    ],
    [
      "Corta el pollo en tiras, la zanahoria en cubos y la cebolla en gajos.",
      "Saltea el pollo con aceite y sal hasta que dore.",
      "Agrega las verduras y cocina hasta que estén suaves y el pollo bien cocido.",
    ],
  ),
  recipe(
    "tacos-pollo",
    "Tacos de pollo",
    "🌮",
    "Tortillas calientes con pollo deshebrado o en tiras.",
    20,
    2,
    ["Comida", "Cena"],
    [
      { catalogId: "tortilla", quantity: 6 },
      { catalogId: "pollo", quantity: 300 },
      { catalogId: "cebolla", quantity: 0.25 },
      { catalogId: "limon", quantity: 1 },
      { catalogId: "cilantro", quantity: 0.5, optional: true },
    ],
    [
      "Cocina el pollo con un poco de sal y deshébralo o córtalo en tiras.",
      "Calienta las tortillas.",
      "Rellena, agrega cebolla y cilantro, y exprime limón al servir.",
    ],
  ),
  recipe(
    "sopa-lentejas",
    "Sopa de lentejas",
    "🍲",
    "Olla grande para comer hoy y recalentar mañana.",
    40,
    4,
    ["Comida", "Cena"],
    [
      { catalogId: "lenteja", quantity: 300 },
      { catalogId: "jitomate", quantity: 2 },
      { catalogId: "cebolla", quantity: 1 },
      { catalogId: "ajo", quantity: 2 },
      { catalogId: "sal", quantity: 4, optional: true },
    ],
    [
      "Enjuaga las lentejas.",
      "Hierve lentejas, jitomate, cebolla y ajo picados con suficiente agua para cubrirlos.",
      "Cuando las lentejas estén suaves, sala y aplasta un poco la olla para espesar el caldo.",
    ],
  ),
  recipe(
    "frijoles-olla",
    "Frijoles de la olla",
    "🫘",
    "Frijol sencillo para comer varios días.",
    70,
    4,
    ["Comida"],
    [
      { catalogId: "frijol", quantity: 250 },
      { catalogId: "cebolla", quantity: 0.5 },
      { catalogId: "ajo", quantity: 1 },
      { catalogId: "sal", quantity: 4, optional: true },
    ],
    [
      "Enjuaga el frijol y cuécelo en agua que lo cubra, junto con cebolla y ajo.",
      "Hierve tapado a fuego medio hasta que el grano esté suave. Agrega agua si se seca.",
      "Sala casi al final para que el frijol no se endurezca.",
    ],
  ),
  recipe(
    "yogurt-fruta",
    "Yogurt con plátano",
    "🍌",
    "Snack frío, sin cocinar.",
    5,
    1,
    ["Desayuno", "Cena", "Colación"],
    [
      { catalogId: "yogurt", quantity: 200 },
      { catalogId: "platano", quantity: 1 },
      { catalogId: "miel", quantity: 10, optional: true },
    ],
    [
      "Sirve el yogurt en un tazón.",
      "Corta el plátano encima.",
      "Agrega miel si quieres más dulce.",
    ],
  ),
];

export function validateRecipes(): void {
  validateCatalog();
  const seen = new Set<string>();
  for (const recipe of RECIPES) {
    if (seen.has(recipe.id)) throw new Error(`Receta duplicada: ${recipe.id}`);
    seen.add(recipe.id);
    for (const ingredient of recipe.ingredients) {
      if (!getCatalog(ingredient.catalogId)) {
        throw new Error(`${recipe.id} usa un ingrediente desconocido: ${ingredient.catalogId}`);
      }
    }
  }
}
