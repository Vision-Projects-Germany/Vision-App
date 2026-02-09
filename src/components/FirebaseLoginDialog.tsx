import { useEffect, useMemo, useState } from "react";

interface FirebaseLoginDialogProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function FirebaseLoginDialog({
  open,
  loading,
  error,
  onClose,
  onSubmit
}: FirebaseLoginDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return Boolean(email.trim()) && Boolean(password) && !loading;
  }, [email, password, loading]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[520px] border-2 border-[rgba(80,250,123,0.20)] bg-[rgba(10,11,16,0.92)] p-6 shadow-[0_6px_0_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[rgba(169,177,214,0.85)]">
              Account Center
            </p>
            <h2 className="mt-2 text-[22px] font-semibold text-[rgba(248,248,242,0.96)]">
              Anmelden
            </h2>
            <p className="mt-2 text-[13px] text-[rgba(169,177,214,0.85)]">
              Bitte Email und Passwort eingeben.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="cta-secondary h-10 px-3 py-2 text-[12px]"
            aria-label="Schliessen"
          >
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
              Schliessen
            </span>
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-[12px] uppercase tracking-[0.10em] text-[rgba(248,248,242,0.78)]">
            <span className="block mb-2">E-Mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@vision.gg"
              className="w-full border-2 border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-[14px] text-[rgba(248,248,242,0.95)] outline-none focus:border-[#50fa7b] focus:shadow-[0_0_0_2px_rgba(80,250,123,0.2)]"
              disabled={loading}
              autoFocus
            />
          </label>
          <label className="block text-[12px] uppercase tracking-[0.10em] text-[rgba(248,248,242,0.78)]">
            <span className="block mb-2">Passwort</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              className="w-full border-2 border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-[14px] text-[rgba(248,248,242,0.95)] outline-none focus:border-[#50fa7b] focus:shadow-[0_0_0_2px_rgba(80,250,123,0.2)]"
              disabled={loading}
            />
          </label>

          {error && (
            <div className="border border-[rgba(255,107,107,0.30)] bg-[rgba(255,107,107,0.08)] px-4 py-3 text-[12px] text-[rgba(255,107,107,0.95)]">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void onSubmit(email.trim(), password)}
              className="cta-primary w-full"
            >
              <span className="flex items-center justify-center gap-3">
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                ) : (
                  <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" />
                )}
                {loading ? "Anmelden..." : "Login"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

