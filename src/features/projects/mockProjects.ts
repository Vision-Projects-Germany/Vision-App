import type { Project } from "./types";

export const mockProjects: Project[] = [
  {
    id: "atlas",
    name: "Atlas Platform",
    status: "active",
    owner: "J. Fischer",
    updatedAt: "Today 09:12",
    summary: "Unified ops layer for multi-service orchestration.",
    stack: ["Rust", "Tauri", "Postgres"],
    progress: 68
  },
  {
    id: "lumen",
    name: "Lumen UI",
    status: "active",
    owner: "R. Hartmann",
    updatedAt: "Yesterday 19:30",
    summary: "Design system for fast, elegant interfaces.",
    stack: ["React", "Tailwind", "Zustand"],
    progress: 54
  },
  {
    id: "prism",
    name: "Prism Analytics",
    status: "paused",
    owner: "S. Klein",
    updatedAt: "2 days ago",
    summary: "Signal intelligence for release health and usage.",
    stack: ["Node", "ClickHouse", "Grafana"],
    progress: 38
  }
];
