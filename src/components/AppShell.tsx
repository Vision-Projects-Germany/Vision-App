import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  withSidebar?: boolean;
}

export function AppShell({ children, withSidebar = true }: AppShellProps) {
  return (
    <div
      className={`h-screen w-screen bg-[#13151A] pr-0 relative ${
        withSidebar ? "pl-[75px]" : "pl-0"
      }`}
    >
      <div className="h-full w-full">{children}</div>
    </div>
  );
}
