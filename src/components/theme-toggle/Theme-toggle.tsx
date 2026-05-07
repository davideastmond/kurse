"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("theme", theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialTheme = getPreferredTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setIsReady(true);
  }, []);

  function toggleTheme() {
    if (!isReady) {
      return;
    }

    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-disabled={!isReady}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold tracking-[0.08em] text-surface-foreground uppercase shadow-sm transition-colors hover:bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
    >
      Theme: {isReady ? theme : "..."}
    </button>
  );
}
