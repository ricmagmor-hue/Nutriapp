import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { validateEquivalents } from "./data/equivalents";
import { validateRecipes } from "./data/recipes";
import "./styles.css";

validateRecipes();
validateEquivalents();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
