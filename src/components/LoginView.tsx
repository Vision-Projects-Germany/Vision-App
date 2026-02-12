import { useEffect, useRef, useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const canSubmit = email.trim().length > 0 && password.length > 0;

  // Auto-focus email field when expanded
  useEffect(() => {
    if (expanded && emailInputRef.current) {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [expanded]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0d0e12]">
      <div className="w-[440px] space-y-8">
        {/* Panel */}
        <div className="border-2 border-[rgba(80,250,123,0.2)] bg-[rgba(10,11,16,0.9)] p-7 shadow-[0_6px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-[rgba(80,250,123,0.28)] hover:shadow-[0_8px_0_rgba(0,0,0,0.6)]">
          <div className="text-center">
            <img
              src={visionTitleLogo}
              alt="Vision Projects"
              className="mx-auto mb-5 h-auto w-[min(280px,70%)] select-none transition-transform duration-300 hover:scale-105"
              draggable={false}
            />
            <p className="text-[0.8rem] uppercase tracking-[0.4em] text-[#a9b1d6]">
              Account Center
            </p>
          </div>

          {error && (
            <div className="mt-5 animate-[shake_0.3s_ease-in-out] border border-[rgba(255,125,125,0.4)] bg-[rgba(255,125,125,0.12)] px-4 py-3 shadow-[0_2px_8px_rgba(255,125,125,0.15)]">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-[rgba(255,125,125,0.95)]" aria-hidden="true" />
                <p className="flex-1 text-[13px] text-[rgba(255,125,125,0.95)]">
                  {error}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleExpanded}
            disabled={loading}
            className={(expanded ? "cta-secondary" : "cta-primary") + " mt-5 w-full transition-all duration-200 active:scale-[0.98]"}
            aria-expanded={expanded}
            aria-label={expanded ? "Abbrechen" : "Anmelden"}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                <span className="animate-pulse">Login in progress...</span>
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
              expanded ? "mt-5 max-h-[320px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1"
            ].join(" ")}
          >
            <div className="space-y-4 pt-1">
              <label className="block text-[12px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.55)]">
                E-Mail
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => onChangeEmail(e.target.value)}
                  placeholder="name@vision.gg"
                  className="mt-2 w-full rounded-none border-2 border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-[15px] text-white shadow-[inset_0_2px_0_rgba(0,0,0,0.2)] outline-none transition-all focus:border-[#50fa7b] focus:bg-[rgba(80,250,123,0.05)] focus:shadow-[0_0_0_3px_rgba(80,250,123,0.1)]"
                  disabled={loading}
                  aria-label="E-Mail Adresse"
                  autoComplete="email"
                />
              </label>
              <label className="block text-[12px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.55)]">
                Passwort
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => onChangePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-none border-2 border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.04)] px-3 py-3 pr-11 text-[15px] text-white shadow-[inset_0_2px_0_rgba(0,0,0,0.2)] outline-none transition-all focus:border-[#50fa7b] focus:bg-[rgba(80,250,123,0.05)] focus:shadow-[0_0_0_3px_rgba(80,250,123,0.1)]"
                    disabled={loading}
                    aria-label="Passwort"
                    autoComplete="current-password"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (canSubmit) onSubmit();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 flex h-full items-center px-3 text-[rgba(255,255,255,0.4)] transition-colors hover:text-[rgba(255,255,255,0.7)]"
                    aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                    tabIndex={-1}
                  >
                    <i 
                      className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="text-[12px] font-semibold text-[rgba(80,250,123,0.8)] transition-colors hover:text-[#50fa7b] hover:underline"
                  onClick={() => {/* TODO: Implement forgot password */}}
                >
                  Passwort vergessen?
                </button>
              </div>

              <button
                type="button"
                className={(canSubmit ? "cta-primary" : "cta-secondary") + " w-full justify-center transition-all duration-200 active:scale-[0.98]"}
                disabled={loading || !canSubmit}
                onClick={onSubmit}
                aria-label="Login absenden"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                    <span className="animate-pulse">Login in progress...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-check" aria-hidden="true" />
                    Login
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 transition-all duration-300 hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)]">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
            Nach dem Login verfügbar
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="group flex items-center gap-3 transition-transform duration-200 hover:translate-x-1">
              <div className="flex h-8 w-8 items-center justify-center bg-[rgba(255,255,255,0.06)] transition-all duration-200 group-hover:bg-[rgba(80,250,123,0.15)]">
                <i className="fa-solid fa-diagram-project text-[14px] text-[rgba(255,255,255,0.6)] transition-colors duration-200 group-hover:text-[#50fa7b]" aria-hidden="true" />
              </div>
              <span className="text-[13px] text-[rgba(255,255,255,0.7)] transition-colors duration-200 group-hover:text-[rgba(255,255,255,0.9)]">Projekte</span>
            </div>
            <div className="group flex items-center gap-3 transition-transform duration-200 hover:translate-x-1">
              <div className="flex h-8 w-8 items-center justify-center bg-[rgba(255,255,255,0.06)] transition-all duration-200 group-hover:bg-[rgba(80,250,123,0.15)]">
                <i className="fa-solid fa-calendar-days text-[14px] text-[rgba(255,255,255,0.6)] transition-colors duration-200 group-hover:text-[#50fa7b]" aria-hidden="true" />
              </div>
              <span className="text-[13px] text-[rgba(255,255,255,0.7)] transition-colors duration-200 group-hover:text-[rgba(255,255,255,0.9)]">Events</span>
            </div>
            <div className="group flex items-center gap-3 transition-transform duration-200 hover:translate-x-1">
              <div className="flex h-8 w-8 items-center justify-center bg-[rgba(255,255,255,0.06)] transition-all duration-200 group-hover:bg-[rgba(80,250,123,0.15)]">
                <i className="fa-solid fa-user text-[14px] text-[rgba(255,255,255,0.6)] transition-colors duration-200 group-hover:text-[#50fa7b]" aria-hidden="true" />
              </div>
              <span className="text-[13px] text-[rgba(255,255,255,0.7)] transition-colors duration-200 group-hover:text-[rgba(255,255,255,0.9)]">Profil</span>
            </div>
            <div className="group flex items-center gap-3 transition-transform duration-200 hover:translate-x-1">
              <div className="flex h-8 w-8 items-center justify-center bg-[rgba(255,255,255,0.06)] transition-all duration-200 group-hover:bg-[rgba(80,250,123,0.15)]">
                <i className="fa-solid fa-ellipsis text-[14px] text-[rgba(255,255,255,0.6)] transition-colors duration-200 group-hover:text-[#50fa7b]" aria-hidden="true" />
              </div>
              <span className="text-[13px] text-[rgba(255,255,255,0.7)] transition-colors duration-200 group-hover:text-[rgba(255,255,255,0.9)]">Vieles mehr</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 text-center text-[13px] text-[rgba(255,255,255,0.55)]">
          <span>Noch kein Account?</span>
          <button
            type="button"
            onClick={onRegister}
            className="font-semibold text-[#2BFE71] transition-all duration-200 hover:brightness-110 hover:underline active:scale-95"
            aria-label="Neuen Account registrieren"
          >
            Registrieren →
          </button>
        </div>
      </div>
    </div>
  );
}
