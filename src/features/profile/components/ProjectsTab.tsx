import React, { useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '../types';

interface ProjectsTabProps {
    profile: UserProfile | null;
}

interface ProjectMedia {
    url?: string;
    thumbUrl?: string;
}

interface ApiProjectItem {
    id: string;
    title?: string | null;
    descriptionHtml?: string | null;
    banner?: ProjectMedia | null;
    logo?: ProjectMedia | null;
    activityStatus?: string | null;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({ profile }) => {
    const [projects, setProjects] = useState<ApiProjectItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProjects = async () => {
            const projectIds = profile?.projects ?? [];
            if (!projectIds.length) {
                setProjects([]);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const response = await fetch("https://api.blizz-developments-official.de/api/projects?page=1&limit=200");
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const payload = await response.json();
                const apiItems: ApiProjectItem[] = Array.isArray(payload?.items) ? payload.items : [];
                const wantedIds = new Set(projectIds);
                setProjects(apiItems.filter((item) => wantedIds.has(item.id)));
            } catch (e) {
                const message = e instanceof Error ? e.message : "Fehler beim Laden der Projekte.";
                setError(message);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };

        void loadProjects();
    }, [profile?.projects]);

    const sortedProjects = useMemo(() => {
        const order: Record<string, number> = {
            "active": 0,
            "coming soon": 1,
            "starting shortly": 2,
            "ended": 3
        };
        return [...projects].sort((a, b) => {
            const aOrder = order[(a.activityStatus ?? "").toLowerCase()] ?? 99;
            const bOrder = order[(b.activityStatus ?? "").toLowerCase()] ?? 99;
            return aOrder - bOrder;
        });
    }, [projects]);

    const plainDescription = (value: string | null | undefined) =>
        (value ?? "").replace(/<[^>]*>/g, "").trim();

    const getBadgeClass = (status: string | null | undefined) => {
        const normalized = (status ?? "").toLowerCase();
        if (normalized === "active") return "bg-[#2BFE71] text-black";
        if (normalized === "coming soon") return "bg-[#facc15] text-black";
        if (normalized === "starting shortly") return "bg-[#60a5fa] text-black";
        if (normalized === "ended") return "bg-[rgba(255,255,255,0.22)] text-[rgba(255,255,255,0.92)]";
        return "bg-[rgba(255,255,255,0.22)] text-[rgba(255,255,255,0.92)]";
    };

    return (
        <div className="mt-4 flex flex-wrap items-start gap-[12px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {sortedProjects.map((project) => (
                <button
                    type="button"
                    key={project.id}
                    className="group relative flex h-[320px] w-[260px] flex-col rounded-[18px] p-[3px] text-left"
                >
                    <span
                        aria-hidden="true"
                        className="rainbow-draw pointer-events-none absolute inset-0 rounded-[18px] blur-[2px]"
                    />
                    <div className="relative z-10 flex h-full w-full overflow-hidden rounded-[15px] bg-[#24262C]">
                        <div className="flex w-full flex-col">
                            {project.banner?.url ? (
                                <div className="relative h-[180px] w-full overflow-hidden">
                                    <img
                                        src={project.banner.url}
                                        alt={`${project.title ?? "Project"} hero`}
                                        className="h-full w-full bg-[#0D0E12] object-cover transition duration-200 group-hover:brightness-90"
                                    />
                                    {project.activityStatus && (
                                        <div className="absolute right-5 top-3">
                                            <span className={`inline-flex rounded-[10px] px-3 py-1 text-[11px] font-semibold ${getBadgeClass(project.activityStatus)}`}>
                                                {project.activityStatus}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-[180px] w-full bg-[#0D0E12]" />
                            )}
                            <div className="px-[16px] pb-[18px] pt-[14px]">
                                <div className="flex items-center gap-[12px]">
                                    {project.logo?.url ? (
                                        <div className="h-[48px] w-[48px] overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22]">
                                            <img
                                                src={project.logo.url}
                                                alt={`${project.title ?? "Project"} logo`}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-[48px] w-[48px] rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22]" />
                                    )}
                                    <p className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)] line-clamp-1">
                                        {project.title ?? "Untitled Project"}
                                    </p>
                                </div>
                                <p className="mt-[12px] text-[12px] leading-[18px] text-[rgba(255,255,255,0.70)] line-clamp-3">
                                    {plainDescription(project.descriptionHtml) || "Keine Beschreibung vorhanden."}
                                </p>
                            </div>
                        </div>
                    </div>
                </button>
            ))}

            {!loading && !error && !sortedProjects.length && (
                <div className="text-xs text-[rgba(255,255,255,0.60)]">
                    Keine Projekte vorhanden.
                </div>
            )}
            {loading && <div className="text-xs text-[rgba(255,255,255,0.60)]">Loading...</div>}
            {error && <div className="text-xs text-[rgba(255,255,255,0.60)]">Projekte konnten nicht geladen werden.</div>}
        </div>
    );
};
