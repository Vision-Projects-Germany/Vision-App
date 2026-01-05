const cards = [
  {
    title: "Library",
    value: "12",
    detail: "Games installed"
  },
  {
    title: "Playtime",
    value: "146h",
    detail: "Last 30 days"
  },
  {
    title: "Achievements",
    value: "38",
    detail: "Unlocked"
  }
];

const quickActions = [
  "Resume last session",
  "Browse new content",
  "Open downloads"
];

export function HomePage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">Player Hub</p>
        <h1 className="text-3xl font-semibold">Home</h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="glass rounded-3xl p-6">
            <p className="text-sm text-muted">{card.title}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-4 text-sm text-muted">{card.detail}</p>
          </div>
        ))}
      </section>

      <section className="glass rounded-3xl p-6">
        <p className="text-sm text-muted">Quick actions</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              className="rounded-2xl border border-border bg-surface-2/60 px-4 py-3 text-sm text-foreground transition hover:border-accent hover:bg-accent/10"
            >
              {action}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
