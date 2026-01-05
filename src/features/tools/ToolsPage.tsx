export function ToolsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">Launcher</p>
        <h1 className="text-3xl font-semibold">Tools</h1>
      </header>

      <section className="glass rounded-3xl p-6">
        <p className="text-sm text-muted">No tools connected yet.</p>
        <p className="mt-4 text-lg font-medium text-foreground">
          Add launchers, scripts, and shortcuts here.
        </p>
      </section>
    </div>
  );
}
