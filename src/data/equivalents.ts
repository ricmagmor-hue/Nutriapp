import type { EquivalentGroup, Unit } from "../types";

export type EquivalentMeasure = Unit | "paq" | "bolsa" | "barra";

export type EquivalentFood = {
  id: string;
  group: EquivalentGroup;
  name: string;
  quantity: number;
  unit: EquivalentMeasure;
  label: string;
  catalogIds?: string[];
  prep?: "cocido" | "crudo";
  free?: boolean;
};

export const EQUIVALENT_GROUP_LABEL: Record<EquivalentGroup, string> = {
  fruta: "Fruta",
  verdura: "Verdura",
  cerealSinGrasa: "Cereal sin grasa",
  cerealConGrasa: "Cereal con grasa",
  grasaConProteina: "Grasa con proteína",
  grasaSinProteina: "Grasa sin proteína",
  aoaMuyBajo: "AOA muy bajo en grasa",
  aoaBajo: "AOA bajo en grasa",
  aoaModerado: "AOA moderado en grasa",
  leguminosa: "Leguminosa",
  leche: "Leche",
  azucar: "Azúcar",
  libre: "Libre",
};

export const COUNTABLE_GROUPS = (Object.keys(EQUIVALENT_GROUP_LABEL) as EquivalentGroup[]).filter((group) => group !== "libre");

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function food(
  group: EquivalentGroup,
  name: string,
  quantity: number,
  unit: EquivalentMeasure,
  label: string,
  extra?: Partial<Pick<EquivalentFood, "catalogIds" | "prep" | "free">>,
): EquivalentFood {
  return { id: `${group}-${slug(name)}`, group, name, quantity, unit, label, ...extra };
}

export const EQUIVALENTS: EquivalentFood[] = [
  food("fruta", "Arándano seco con azúcar", 18, "g", "18 g"),
  food("fruta", "Blueberries", 110, "g", "110 g"),
  food("fruta", "Carambolo", 1.5, "pza", "1 ½ pza"),
  food("fruta", "Ciruela roja", 3, "pza", "3 pzas"),
  food("fruta", "Ciruela pasa chica", 7, "pza", "7 pzas"),
  food("fruta", "Durazno", 2, "pza", "2 pzas"),
  food("fruta", "Frambuesas", 1, "taza", "1 tz"),
  food("fruta", "Fresas", 1, "taza", "1 tz"),
  food("fruta", "Guayabas", 2, "pza", "2 pzas"),
  food("fruta", "Higo", 80, "g", "80 g"),
  food("fruta", "Mamey", 55, "g", "55 g"),
  food("fruta", "Mandarinas", 2, "pza", "2 pzas"),
  food("fruta", "Mango", 100, "g", "100 g"),
  food("fruta", "Manzana", 1, "pza", "1 pza"),
  food("fruta", "Melón picado", 1, "taza", "1 tz"),
  food("fruta", "Naranja chica", 2, "pza", "2 pzas"),
  food("fruta", "Papaya picada", 1, "taza", "1 tz"),
  food("fruta", "Pera grande", 0.5, "pza", "½ pza"),
  food("fruta", "Piña picada", 0.75, "taza", "¾ tz"),
  food("fruta", "Plátano", 0.5, "pza", "½ pza", { catalogIds: ["platano"] }),
  food("fruta", "Sandía picada", 1, "taza", "1 tz"),
  food("fruta", "Tunas", 2, "pza", "2 pzas"),
  food("fruta", "Uvas verdes", 10, "pza", "10 pzas"),
  food("fruta", "Zarzamoras", 100, "g", "100 g"),

  food("verdura", "Acelgas cocidas", 0.5, "taza", "½ tz", { prep: "cocido" }),
  food("verdura", "Alcachofa", 1, "pza", "1 pza"),
  food("verdura", "Apio", 2, "taza", "2 tz"),
  food("verdura", "Betabel", 0.5, "pza", "½ pza"),
  food("verdura", "Brócoli", 1, "taza", "1 tz"),
  food("verdura", "Calabacitas", 0.5, "taza", "½ tz"),
  food("verdura", "Cebolla cocida", 0.5, "taza", "½ tz", { prep: "cocido" }),
  food("verdura", "Col cruda", 1.5, "taza", "1 ½ tz"),
  food("verdura", "Coliflor", 1, "taza", "1 tz"),
  food("verdura", "Champiñones", 1, "taza", "1 tz"),
  food("verdura", "Chayote cocido", 0.5, "taza", "½ tz", { prep: "cocido" }),
  food("verdura", "Chícharo", 0.25, "taza", "¼ tz"),
  food("verdura", "Ejote cocido", 0.5, "taza", "½ tz", { prep: "cocido" }),
  food("verdura", "Espinaca cruda", 2, "taza", "2 tz"),
  food("verdura", "Espinaca cocida", 1, "taza", "1 tz", { prep: "cocido" }),
  food("verdura", "Jícama", 1, "taza", "1 tz"),
  food("verdura", "Jitomate", 1, "pza", "1 pza", { catalogIds: ["jitomate"] }),
  food("verdura", "Lechuga", 3, "taza", "3 tz"),
  food("verdura", "Nopal cocido", 1, "pza", "1 pza", { prep: "cocido" }),
  food("verdura", "Pepino rebanado", 1, "taza", "1 tz"),
  food("verdura", "Pimiento", 1, "taza", "1 tz"),
  food("verdura", "Zanahoria", 1, "pza", "1 pza", { catalogIds: ["zanahoria"] }),

  food("cerealSinGrasa", "Arroz cocido", 50, "g", "50 g", { catalogIds: ["arroz"], prep: "cocido" }),
  food("cerealSinGrasa", "Avena cruda", 3, "cda", "3 cdas", { prep: "crudo" }),
  food("cerealSinGrasa", "Bagel", 1 / 3, "pza", "⅓ pza"),
  food("cerealSinGrasa", "Baguette grande", 1 / 5, "pza", "⅕ pza"),
  food("cerealSinGrasa", "Bolillo", 1 / 3, "pza", "⅓ pza"),
  food("cerealSinGrasa", "Camote cocido", 70, "g", "70 g", { prep: "cocido" }),
  food("cerealSinGrasa", "Cereal de caja", 0.5, "taza", "½ tz"),
  food("cerealSinGrasa", "Cuscús cocido", 40, "g", "40 g", { prep: "cocido" }),
  food("cerealSinGrasa", "Elote", 0.5, "taza", "½ tz"),
  food("cerealSinGrasa", "Galletas habaneras", 4, "pza", "4 pzas"),
  food("cerealSinGrasa", "Galletas Marías", 5, "pza", "5 pzas"),
  food("cerealSinGrasa", "Galletas saladas", 5, "pza", "5 pzas"),
  food("cerealSinGrasa", "Hot cakes", 0.5, "pza", "½ pza"),
  food("cerealSinGrasa", "Palomitas", 2.5, "taza", "2 ½ tz"),
  food("cerealSinGrasa", "Pan blanco, integral o tostado", 1, "pza", "1 rebanada", { catalogIds: ["pan"] }),
  food("cerealSinGrasa", "Pan de hamburguesa o hot dog", 0.5, "pza", "½ pza"),
  food("cerealSinGrasa", "Papa cocida", 70, "g", "70 g", { prep: "cocido" }),
  food("cerealSinGrasa", "Pasta cocida", 40, "g", "40 g", { catalogIds: ["pasta"], prep: "cocido" }),
  food("cerealSinGrasa", "Pan árabe", 0.5, "pza", "½ pza"),
  food("cerealSinGrasa", "Pan árabe integral chico", 1, "pza", "1 pza"),
  food("cerealSinGrasa", "Quinoa", 50, "g", "50 g"),
  food("cerealSinGrasa", "Salmas", 1, "paq", "1 paq"),
  food("cerealSinGrasa", "Sopa de pasta o municiones", 40, "g", "40 g"),
  food("cerealSinGrasa", "Tortilla de maíz", 1, "pza", "1 pza", { catalogIds: ["tortilla"] }),
  food("cerealSinGrasa", "Tostadas de nopal", 2, "pza", "2 pzas"),

  food("cerealConGrasa", "Barrita", 0.5, "pza", "½ pza"),
  food("cerealConGrasa", "Bisquet", 0.5, "pza", "½ pza"),
  food("cerealConGrasa", "Cuernito", 0.5, "pza", "½ pza"),
  food("cerealConGrasa", "Dona", 1 / 3, "pza", "⅓ pza"),
  food("cerealConGrasa", "Galleta de avena", 1, "pza", "1 pza"),
  food("cerealConGrasa", "Galleta dulce", 2, "pza", "2 pzas"),
  food("cerealConGrasa", "Granola", 3, "cda", "3 cdas"),
  food("cerealConGrasa", "Muffin", 1 / 3, "pza", "⅓ pza"),
  food("cerealConGrasa", "Papas", 1 / 3, "bolsa", "⅓ bolsa"),
  food("cerealConGrasa", "Pan dulce", 0.5, "pza", "½ pza"),
  food("cerealConGrasa", "Tamal", 0.25, "pza", "¼ pza"),
  food("cerealConGrasa", "Tortilla de harina", 1, "pza", "1 pza"),
  food("cerealConGrasa", "Totopos de maíz", 25, "g", "25 g"),
  food("cerealConGrasa", "Waffle", 1, "pza", "1 pza"),

  food("grasaConProteina", "Ajonjolí, pepitas o semillas", 1, "cda", "1 cda"),
  food("grasaConProteina", "Almendra", 10, "pza", "10 pzas"),
  food("grasaConProteina", "Avellana", 9, "pza", "9 pzas"),
  food("grasaConProteina", "Cacahuates", 13, "pza", "13 pzas"),
  food("grasaConProteina", "Chía", 2, "cda", "2 cdas"),
  food("grasaConProteina", "Crema de cacahuate o almendra", 1, "cda", "1 cda"),
  food("grasaConProteina", "Coco fresco", 12, "g", "12 g"),
  food("grasaConProteina", "Coco rallado", 1.5, "cda", "1 ½ cda"),
  food("grasaConProteina", "Hummus", 2, "cda", "2 cdas"),
  food("grasaConProteina", "Pepitas o piñón", 1, "cda", "1 cda"),
  food("grasaConProteina", "Pistaches", 15, "pza", "15 pzas"),
  food("grasaConProteina", "Nuez de castilla", 3, "pza", "3 pzas"),
  food("grasaConProteina", "Nuez de la india", 7, "pza", "7 pzas"),

  food("grasaSinProteina", "Aceite", 1, "cdita", "1 cucharadita", { catalogIds: ["aceite"] }),
  food("grasaSinProteina", "Aceitunas", 7, "pza", "7 pzas"),
  food("grasaSinProteina", "Aderezo", 1, "cda", "1 cda"),
  food("grasaSinProteina", "Aguacate mediano", 30, "g", "30 g"),
  food("grasaSinProteina", "Dip", 1, "cda", "1 cda"),
  food("grasaSinProteina", "Frijoles refritos", 2, "cda", "2 cdas"),
  food("grasaSinProteina", "Jocoque", 2, "cda", "2 cdas"),
  food("grasaSinProteina", "Media crema", 1, "cda", "1 cda"),
  food("grasaSinProteina", "Mayonesa", 1, "cdita", "1 cucharadita"),
  food("grasaSinProteina", "Margarina", 1, "cdita", "1 cucharadita"),
  food("grasaSinProteina", "Mantequilla", 1, "cdita", "1 cucharadita"),

  food("aoaMuyBajo", "Abulón", 30, "g", "30 g"),
  food("aoaMuyBajo", "Atún enlatado", 0.5, "pza", "½ lata", { catalogIds: ["atun"] }),
  food("aoaMuyBajo", "Atún fresco", 30, "g", "30 g"),
  food("aoaMuyBajo", "Bacalao", 30, "g", "30 g"),
  food("aoaMuyBajo", "Bistec de res", 30, "g", "30 g"),
  food("aoaMuyBajo", "Cangrejo cocido", 30, "g", "30 g", { prep: "cocido" }),
  food("aoaMuyBajo", "Cecina", 25, "g", "25 g"),
  food("aoaMuyBajo", "Chambarete de res", 25, "g", "25 g"),
  food("aoaMuyBajo", "Clara de huevo", 60, "g", "60 g"),
  food("aoaMuyBajo", "Falda de res", 30, "g", "30 g"),
  food("aoaMuyBajo", "Filete de pescado", 35, "g", "35 g"),
  food("aoaMuyBajo", "Pavo", 30, "g", "30 g"),
  food("aoaMuyBajo", "Pechuga de pavo", 2, "pza", "2 rebanadas"),
  food("aoaMuyBajo", "Pechuga de pollo", 30, "g", "30 g", { catalogIds: ["pollo"] }),
  food("aoaMuyBajo", "Queso cottage", 3, "cda", "3 cdas"),
  food("aoaMuyBajo", "Surimi", 1, "barra", "1 barra"),

  food("aoaBajo", "Arrachera de res cruda", 25, "g", "25 g"),
  food("aoaBajo", "Bistec de ternera", 30, "g", "30 g"),
  food("aoaBajo", "Camarón cocido", 25, "g", "25 g", { prep: "cocido" }),
  food("aoaBajo", "Carne de cerdo", 20, "g", "20 g"),
  food("aoaBajo", "Queso cheddar bajo en grasa", 30, "g", "30 g"),
  food("aoaBajo", "Queso de soya", 2, "pza", "2 rebanadas"),
  food("aoaBajo", "Queso fresco", 20, "g", "20 g"),
  food("aoaBajo", "Queso mozzarella bajo en grasa", 20, "g", "20 g"),
  food("aoaBajo", "Queso Oaxaca", 20, "g", "20 g", { catalogIds: ["queso"] }),
  food("aoaBajo", "Queso panela", 30, "g", "30 g"),
  food("aoaBajo", "Requesón", 2, "cda", "2 cdas"),
  food("aoaBajo", "Salmón", 30, "g", "30 g"),
  food("aoaBajo", "Tofu", 40, "g", "40 g"),

  food("aoaModerado", "Huevo", 1, "pza", "1 pza", { catalogIds: ["huevo"] }),
  food("aoaModerado", "Jamón serrano", 10, "g", "10 g"),
  food("aoaModerado", "Jamón de cerdo", 2, "pza", "2 rebanadas", { catalogIds: ["jamon"] }),
  food("aoaModerado", "Nugget de pollo", 2, "pza", "2 pzas"),
  food("aoaModerado", "Palitos de pescado congelados", 1.5, "pza", "1 ½ pza"),
  food("aoaModerado", "Pepperoni", 20, "g", "20 g"),
  food("aoaModerado", "Pollo rostizado", 1 / 3, "pza", "⅓ pza"),
  food("aoaModerado", "Queso amarillo", 2, "pza", "2 rebanadas"),
  food("aoaModerado", "Queso blanco", 30, "g", "30 g"),
  food("aoaModerado", "Queso blue cheese", 15, "g", "15 g"),
  food("aoaModerado", "Queso brie", 15, "g", "15 g"),
  food("aoaModerado", "Queso de cabra", 15, "g", "15 g"),
  food("aoaModerado", "Queso manchego", 15, "g", "15 g"),
  food("aoaModerado", "Queso mozzarella", 20, "g", "20 g"),
  food("aoaModerado", "Queso parmesano", 3.5, "cda", "3 ½ cdas"),
  food("aoaModerado", "Queso tipo americano", 25, "g", "25 g"),
  food("aoaModerado", "Salami", 3, "pza", "3 rebanadas"),
  food("aoaModerado", "Salchicha", 0.5, "pza", "½ pza"),
  food("aoaModerado", "Sardina en tomate", 1, "pza", "1 pza"),

  food("leguminosa", "Alubia cocida", 55, "g", "55 g", { prep: "cocido" }),
  food("leguminosa", "Frijoles cocidos", 50, "g", "50 g", { catalogIds: ["frijol"], prep: "cocido" }),
  food("leguminosa", "Frijoles refritos", 4, "cda", "4 cdas"),
  food("leguminosa", "Garbanzo cocido", 50, "g", "50 g", { prep: "cocido" }),
  food("leguminosa", "Haba cocida", 50, "g", "50 g", { prep: "cocido" }),
  food("leguminosa", "Lentejas", 50, "g", "50 g", { catalogIds: ["lenteja"], prep: "cocido" }),

  food("leche", "Helado", 0.25, "taza", "¼ tz"),
  food("leche", "Jocoque", 2, "cda", "2 cdas"),
  food("leche", "Leche de almendra, soya o coco", 1, "taza", "1 tz"),
  food("leche", "Leche de avena o arroz", 0.75, "taza", "¾ tz"),
  food("leche", "Leche en polvo", 2, "cda", "2 cdas"),
  food("leche", "Leche entera", 0.5, "taza", "½ tz", { catalogIds: ["leche"] }),
  food("leche", "Leche evaporada", 1 / 3, "taza", "⅓ tz"),
  food("leche", "Leche light", 0.75, "taza", "¾ tz"),
  food("leche", "Yogurt", 0.75, "taza", "¾ tz"),

  food("azucar", "Azúcar granulada", 2, "cdita", "2 cucharaditas"),
  food("azucar", "Cajeta, mermelada o miel", 2, "cdita", "2 cucharaditas"),
  food("azucar", "Caramelos", 2, "pza", "2 pzas"),
  food("azucar", "Catsup", 2, "cda", "2 cdas"),
  food("azucar", "Chocolate en polvo", 2, "cdita", "2 cucharaditas"),
  food("azucar", "Dulce de leche", 2, "cdita", "2 cucharaditas"),
  food("azucar", "Gelatina", 0.5, "taza", "½ tz"),
  food("azucar", "Gomitas", 4, "pza", "4 pzas"),
  food("azucar", "Jugos o refrescos", 1 / 3, "taza", "⅓ tz"),
  food("azucar", "Leche condensada", 2, "cdita", "2 cucharaditas"),
  food("azucar", "Malvaviscos", 2, "pza", "2 pzas"),
  food("azucar", "Paleta helada", 0.5, "pza", "½ pza"),
  food("azucar", "Piloncillo", 10, "g", "10 g"),
  food("azucar", "Té helado", 2, "cda", "2 cdas"),

  food("libre", "Agua mineral", 0, "pza", "Libre", { free: true }),
  food("libre", "Refresco light", 1, "pza", "1 lata", { free: true }),
  food("libre", "Consomé de pollo desgrasado", 0, "pza", "Libre", { free: true }),
  food("libre", "Té", 0, "pza", "Libre", { free: true }),
  food("libre", "Vinagre", 0, "pza", "Libre", { free: true }),
  food("libre", "Limón", 0, "pza", "Libre", { catalogIds: ["limon"], free: true }),
  food("libre", "Gelatina light", 0, "pza", "Libre", { free: true }),
];

export const EQUIVALENT_RECOMMENDATIONS = [
  "Pan Bimbo Doble Cero",
  "Salmas, Susalia",
  "Crema de almendra o cacahuate Kirkland",
  "Chocolate Turín sin azúcar",
  "Aderezos light, menos de 20 calorías por porción (Clemente Jacques)",
  "Gelatina light (Jello, D'Gari)",
  "Barritas Stila, Brownie Fiber One, obleas Kalan, choco-obleas",
  "Yogurt Chobani, Fage, Yoplait griego sin azúcar o yogurt griego Kirkland",
  "Leche vegetal Silk, Ades o Calahua",
];

export function validateEquivalents(): void {
  const seen = new Set<string>();
  const catalogs = new Set<string>();
  for (const item of EQUIVALENTS) {
    if (seen.has(item.id)) throw new Error(`Equivalente duplicado: ${item.id}`);
    seen.add(item.id);
    if (!item.free && item.quantity <= 0) throw new Error(`Porción inválida: ${item.name}`);
    for (const catalogId of item.catalogIds ?? []) {
      if (catalogs.has(catalogId)) throw new Error(`El alimento ${catalogId} está en dos equivalentes`);
      catalogs.add(catalogId);
    }
  }
}
