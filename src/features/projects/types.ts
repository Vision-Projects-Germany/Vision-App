export interface Project {
  id: string;
  name: string;
  status: "active" | "paused" | "draft";
  owner: string;
  updatedAt: string;
  summary: string;
  stack: string[];
  progress: number;
}
