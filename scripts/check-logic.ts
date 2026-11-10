import assert from "node:assert/strict";
import { RECIPES, validateRecipes } from "../src/data/recipes";
import { EQUIVALENTS, validateEquivalents } from "../src/data/equivalents";
import { equivalentsForIngredient } from "../src/lib/equivalents";
import {
  acceptInvite,
  addFamilyMember,
  assignDiet,
  createAccount,
  createInvite,
  emptyApp,
  favoriteScore,
  normalizeDiet,
  portionsForRecipe,
  setActiveAccount,
  toggleFavorite,
} from "../src/lib/profiles";
import {
  assessRecipe,
  buildCookLines,
  buildShoppingList,
  cookMeal,
  exampleState,
  markPurchased,
  matchLevel,
  missingFromLine,
  planMissing,
  saveItem,
} from "../src/lib/pantry";

validateRecipes();

const sample = exampleState();
const levelOf = (id: string) => matchLevel(assessRecipe(RECIPES.find((recipe) => recipe.id === id)!, sample.inventory));

assert.equal(levelOf("huevos-revueltos"), "ready");
assert.equal(levelOf("quesadillas"), "ready");
assert.equal(levelOf("pasta-jitomate"), "ready");
assert.equal(levelOf("frijoles-olla"), "ready");
assert.equal(levelOf("tacos-pollo"), "close");
assert.equal(levelOf("ensalada-atun"), "close");

const huevos = RECIPES.find((recipe) => recipe.id === "huevos-revueltos")!;
const cooked = cookMeal(sample, huevos, 2, buildCookLines(huevos, sample.inventory, 2));
assert.equal(cooked.state.inventory.find((item) => item.catalogId === "huevo")?.quantity, 2);
assert.equal(cooked.state.inventory.find((item) => item.catalogId === "mantequilla")?.quantity, 25);
assert.equal(cooked.state.inventory.find((item) => item.catalogId === "sal")?.quantity, 198);
assert.equal(cooked.missingCount, 0);
assert.equal(cooked.state.cooked[0]?.name, "Huevos revueltos");

const onePortion = buildCookLines(huevos, sample.inventory, 1).find((line) => line.catalogId === "huevo");
assert.equal(onePortion?.requested, 2);
assert.equal(onePortion?.deduct, 2);

const avena = RECIPES.find((recipe) => recipe.id === "avena-leche")!;
const liters = {
  ...sample,
  inventory: sample.inventory.map((item) => (item.catalogId === "leche" ? { ...item, quantity: 1, unit: "l" as const } : item)),
};
const milkCook = cookMeal(liters, avena, 1, buildCookLines(avena, liters.inventory, 1));
const milk = milkCook.state.inventory.find((item) => item.catalogId === "leche");
assert.equal(milk?.quantity, 0.75);
assert.equal(milk?.unit, "l");

const list = buildShoppingList(sample);
assert.deepEqual(
  list.map((line) => line.catalogId),
  ["limon"],
);
assert.equal(list[0]?.quantity, 6);

const bought = markPurchased(sample, list[0]!, 6);
assert.equal(bought.inventory.find((item) => item.catalogId === "limon")?.quantity, 6);
assert.equal(
  buildShoppingList(bought).some((line) => line.catalogId === "limon"),
  false,
);

const tacos = RECIPES.find((recipe) => recipe.id === "tacos-pollo")!;
const planned = planMissing(sample, tacos, 2);
assert.equal(planned.added, 2);
assert.ok(planned.state.extras.some((extra) => extra.catalogId === "pollo" && extra.quantity === 300));
assert.ok(planned.state.extras.some((extra) => extra.catalogId === "limon" && extra.quantity === 1));

const merged = saveItem(
  sample,
  { name: "Huevo", catalogId: "huevo", quantity: 6, unit: "pza", minQuantity: 2, buyQuantity: 12 },
  null,
);
assert.equal(merged.merged, true);
assert.equal(merged.state.inventory.find((item) => item.catalogId === "huevo")?.quantity, 12);

const afterCook = buildShoppingList(cooked.state);
assert.ok(afterCook.some((line) => line.catalogId === "huevo"));
assert.ok(afterCook.some((line) => line.catalogId === "limon"));

const weird = {
  ...sample,
  inventory: sample.inventory.map((item) => (item.catalogId === "huevo" ? { ...item, unit: "g" as const, quantity: 200 } : item)),
};
const eggLine = buildCookLines(huevos, weird.inventory, 2).find((line) => line.catalogId === "huevo");
assert.equal(eggLine?.compatible, false);
assert.equal(eggLine ? missingFromLine(eggLine) : 1, 0);
assert.equal("location" in sample.inventory[0], false);

let people = createAccount(emptyApp(), "Ana", "daily");
const ana = people.accounts[0];
people = createAccount(people, "Dra. López", "nutritionist");
const doctor = people.accounts.find((account) => account.role === "nutritionist");
assert.ok(doctor);
const invited = createInvite(people);
assert.equal(invited.code?.length, 6);
people = setActiveAccount(invited.state, ana.id);
const anaSelf = people.members.find((member) => member.accountId === ana.id && member.kind === "self");
assert.ok(anaSelf);
const linked = acceptInvite(people, invited.code ?? "", anaSelf.id);
assert.equal(linked.state.links.length, 1);
assert.equal(linked.state.links[0]?.memberId, anaSelf.id);
assert.match(linked.message, /Dra\. López/);
const meals = [
  { id: "des", name: "Desayuno", kind: "desayuno" as const, portions: {} },
  { id: "com", name: "Comida", kind: "comida" as const, portions: {} },
  { id: "cen", name: "Cena", kind: "cena" as const, portions: {} },
];
const withDiet = assignDiet(linked.state, {
  memberId: anaSelf.id,
  name: "Déficit",
  calories: 1800,
  proteinG: 120,
  carbsG: 180,
  fatG: 50,
  notes: "",
  meals,
  assignedById: doctor.id,
  assignedByName: doctor.name,
});
const plan = portionsForRecipe(huevos, [anaSelf], withDiet.diets, [anaSelf.id], { mealKey: "desayuno" });
assert.equal(plan.people[0]?.mealKcal, 600);
assert.equal(plan.people[0]?.servings, 2.727);
assert.equal(plan.totalServings, 2.727);
const family = { ...anaSelf, id: "hijo", name: "Leo", kind: "family" as const };
const shared = portionsForRecipe(huevos, [anaSelf, family], withDiet.diets, [anaSelf.id, family.id]);
assert.equal(shared.totalServings, 3.727);

validateEquivalents();
assert.equal(EQUIVALENTS.filter((item) => item.group === "fruta").length, 24);
assert.equal(EQUIVALENTS.filter((item) => item.group === "verdura").length, 22);
assert.equal(EQUIVALENTS.filter((item) => item.group === "cerealSinGrasa").length, 25);
assert.equal(EQUIVALENTS.filter((item) => item.group === "aoaModerado").length, 19);
assert.equal(equivalentsForIngredient("huevo", 1, "pza")?.count, 1);
assert.equal(equivalentsForIngredient("limon", 2, "pza")?.count, 0);
assert.equal(equivalentsForIngredient("leche", 120, "ml")?.count, 1);

const eqDiet = {
  ...withDiet.diets[0]!,
  meals: [
    { id: "des", name: "Desayuno", kind: "desayuno" as const, portions: { aoaModerado: 1 } },
    { id: "com", name: "Comida", kind: "comida" as const, portions: {} },
    { id: "cen", name: "Cena", kind: "cena" as const, portions: {} },
    { id: "col", name: "Media tarde", kind: "colacion" as const, portions: { fruta: 1 } },
  ],
};
const byGroups = portionsForRecipe(huevos, [anaSelf!], [eqDiet], [anaSelf!.id], { useEquivalents: true, mealKey: "desayuno" });
assert.equal(byGroups.people[0]?.servings, 0.5);
assert.equal(byGroups.people[0]?.basis, "equivalentes");
const lunch = portionsForRecipe(huevos, [anaSelf!], [eqDiet], [anaSelf!.id], { useEquivalents: true, mealKey: "comida" });
assert.equal(lunch.people[0]?.basis, "kcal");
const licuado = RECIPES.find((recipe) => recipe.id === "licuado-platano")!;
const snack = portionsForRecipe(licuado, [anaSelf!], [eqDiet], [anaSelf!.id], { useEquivalents: true, mealKey: "colacion:media tarde" });
assert.equal(snack.people[0]?.basis, "equivalentes");
assert.equal(snack.people[0]?.servings, 0.5);
const withoutGuide = portionsForRecipe(huevos, [anaSelf!], [eqDiet], [anaSelf!.id], { mealKey: "desayuno" });
assert.equal(withoutGuide.people[0]?.servings, 2.045);
assert.equal(withoutGuide.people[0]?.basis, "kcal");
const guideWithoutGroups = portionsForRecipe(huevos, [anaSelf!], withDiet.diets, [anaSelf!.id], { useEquivalents: true, mealKey: "desayuno" });
assert.equal(guideWithoutGroups.people[0]?.basis, "kcal");

const legacy = normalizeDiet({
  id: "vieja",
  memberId: anaSelf!.id,
  name: "Anterior",
  calories: 1600,
  proteinG: 100,
  carbsG: 150,
  fatG: 40,
  mealsPerDay: 4,
  equivalents: { aoaModerado: 4 },
  active: true,
  notes: "",
});
assert.equal(legacy?.meals.length, 4);
assert.equal(legacy?.meals[0]?.portions.aoaModerado, 1);
assert.equal(legacy?.meals[3]?.kind, "colacion");

let fav = setActiveAccount(withDiet, ana.id);
for (let index = 0; index < 5; index += 1) {
  const result = toggleFavorite(fav, `receta-${index}`, "desayuno");
  assert.equal(result.changed, true);
  fav = result.state;
}
const blocked = toggleFavorite(fav, "receta-extra", "desayuno");
assert.equal(blocked.changed, false);
assert.match(blocked.message, /5/);
const otherMeal = toggleFavorite(fav, "receta-extra", "comida");
assert.equal(otherMeal.changed, true);
fav = setActiveAccount(otherMeal.state, doctor.id);
const doctorPick = toggleFavorite(fav, "receta-0", "desayuno");
assert.equal(favoriteScore(doctorPick.state.favorites, "receta-0", "desayuno"), 2);
assert.equal(favoriteScore(doctorPick.state.favorites, "receta-1", "desayuno"), 1);
const removed = toggleFavorite(doctorPick.state, "receta-0", "desayuno");
assert.equal(favoriteScore(removed.state.favorites, "receta-0", "desayuno"), 1);

let household = addFamilyMember(linked.state, "Leo");
const leo = household.members.find((member) => member.name === "Leo");
assert.ok(leo);
household = createAccount(household, "Dra. Pérez", "nutritionist");
const second = household.accounts.find((account) => account.name === "Dra. Pérez");
assert.ok(second);
household = setActiveAccount(household, second.id);
const secondInvite = createInvite(household);
household = setActiveAccount(secondInvite.state, ana.id);
const both = acceptInvite(household, secondInvite.code ?? "", leo.id);
assert.equal(both.state.links.length, 2);
assert.match(both.message, /Leo/);
const repeated = acceptInvite(both.state, "NOEXISTE", leo.id);
assert.equal(repeated.state.links.length, 2);
const sameDoctor = createInvite(setActiveAccount(both.state, doctor.id));
const again = acceptInvite(setActiveAccount(sameDoctor.state, ana.id), sameDoctor.code ?? "", anaSelf.id);
assert.match(again.message, /ya está/);
assert.equal(again.state.links.length, 2);

const sharedMeals = [
  { id: "des", name: "Desayuno", kind: "desayuno" as const, portions: { aoaModerado: 1 } },
  { id: "com", name: "Comida", kind: "comida" as const, portions: {} },
  { id: "cen", name: "Cena", kind: "cena" as const, portions: {} },
];
const leoMeals = [
  { id: "des", name: "Desayuno", kind: "desayuno" as const, portions: { aoaModerado: 2 } },
  { id: "com", name: "Comida", kind: "comida" as const, portions: {} },
  { id: "cen", name: "Cena", kind: "cena" as const, portions: {} },
];
let grouped = assignDiet(both.state, {
  memberId: anaSelf.id,
  name: "Ana",
  calories: 1800,
  proteinG: 120,
  carbsG: 180,
  fatG: 50,
  notes: "",
  meals: sharedMeals,
});
grouped = assignDiet(grouped, {
  memberId: leo.id,
  name: "Leo",
  calories: 2200,
  proteinG: 140,
  carbsG: 220,
  fatG: 60,
  notes: "",
  meals: leoMeals,
});
const table = portionsForRecipe(huevos, [anaSelf, leo], grouped.diets, [anaSelf.id, leo.id], {
  guidedMemberIds: [anaSelf.id, leo.id],
  mealKey: "desayuno",
});
assert.equal(table.people[0]?.servings, 0.5);
assert.equal(table.people[1]?.servings, 1);
assert.equal(table.totalServings, 1.5);

console.log(`ok: ${RECIPES.length} recetas, ${EQUIVALENTS.length} equivalentes`);
