export interface AppSettings {
  discordPresenceEnabled: boolean;
  autoRefreshEnabled: boolean;
  projectCacheEnabled: boolean;
  toastEnabled: boolean;
}

interface SettingsPageProps {
  settings: AppSettings;
  onUpdate: (updater: (prev: AppSettings) => AppSettings) => void;
  onNavigate: (page: string) => void;
  profileDebugVisible?: boolean;
  onCheckForUpdates: () => void;
  updateCheckLoading: boolean;
  appVersion?: string;
}

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function ToggleSwitch({ enabled, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#50fa7b]/30 ${enabled ? "bg-[#50fa7b] shadow-[0_0_15px_rgba(80,250,123,0.45)]" : "bg-white/10 hover:bg-white/15"
        }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-black shadow-lg transition-transform duration-300 ${enabled ? "translate-x-6" : "translate-x-1"
          }`}
      />
    </button>
  );
}

interface SettingItemProps {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  isLast?: boolean;
}

function SettingItem({ icon, title, description, enabled, onChange, isLast }: SettingItemProps) {
  return (
    <div className={`flex items-center justify-between p-5 transition-colors hover:bg-white/5 ${!isLast ? 'border-b border-white/5' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 text-xl border border-white/10 shadow-inner">
          {icon}
        </div>
        <div>
          <p className="font-medium text-white/90">{title}</p>
          <p className="mt-1 text-sm text-muted/80">{description}</p>
        </div>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} />
    </div>
  );
}

export function SettingsPage({
  settings,
  onUpdate,
  onNavigate,
  profileDebugVisible,
  onCheckForUpdates,
  updateCheckLoading,
  appVersion
}: SettingsPageProps) {
  const toggleSetting = (key: keyof AppSettings) => {
    onUpdate((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10 animate-[fadeIn_0.5s_ease-out]">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-widest text-accent uppercase mb-2">System</p>
        <h1 className="text-4xl font-bold text-white tracking-tight">Einstellungen</h1>
        <p className="mt-2 text-muted text-lg">Verwalte deine App-Präferenzen und Konfigurationen.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Section */}
        <section className="glass rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 text-xl border border-orange-500/20">
                ⚙️
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">System</h2>
                <p className="text-sm text-muted">System & Verhalten</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <SettingItem
              icon="🔄"
              title="Auto-Refresh"
              description="Daten automatisch im Hintergrund aktualisieren"
              enabled={settings.autoRefreshEnabled}
              onChange={() => toggleSetting("autoRefreshEnabled")}
            />
            <SettingItem
              icon="🚀"
              title="Projekt Cache"
              description="Projekte lokal zwischenspeichern für schnelleren Zugriff"
              enabled={settings.projectCacheEnabled}
              onChange={() => toggleSetting("projectCacheEnabled")}
            />
            <SettingItem
              icon="🎮"
              title="Discord Presence"
              description="Zeige deinen Status in Discord an"
              enabled={settings.discordPresenceEnabled}
              onChange={() => toggleSetting("discordPresenceEnabled")}
              isLast={true}
            />
          </div>
        </section>

        {/* Notifications Section */}
        <section className="glass rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 text-xl border border-indigo-500/20">
                🔔
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">Benachrichtigungen</h2>
                <p className="text-sm text-muted">Verwalte Push & Info Alerts</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <SettingItem
              icon="🍞"
              title="Toasts aktivieren"
              description="Kleine Info-Popups am unteren Rand anzeigen"
              enabled={settings.toastEnabled}
              onChange={() => toggleSetting("toastEnabled")}
              isLast={true}
            />
            {/* Placeholder for visual balance */}
            <div className="hidden border-t border-white/5 p-5 opacity-50 pointer-events-none filter grayscale">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-xl">
                  📧
                </div>
                <div>
                  <p className="font-medium text-white/90">Email Reports</p>
                  <p className="mt-1 text-sm text-muted/80">Coming soon...</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* About Section */}
      <section className="glass rounded-3xl overflow-hidden mt-8">
        <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 text-xl border border-blue-500/20">
              ℹ️
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Über Vision Desktop</h2>
              <p className="text-sm text-muted">Systeminformationen</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-bold uppercase tracking-wider self-start md:self-center">
            Release
          </div>
        </div>

        <div className="p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors">
              <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">Version</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{appVersion ?? "Unbekannt"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors flex items-center justify-between group cursor-pointer">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted mb-1">Status</p>
                <p className="text-lg font-medium text-emerald-400">System Online</p>
              </div>
              <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                <i className="fas fa-check text-emerald-400 text-sm"></i>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row gap-4">
            <button
              type="button"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.99] flex justify-center items-center gap-2"
            >
              <i className="fas fa-list text-muted"></i>
              Changelog ansehen
            </button>

            {profileDebugVisible && (
              <button
                type="button"
                onClick={() => onNavigate("settings-debug")}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.99] flex justify-center items-center gap-2"
              >
                <i className="fas fa-bug text-muted"></i>
                Debug Menu
              </button>
            )}

            <button
              type="button"
              onClick={onCheckForUpdates}
              disabled={updateCheckLoading}
              className="flex-1 rounded-xl border border-[#3dff7d] bg-[#50fa7b] px-6 py-4 text-sm font-bold text-black shadow-[0_0_20px_rgba(80,250,123,0.3)] transition-all hover:bg-[#3dff7d] hover:shadow-[0_0_25px_rgba(80,250,123,0.5)] active:scale-[0.99] active:shadow-none flex justify-center items-center gap-2"
            >
              <i className={`fas ${updateCheckLoading ? "fa-spinner fa-spin" : "fa-sync-alt"}`}></i>
              {updateCheckLoading ? "Suche..." : "Nach Updates suchen"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
