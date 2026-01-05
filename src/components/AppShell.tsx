import type { ReactNode } from "react";
import logo from "../assets/logos/VisionApp.png";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen w-screen bg-[#13151A] pt-[50px] pl-[75px] pr-0 relative">
      <div className="absolute left-24 top-4 z-50">
        <img src={logo} alt="Vision App" className="h-6 w-auto rounded-lg" />
      </div>
      <div className="h-full w-full">{children}</div>
    </div>
  );
}
