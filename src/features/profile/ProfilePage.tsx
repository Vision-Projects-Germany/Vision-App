import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface AppInfo {
  name: string;
  version: string;
}

export function ProfilePage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    invoke<AppInfo>("get_app_info")
      .then(setAppInfo)
      .catch(() => setAppInfo(null));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">Account</p>
        <h1 className="text-3xl font-semibold">Profil</h1>
      </header>

      <section className="glass rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <i className="fas fa-user" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold">Player One</p>
            <p className="text-sm text-muted">Level 18 · Pro member</p>
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl p-6">
        <p className="text-sm text-muted">App info</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
