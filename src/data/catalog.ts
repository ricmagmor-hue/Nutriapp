import type { CatalogItem, Unit } from "../types";

function item(
  id: string,
  name: string,
  unit: Unit,
  minQuantity: number,
  buyQuantity: number,
  category: string,
  aliases?: string[],
): CatalogItem {
  return { id, name, unit, minQuantity, buyQuantity, category, aliases };
}

export const CATEGORY_ORDER = [
  "Verduras",
  "Frutas",
  "Proteínas",
  "Lácteos",
  "Granos",
  "Abarrotes",
  "Condimentos",
  "Otros",
];

export const CATALOG: CatalogItem[] = [
  item("huevo", "Huevo", "pza", 2, 12, "Proteínas", ["huevos"]),
  item("leche", "Leche", "ml", 250, 1000, "Lácteos"),
  item("queso", "Queso", "g", 80, 400, "Lácteos"),
  item("mantequilla", "Mantequilla", "g", 20, 90, "Lácteos"),
  item("yogurt", "Yogurt", "g", 150, 450, "Lácteos"),
  item("jamon", "Jamón", "pza", 2, 10, "Proteínas", ["jamon"]),
  item("pollo", "Pechuga de pollo", "g", 200, 600, "Proteínas", ["pollo"]),
  item("jitomate", "Jitomate", "pza", 2, 6, "Verduras", ["tomate", "jitomates"]),
  item("cebolla", "Cebolla", "pza", 1, 4, "Verduras"),
  item("ajo", "Ajo", "pza", 2, 8, "Verduras", ["diente de ajo"]),
  item("aguacate", "Aguacate", "pza", 1, 3, "Frutas"),
  item("limon", "Limón", "pza", 2, 6, "Frutas", ["limon", "limones"]),
  item("cilantro", "Cilantro", "pza", 1, 1, "Verduras"),
  item("zanahoria", "Zanahoria", "pza", 1, 4, "Verduras"),
  item("chile", "Chile", "pza", 2, 6, "Verduras", ["chile serrano"]),
  item("papa", "Papa", "pza", 2, 6, "Verduras", ["papas"]),
  item("elote", "Elote", "pza", 1, 4, "Verduras"),
  item("platano", "Plátano", "pza", 2, 6, "Frutas", ["platano", "banano"]),
  item("tortilla", "Tortilla de maíz", "pza", 4, 16, "Granos", ["tortillas"]),
  item("pan", "Pan de caja", "pza", 2, 8, "Granos", ["pan"]),
  item("arroz", "Arroz", "g", 200, 1000, "Granos"),
  item("pasta", "Pasta", "g", 180, 500, "Granos", ["espagueti", "spaghetti"]),
  item("frijol", "Frijol", "g", 200, 500, "Granos", ["frijoles"]),
  item("lenteja", "Lenteja", "g", 200, 500, "Granos", ["lentejas"]),
  item("avena", "Avena", "g", 80, 400, "Granos"),
  item("harina", "Harina", "g", 200, 1000, "Granos"),
  item("atun", "Atún en lata", "pza", 1, 3, "Proteínas", ["atun", "lata de atun"]),
  item("aceite", "Aceite", "ml", 80, 750, "Condimentos"),
  item("sal", "Sal", "g", 30, 500, "Condimentos"),
  item("azucar", "Azúcar", "g", 80, 500, "Abarrotes", ["azucar"]),
  item("miel", "Miel", "g", 30, 300, "Condimentos"),
  item("cafe", "Café", "g", 30, 250, "Abarrotes", ["cafe"]),
];

const byId = new Map(CATALOG.map((entry) => [entry.id, entry]));

export function getCatalog(id: string): CatalogItem | undefined {
  return byId.get(id);
}

export function validateCatalog(): void {
  const seen = new Set<string>();
  for (const entry of CATALOG) {
    if (seen.has(entry.id)) throw new Error(`Ingrediente duplicado: ${entry.id}`);
    seen.add(entry.id);
  }
}
