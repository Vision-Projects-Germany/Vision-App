import { createHashRouter } from "react-router-dom";
import AppShell from "./App";
import { HomePage } from "../features/home/HomePage";
import { ProjectsPage } from "../features/projects/ProjectsPage";
import { ProjectDetailPage } from "../features/projects/ProjectDetailPage";
import { ProfilePage } from "../features/profile/ProfilePage";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:projectId", element: <ProjectDetailPage /> },
      { path: "profile", element: <ProfilePage /> }
    ]
  }
]);
