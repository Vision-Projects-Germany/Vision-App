import { useState } from "react";

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function LoginView({ onLogin, loading, error }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-[360px] rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[#13151A] px-[20px] py-[22px]">
        <h1 className="text-[20px] font-semibold text-[rgba(255,255,255,0.92)]">
          Login
        </h1>
        <p className="mt-[6px] text-[12px] text-[rgba(255,255,255,0.60)]">
          Melde dich mit deiner Vision ID an.
        </p>

        <div className="mt-[16px] space-y-[10px]">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0D0E12] px-[12px] py-[10px] text-[13px] text-[rgba(255,255,255,0.92)] placeholder:text-[rgba(255,255,255,0.40)]"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Passwort"
            className="w-full rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0D0E12] px-[12px] py-[10px] text-[13px] text-[rgba(255,255,255,0.92)] placeholder:text-[rgba(255,255,255,0.40)]"
          />
        </div>

        {error && (
          <p className="mt-[10px] text-[11px] text-[rgba(255,125,125,0.92)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => onLogin(email, password)}
          disabled={loading}
          className="mt-[16px] w-full rounded-[10px] bg-[#2BFE71] px-[12px] py-[10px] text-[13px] font-semibold text-[#0D0E12] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Anmelden..." : "Anmelden"}
        </button>
      </div>
    </div>
  );
}
