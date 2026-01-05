import { Outlet } from "react-router-dom";
import { Sidebar } from "./layout/Sidebar";
import { Topbar } from "./layout/Topbar";

export default function AppShell() {
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
