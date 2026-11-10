import { useState } from "react";
import { COUNTABLE_GROUPS, EQUIVALENT_GROUP_LABEL, EQUIVALENT_RECOMMENDATIONS } from "../data/equivalents";
import { formatTargets } from "../lib/equivalents";
import {
  acceptInvite,
  activateDiet,
  addFamilyMember,
  activeAccount,
  assignDiet,
  createAccount,
  membersOf,
  removeDiet,
  removeLink,
  removeMember,
  renameAccount,
  roleLabel,
  setUseEquivalents,
  updateMember,
  usesEquivalentSystem,
} from "../lib/profiles";
import type { AppState, Diet, DietMeal, EquivalentCounts, HouseholdMember, MealKind } from "../types";
import { Welcome } from "./Welcome";

type Props = {
  state: AppState;
  setState: (state: AppState) => void;
};

export function ProfileView({ state, setState }: Props) {
  const account = activeAccount(state);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [familyName, setFamilyName] = useState("");
  if (!account) return null;

  const equivalentsOn = usesEquivalentSystem(state);
  const members = membersOf(state, account.id);
  const links = state.links.filter((link) => link.clientAccountId === account.id);
  const guided = new Set(links.map((link) => link.memberId));

  return (
    <section>
      <div className="hero">
        <p className="eyebrow">{roleLabel(account.role)}</p>
        <h1>{account.name}</h1>
        <p className="lede">
          {account.role === "daily"
            ? "Aquí vive tu hogar. Cada persona puede tener su nutriólogo: pega un código por persona y las recetas suman las porciones de quien esté en la mesa."
            : "Este perfil invita pacientes y les asigna porciones por grupo en cada comida. Tu propia cocina sigue en las otras pestañas."}
        </p>
      </div>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <form
        className="panel stack-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setState(renameAccount(state, account.id, String(data.get("name") ?? "")));
          setNotice("Nombre del perfil actualizado.");
        }}
      >
        <h2>Perfil</h2>
        <label className="field">
          <span>Nombre con el que te ven</span>
          <input name="name" defaultValue={account.name} />
        </label>
        <button type="submit" className="btn primary">
          Guardar nombre
        </button>
      </form>

      <section className="panel stack-form">
        <h2>Lista de equivalentes</h2>
        <label className="check-line">
          <input type="checkbox" checked={equivalentsOn} onChange={(event) => setState(setUseEquivalents(state, event.target.checked))} />
          <span>Calcular sin nutriólogo con la guía de equivalentes</span>
        </label>
        <p className="muted">
          Quien tenga nutriólogo usa las porciones que le asignaron. Esta casilla aplica solo a las personas del hogar que no tienen uno.
        </p>
        {(equivalentsOn || guided.size > 0) && (
          <details>
            <summary>Alimentos que recomienda la guía</summary>
            <ul className="recommend-list">
              {EQUIVALENT_RECOMMENDATIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="panel">
        <h2>Personas de este hogar</h2>
        <p className="muted">Las recetas se calculan para quien marques en Recetas. Cada persona puede tener su propio plan.</p>
        <ul className="people-list">
          {members.map((member) => (
            <MemberEditor
              key={member.id}
              member={member}
              state={state}
              setState={setState}
              onNotice={setNotice}
              showEquivalents={equivalentsOn || guided.has(member.id)}
              onRemove={() => setState(removeMember(state, member.id))}
            />
          ))}
        </ul>
        <form
          className="inline-add"
          onSubmit={(event) => {
            event.preventDefault();
            if (!familyName.trim()) return;
            setState(addFamilyMember(state, familyName));
            setFamilyName("");
            setNotice("Persona agregada al hogar.");
          }}
        >
          <input value={familyName} placeholder="Nombre de un familiar" onChange={(event) => setFamilyName(event.target.value)} />
          <button type="submit" className="btn primary">
            Agregar
          </button>
        </form>
      </section>

      {account.role === "daily" && (
        <section className="panel stack-form">
          <h2>Nutriólogos</h2>
          <p className="muted">Cada persona del hogar puede aceptar un código distinto. Puedes pegar varios: uno por quien tenga nutriólogo.</p>
          {links.length === 0 ? (
            <p className="muted">Todavía no hay nadie vinculado.</p>
          ) : (
            <ul className="history-list">
              {links.map((link) => {
                const professional = state.accounts.find((item) => item.id === link.professionalId);
                const person = members.find((item) => item.id === link.memberId);
                return (
                  <li key={link.id}>
                    <strong>{person?.name ?? "Persona"}</strong>
                    <span>{professional?.name ?? "Nutriólogo"}</span>
                    <button type="button" className="btn tiny" onClick={() => setState(removeLink(state, link.id))}>
                      Desvincular
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <NutritionistCodeForm
            members={members}
            onAccept={(memberId, code) => {
              const result = acceptInvite(state, code, memberId);
              setState(result.state);
              setNotice(result.message);
              return result.state !== state;
            }}
          />
        </section>
      )}

      {creating ? (
        <Welcome
          title="Otro perfil en este dispositivo"
          submitLabel="Crear perfil"
          onCancel={() => setCreating(false)}
          onCreate={(name, role) => {
            setState(createAccount(state, name, role));
            setCreating(false);
            setNotice("Perfil creado. Ya estás dentro de él.");
          }}
        />
      ) : (
        <button type="button" className="btn ghost" onClick={() => setCreating(true)}>
          Crear otro perfil
        </button>
      )}
    </section>
  );
}

function NutritionistCodeForm({
  members,
  onAccept,
}: {
  members: HouseholdMember[];
  onAccept: (memberId: string, code: string) => boolean;
}) {
  const [memberId, setMemberId] = useState(members.find((member) => member.kind === "self")?.id ?? members[0]?.id ?? "");
  const [code, setCode] = useState("");
  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (onAccept(memberId, code)) setCode("");
      }}
    >
      <label className="field">
        <span>¿Para quién es el código?</span>
        <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>
      <div className="inline-add">
        <input value={code} placeholder="Código de invitación" onChange={(event) => setCode(event.target.value.toUpperCase())} />
        <button type="submit" className="btn primary">
          Aceptar
        </button>
      </div>
    </form>
  );
}

function MemberEditor({
  member,
  state,
  setState,
  onNotice,
  onRemove,
  showEquivalents,
}: {
  member: HouseholdMember;
  state: AppState;
  setState: (state: AppState) => void;
  onNotice: (notice: string) => void;
  onRemove: () => void;
  showEquivalents: boolean;
}) {
  const diets = state.diets.filter((diet) => diet.memberId === member.id);

  return (
    <li className="member-card">
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const age = Number(data.get("age"));
          const weight = Number(data.get("weight"));
          const sex = String(data.get("sex") ?? "");
          setState(
            updateMember(state, member.id, {
              name: String(data.get("name") ?? member.name).trim() || member.name,
              age: Number.isFinite(age) && age > 0 ? age : undefined,
              weightKg: Number.isFinite(weight) && weight > 0 ? weight : undefined,
              sex: sex === "femenino" || sex === "masculino" ? sex : undefined,
            }),
          );
          onNotice(`Datos de ${member.name} guardados.`);
        }}
      >
        <div className="panel-head">
          <h3>{member.kind === "self" ? "Tú" : "Familiar"}</h3>
          {member.kind === "family" && (
            <button type="button" className="btn tiny danger" onClick={onRemove}>
              Quitar
            </button>
          )}
        </div>
        <div className="form-grid stats">
          <label className="field">
            <span>Nombre</span>
            <input name="name" defaultValue={member.name} />
          </label>
          <label className="field">
            <span>Edad</span>
            <input name="age" inputMode="numeric" defaultValue={member.age ?? ""} placeholder="Opcional" />
          </label>
          <label className="field">
            <span>Peso (kg)</span>
            <input name="weight" inputMode="decimal" defaultValue={member.weightKg ?? ""} placeholder="Opcional" />
          </label>
          <label className="field">
            <span>Sexo</span>
            <select name="sex" defaultValue={member.sex ?? ""}>
              <option value="">Sin indicar</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn tiny">
          Guardar datos
        </button>
      </form>

      <div className="plan-block">
        <h3>Plan de alimentación</h3>
        {diets.length === 0 && <p className="muted">Sin plan. Las recetas usan una porción de la receta.</p>}
        <ul className="history-list">
          {diets.map((diet) => (
            <li key={diet.id} className="diet-entry">
              <div className="panel-head">
                <strong>
                  {diet.name}
                  {diet.active ? " · activo" : ""}
                </strong>
                <div className="item-actions">
                  {!diet.active && (
                    <button type="button" className="btn tiny" onClick={() => setState(activateDiet(state, diet.id))}>
                      Usar este
                    </button>
                  )}
                  <button type="button" className="btn tiny danger" onClick={() => setState(removeDiet(state, diet.id))}>
                    Quitar
                  </button>
                </div>
              </div>
              <DietSummary diet={diet} />
            </li>
          ))}
        </ul>
        <DietForm
          showEquivalents={showEquivalents}
          onCreate={(input) => {
            setState(assignDiet(state, { ...input, memberId: member.id }));
            onNotice(`Plan activo para ${member.name}.`);
          }}
        />
      </div>
    </li>
  );
}

export function DietSummary({ diet }: { diet: Diet }) {
  return (
    <>
      <span>
        {diet.calories} kcal · P {diet.proteinG} · C {diet.carbsG} · G {diet.fatG}
        {diet.notes ? ` · ${diet.notes}` : ""}
        {diet.assignedByName ? ` · ${diet.assignedByName}` : ""}
      </span>
      <ul className="meal-lines">
        {diet.meals.map((meal) => (
          <li key={meal.id}>
            <strong>{meal.name}</strong>
            <span>{formatTargets(meal.portions) || "Sin porciones por grupo"}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

type MealDraft = {
  key: string;
  name: string;
  kind: MealKind;
  lockedName: boolean;
};

function initialDrafts(): MealDraft[] {
  return [
    { key: "desayuno", name: "Desayuno", kind: "desayuno", lockedName: true },
    { key: "comida", name: "Comida", kind: "comida", lockedName: true },
    { key: "cena", name: "Cena", kind: "cena", lockedName: true },
  ];
}

export function DietForm({
  onCreate,
  showEquivalents = false,
  submitLabel = "Guardar plan activo",
}: {
  onCreate: (input: {
    name: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    notes: string;
    meals: DietMeal[];
  }) => void;
  showEquivalents?: boolean;
  submitLabel?: string;
}) {
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<MealDraft[]>(initialDrafts);
  const [formKey, setFormKey] = useState(0);
  const extras = drafts.filter((meal) => meal.kind === "colacion").length;

  return (
    <form
      key={formKey}
      className="stack-form diet-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const calories = Number(data.get("calories"));
        const proteinG = Number(data.get("protein"));
        const carbsG = Number(data.get("carbs"));
        const fatG = Number(data.get("fat"));
        const name = String(data.get("name") ?? "").trim();
        if (!name || !Number.isFinite(calories) || calories < 800 || calories > 6000) {
          setError("El plan necesita nombre y entre 800 y 6000 kcal.");
          return;
        }
        if (![proteinG, carbsG, fatG].every((value) => Number.isFinite(value) && value >= 0)) {
          setError("Revisa los gramos de proteína, carbohidratos y grasa.");
          return;
        }

        const meals: DietMeal[] = [];
        const snackNames = new Set<string>();
        for (const draft of drafts) {
          const mealName = draft.lockedName ? draft.name : String(data.get(`${draft.key}__name`) ?? "").trim();
          if (!mealName) {
            setError("Cada colación necesita un nombre.");
            return;
          }
          if (draft.kind === "colacion") {
            const key = mealName.toLocaleLowerCase("es");
            if (snackNames.has(key)) {
              setError("Dos colaciones no pueden llamarse igual.");
              return;
            }
            snackNames.add(key);
          }
          const portions: EquivalentCounts = {};
          if (showEquivalents) {
            for (const group of COUNTABLE_GROUPS) {
              const raw = String(data.get(`${draft.key}__${group}`) ?? "").trim().replace(",", ".");
              if (!raw) continue;
              const value = Number(raw);
              if (!Number.isFinite(value) || value < 0) {
                setError(`Revisa ${EQUIVALENT_GROUP_LABEL[group].toLowerCase()} en ${mealName}.`);
                return;
              }
              if (value > 0) portions[group] = value;
            }
          }
          meals.push({ id: crypto.randomUUID(), name: mealName, kind: draft.kind, portions });
        }

        onCreate({
          name,
          calories,
          proteinG,
          carbsG,
          fatG,
          notes: String(data.get("notes") ?? ""),
          meals,
        });
        setDrafts(initialDrafts());
        setFormKey((current) => current + 1);
        setError("");
      }}
    >
      <div className="form-grid stats">
        <label className="field">
          <span>Nombre del plan</span>
          <input name="name" placeholder="Déficit, mantenimiento..." />
        </label>
        <label className="field">
          <span>Kcal al día</span>
          <input name="calories" inputMode="numeric" placeholder="1800" />
        </label>
        <label className="field">
          <span>Proteína (g)</span>
          <input name="protein" inputMode="numeric" placeholder="120" />
        </label>
        <label className="field">
          <span>Carbos (g)</span>
          <input name="carbs" inputMode="numeric" placeholder="180" />
        </label>
        <label className="field">
          <span>Grasa (g)</span>
          <input name="fat" inputMode="numeric" placeholder="50" />
        </label>
      </div>
      <label className="field">
        <span>Notas</span>
        <input name="notes" placeholder="Opcional" />
      </label>
      {showEquivalents ? (
        <div className="meal-editor">
          <p className="muted">Asigna los equivalentes de cada comida. Desayuno, comida y cena van siempre. Si hace falta, agrega colaciones.</p>
          {drafts.map((draft) => (
            <fieldset key={draft.key} className="eq-set">
              <legend>{draft.lockedName ? draft.name : "Colación"}</legend>
              {!draft.lockedName && (
                <div className="panel-head">
                  <label className="field grow">
                    <span>Nombre</span>
                    <input name={`${draft.key}__name`} defaultValue={draft.name} />
                  </label>
                  <button
                    type="button"
                    className="btn tiny danger"
                    onClick={() => setDrafts((current) => current.filter((meal) => meal.key !== draft.key))}
                  >
                    Quitar
                  </button>
                </div>
              )}
              <div className="eq-grid">
                {COUNTABLE_GROUPS.map((group) => (
                  <label key={group} className="field">
                    <span>{EQUIVALENT_GROUP_LABEL[group]}</span>
                    <input name={`${draft.key}__${group}`} inputMode="decimal" placeholder="0" />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            className="btn tiny"
            disabled={extras >= 4}
            onClick={() =>
              setDrafts((current) => [
                ...current,
                {
                  key: crypto.randomUUID(),
                  name: extras === 0 ? "Colación" : `Colación ${extras + 1}`,
                  kind: "colacion",
                  lockedName: false,
                },
              ])
            }
          >
            {extras >= 4 ? "Máximo 4 colaciones" : "Agregar colación"}
          </button>
        </div>
      ) : (
        <p className="muted">Sin la guía de equivalentes, las calorías se reparten entre desayuno, comida y cena.</p>
      )}
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn tiny">
        {submitLabel}
      </button>
    </form>
  );
}
