import { useState } from "react";
import { NavLink } from "react-router-dom";
import { SideIcons } from "../../components/SideIcons";
import { cn } from "../../shared/utils/cn";

const navItems = [
  { label: "Home", to: "/", icon: "fa-house" },
  { label: "Projekte", to: "/projects", icon: "fa-folder-open" }
];

export function Sidebar() {
  const [sideActive, setSideActive] = useState("home");

  return (
    <aside className="relative flex w-20 flex-col items-center border-r border-border bg-surface/60 px-3 py-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
        <span className="text-lg font-semibold">V</span>
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            aria-label={item.label}
            title={item.label}
            className={({ isActive }) =>
              cn(
                "group flex h-12 w-12 items-center justify-center rounded-2xl border border-transparent text-sm font-semibold text-muted transition",
                isActive
                  ? "bg-surface-2 text-foreground shadow-soft border-border"
                  : "hover:bg-surface-2/70 hover:text-foreground"
              )
            }
          >
            <i className={`fas ${item.icon}`} aria-hidden="true" />
          </NavLink>
        ))}
      </nav>

      <div className="absolute inset-y-0 left-0 flex items-start pt-6">
        <SideIcons activeId={sideActive} onChange={setSideActive} />
      </div>
    </aside>
  );
}
