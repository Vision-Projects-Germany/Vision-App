import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen w-screen bg-[#13151A] pl-[75px] pr-0 relative">
      <div className="h-full w-full">{children}</div>
    </div>
  );
}
