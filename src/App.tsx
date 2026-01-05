import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { onAuthStateChanged, signInWithEmailAndPassword, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import modrinthLogo from "./assets/logos/modrinth/modrinth_logo.png";
import { AppShell } from "./components/AppShell";
import { MainCard } from "./components/MainCard";
import { SideIcons } from "./components/SideIcons";
import { LoginView } from "./components/LoginView";
import { auth, db } from "./firebase";

interface NewsItem {
  title: string;
  excerpt: string;
  cover: { url: string } | null;
}

interface ProjectItem {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  cover: { url: string } | null;
  logoIcon?: { url: string } | null;
  modrinth_id?: string | null;
  modrinthId?: string | null;
  modrinthSlug?: string | null;
  modrinth_slug?: string | null;
  srcModrinth?: boolean;
  src_modrinth?: boolean;
}

interface ModrinthProject {
  title?: string;
  description?: string;
  icon_url?: string | null;
  gallery?: ModrinthGalleryItem[] | null;
  slug?: string;
  id?: string;
  project_type?: string;
}

interface ModrinthCard {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  iconUrl: string | null;
  projectType: string;
  url: string | null;
}

interface ModrinthGalleryItem {
  url?: string;
  raw_url?: string;
  featured?: boolean;
}

const fallbackProjectDescription =
  "Projektbeschreibung folgt. Mehr Details kommen spaeter, inklusive Features, Updates und Plattformen.";

const modrinthTypeOrder = [
  "modpack",
  "mod",
  "plugin",
  "datapack",
  "resourcepack",
  "shader"
];

const modrinthTypeLabels: Record<string, string> = {
  modpack: "Modpacks",
  mod: "Mods",
  plugin: "Plugins",
  datapack: "Datapacks",
  resourcepack: "Resourcepacks",
  shader: "Shader"
};

function getContributorIds() {
  const raw = (import.meta.env.VITE_PROJECT_CONTRIBUTORS_ID as string | undefined) ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeModrinthFields(item: ProjectItem) {
  const modrinthId =
    item.modrinthId ??
    item.modrinth_id ??
    // @ts-ignore backend may use snake case
    (item as any).modrinth_id ??
    null;

  return { modrinthId };
}

function getModrinthProjectUrl(item: ProjectItem) {
  const slug =
    item.modrinthSlug ?? item.modrinth_slug ?? (item as any).modrinthSlug ?? null;
  const modrinthId =
    item.modrinthId ?? item.modrinth_id ?? (item as any).modrinthId ?? null;
  const handle = slug ?? modrinthId;
  return handle ? `https://modrinth.com/project/${handle}` : null;
}

function getModrinthProjectLink(project: ModrinthProject) {
  const handle = project.slug ?? project.id ?? null;
  return handle ? `https://modrinth.com/project/${handle}` : null;
}

function toModrinthCard(project: ModrinthProject) {
  const coverUrl = getModrinthCover(project) ?? project.icon_url ?? null;
  return {
    id: project.id ?? project.slug ?? "unknown",
    title: project.title ?? "Unbekanntes Projekt",
    description: project.description ?? null,
    coverUrl,
    iconUrl: project.icon_url ?? null,
    projectType: project.project_type ?? "other",
    url: getModrinthProjectLink(project)
  };
}

function groupModrinthCards(cards: ModrinthCard[]) {
  const grouped = new Map<string, ModrinthCard[]>();
  for (const card of cards) {
    const type = card.projectType || "other";
    const bucket = grouped.get(type) ?? [];
    bucket.push(card);
    grouped.set(type, bucket);
  }

  const ordered = modrinthTypeOrder
    .filter((type) => grouped.has(type))
    .map((type) => ({
      type,
      label: modrinthTypeLabels[type] ?? type,
      items: grouped.get(type) ?? []
    }));

  const leftovers = Array.from(grouped.entries())
    .filter(([type]) => !modrinthTypeOrder.includes(type))
    .map(([type, items]) => ({
      type,
      label: modrinthTypeLabels[type] ?? "Andere",
      items
    }));

  return [...ordered, ...leftovers];
}

async function openModrinth(url: string | null) {
  if (!url) {
    return;
  }

  try {
    await openUrl(url);
  } catch (error) {
    console.error("Failed to open Modrinth URL", error);
  }
}

async function fetchModrinthProject(modrinthId: string, signal: AbortSignal) {
  const response = await fetch(`https://api.modrinth.com/v2/project/${modrinthId}`, {
    signal
  });

  if (!response.ok) {
    throw new Error("modrinth project fetch failed");
  }

  return (await response.json()) as ModrinthProject;
}

function getModrinthCover(project: ModrinthProject) {
  const gallery = Array.isArray(project.gallery) ? project.gallery : [];
  if (!gallery.length) {
    return null;
  }

  const featured = gallery.find((item) => item.featured && (item.raw_url ?? item.url));
  if (featured) {
    return featured.raw_url ?? featured.url ?? null;
  }

  const first = gallery.find((item) => item.raw_url ?? item.url);
  return first?.raw_url ?? first?.url ?? null;
}

export default function App() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsError, setNewsError] = useState(false);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [projectError, setProjectError] = useState(false);
  const [modrinthProjects, setModrinthProjects] = useState<ModrinthProject[]>([]);
  const [modrinthError, setModrinthError] = useState(false);
  const [activePage, setActivePage] = useState("home");
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userProjectIds, setUserProjectIds] = useState<string[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("https://api.blizz-developments-official.de/api/news?page=1&limit=5", {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("news fetch failed");
        }
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data.items)) {
          setNewsItems(data.items);
        } else {
          setNewsItems([]);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setNewsError(true);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadProjects = async () => {
      try {
        const response = await fetch(
          "https://api.blizz-developments-official.de/api/projects?page=1&limit=6",
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("projects fetch failed");
        }
        const data = await response.json();
        if (!Array.isArray(data.items)) {
          setProjectItems([]);
          return;
        }

        const items = data.items as ProjectItem[];
        const enrichedItems = await Promise.all(
          items.map(async (item) => {
            const { modrinthId } = normalizeModrinthFields(item);
            const useModrinth =
              item.srcModrinth === true ||
              item.src_modrinth === true ||
              (item as any).srcmodrinth === true;
            if (!useModrinth || !modrinthId) {
              return item;
            }

            try {
              const modrinth = await fetchModrinthProject(modrinthId, controller.signal);
              const coverUrl = getModrinthCover(modrinth);
              const fallbackCoverUrl = modrinth.icon_url ?? null;

              return {
                ...item,
                srcModrinth: useModrinth,
                modrinthSlug:
                  modrinth.slug ??
                  item.modrinthSlug ??
                  (item as any).modrinth_slug ??
                  null,
                title: modrinth.title ?? item.title,
                description: modrinth.description ?? item.description,
                logoIcon: modrinth.icon_url ? { url: modrinth.icon_url } : null,
                cover: coverUrl
                  ? { url: coverUrl }
                  : fallbackCoverUrl
                    ? { url: fallbackCoverUrl }
                    : null
              };
            } catch {
              return item;
            }
          })
        );

        if (!controller.signal.aborted) {
          setProjectItems(enrichedItems);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setProjectError(true);
        }
      }
    };

    loadProjects();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const contributors = getContributorIds();

    if (!contributors.length) {
      setModrinthProjects([]);
      setModrinthError(true);
      return () => controller.abort();
    }

    const loadModrinthProjects = async () => {
      try {
        const seen = new Set<string>();
        const collected: ModrinthProject[] = [];

        for (const contributorId of contributors) {
          const response = await fetch(
            `https://api.modrinth.com/v2/user/${contributorId}/projects`,
            { signal: controller.signal }
          );
          if (!response.ok) {
            throw new Error("modrinth projects fetch failed");
          }
          const data = (await response.json()) as ModrinthProject[];
          if (Array.isArray(data)) {
            for (const project of data) {
              const key = project.id ?? project.slug;
              if (!key || seen.has(key)) {
                continue;
              }
              seen.add(key);
              collected.push(project);
            }
          }
        }

        if (!controller.signal.aborted) {
          setModrinthProjects(collected);
          setModrinthError(false);
        }
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          setModrinthError(true);
        }
      }
    };

    loadModrinthProjects();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    invoke<string | null>("deeplink_get_current_route")
      .then((route) => {
        if (route && isPage(route)) {
          setActivePage(route);
        }
      })
      .catch(() => undefined);

    listen("app:navigate", (event) => {
      const route = String(event.payload ?? "");
      if (isPage(route)) {
        setActivePage(route);
      }
    })
      .then((stop) => {
        unlisten = stop;
      })
      .catch(() => undefined);

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUsername(null);
      setUserProjectIds([]);
      return;
    }

    getDoc(doc(db, "users", user.uid))
      .then((snapshot) => {
        const value = snapshot.exists() ? snapshot.get("username") : null;
        setUsername(typeof value === "string" ? value : null);
        const projectsValue = snapshot.exists() ? snapshot.get("projects") : null;
        setUserProjectIds(Array.isArray(projectsValue) ? projectsValue : []);
      })
      .catch(() => {
        setUsername(null);
        setUserProjectIds([]);
      });
  }, [user]);

  const handleLogin = async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLoginForm(false);
    } catch {
      setLoginError("Login fehlgeschlagen.");
    } finally {
      setLoginLoading(false);
    }
  };

  if (!authReady) {
    return (
      <AppShell>
        <div className="h-full w-full" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="h-full w-full relative">
        <MainCard>
          <div className="grid h-full w-full min-h-0 grid-cols-[auto,1fr] grid-rows-[auto,1fr,auto]">
            <div className="col-start-1 row-span-3">
              <SideIcons activeId={activePage} onChange={setActivePage} />
            </div>
            <div className="col-start-2 row-start-2 min-h-0 pl-[24px] pr-[340px] pt-[24px]">
              <div className="h-full min-h-0 overflow-hidden">
                <div className="h-full min-h-0 overflow-auto pr-2">
                  {renderContent(
                    activePage,
                    setActivePage,
                    projectItems,
                    projectError,
                    modrinthProjects,
                    modrinthError,
                    user,
                    username,
                    userProjectIds,
                    showLoginForm,
                    setShowLoginForm,
                    handleLogin,
                    loginLoading,
                    loginError
                  )}
                </div>
              </div>
            </div>
          </div>
        </MainCard>
        <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-[#131419] border-t border-[rgba(255,255,255,0.06)] flex flex-col z-10">
          <div className="h-[20px]" />
          <div className="px-4 pt-0 pb-3">
            <h2 className="text-base font-semibold text-[rgba(255,255,255,0.92)]">News:</h2>
          </div>
          <div className="px-4 space-y-4 overflow-auto">
            {newsItems.map((item) => (
              <div
                key={item.title}
                className="w-full rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#13151A] overflow-hidden"
              >
                {item.cover?.url ? (
                  <div
                    className="h-[120px] w-full bg-[#0D0E12] bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.cover.url})` }}
                  />
                ) : (
                  <div className="h-[120px] w-full bg-[#0D0E12]" />
                )}
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold text-[rgba(255,255,255,0.92)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-[rgba(255,255,255,0.60)]">
                    {item.excerpt}
                  </p>
                </div>
              </div>
            ))}

            {!newsItems.length && !newsError && (
              <div className="text-xs text-[rgba(255,255,255,0.60)]">Loading...</div>
            )}
            {newsError && (
              <div className="text-xs text-[rgba(255,255,255,0.60)]">
                News could not be loaded.
              </div>
            )}
          </div>
          <div className="flex-1" />
          <div className="w-full h-[200px] bg-white rounded-t-lg" />
        </div>
      </div>
    </AppShell>
  );
}

function renderContent(
  page: string,
  onNavigate: (pageId: string) => void,
  projects: ProjectItem[],
  projectError: boolean,
  modrinthProjects: ModrinthProject[],
  modrinthError: boolean,
  user: User | null,
  username: string | null,
  userProjectIds: string[],
  showLoginForm: boolean,
  setShowLoginForm: (value: boolean) => void,
  onLogin: (email: string, password: string) => Promise<void>,
  loginLoading: boolean,
  loginError: string | null
) {
  const modrinthCards = modrinthProjects.map(toModrinthCard);
  const groupedModrinth = groupModrinthCards(modrinthCards);

  if (page === "home") {
    return (
      <>
        <p
          className="text-[28px] font-bold text-[rgba(255,255,255,0.92)]"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Willkommen zurück!
        </p>
        <h1 className="mt-[8px] text-[18px] font-semibold text-[#B0BAC5]">
          Meine Projekte
        </h1>
        <div className="mt-[16px] grid grid-cols-[repeat(auto-fit,minmax(30px,260px))] gap-[12px]">
          {projects
            .filter((item) => userProjectIds.includes(item.id))
            .map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-[18px] bg-[#24262C]"
              >
                {getModrinthProjectUrl(item) && (
                  <button
                    type="button"
                    onClick={() => openModrinth(getModrinthProjectUrl(item))}
                    className="absolute left-1/2 top-0 z-10 w-[210px] -translate-x-1/2 -translate-y-2 rounded-b-2xl rounded-t-none bg-[#16181c] px-4 py-2 shadow-lg opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100"
                    aria-label="Open on Modrinth"
                  >
                    <div className="flex items-center justify-center">
                      <img src={modrinthLogo} alt="Modrinth" className="h-7 w-auto" />
                    </div>
                  </button>
                )}

                {item.cover?.url ? (
                  <img
                    src={item.cover.url}
                    alt={`${item.title} hero`}
                    className="h-[180px] w-full bg-[#0D0E12] object-cover transition duration-200 group-hover:brightness-90"
                  />
                ) : (
                  <div className="h-[180px] w-full bg-[#0D0E12]" />
                )}
                <div className="px-[16px] pb-[18px] pt-[14px]">
                  <div className="flex items-center gap-[12px]">
                    {item.logoIcon?.url ? (
                      <img
                        src={item.logoIcon.url}
                        alt={`${item.title} logo`}
                        className="h-[48px] w-[48px] rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22] object-cover"
                      />
                    ) : (
                      <div className="h-[48px] w-[48px] rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22]" />
                    )}
                    <p className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-[12px] text-[12px] leading-[18px] text-[rgba(255,255,255,0.70)] max-h-[72px] overflow-hidden">
                    {item.description ?? fallbackProjectDescription}
                  </p>
                </div>
              </div>
            ))}
          {!userProjectIds.length && !projectError && (
            <div className="text-xs text-[rgba(255,255,255,0.60)]">
              Keine Projekte hinterlegt.
            </div>
          )}
        </div>
        <>
          <div className="mt-[45px]">
            <button
              type="button"
              onClick={() => onNavigate("explore")}
              className="group flex items-center gap-[8px] text-[18px] font-semibold text-[#B0BAC5] transition hover:text-[rgba(255,255,255,0.92)]"
            >
              Projekte erkunden
              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-[18px] transition-transform group-hover:translate-x-[4px] group-hover:text-[#2BFE71]"
              />
            </button>
          </div>
          <div className="mt-[16px] grid grid-cols-[repeat(auto-fit,minmax(30px,260px))] gap-[12px]">
            {projects.map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-[18px] bg-[#24262C]"
              >
                {getModrinthProjectUrl(item) && (
                  <button
                    type="button"
                    onClick={() => openModrinth(getModrinthProjectUrl(item))}
                    className="absolute left-1/2 top-0 z-10 w-[210px] -translate-x-1/2 -translate-y-2 rounded-b-2xl rounded-t-none bg-[#16181c] px-4 py-2 shadow-lg opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100"
                    aria-label="Open on Modrinth"
                  >
                    <div className="flex items-center justify-center">
                      <img src={modrinthLogo} alt="Modrinth" className="h-7 w-auto" />
                    </div>
                  </button>
                )}

                {item.cover?.url ? (
                  <img
                    src={item.cover.url}
                    alt={`${item.title} hero`}
                    className="h-[180px] w-full bg-[#0D0E12] object-cover transition duration-200 group-hover:brightness-90"
                  />
                ) : (
                  <div className="h-[180px] w-full bg-[#0D0E12]" />
                )}
                <div className="px-[16px] pb-[18px] pt-[14px]">
                  <div className="flex items-center gap-[12px]">
                    {item.logoIcon?.url ? (
                      <img
                        src={item.logoIcon.url}
                        alt={`${item.title} logo`}
                        className="h-[48px] w-[48px] rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22] object-cover"
                      />
                    ) : (
                      <div className="h-[48px] w-[48px] rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22]" />
                    )}
                    <p className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-[12px] text-[12px] leading-[18px] text-[rgba(255,255,255,0.70)] max-h-[72px] overflow-hidden">
                    {item.description ?? fallbackProjectDescription}
                  </p>
                </div>
              </div>
            ))}
            {!projects.length && !projectError && (
              <div className="text-xs text-[rgba(255,255,255,0.60)]">Loading...</div>
            )}
            {projectError && (
              <div className="text-xs text-[rgba(255,255,255,0.60)]">
                Projekte konnten nicht geladen werden.
              </div>
            )}
          </div>
        </>
      </>
    );
  }

  if (page === "projects") {
    return (
      <>
        <h1 className="text-[20px] font-semibold text-[rgba(255,255,255,0.92)]">
          Projekte
        </h1>
        <p className="mt-[8px] text-[13px] text-[rgba(255,255,255,0.60)]">
          Projekte werden im Explore-Bereich dargestellt.
        </p>
      </>
    );
  }

  if (page === "explore") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="mt-[16px] flex-1 overflow-auto pr-2 [&::-webkit-scrollbar]:hidden">
          <div className="space-y-[26px]">
            {groupedModrinth.map((group) => (
              <div key={group.type} className="space-y-2">
                {group.label === "Mods" ? (
                  <button
                    type="button"
                    onClick={() => openModrinth("https://modrinth.com/organization/vision-projects/mods")}
                    className="group flex items-center gap-2 text-[17px] font-semibold text-[#A0BAC5] transition hover:text-white"
                  >
                    Mods erkunden
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="text-[15px] text-[#A0BAC5] transition group-hover:translate-x-[4px] group-hover:text-[#2BFE71]"
                    />
                  </button>
                ) : group.label === "Modpacks" ? (
                  <button
                    type="button"
                    onClick={() => openModrinth("https://modrinth.com/organization/vision-projects/modpacks")}
                    className="group flex items-center gap-2 text-[17px] font-semibold text-[#A0BAC5] transition hover:text-white"
                  >
                    Modpacks erkunden
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="text-[15px] text-[#A0BAC5] transition group-hover:translate-x-[4px] group-hover:text-[#2BFE71]"
                    />
                  </button>
                ) : group.label === "Resourcepacks" ? (
                  <button
                    type="button"
                    onClick={() => openModrinth("https://modrinth.com/organization/vision-projects/resourcepacks")}
                    className="group flex items-center gap-2 text-[17px] font-semibold text-[#A0BAC5] transition hover:text-white"
                  >
                    Resourcepacks erkunden
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="text-[15px] text-[#A0BAC5] transition group-hover:translate-x-[4px] group-hover:text-[#2BFE71]"
                    />
                  </button>
                ) : (
                  <h2 className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
                    {group.label}
                  </h2>
                )}
                <div className="mt-[10px] overflow-x-hidden pb-2 pr-1">
                  <div className="grid grid-flow-col auto-cols-[260px] gap-[12px]">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="group relative overflow-hidden rounded-[18px] bg-[#24262C]"
                      >
                        {item.url && (
                          <button
                            type="button"
                            onClick={() => openModrinth(item.url)}
                            className="absolute left-1/2 top-0 z-10 w-[210px] -translate-x-1/2 -translate-y-2 rounded-b-2xl rounded-t-none bg-[#16181c] px-4 py-2 shadow-lg opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100"
                            aria-label="Open on Modrinth"
                          >
                            <div className="flex items-center justify-center">
                              <img src={modrinthLogo} alt="Modrinth" className="h-7 w-auto" />
                            </div>
                          </button>
                        )}

                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={`${item.title} hero`}
                            className="h-[180px] w-full bg-[#0D0E12] object-cover transition duration-200 group-hover:brightness-90"
                          />
                        ) : (
                          <div className="h-[180px] w-full bg-[#0D0E12]" />
                        )}
                        <div className="px-[16px] pb-[18px] pt-[14px]">
                          <div className="flex items-center gap-[12px]">
                            {item.iconUrl ? (
                              <img
                                src={item.iconUrl}
                                alt={`${item.title} logo`}
                                className="h-[48px] w-[48px] rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22] object-cover"
                              />
                            ) : (
                              <div className="h-[48px] w-[48px] rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22]" />
                            )}
                            <p className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
                              {item.title}
                            </p>
                          </div>
                          <p className="mt-[12px] text-[12px] leading-[18px] text-[rgba(255,255,255,0.70)] max-h-[72px] overflow-hidden">
                            {item.description ?? fallbackProjectDescription}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {!modrinthCards.length && !modrinthError && (
              <div className="text-xs text-[rgba(255,255,255,0.60)]">Loading...</div>
            )}
            {modrinthError && (
              <div className="text-xs text-[rgba(255,255,255,0.60)]">
                Projekte konnten nicht geladen werden.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (page === "settings") {
    return (
      <>
        <h1 className="text-[20px] font-semibold text-[rgba(255,255,255,0.92)]">
          Einstellungen
        </h1>
        <p className="mt-[8px] text-[13px] text-[rgba(255,255,255,0.60)]">
          Einstellungen kommen spaeter.
        </p>
      </>
    );
  }

  if (page === "profile") {
    if (!user) {
      if (showLoginForm) {
        return (
          <LoginView onLogin={onLogin} loading={loginLoading} error={loginError} />
        );
      }

      return (
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#13151A] px-[16px] py-[14px]">
          <p className="text-[14px] font-semibold text-[rgba(255,255,255,0.92)]">
            Profil
          </p>
          <p className="mt-[6px] text-[12px] text-[rgba(255,255,255,0.60)]">
            Du bist noch nicht angemeldet.
          </p>
          <button
            type="button"
            onClick={() => setShowLoginForm(true)}
            className="mt-[12px] rounded-[10px] bg-[#2BFE71] px-[14px] py-[8px] text-[12px] font-semibold text-[#0D0E12]"
          >
            Anmelden
          </button>
        </div>
      );
    }

    return (
      <>
        <h1 className="text-[20px] font-semibold text-[rgba(255,255,255,0.92)]">
          Profil
        </h1>
        <p className="mt-[8px] text-[13px] text-[rgba(255,255,255,0.60)]">
          Username: {username ?? "Unbekannt"}
        </p>
      </>
    );
  }

  return null;
}

function isPage(route: string) {
  return ["home", "projects", "explore", "settings", "profile"].includes(route);
}
