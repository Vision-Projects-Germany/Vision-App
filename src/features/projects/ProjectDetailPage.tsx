import { Link, useParams } from "react-router-dom";
import { useProjectsStore } from "./projectsStore";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const project = useProjectsStore((state) =>
    state.projects.find((item) => item.id === projectId)
  );

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Projekt nicht gefunden</h1>
        <Link to="/projects" className="text-sm text-accent">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link to="/projects" className="text-sm text-accent">
          Zurück zu Projekten
        </Link>
        <h1 className="text-3xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted">{project.summary}</p>
      </header>

      <section className="glass rounded-3xl p-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Status</p>
            <p className="mt-2 text-lg font-medium text-foreground">{project.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Owner</p>
            <p className="mt-2 text-lg font-medium text-foreground">{project.owner}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Last update</p>
            <p className="mt-2 text-lg font-medium text-foreground">{project.updatedAt}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Stack</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-border bg-surface-2/60 px-3 py-1 text-xs text-muted"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Progress</p>
          <div className="mt-3 h-2 rounded-full bg-surface-2">
            <div
              className="h-2 rounded-full bg-accent"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
