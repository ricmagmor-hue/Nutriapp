import { useState } from "react";
import { findCatalogByName, searchCatalog } from "../lib/pantry";
import type { CatalogItem } from "../types";

type Props = {
  id: string;
  value: string;
  onValue: (name: string, catalog?: CatalogItem) => void;
};

export function NameField({ id, value, onValue }: Props) {
  const [open, setOpen] = useState(false);
  const matches = searchCatalog(value);

  return (
    <div className="suggest">
      <input
        id={id}
        value={value}
        autoComplete="off"
        placeholder="Ej. jitomate, arroz, huevo"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          const next = event.target.value;
          onValue(next, findCatalogByName(next));
          setOpen(true);
        }}
      />
      {open && matches.length > 0 && (
        <ul className="suggest-list" role="listbox">
          {matches.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onValue(entry.name, entry);
                  setOpen(false);
                }}
              >
                <span>{entry.name}</span>
                <small>{entry.category}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
