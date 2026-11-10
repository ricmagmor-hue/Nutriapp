import { useState } from "react";
import { roleLabel } from "../lib/profiles";
import type { AccountRole } from "../types";

const ROLES: { id: AccountRole; title: string; copy: string }[] = [
  {
    id: "daily",
    title: "Día a día",
    copy: "Llevas tu inventario, cocinas para ti o tu familia y sigues el plan de tu nutriólogo.",
  },
  {
    id: "nutritionist",
    title: "Nutriólogo",
    copy: "Invitas pacientes y les asignas porciones por grupo en cada comida.",
  },
];

export function Welcome({
  title,
  submitLabel,
  onCreate,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  onCreate: (name: string, role: AccountRole) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<AccountRole>("daily");
  const [error, setError] = useState("");

  return (
    <section className="panel welcome">
      <p className="eyebrow">Perfil</p>
      <h1>{title}</h1>
      <p className="lede">Elige cómo vas a usar Despensa. En este navegador puedes tener varios perfiles y cambiar de uno a otro.</p>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) {
            setError("Escribe un nombre.");
            return;
          }
          onCreate(name.trim(), role);
        }}
      >
        <label className="field">
          <span>Nombre</span>
          <input value={name} placeholder="Ana, Dra. López" onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="role-grid">
          {ROLES.map((item) => (
            <button key={item.id} type="button" className={role === item.id ? "role-card active" : "role-card"} onClick={() => setRole(item.id)}>
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn primary">
            {submitLabel} · {roleLabel(role)}
          </button>
          {onCancel && (
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
