"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/shared/lib";

const THEME_KEY = "bania.theme";
const THEME_EVENT = "bania:theme";

export type Theme = "dark" | "light";

/**
 * The chosen theme, read from the document rather than from React state.
 *
 * The attribute is set by a one-line script in <head> before the first
 * paint — see layout.tsx — so this component must agree with whatever
 * that script decided rather than hold a second copy of it.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function current(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function apply(theme: Theme) {
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;

  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private browsing: the choice holds for this page and is forgotten
    // on the next one. Nothing worth saying.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Day or night, in the header.
 *
 * Dark is the default and the design's home key; light is the second
 * half of the same design, for a phone in sunlight.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  // Dark on the server: it is the default, so the markup the browser
  // receives matches what the pre-paint script leaves alone.
  const theme = useSyncExternalStore(subscribe, current, () => "dark" as Theme);
  const next: Theme = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={() => apply(next)}
      aria-label={next === "light" ? "Світла тема" : "Темна тема"}
      title={next === "light" ? "Світла тема" : "Темна тема"}
      className={cn(
        "border-bronze/30 text-muted-foreground hover:border-bronze hover:text-foreground flex size-10 shrink-0 items-center justify-center border transition-colors",
        className,
      )}
    >
      {theme === "light" ? (
        <Moon className="size-4" aria-hidden />
      ) : (
        <Sun className="size-4" aria-hidden />
      )}
    </button>
  );
}
