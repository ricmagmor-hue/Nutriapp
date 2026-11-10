import { useEffect, useState, type FormEvent } from "react";
import { NameField } from "./NameField";
import { addManualExtra, buildShoppingList, markPurchased, removeExtras } from "../lib/pantry";
import { formatQty, parseQty, UNIT_OPTIONS, unitLabel } from "../lib/units";
import type { CatalogItem, Kitchen, ShopLine, Unit } from "../types";

type Props = {
  state: Kitchen;
  setState: (state: Kitchen) => void;
};

export function ShoppingView({ state, setState }: Props) {
  const lines = buildShoppingList(state);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [catalogId, setCatalogId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<Unit>("pza");
  const [error, setError] = useState("");

  const groups = new Map<string, ShopLine[]>();
  for (const line of lines) {
    const bucket = groups.get(line.category) ?? [];
    bucket.push(line);
    groups.set(line.category, bucket);
  }

  function onName(next: string, catalog?: CatalogItem) {
    setName(next);
    setCatalogId(catalog?.id);
    if (catalog) setUnit(catalog.unit);
  }

  function addManual(event: FormEvent) {
    event.preventDefault();
    const parsed = parseQty(quantity);
    const trimmed = name.trim();
    if (!trimmed || parsed === null || parsed <= 0) {
      setError("Escribe qué vas a comprar y una cantidad mayor a cero.");
      return;
    }
    setState(addManualExtra(state, { name: trimmed, quantity: parsed, unit, catalogId }));
    setNotice(`${trimmed} quedó en la lista.`);
    setName("");
    setCatalogId(undefined);
    setQuantity("1");
    setError("");
  }

  return (
    <section>
      <div className="hero">
        <p className="eyebrow">Lista del super</p>
        <h1>{lines.length === 0 ? "Por ahora no falta nada" : `${lines.length} ${lines.length === 1 ? "cosa" : "cosas"} para comprar`}</h1>
        <p className="lede">
          Aquí entra lo que está por acabarse, lo que te faltó para una receta y lo que anotes a mano. Al marcarlo como comprado, se suma a tu inventario.
        </p>
      </div>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <form className="panel stack-form" onSubmit={addManual}>
        <h2>Anotar algo</h2>
        <div className="form-grid">
          <label className="field">
            <span>Producto</span>
            <NameField id="shop-name" value={name} onValue={onName} />
          </label>
          <label className="field">
            <span>Cantidad</span>
            <input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <label className="field">
            <span>Unidad</span>
            <select value={unit} onChange={(event) => setUnit(event.target.value as Unit)}>
              {UNIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {unitLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn primary">
          Agregar a la lista
        </button>
      </form>

      {lines.length === 0 ? (
        <p className="panel muted empty-copy">Cuando un alimento llegue a su mínimo, o te falte algo para cocinar, va a aparecer aquí.</p>
      ) : (
        [...groups.entries()].map(([category, items]) => (
          <section key={category} className="panel">
            <h2>{category}</h2>
            <ul className="shop-list">
              {items.map((line) => (
                <ShopRow
                  key={line.key}
                  line={line}
                  onBuy={(amount) => {
                    setState(markPurchased(state, line, amount));
                    setNotice(`Sumé ${formatQty(amount, line.unit)} de ${line.name} al inventario.`);
                  }}
                  onRemove={() => {
                    setState(removeExtras(state, line.extraIds));
                    setNotice(`Quité la nota de ${line.name}. Si sigue en la lista, es porque está por acabarse.`);
                  }}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}

function ShopRow({ line, onBuy, onRemove }: { line: ShopLine; onBuy: (quantity: number) => void; onRemove: () => void }) {
  const [amount, setAmount] = useState(String(line.quantity));

  useEffect(() => {
    setAmount(String(line.quantity));
  }, [line.key, line.quantity]);

  const parsed = parseQty(amount);

  return (
    <li>
      <div className="shop-copy">
        <strong>{line.name}</strong>
        <p>{line.notes.join(" · ")}</p>
      </div>
      <div className="shop-actions">
        <label className="field compact">
          <span className="sr-only">Cantidad de {line.name}</span>
          <input
            inputMode="decimal"
            aria-label={`Cantidad de ${line.name}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <small>{unitLabel(line.unit, parsed ?? line.quantity)}</small>
        </label>
        <button type="button" className="btn primary" disabled={parsed === null || parsed <= 0} onClick={() => parsed && onBuy(parsed)}>
          Ya lo compré
        </button>
        {line.extraIds.length > 0 && (
          <button type="button" className="btn tiny" onClick={onRemove}>
            Quitar nota
          </button>
        )}
      </div>
    </li>
  );
}
