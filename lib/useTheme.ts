"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "dark" | "light";

/**
 * Lee/escribe el tema en la misma clave de localStorage ('theme') que
 * usa Strata, y lo aplica como atributo data-theme en <html> — igual
 * convención que el script anti-flash de layout.tsx. Así el toggle de
 * StrataDOC y el de Strata quedan sincronizados para el mismo usuario.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setThemeState(stored === "light" ? "light" : "dark");
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem("theme", next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
