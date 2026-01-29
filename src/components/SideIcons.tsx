import { memo } from "react";

interface SideIconsProps {
  activeId: string;
  onChange: (id: string) => void;
  visiblePages?: string[] | null;
}

export const SideIcons = memo(function SideIcons({
  activeId,
  onChange,
  visiblePages = null
}: SideIconsProps) {
  const items = [
    { id: "home", label: "Home", icon: "fa-house" },
    { id: "explore", label: "Explore", icon: "fa-compass" }
  ];
  const adminItems = [
    { id: "editor", label: "Editor", icon: "fa-pen-to-square" },
    { id: "analytics", label: "Analytics", icon: "fa-chart-line" },
    { id: "calendar", label: "Kalender", icon: "fa-calendar-days" },
    { id: "admin", label: "Admin", icon: "fa-shield" }
  ];
  const isAllowed = (pageId: string) => {
    if (visiblePages === null) {
      return true;
    }
    if (visiblePages.length === 0) {
      return false;
    }
    return visiblePages.includes(pageId);
  };
  const visibleItems = items.filter((item) => isAllowed(item.id));
  const visibleAdminItems = adminItems.filter((item) => isAllowed(item.id));

  return (
    <div className="flex h-full flex-col items-start pt-6 pb-0 -ml-[85px]">
      <div className="flex flex-col gap-3">
        {visibleItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onChange(item.id)}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-200 ${activeId === item.id
              ? "bg-[rgba(43,254,113,0.18)] text-[#2BFE71] shadow-lg"
              : "text-[#B0BAC5] hover:bg-[rgba(176,186,197,0.16)] hover:scale-105"
              }`}
            aria-label={item.label}
            title={item.label}
          >
            <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      {visibleAdminItems.length > 0 && (
        <>
          <div className="my-4 h-px w-10 rounded-full bg-[rgba(255,255,255,0.14)]" />
          <div className="flex flex-col gap-3">
            {visibleAdminItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onChange(item.id)}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-200 ${activeId === item.id
                    ? "bg-[rgba(43,254,113,0.18)] text-[#2BFE71] shadow-lg"
                    : "text-[#B0BAC5] hover:bg-[rgba(176,186,197,0.16)] hover:scale-105"
                  }`}
                aria-label={item.label}
                title={item.label}
              >
                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {isAllowed("settings") && (
          <button
            type="button"
            onClick={() => onChange("settings")}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-200 ${activeId === "settings"
              ? "bg-[rgba(43,254,113,0.18)] text-[#2BFE71] shadow-lg"
              : "text-[#B0BAC5] hover:bg-[rgba(176,186,197,0.16)] hover:scale-105"
              }`}
            aria-label="Settings"
            title="Settings"
          >
            <i className="fa-solid fa-gear" aria-hidden="true" />
          </button>
        )}

        {isAllowed("profile") && (
          <button
            type="button"
            onClick={() => onChange("profile")}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-200 ${activeId === "profile"
              ? "bg-[rgba(43,254,113,0.18)] text-[#2BFE71] shadow-lg"
              : "text-[#B0BAC5] hover:bg-[rgba(176,186,197,0.16)] hover:scale-105"
              }`}
            aria-label="Profile"
            title="Profile"
          >
            <i className="fa-solid fa-user" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
});
