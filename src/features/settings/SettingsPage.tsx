import { useTheme } from "../../shared/theme";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">Preferences</p>
        <h1 className="text-3xl font-semibold">Einstellungen</h1>
      </header>

      <section className="glass rounded-3xl p-6">
        <p className="text-sm text-muted">Theme</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              theme === "dark"
                ? "border-accent bg-accent/20 text-foreground"
                : "border-border bg-surface-2/60 text-muted"
            }`}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              theme === "light"
                ? "border-accent bg-accent/20 text-foreground"
                : "border-border bg-surface-2/60 text-muted"
            }`}
          >
            Light
          </button>
        </div>
      </section>

      <section className="glass rounded-3xl p-6">
        <p className="text-sm text-muted">App</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Name</p>
            <p className="mt-2 text-lg font-medium">Vision Desktop</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Version</p>
            <p className="mt-2 text-lg font-medium">0.1.0</p>
          </div>
        </div>
      </section>
    </div>
  );
}
