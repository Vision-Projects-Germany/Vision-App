import { memo } from "react";
import { Link } from "react-router-dom";
import { useProjectsStore } from "./projectsStore";

export const ProjectsPage = memo(function ProjectsPage() {
  const projects = useProjectsStore((state) => state.projects);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">Workspace</p>
        <h1 className="text-3xl font-semibold">Projekte</h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="glass group rounded-3xl p-6 transition hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-foreground">{project.name}</p>
                <p className="text-sm text-muted">{project.summary}</p>
              </div>
              <span className="pill bg-accent/20 text-accent">{project.status}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-border bg-surface-2/60 px-3 py-1 text-xs text-muted"
                >
                  {tech}
                </span>
              ))}
            </div>
            <div className="mt-6 text-xs text-muted">
              Owner: {project.owner} - Updated: {project.updatedAt}
            </div>
            <div className="mt-4">
              <div className="h-2 rounded-full bg-surface-2">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
});
