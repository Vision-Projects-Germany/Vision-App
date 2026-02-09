import visionTitleLogo from "../assets/logos/vision/vision_title.png";

interface LoginViewProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  loading: boolean;
  error: string | null;
  email: string;
  password: string;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
  onRegister: () => void;
}

export function LoginView({
  expanded,
  onToggleExpanded,
  loading,
  error,
  email,
  password,
  onChangeEmail,
  onChangePassword,
  onSubmit,
  onRegister
}: LoginViewProps) {
  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0d0e12]">
      <div className="w-[440px] space-y-8">
        {/* Panel */}
        <div className="border-2 border-[rgba(80,250,123,0.2)] bg-[rgba(10,11,16,0.9)] p-7 shadow-[0_6px_0_rgba(0,0,0,0.5)]">
          <div className="text-center">
            <img
              src={visionTitleLogo}
              alt="Vision Projects"
              className="mx-auto mb-5 h-auto w-[min(280px,70%)] select-none"
              draggable={false}
            />
            <p className="text-[0.8rem] uppercase tracking-[0.4em] text-[#a9b1d6]">
              Account Center
            </p>
          </div>

          {error && (
            <div className="mt-5 border border-[rgba(255,125,125,0.3)] bg-[rgba(255,125,125,0.08)] px-4 py-3">
              <p className="text-[13px] text-[rgba(255,125,125,0.95)]">
                {error}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleExpanded}
            disabled={loading}
            className={(expanded ? "cta-secondary" : "cta-primary") + " mt-5 w-full"}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                Login in progress...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <i
                  className={
                    expanded ? "fa-solid fa-xmark" : "fa-solid fa-arrow-right-to-bracket"
                  }
                  aria-hidden="true"
                />
                {expanded ? "Abbrechen" : "Anmelden"}
              </span>
            )}
          </button>

          <div
            className={[
              "overflow-hidden transition-[max-height,opacity,transform] duration-300",
              "ease-[cubic-bezier(0.4,0,0.2,1)]",
              expanded ? "mt-5 max-h-[260px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1"
            ].join(" ")}
          >
            <div className="space-y-4 pt-1">
              <label className="block text-[12px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.55)]">
                E-Mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onChangeEmail(e.target.value)}
                  placeholder="name@vision.gg"
                  className="mt-2 w-full rounded-none border-2 border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-[15px] text-white shadow-[inset_0_2px_0_rgba(0,0,0,0.2)] outline-none transition focus:border-[#50fa7b] focus:bg-[rgba(80,250,123,0.05)]"
                  disabled={loading}
                />
              </label>
              <label className="block text-[12px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.55)]">
                Passwort
                <input
                  type="password"
                  value={password}
                  onChange={(e) => onChangePassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-none border-2 border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-[15px] text-white shadow-[inset_0_2px_0_rgba(0,0,0,0.2)] outline-none transition focus:border-[#50fa7b] focus:bg-[rgba(80,250,123,0.05)]"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSubmit();
                    }
                  }}
                />
              </label>

              <button
                type="button"
                className={(canSubmit ? "cta-primary" : "cta-secondary") + " w-full justify-center"}
                disabled={loading || !canSubmit}
                onClick={onSubmit}
              >
                {loading ? "Login in progress..." : "Login"}
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
            Nach dem Login verfuegbar
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-[rgba(255,255,255,0.06)]">
                <i className="fa-solid fa-diagram-project text-[14px] text-[rgba(255,255,255,0.6)]" aria-hidden="true" />
              </div>
              <span className="text-[13px] text-[rgba(255,255,255,0.7)]">Projekte</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-[rgba(255,255,255,0.06)]">
                <i className="fa-solid fa-calendar-days text-[14px] text-[rgba(255,255,255,0.6)]" aria-hidden="true" />
              </div>
              <span className="text-[13px] text-[rgba(255,255,255,0.7)]">Events</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-[rgba(255,255,255,0.06)]">
                <i className="fa-solid fa-user text-[14px] text-[rgba(255,255,255,0.6)]" aria-hidden="true" />
              </div>
              <span className="text-[13px] text-[rgba(255,255,255,0.7)]">Profil</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-[rgba(255,255,255,0.06)]">
                <i className="fa-solid fa-ellipsis text-[14px] text-[rgba(255,255,255,0.6)]" aria-hidden="true" />
              </div>
              <span className="text-[13px] text-[rgba(255,255,255,0.7)]">Vieles mehr</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 text-center text-[13px] text-[rgba(255,255,255,0.55)]">
          <span>Noch kein Account?</span>
          <button
            type="button"
            onClick={onRegister}
            className="font-semibold text-[#2BFE71] transition hover:brightness-110"
          >
            Registrieren
          </button>
        </div>
      </div>
    </div>
  );
}
