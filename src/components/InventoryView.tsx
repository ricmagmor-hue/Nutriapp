import { useState, type FormEvent } from "react";
import { NameField } from "./NameField";
import { exampleState, removeItem, saveItem, updateQuantity } from "../lib/pantry";
import { formatQty, parseQty, stepFor, UNIT_OPTIONS, unitLabel } from "../lib/units";
import type { CatalogItem, InventoryItem, Kitchen, Unit } from "../types";

type FormState = {
  name: string;
  quantity: string;
  unit: Unit;
  minQuantity: string;
  buyQuantity: string;
  catalogId?: string;
};

type Props = {
  state: Kitchen;
  setState: (state: Kitchen) => void;
  readyCount: number;
  onSeeRecipes: () => void;
};

function blankForm(): FormState {
  return {
    name: "",
    quantity: "",
    unit: "pza",
    minQuantity: "1",
    buyQuantity: "1",
  };
}

export function InventoryView({ state, setState, readyCount, onSeeRecipes }: Props) {
  const [formOpen, setFormOpen] = useState(state.inventory.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmExample, setConfirmExample] = useState(false);

  const dirty = state.inventory.length > 0 || state.extras.length > 0 || state.cooked.length > 0;

  function onName(name: string, catalog?: CatalogItem) {
    setForm((current) => {
      if (!catalog) return { ...current, name, catalogId: undefined };
      return {
        ...current,
        name,
        catalogId: catalog.id,
        unit: catalog.unit,
        minQuantity: String(catalog.minQuantity),
        buyQuantity: String(catalog.buyQuantity),
      };
    });
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setFormOpen(true);
    setError("");
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      minQuantity: String(item.minQuantity),
      buyQuantity: String(item.buyQuantity),
      catalogId: item.catalogId,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankForm());
    setError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    const quantity = parseQty(form.quantity);
    const minQuantity = parseQty(form.minQuantity);
    const buyQuantity = parseQty(form.buyQuantity);
    if (!name) {
      setError("Escribe el nombre del alimento.");
      return;
    }
    if (quantity === null || minQuantity === null || buyQuantity === null) {
      setError("Revisa las cantidades. Usa números, por ejemplo 2 o 0.5.");
      return;
    }

    const result = saveItem(
      state,
      {
        name,
        quantity,
        unit: form.unit,
        minQuantity,
        buyQuantity,
        catalogId: form.catalogId,
      },
      editingId,
    );
    setState(result.state);
    setNotice(
      editingId
        ? `Actualicé ${name}.`
          : result.merged
            ? `Sumé ${formatQty(quantity, form.unit)} a ${name}.`
            : `${name} quedó en el inventario.`,
    );
    resetForm();
  }

  function loadExample() {
    if (dirty && !confirmExample) {
      setConfirmExample(true);
      return;
    }
    setState(exampleState());
    setConfirmExample(false);
    resetForm();
    setNotice("Cargué una despensa de ejemplo. Ya hay platillos que puedes preparar.");
  }

  return (
    <section>
      <div className="hero">
        <p className="eyebrow">Inventario</p>
        <h1>{readyCount > 0 ? `Hoy puedes preparar ${readyCount} ${readyCount === 1 ? "platillo" : "platillos"}` : "Anota lo que ya tienes"}</h1>
        <p className="lede">
          {readyCount > 0
            ? "Las recetas se arman con lo que anotaste. Cuando cocines, descontamos lo que uses."
            : "Anota lo que tienes en casa. Con eso te decimos qué cocinar y qué anotar para el super."}
        </p>
        <div className="hero-actions">
          <button type="button" className="btn primary" onClick={onSeeRecipes}>
            Ver recetas
          </button>
          <button type="button" className="btn ghost" onClick={loadExample}>
            Cargar ejemplo
          </button>
        </div>
        {confirmExample && (
          <div className="confirm-bar">
            <p>Esto reemplaza tu inventario, tu lista y el historial de platillos.</p>
            <button type="button" className="btn primary" onClick={loadExample}>
              Reemplazar
            </button>
            <button type="button" className="btn ghost" onClick={() => setConfirmExample(false)}>
              Cancelar
            </button>
          </div>
        )}
      </div>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>{editingId ? "Editar alimento" : "Agregar alimento"}</h2>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (formOpen) {
                resetForm();
                setFormOpen(false);
                return;
              }
              setFormOpen(true);
            }}
          >
            {formOpen ? "Cerrar" : "Agregar"}
          </button>
        </div>
        {formOpen && (
          <form className="stack-form" onSubmit={submit}>
            <label className="field">
              <span>Nombre</span>
              <NameField id="food-name" value={form.name} onValue={onName} />
            </label>
            <div className="form-grid pair">
              <label className="field">
                <span>Cantidad</span>
                <input
                  inputMode="decimal"
                  value={form.quantity}
                  placeholder="0"
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Unidad</span>
                <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value as Unit })}>
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unitLabel(unit)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <details className="advanced">
              <summary>Cuándo avisar para reponer</summary>
              <div className="form-grid">
                <label className="field">
                  <span>Avisar si queda esta cantidad o menos</span>
                  <input
                    inputMode="decimal"
                    value={form.minQuantity}
                    onChange={(event) => setForm({ ...form, minQuantity: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Cantidad que sueles comprar</span>
                  <input
                    inputMode="decimal"
                    value={form.buyQuantity}
                    onChange={(event) => setForm({ ...form, buyQuantity: event.target.value })}
                  />
                </label>
              </div>
            </details>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="submit" className="btn primary">
                {editingId ? "Guardar cambios" : "Agregar al inventario"}
              </button>
              {editingId && (
                <button type="button" className="btn ghost" onClick={() => resetForm()}>
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>En casa</h2>
          <span className="count-label">{state.inventory.length}</span>
        </div>
        {state.inventory.length === 0 ? (
          <p className="muted empty-copy">Todavía no hay alimentos anotados.</p>
        ) : (
          <ul className="item-list">
            {[...state.inventory]
              .sort((a, b) => {
                const aLow = a.quantity <= a.minQuantity ? 0 : 1;
                const bLow = b.quantity <= b.minQuantity ? 0 : 1;
                if (aLow !== bLow) return aLow - bLow;
                return a.name.localeCompare(b.name, "es");
              })
              .map((item) => {
                const low = item.quantity <= item.minQuantity;
                const step = stepFor(item.unit);
                return (
                  <li key={item.id} className={low ? "is-low" : ""}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>{formatQty(item.quantity, item.unit)}</p>
                      {low && <span className="pill warn">Reponer</span>}
                    </div>
                    <div className="item-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Quitar ${step} a ${item.name}`}
                        onClick={() => setState(updateQuantity(state, item.id, item.quantity - step))}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Sumar ${step} a ${item.name}`}
                        onClick={() => setState(updateQuantity(state, item.id, item.quantity + step))}
                      >
                        +
                      </button>
                      <button type="button" className="btn tiny" onClick={() => startEdit(item)}>
                        Editar
                      </button>
                      <button type="button" className="btn tiny danger" onClick={() => setState(removeItem(state, item.id))}>
                        Quitar
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </section>
  );
}
