const items = [
  { id: "home", label: "Home", icon: "fa-house" },
  { id: "projects", label: "Projects", icon: "fa-book" },
  { id: "explore", label: "Explore", icon: "fa-compass" }
];

interface SideIconsProps {
  activeId: string;
  onChange: (id: string) => void;
}

export function SideIcons({ activeId, onChange }: SideIconsProps) {

  return (
    <div className="flex h-full flex-col items-start pt-0 pb-0 -ml-[85px]">
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onChange(item.id)}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-200 ${
              activeId === item.id
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
      
      <div className="mt-auto flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onChange("settings")}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-200 ${
            activeId === "settings"
              ? "bg-[rgba(43,254,113,0.18)] text-[#2BFE71] shadow-lg"
              : "text-[#B0BAC5] hover:bg-[rgba(176,186,197,0.16)] hover:scale-105"
          }`}
          aria-label="Settings"
          title="Settings"
        >
          <i className="fa-solid fa-gear" aria-hidden="true" />
        </button>
        
        <button
          type="button"
          onClick={() => onChange("profile")}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-200 ${
            activeId === "profile"
              ? "bg-[rgba(43,254,113,0.18)] text-[#2BFE71] shadow-lg"
              : "text-[#B0BAC5] hover:bg-[rgba(176,186,197,0.16)] hover:scale-105"
          }`}
          aria-label="Profile"
          title="Profile"
        >
          <i className="fa-solid fa-user" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
