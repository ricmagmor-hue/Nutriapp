import { useState } from "react";
import { DietForm, DietSummary } from "./ProfileView";
import { activeAccount, assignDiet, createInvite, membersOf, removeLink, roleLabel } from "../lib/profiles";
import type { AppState, HouseholdMember } from "../types";

type Housemate = {
  id: string;
  name: string;
  mine: boolean;
};

type PatientRow = {
  linkId: string;
  member: HouseholdMember;
  householdId: string;
  householdName: string;
  housemates: Housemate[];
  planName: string | null;
};

export function PatientsView({ state, setState }: { state: AppState; setState: (state: AppState) => void }) {
  const account = activeAccount(state);
  const [notice, setNotice] = useState("");
  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  if (!account || account.role === "daily") return null;

  const invites = state.invites.filter((invite) => invite.professionalId === account.id);
  const patients = patientRows(state, account.id);
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = patients.filter((patient) => (needle ? patientText(patient).includes(needle) : true));
  const open = patients.find((patient) => patient.member.id === openId) ?? null;

  return (
    <section>
      <div className="hero">
        <p className="eyebrow">{roleLabel(account.role)}</p>
        <h1>Pacientes</h1>
        <p className="lede">
          Un nutriólogo puede llevar a varias personas. Genera un código por paciente. Si dos viven en el mismo hogar, aquí se ven juntos.
        </p>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <section className="panel">
        <h2>Invitar</h2>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const result = createInvite(state);
            if (!result.code) return;
            setState(result.state);
            setLatestCode(result.code);
            setNotice("Comparte este código con el paciente. En su hogar lo aceptan a su nombre.");
          }}
        >
          Generar código
        </button>
        {latestCode && <p className="invite-code">{latestCode}</p>}
        {invites.length > 0 && (
          <ul className="history-list">
            {invites.map((invite) => (
              <li key={invite.code}>
                <strong>{invite.code}</strong>
                <span>Sin usar</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open ? (
        <PatientDetail
          patient={open}
          state={state}
          setState={setState}
          professionalId={account.id}
          professionalName={account.name}
          onBack={() => setOpenId(null)}
          onNotice={setNotice}
        />
      ) : (
        <section className="panel">
          <div className="panel-head">
            <h2>Tu lista</h2>
            <span className="count-label">{patients.length}</span>
          </div>
          <label className="field">
            <span className="sr-only">Buscar paciente</span>
            <input
              value={query}
              placeholder="Buscar por nombre, hogar o plan"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {patients.length === 0 ? (
            <p className="muted empty-copy">Cuando alguien acepte tu código, el paciente aparece aquí.</p>
          ) : visible.length === 0 ? (
            <p className="muted empty-copy">Ningún paciente coincide con esa búsqueda.</p>
          ) : (
            <div className="patient-list">
              {visible.map((patient) => (
                <article key={patient.member.id} className="patient-card">
                  <div>
                    <strong>{patient.member.name}</strong>
                    <p className="meta">Hogar: {patient.householdName}</p>
                    <p className="housemates">{housemateCopy(patient.housemates)}</p>
                    <p className="meta">{patient.planName ? `Plan activo: ${patient.planName}` : "Sin plan asignado"}</p>
                  </div>
                  <button type="button" className="btn tiny" onClick={() => setOpenId(patient.member.id)}>
                    Ver plan
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function patientRows(state: AppState, professionalId: string): PatientRow[] {
  return state.links
    .filter((link) => link.professionalId === professionalId)
    .flatMap((link) => {
      const household = state.accounts.find((item) => item.id === link.clientAccountId);
      const member = state.members.find((item) => item.id === link.memberId);
      if (!household || !member) return [];
      const plan = state.diets.find((diet) => diet.memberId === member.id && diet.active);
      const housemates = membersOf(state, household.id)
        .filter((person) => person.id !== member.id && state.links.some((item) => item.memberId === person.id))
        .map((person) => ({
          id: person.id,
          name: person.name,
          mine: state.links.some((item) => item.memberId === person.id && item.professionalId === professionalId),
        }));
      return [
        {
          linkId: link.id,
          member,
          householdId: household.id,
          householdName: household.name,
          housemates,
          planName: plan?.name ?? null,
        },
      ];
    })
    .sort((a, b) => a.member.name.localeCompare(b.member.name, "es") || a.householdName.localeCompare(b.householdName, "es"));
}

function patientText(patient: PatientRow): string {
  return [patient.member.name, patient.householdName, patient.planName ?? "", ...patient.housemates.map((person) => person.name)]
    .join(" ")
    .toLocaleLowerCase("es");
}

function housemateCopy(housemates: Housemate[]): string {
  if (housemates.length === 0) return "Único paciente de este hogar.";
  const people = housemates.map((person) => `${person.name} (${person.mine ? "tu paciente" : "paciente de otro nutriólogo"})`);
  return `Mismo hogar: ${people.join(", ")}.`;
}

function PatientDetail({
  patient,
  state,
  setState,
  professionalId,
  professionalName,
  onBack,
  onNotice,
}: {
  patient: PatientRow;
  state: AppState;
  setState: (state: AppState) => void;
  professionalId: string;
  professionalName: string;
  onBack: () => void;
  onNotice: (notice: string) => void;
}) {
  const diets = state.diets.filter((diet) => diet.memberId === patient.member.id);
  const kitchen = state.kitchens[patient.householdId];

  return (
    <article className="panel">
      <button type="button" className="text-link back" onClick={onBack}>
        ← Todos los pacientes
      </button>
      <div className="panel-head">
        <div>
          <h2>{patient.member.name}</h2>
          <p className="meta">Hogar: {patient.householdName}</p>
          <p className="housemates">{housemateCopy(patient.housemates)}</p>
        </div>
        <button type="button" className="btn tiny" onClick={() => setState(removeLink(state, patient.linkId))}>
          Quitar paciente
        </button>
      </div>
      <div className="plan-block">
        <h3>Porciones por comida</h3>
        {diets.length === 0 && <p className="muted">Sin plan asignado.</p>}
        <ul className="history-list">
          {diets.map((diet) => (
            <li key={diet.id} className="diet-entry">
              <strong>
                {diet.name}
                {diet.active ? " · activo" : ""}
              </strong>
              <DietSummary diet={diet} />
            </li>
          ))}
        </ul>
        <DietForm
          showEquivalents
          submitLabel="Asignar porciones"
          onCreate={(input) => {
            setState(assignDiet(state, { ...input, memberId: patient.member.id, assignedById: professionalId, assignedByName: professionalName }));
            onNotice(`Porciones asignadas a ${patient.member.name}. En Recetas, cada comida usa esos grupos.`);
          }}
        />
      </div>
      <div className="plan-block">
        <h3>Cocina reciente del hogar</h3>
        {(kitchen?.cooked.length ?? 0) === 0 ? (
          <p className="muted">Todavía no confirman platillos.</p>
        ) : (
          <ul className="history-list">
            {kitchen.cooked.slice(0, 4).map((entry) => (
              <li key={entry.id}>
                <strong>{entry.name}</strong>
                <span>
                  {entry.servings} {entry.servings === 1 ? "porción" : "porciones"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
