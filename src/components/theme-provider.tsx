import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "forest";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "light",
  toggle: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("veripolicy-theme")) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "forest") setThemeState(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "forest");
    root.classList.add(theme);
    localStorage.setItem("veripolicy-theme", theme);
  }, [theme]);

  const toggle = () => {
    setThemeState((t) => (t === "light" ? "dark" : t === "dark" ? "forest" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
