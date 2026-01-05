const services = [
  { name: "Workflow Engine", status: "healthy", detail: "12ms latency" },
  { name: "Data Sync", status: "healthy", detail: "Last sync 2m ago" },
  { name: "Notifications", status: "degraded", detail: "Queue backlog" }
];

const logs = [
  "10:42 System check completed.",
  "10:40 Sync pipeline updated.",
  "10:32 Alert threshold adjusted."
];

export function ServicesPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">Infrastructure</p>
        <h1 className="text-3xl font-semibold">Services</h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        {services.map((service) => (
          <div key={service.name} className="glass rounded-3xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold">{service.name}</p>
                <p className="text-sm text-muted">{service.detail}</p>
              </div>
              <span className="pill bg-accent/20 text-accent">{service.status}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="glass rounded-3xl p-6">
        <p className="text-sm text-muted">Logs</p>
        <ul className="mt-4 space-y-2 text-sm text-foreground">
          {logs.map((line) => (
            <li key={line} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-3">
              {line}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
