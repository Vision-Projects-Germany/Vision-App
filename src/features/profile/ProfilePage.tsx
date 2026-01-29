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
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-muted/70">Account</p>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Profil
        </h1>
      </header>

      {/* Hauptprofil Card */}
      <section className="glass group relative overflow-hidden rounded-3xl p-8 transition-all hover:shadow-2xl hover:shadow-accent/5">
        <div className="absolute right-0 top-0 h-32 w-32 bg-accent/5 blur-3xl" />
        <div className="relative flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/30 via-accent/20 to-accent/10 text-2xl text-accent shadow-lg shadow-accent/20 transition-transform group-hover:scale-105">
            <i className="fas fa-user" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-foreground">Player One</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                <i className="fas fa-star text-[10px]" aria-hidden="true" />
                Level 18
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500/15 to-pink-500/15 px-3 py-1 text-xs font-semibold text-purple-300">
                <i className="fas fa-crown text-[10px]" aria-hidden="true" />
                Pro Member
              </span>
            </div>
          </div>
          <button className="rounded-2xl border border-border bg-surface-2/60 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-surface-2 hover:scale-105">
            Bearbeiten
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass group rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted/70">Projekte</p>
              <p className="mt-2 text-3xl font-bold text-foreground">12</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <i className="fas fa-folder text-lg" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="glass group rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted/70">Commits</p>
              <p className="mt-2 text-3xl font-bold text-foreground">847</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <i className="fas fa-code-branch text-lg" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="glass group rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted/70">Streak</p>
              <p className="mt-2 text-3xl font-bold text-foreground">28d</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <i className="fas fa-fire text-lg" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* App Info */}
      <section className="glass overflow-hidden rounded-3xl">
        <div className="border-b border-border/50 px-6 py-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted/70">System Info</p>
        </div>
        <div className="grid gap-px bg-border/30 md:grid-cols-2">
          <div className="bg-surface-1/80 p-6 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted/60">App Name</p>
                <p className="mt-3 text-xl font-bold text-foreground">{appInfo?.name ?? "Vision Desktop"}</p>
              </div>
              <div className="rounded-lg bg-accent/10 p-2 text-accent">
                <i className="fas fa-desktop" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="bg-surface-1/80 p-6 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted/60">Version</p>
                <p className="mt-3 text-xl font-bold text-foreground">{appInfo?.version ?? "0.1.0"}</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                <i className="fas fa-tag" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
