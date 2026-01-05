import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface AppInfo {
  name: string;
  version: string;
}

const cards = [
  {
    title: "Projects",
    value: "12",
    detail: "3 updated this week"
  },
  {
    title: "Services",
    value: "7",
    detail: "All healthy"
  },
  {
    title: "Activity",
    value: "24",
    detail: "Events in the last 24h"
  }
];

export function DashboardPage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    invoke<AppInfo>("get_app_info")
      .then(setAppInfo)
      .catch(() => setAppInfo(null));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">Control Center</p>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">App Info (Tauri Command)</p>
            <p className="text-lg font-semibold">Runtime</p>
          </div>
          <span className="pill bg-accent/20 text-accent">Local</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Name</p>
            <p className="mt-2 text-lg font-medium">{appInfo?.name ?? "Vision Desktop"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Version</p>
            <p className="mt-2 text-lg font-medium">{appInfo?.version ?? "0.1.0"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
