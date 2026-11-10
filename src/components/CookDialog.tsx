import { useEffect, useId, useState } from "react";
import { buildCookLines, missingFromLine } from "../lib/pantry";
import { clampServings, formatQty, parseQty, unitLabel } from "../lib/units";
import type { CookLine, InventoryItem, Recipe } from "../types";

type Props = {
  recipe: Recipe;
  inventory: InventoryItem[];
  initialServings: number;
  onClose: () => void;
  onConfirm: (servings: number, lines: CookLine[]) => void;
};

export function CookDialog({ recipe, inventory, initialServings, onClose, onConfirm }: Props) {
  const titleId = useId();
  const [servings, setServings] = useState(initialServings);
  const [lines, setLines] = useState(() => buildCookLines(recipe, inventory, initialServings));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function changeServings(raw: string) {
    const next = clampServings(parseQty(raw) ?? 1);
    setServings(next);
    setLines(buildCookLines(recipe, inventory, next));
  }

  function changeDeduct(index: number, raw: string) {
    const parsed = parseQty(raw) ?? 0;
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, deduct: Math.min(line.available, parsed) } : line,
      ),
    );
  }

  const missing = lines.filter((line) => missingFromLine(line) > 0);

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Confirmar platillo</p>
        <h2 id={titleId}>Preparaste {recipe.name}</h2>
        <p className="lede">
          Descontamos del inventario lo que usaste. Si faltó algo obligatorio, se anota en la lista del super.
        </p>

        <label className="field compact">
          <span>Porciones que hiciste</span>
          <input
            type="number"
          min={0.25}
          step="any"
            value={servings}
            onChange={(event) => changeServings(event.target.value)}
            onWheel={(event) => event.currentTarget.blur()}
          />
        </label>

        <ul className="deduct-list">
          {lines.map((line, index) => {
            const gap = missingFromLine(line);
            return (
              <li key={line.catalogId}>
                <div className="deduct-copy">
                  <strong>{line.name}</strong>
                  <p>Receta: {formatQty(line.requested, line.requestUnit)}</p>
                  <p>{line.haveLabel}</p>
                  {gap > 0 && <p className="warn-text">Se anotarán {formatQty(gap, line.requestUnit)} en el super.</p>}
                  {line.hint && gap === 0 && <p className="muted">{line.hint}</p>}
                </div>
                <label className="field compact">
                  <span>Descontar ({unitLabel(line.deductUnit)})</span>
                  <input
                    type="number"
                    min={0}
                    max={line.available}
                    step="any"
                    value={line.deduct}
                    onChange={(event) => changeDeduct(index, event.target.value)}
                    onWheel={(event) => event.currentTarget.blur()}
                  />
                </label>
              </li>
            );
          })}
        </ul>

        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" onClick={() => onConfirm(servings, lines)}>
            {missing.length > 0 ? "Descontar y anotar faltantes" : "Descontar del inventario"}
          </button>
        </div>
      </div>
    </div>
  );
}
