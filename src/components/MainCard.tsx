import type { ReactNode } from "react";

interface MainCardProps {
  children: ReactNode;
}

export function MainCard({ children }: MainCardProps) {
  return (
    <div
      className="flex h-full w-full flex-col rounded-tl-[26px] border border-[rgba(255,255,255,0.06)] bg-[#0D0E12] p-[22px]"
      style={{
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)"
      }}
    >
      {children}
    </div>
  );
}
