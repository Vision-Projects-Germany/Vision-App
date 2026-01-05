import { create } from "zustand";
import { mockProjects } from "./mockProjects";
import type { Project } from "./types";

interface ProjectsState {
  projects: Project[];
}

export const useProjectsStore = create<ProjectsState>(() => ({
  projects: mockProjects
}));
