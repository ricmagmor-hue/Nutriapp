import { useState } from "react";
import { RECIPES } from "../data/recipes";
import { cookedGuideNote, formatGroupCounts, recipeGroupCounts } from "../lib/equivalents";
import {
  FAVORITE_LIMIT,
  favoriteScore,
  favoritesInMeal,
  isFavorite,
  mealChoices,
  portionsForRecipe,
  type MealChoice,
} from "../lib/profiles";
import { assessRecipe, cookMeal, matchLevel, planMissing } from "../lib/pantry";
import { clampServings, formatQty, parseQty } from "../lib/units";
import type { AssessedIngredient, Diet, HouseholdMember, Kitchen, MatchLevel, Recipe, RecipeFavorite } from "../types";
import { CookDialog } from "./CookDialog";

type Filter = "all" | MatchLevel;

type Props = {
  state: Kitchen;
  setState: (state: Kitchen) => void;
  members: HouseholdMember[];
  diets: Diet[];
  selectedIds: string[];
  useEquivalents: boolean;
  guidedMemberIds: string[];
  accountId: string;
  favorites: RecipeFavorite[];
  onToggleMember: (memberId: string) => void;
  onToggleFavorite: (recipeId: string, mealKey: string) => string;
  onOpenShopping: () => void;
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "ready", label: "Puedo hacer" },
  { id: "close", label: "Casi" },
  { id: "missing", label: "Me faltan" },
];

function problemCount(lines: AssessedIngredient[]): number {
  return lines.filter((line) => line.status === "short" || line.status === "absent" || line.status === "unit").length;
}

function levelLabel(level: MatchLevel, problems: number): string {
  if (level === "ready") return "Puedes hacerla";
  if (level === "close") return problems === 1 ? "Te falta 1" : `Te faltan ${problems}`;
  return "Faltan varios";
}

function ingredientNote(line: AssessedIngredient): string {
  if (line.status === "ok" && line.optional) return "Opcional · lo tienes";
  if (line.status === "ok") return "Lo tienes";
  if (line.status === "optional") return "Opcional";
  if (line.status === "short") return `Te faltan ${formatQty(line.shortBy, line.unit)}`;
  if (line.status === "unit") return "La unidad no coincide con la receta";
  return "No está en tu inventario";
}

function scoreLabel(score: number): string {
  if (score === 0) return "Sin calificación";
  if (score === 1) return "1 perfil la eligió";
  return `${score} perfiles la eligieron`;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" }).format(date);
  const day = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(date);
  const today = new Date();
  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return `Hoy, ${time}`;
  if (sameDay(date, yesterday)) return `Ayer, ${time}`;
  return `${day}, ${time}`;
}

function mealByClock(choices: MealChoice[]): string {
  const hour = new Date().getHours();
  const kind = hour < 11 ? "desayuno" : hour < 17 ? "comida" : "cena";
  return choices.find((choice) => choice.kind === kind)?.key ?? choices[0].key;
}

export function RecipesView({
  state,
  setState,
  members,
  diets,
  selectedIds,
  useEquivalents,
  guidedMemberIds,
  accountId,
  favorites,
  onToggleMember,
  onToggleFavorite,
  onOpenShopping,
}: Props) {
  const choices = mealChoices(diets, selectedIds);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [mealKey, setMealKey] = useState(() => mealByClock(choices));
  const meal = choices.find((choice) => choice.key === mealKey) ?? choices[0];
  const selected = RECIPES.find((recipe) => recipe.id === selectedId) ?? null;
  const needle = query.trim().toLocaleLowerCase("es");
  const savedHere = favoritesInMeal(favorites, accountId, meal.key);

  const ranked = RECIPES.map((recipe) => {
    const plan = portionsForRecipe(recipe, members, diets, selectedIds, { useEquivalents, guidedMemberIds, mealKey: meal.key });
    const assessed = assessRecipe(recipe, state.inventory, plan.totalServings);
    const score = favoriteScore(favorites, recipe.id, meal.key);
    const tagged = recipe.tags.includes(meal.tag);
    return { recipe, assessed, plan, level: matchLevel(assessed), problems: problemCount(assessed), score, tagged };
  }).filter((card) => card.tagged || card.score > 0);

  const ready = ranked.filter((card) => card.level === "ready").length;
  const topScore = ranked.reduce((best, card) => Math.max(best, card.score), 0);
  const cards = ranked
    .filter(({ level }) => (filter === "all" ? true : level === filter))
    .filter(({ recipe }) => (needle ? recipe.name.toLocaleLowerCase("es").includes(needle) : true))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      const rank = { ready: 0, close: 1, missing: 2 };
      if (rank[a.level] !== rank[b.level]) return rank[a.level] - rank[b.level];
      return a.recipe.name.localeCompare(b.recipe.name, "es");
    });

  return (
    <section>
      <div className="hero">
        <p className="eyebrow">{meal.name}</p>
        <h1>
          {state.inventory.length === 0
            ? "Primero llena tu inventario"
            : ready > 0
              ? `${ready} ${ready === 1 ? "platillo listo" : "platillos listos"} para ${meal.name.toLocaleLowerCase("es")}`
              : `Todavía no completas un platillo de ${meal.name.toLocaleLowerCase("es")}`}
        </h1>
        <p className="lede">
          Puedes guardar hasta {FAVORITE_LIMIT} favoritos en esta comida ({savedHere} de {FAVORITE_LIMIT}). Esos favoritos arman una calificación entre todos los perfiles: las más elegidas aparecen primero.
          {useEquivalents || guidedMemberIds.length > 0
            ? " Cada persona usa las porciones de su plan. Si no tiene grupos en esta comida, se calcula con sus calorías."
            : " Si hay un plan activo, las porciones se ajustan con las calorías de una comida."}
        </p>
      </div>

      {notice && (
        <p className="notice" role="status">
          {notice}{" "}
          {notice.includes("super") && (
            <button type="button" className="text-link" onClick={onOpenShopping}>
              Ver lista
            </button>
          )}
        </p>
      )}

      {selected ? (
        <RecipeDetail
          key={selected.id}
          recipe={selected}
          state={state}
          setState={setState}
          members={members}
          diets={diets}
          selectedIds={selectedIds}
          useEquivalents={useEquivalents}
          guidedMemberIds={guidedMemberIds}
          meal={meal}
          favorite={isFavorite(favorites, accountId, selected.id, meal.key)}
          score={favoriteScore(favorites, selected.id, meal.key)}
          onBack={() => setSelectedId(null)}
          onNotice={setNotice}
          onToggleFavorite={() => setNotice(onToggleFavorite(selected.id, meal.key))}
        />
      ) : (
        <>
          <div className="who">
            <p>Comida</p>
            <div className="chips" role="group" aria-label="Comida del plan">
              {choices.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  className={meal.key === choice.key ? "chip active" : "chip"}
                  aria-pressed={meal.key === choice.key}
                  onClick={() => {
                    setMealKey(choice.key);
                    setNotice("");
                  }}
                >
                  {choice.name}
                </button>
              ))}
            </div>
          </div>
          <div className="who">
            <p>Cocinar para</p>
            <div className="chips" role="group" aria-label="Personas en la mesa">
              {members.map((member) => {
                const selectedMember = selectedIds.includes(member.id);
                const diet = diets.find((item) => item.memberId === member.id && item.active);
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={selectedMember ? "chip active" : "chip"}
                    aria-pressed={selectedMember}
                    onClick={() => onToggleMember(member.id)}
                  >
                    {member.name}
                    {diet ? ` · ${diet.calories} kcal` : ""}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="toolbar">
            <label className="field grow">
              <span className="sr-only">Buscar receta</span>
              <input value={query} placeholder="Buscar receta" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className="chips" role="group" aria-label="Filtrar recetas">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filter === item.id ? "chip active" : "chip"}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {cards.length === 0 ? (
            <p className="panel muted">Ningún platillo coincide con esta comida.</p>
          ) : (
            <div className="recipe-grid">
              {cards.map(({ recipe, level, problems, assessed, plan, score }) => {
                const required = assessed.filter((line) => !line.optional);
                const ok = required.filter((line) => line.status === "ok").length;
                const favorite = isFavorite(favorites, accountId, recipe.id, meal.key);
                return (
                  <article key={recipe.id} className="recipe-card">
                    <div className="card-top">
                      <span className="recipe-emoji" aria-hidden>
                        {recipe.emoji}
                      </span>
                      <button
                        type="button"
                        className={favorite ? "fav on" : "fav"}
                        aria-pressed={favorite}
                        onClick={() => setNotice(onToggleFavorite(recipe.id, meal.key))}
                      >
                        {favorite ? "★ Favorita" : "☆ Favorito"}
                      </button>
                    </div>
                    <button type="button" className="recipe-open" onClick={() => setSelectedId(recipe.id)}>
                      <span className="pill-row">
                        <span className={`pill ${level}`}>{levelLabel(level, problems)}</span>
                        {score > 0 && score === topScore && <span className="pill recommended">Más elegida</span>}
                      </span>
                      <strong>{recipe.name}</strong>
                      <span className="summary">{recipe.summary}</span>
                      <span className="meta">
                        {recipe.minutes} min · {plan.totalServings} {plan.totalServings === 1 ? "porción" : "porciones"} · ~
                        {recipe.kcalPerServing} kcal c/u · {ok} de {required.length}
                      </span>
                      <span className="score">{scoreLabel(score)}</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {state.cooked.length > 0 && (
            <section className="panel history">
              <h2>Platillos que ya preparaste</h2>
              <ul className="history-list">
                {state.cooked.map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.name}</strong>
                    <span>
                      {entry.servings} {entry.servings === 1 ? "porción" : "porciones"} · {formatWhen(entry.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}

function RecipeDetail({
  recipe,
  state,
  setState,
  members,
  diets,
  selectedIds,
  useEquivalents,
  guidedMemberIds,
  meal,
  favorite,
  score,
  onBack,
  onNotice,
  onToggleFavorite,
}: {
  recipe: Recipe;
  state: Kitchen;
  setState: (state: Kitchen) => void;
  members: HouseholdMember[];
  diets: Diet[];
  selectedIds: string[];
  useEquivalents: boolean;
  guidedMemberIds: string[];
  meal: MealChoice;
  favorite: boolean;
  score: number;
  onBack: () => void;
  onNotice: (notice: string) => void;
  onToggleFavorite: () => void;
}) {
  const plan = portionsForRecipe(recipe, members, diets, selectedIds, { useEquivalents, guidedMemberIds, mealKey: meal.key });
  const [servings, setServings] = useState(plan.totalServings);
  const [touched, setTouched] = useState(false);
  const [cooking, setCooking] = useState(false);
  const shownServings = touched ? servings : plan.totalServings;
  const assessed = assessRecipe(recipe, state.inventory, shownServings);
  const level = matchLevel(assessed);
  const problems = problemCount(assessed);

  function changeServings(raw: string) {
    setTouched(true);
    setServings(clampServings(parseQty(raw) ?? plan.totalServings));
  }

  function addMissing() {
    const result = planMissing(state, recipe, shownServings);
    setState(result.state);
    onNotice(
      result.added === 0 && result.unitIssues > 0
        ? "Hay ingredientes con una unidad distinta. Ajústalos en el inventario antes de anotar la compra."
        : result.added === 0
          ? `Para ${shownServings} ${shownServings === 1 ? "porción" : "porciones"} de ${recipe.name} no falta nada obligatorio.`
          : result.added === 1
            ? "Anoté 1 ingrediente en la lista del super."
            : `Anoté ${result.added} ingredientes en la lista del super.`,
    );
  }

  return (
    <article className="panel detail">
      <button type="button" className="text-link back" onClick={onBack}>
        ← Todas las recetas
      </button>
      <div className="detail-title">
        <span className="recipe-emoji lg" aria-hidden>
          {recipe.emoji}
        </span>
        <div>
          <span className="pill-row">
            <span className={`pill ${level}`}>{levelLabel(level, problems)}</span>
            <span className="pill recommended">{scoreLabel(score)}</span>
          </span>
          <h2>{recipe.name}</h2>
          <p className="lede">{recipe.summary}</p>
          <p className="meta">
            {recipe.minutes} min · {recipe.tags.join(" · ")}
          </p>
        </div>
      </div>

      <button type="button" className={favorite ? "fav on" : "fav"} aria-pressed={favorite} onClick={onToggleFavorite}>
        {favorite ? `★ En tus favoritos de ${meal.name}` : `☆ Guardar en ${meal.name}`}
      </button>

      {plan.people.length > 0 && (
        <ul className="portion-list">
          {plan.people.map((person) => (
            <li key={person.memberId}>
              <strong>{person.name}</strong>
              <span>
                {person.servings} {person.servings === 1 ? "porción" : "porciones"}
                {person.basis === "equivalentes"
                  ? ` · ajustada a ${meal.name} de ${person.dietName}, limita ${person.limitLabel}`
                  : person.mealKcal
                    ? ` · ${meal.name} de ${person.mealKcal} kcal (${person.dietName})`
                    : " · porción base de la receta"}
                {" · "}~
                {Math.round(person.servings * recipe.kcalPerServing)} kcal
              </span>
            </li>
          ))}
        </ul>
      )}
      {(useEquivalents || guidedMemberIds.length > 0) && (
        <p className="muted guide-note">
          {formatGroupCounts(recipeGroupCounts(recipe, shownServings))} {cookedGuideNote(recipe) ?? ""}
        </p>
      )}

      <label className="field compact servings-field">
        <span>Porciones a preparar</span>
        <input
          type="number"
          min={0.25}
          max={24}
          step="any"
          value={shownServings}
          onChange={(event) => changeServings(event.target.value)}
          onWheel={(event) => event.currentTarget.blur()}
        />
      </label>
      {touched && (
        <button type="button" className="text-link" onClick={() => setTouched(false)}>
          Volver a las porciones del plan
        </button>
      )}

      <div className="detail-grid">
        <section>
          <h3>Ingredientes</h3>
          <ul className="ingredient-list">
            {assessed.map((line) => (
              <li key={line.catalogId} className={`status-${line.status}`}>
                <div>
                  <strong>{line.name}</strong>
                  <p>{ingredientNote(line)}</p>
                </div>
                <span>{formatQty(line.requested, line.unit)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Preparación</h3>
          <ol className="steps">
            {recipe.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      <div className="form-actions">
        <button type="button" className="btn primary" onClick={() => setCooking(true)}>
          Ya lo preparé
        </button>
        <button type="button" className="btn ghost" onClick={addMissing} disabled={problems === 0}>
          Anotar faltantes en el super
        </button>
      </div>

      {cooking && (
        <CookDialog
          recipe={recipe}
          inventory={state.inventory}
          initialServings={shownServings}
          onClose={() => setCooking(false)}
          onConfirm={(cookedServings, lines) => {
            const result = cookMeal(state, recipe, cookedServings, lines);
            setState(result.state);
            setCooking(false);
            onNotice(
              result.missingCount > 0
                ? `Desconté lo de ${recipe.name}. Lo que faltaba quedó en la lista del super.`
                : `Desconté los ingredientes de ${recipe.name}.`,
            );
          }}
        />
      )}
    </article>
  );
}
