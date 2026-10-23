import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="mb-6 rounded-2xl border bg-card/50 p-5">
      <h2 className="font-display font-semibold">Appearance</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Choose your theme. Saved automatically on this device across all pages.
      </p>
      <div role="group" aria-label="Color theme" className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
            { value: "system", label: "System", icon: Monitor },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={() => setTheme(value as Theme)}
            className={`relative flex flex-col items-center gap-2 rounded-xl border px-2 py-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${theme === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/40 text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            <Icon className="size-5" />
            <span className="font-medium">{label}</span>
            {theme === value && (
              <Check aria-hidden="true" className="absolute right-2 top-2 size-3" />
            )}
          </button>
        ))}
      </div>
      {theme === "system" && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          Matches your device’s light or dark appearance.
        </p>
      )}
    </section>
  );
}
