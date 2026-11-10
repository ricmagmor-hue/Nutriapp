import { useEffect, useState } from "react";
import { PatientsView } from "./components/PatientsView";
import { InventoryView } from "./components/InventoryView";
import { ProfileView } from "./components/ProfileView";
import { RecipesView } from "./components/RecipesView";
import { ShoppingView } from "./components/ShoppingView";
import { Welcome } from "./components/Welcome";
import { buildShoppingList, countReady } from "./lib/pantry";
import {
  activeAccount,
  activeKitchen,
  createAccount,
  membersOf,
  roleLabel,
  selectedMemberIds,
  setActiveAccount,
  guidedMemberIds,
  toggleCookingFor,
  toggleFavorite,
  withKitchen,
} from "./lib/profiles";
import { loadState, saveState } from "./lib/storage";
import type { AppState } from "./types";

type Tab = "inventario" | "recetas" | "compras" | "perfil" | "pacientes";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<Tab>("inventario");

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("perfil") !== "nutriologo") return;
    setState((current) => {
      const nutritionist = current.accounts.find((account) => account.role === "nutritionist");
      if (!nutritionist) return current;
      return setActiveAccount(current, nutritionist.id);
    });
    setTab("pacientes");
  }, []);

  const account = activeAccount(state);
  const kitchen = activeKitchen(state);
  const setKitchen = (next: typeof kitchen) => setState((current) => withKitchen(current, next));
  const readyCount = countReady(kitchen.inventory);
  const shopCount = buildShoppingList(kitchen).length;
  const tabs: { id: Tab; label: string }[] = [
    ...(account && account.role !== "daily" ? [{ id: "pacientes" as const, label: "Pacientes" }] : []),
    { id: "inventario", label: "Inventario" },
    { id: "recetas", label: "Recetas" },
    { id: "compras", label: "Compras" },
    { id: "perfil", label: "Perfil" },
  ];
  const current = tabs.some((item) => item.id === tab) ? tab : tabs[0].id;

  if (!account) {
    return (
      <div className="app">
        <div className="chrome">
          <header className="topbar">
            <div className="brand">
              <span className="logo" aria-hidden>
                🥘
              </span>
              <div>
                <p className="brand-name">Despensa</p>
                <p className="brand-tag">Cocina con lo que ya tienes</p>
              </div>
            </div>
          </header>
        </div>
        <main>
          <Welcome
            title="¿Cómo vas a usar Despensa?"
            submitLabel="Entrar"
            onCreate={(name, role) => {
              setState((currentState) => createAccount(currentState, name, role));
              setTab(role === "daily" ? "inventario" : "pacientes");
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="chrome">
        <header className="topbar">
          <div className="brand">
            <span className="logo" aria-hidden>
              🥘
            </span>
            <div>
              <p className="brand-name">Despensa</p>
              <p className="brand-tag">{roleLabel(account.role)}</p>
            </div>
          </div>
          <label className="profile-switch">
            <span className="sr-only">Perfil activo</span>
            <select
              value={account.id}
              onChange={(event) => {
                const next = state.accounts.find((item) => item.id === event.target.value);
                setState(setActiveAccount(state, event.target.value));
                setTab(next && next.role !== "daily" ? "pacientes" : "inventario");
              }}
            >
              {state.accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {roleLabel(item.role)}
                </option>
              ))}
            </select>
          </label>
        </header>
        <nav className="tabs" aria-label="Secciones">
          {tabs.map((item) => {
            const count = item.id === "recetas" ? readyCount : item.id === "compras" ? shopCount : 0;
            return (
              <button
                key={item.id}
                type="button"
                className={current === item.id ? "active" : ""}
                aria-current={current === item.id ? "page" : undefined}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                {count > 0 && <span className="tab-count">{count}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <main>
        {current === "inventario" && (
          <InventoryView key={account.id} state={kitchen} setState={setKitchen} readyCount={readyCount} onSeeRecipes={() => setTab("recetas")} />
        )}
        {current === "recetas" && (
          <RecipesView
            key={account.id}
            state={kitchen}
            setState={setKitchen}
            members={membersOf(state)}
            diets={state.diets}
            selectedIds={selectedMemberIds(state)}
            useEquivalents={Boolean(account.useEquivalents)}
            guidedMemberIds={guidedMemberIds(state)}
            accountId={account.id}
            favorites={state.favorites}
            onToggleMember={(memberId) => setState((currentState) => toggleCookingFor(currentState, memberId))}
            onToggleFavorite={(recipeId, mealKey) => {
              const result = toggleFavorite(state, recipeId, mealKey);
              setState(result.state);
              return result.message;
            }}
            onOpenShopping={() => setTab("compras")}
          />
        )}
        {current === "compras" && <ShoppingView key={account.id} state={kitchen} setState={setKitchen} />}
        {current === "perfil" && <ProfileView key={account.id} state={state} setState={setState} />}
        {current === "pacientes" && <PatientsView key={account.id} state={state} setState={setState} />}
        <p className="footnote">Perfiles, planes, favoritos e inventario se guardan en este navegador. La calificación de cada receta sale de los favoritos de todos los perfiles.</p>
      </main>
    </div>
  );
}
