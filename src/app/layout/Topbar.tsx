import { useTheme } from "../../shared/theme";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface/70 px-8 py-4">
      <div>
        <p className="text-sm text-muted">Status</p>
        <p className="text-lg font-semibold">Ready to play</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
          Online
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border border-border bg-surface-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition hover:bg-accent/20"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
}
