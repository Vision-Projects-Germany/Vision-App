import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./layout/Sidebar";
import { Topbar } from "./layout/Topbar";

export default function AppShell() {
  const location = useLocation();

  // Preload benachbarte Routes beim Laden
  useEffect(() => {
    // Preload ProjectsPage wenn wir auf der HomePage sind
    if (location.pathname === "/") {
      const timer = setTimeout(() => {
        // Prefetch der wahrscheinlichsten nächsten Route
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "script";
        document.head.appendChild(link);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-auto px-8 pb-10 pt-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
