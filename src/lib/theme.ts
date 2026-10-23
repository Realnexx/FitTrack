import { useEffect, useSyncExternalStore } from "react";
export type Theme = "light" | "dark" | "system";
const key = "fittrack-theme";
let fallback: Theme = "dark";
export function themePreference(value: unknown): Theme {
  return value === "light" || value === "system" ? value : "dark";
}
function preference(): Theme {
  try {
    return themePreference(localStorage.getItem(key) ?? fallback);
  } catch {
    return fallback;
  }
}
function snapshot() {
  const selected = preference();
  const dark =
    selected === "dark" ||
    (selected === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return `${selected}:${dark ? "dark" : "light"}`;
}
function subscribe(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("fittrack-theme-change", listener);
  window.addEventListener("storage", listener);
  media.addEventListener("change", listener);
  return () => {
    window.removeEventListener("fittrack-theme-change", listener);
    window.removeEventListener("storage", listener);
    media.removeEventListener("change", listener);
  };
}
export function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.classList.toggle("light", resolved === "light");
  document.documentElement.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#07111f" : "#f4f7fa");
}
export function setTheme(theme: Theme) {
  fallback = theme;
  try {
    localStorage.setItem(key, theme);
  } catch {
    /* Keep the choice for this session when storage is blocked. */
  }
  const resolved =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
  applyTheme(resolved);
  window.dispatchEvent(new Event("fittrack-theme-change"));
}
export function useTheme() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "dark:dark");
  const [theme, resolved] = value.split(":") as [Theme, "light" | "dark"];
  return { theme, resolved, setTheme };
}
export function ThemeController() {
  const { resolved } = useTheme();
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);
  return null;
}
// Run before the first paint, including on public/authentication pages.
export const themeScript = `(function(){var t='dark';try{t=localStorage.getItem('fittrack-theme')||'dark'}catch(e){}var d=t!=='light'&&(t!=='system'||matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=d?'#07111f':'#f4f7fa'})()`;
