interface LoginViewProps {
  onOAuthLogin: () => Promise<void>;
  onOpenWebsite?: () => void;
  oauthLoading: boolean;
  error: string | null;
}

export function LoginView({
  onOAuthLogin,
  onOpenWebsite,
  oauthLoading,
  error
}: LoginViewProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0d0e12]">
      <div className="w-[440px] space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-[rgba(43,254,113,0.12)] shadow-[0_0_0_1px_rgba(43,254,113,0.3)]">
            <i className="fa-solid fa-right-to-bracket text-[28px] text-[#2BFE71]" aria-hidden="true" />
          </div>
          <h1 className="text-[28px] font-bold text-white">
            Willkommen
          </h1>
          <p className="mt-3 text-[15px] text-[rgba(255,255,255,0.55)]">
            Melde dich an, um deine Projekte zu verwalten
          </p>
        </div>

        {/* Login Card */}
        <div className="border border-[rgba(255,255,255,0.08)] bg-[#13151A] p-6">
          {error && (
            <div className="mb-4 border border-[rgba(255,125,125,0.3)] bg-[rgba(255,125,125,0.08)] px-4 py-3">
              <p className="text-[13px] text-[rgba(255,125,125,0.95)]">
                {error}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void onOAuthLogin()}
            disabled={oauthLoading}
            className="cta-primary w-full"
          >
            {oauthLoading ? (
              <span className="flex items-center justify-center gap-3">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                Browser wird geöffnet...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" />
                Mit Vision OAuth anmelden
              </span>
            )}
          </button>

          {onOpenWebsite && (
            <button
              type="button"
              onClick={() => onOpenWebsite()}
              className="cta-secondary mt-3 w-full"
            >
              <span className="flex items-center justify-center gap-3">
                <i className="fa-solid fa-headset" aria-hidden="true" />
                Support kontaktieren
              </span>
            </button>
          )}
        </div>

        {/* Features */}
        <div className="border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
            Nach dem Login verfügbar
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
      </div>
    </div>
  );
}
