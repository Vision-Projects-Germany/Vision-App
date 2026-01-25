import { lazy, Suspense } from "react";
import { createHashRouter } from "react-router-dom";
import AppShell from "./App";
import { PageLoader } from "../components/PageLoader";

// Lazy load route components for better code splitting
const HomePage = lazy(() => import("../features/home/HomePage").then(m => ({ default: m.HomePage })));
const ProjectsPage = lazy(() => import("../features/projects/ProjectsPage").then(m => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import("../features/projects/ProjectDetailPage").then(m => ({ default: m.ProjectDetailPage })));
const ProfilePage = lazy(() => import("../features/profile/ProfilePage").then(m => ({ default: m.ProfilePage })));

// Preload häufig verwendete Routes im Hintergrund
if (typeof window !== 'undefined') {
  // Preload ProjectsPage nach 2 Sekunden
  setTimeout(() => {
    import("../features/projects/ProjectsPage").catch(() => {});
  }, 2000);
  
  // Preload ProfilePage nach 3 Sekunden
  setTimeout(() => {
    import("../features/profile/ProfilePage").catch(() => {});
  }, 3000);
}

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<PageLoader />}>
            <HomePage />
          </Suspense>
        ) 
      },
      { 
        path: "projects", 
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProjectsPage />
          </Suspense>
        ) 
      },
      { 
        path: "projects/:projectId", 
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProjectDetailPage />
          </Suspense>
        ) 
      },
      { 
        path: "profile", 
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ) 
      }
    ]
  }
]);
