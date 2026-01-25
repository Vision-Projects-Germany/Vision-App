import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
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
  srcModrinthTitle?: boolean;
  srcModrinthDescription?: boolean;
  srcModrinthLogo?: boolean;
  srcModrinthBanner?: boolean;
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

interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
}

interface ModrinthGalleryItem {
  url?: string;
  raw_url?: string;
  featured?: boolean;
}

interface MediaItem {
  id?: string;
  url?: string;
  thumbUrl?: string;
  width?: number;
  height?: number;
  type?: string;
  createdAt?: string;
  variants?: {
    originalUrl?: string;
    webpUrl?: string;
    thumbUrl?: string;
  };
}

interface HttpResponse {
  status: number;
  body: string;
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

let tauriDetection: Promise<boolean> | null = null;

async function isRunningInTauri() {
  if (!tauriDetection) {
    tauriDetection = Promise.resolve(isTauri());
  }
  return tauriDetection;
}

function createAbortError() {
  const error = new Error("AbortError");
  (error as Error & { name: string }).name = "AbortError";
  return error;
}

async function requestText(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  } = {}
) {
  if (options.signal?.aborted) {
    throw createAbortError();
  }

  if (await isRunningInTauri()) {
    const response = await invoke<HttpResponse>("http_request", {
      request: {
        method: (options.method ?? "GET") as
          | "GET"
          | "POST"
          | "PUT"
          | "PATCH"
          | "DELETE",
        url,
        headers: options.headers,
        body: options.body
      }
    });

    if (options.signal?.aborted) {
      throw createAbortError();
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(response.body || `HTTP ${response.status}`);
    }

    return response.body;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
    signal: options.signal
  });
  const text = await response.text();

  if (options.signal?.aborted) {
    throw createAbortError();
  }

  if (!response.ok) {
    throw new Error(text || `HTTP ${response.status}`);
  }

  return text;
}

async function requestJson<T>(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  } = {}
) {
  const text = await requestText(url, options);
  if (!text) {
    return null as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON response.");
  }
}

function getContributorIds() {
  const raw = (import.meta.env.VITE_PROJECT_CONTRIBUTORS_ID as string | undefined) ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isPage(route: string) {
  return [
    "home",
    "projects",
    "explore",
    "media",
    "settings",
    "profile",
    "editor",
    "analytics",
    "calendar",
    "admin"
  ].includes(route);
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

function parseCalendarDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function toCalendarEvents(items: unknown[]) {
  return items
    .map((item) => {
      const record = item as Record<string, unknown>;
      const title =
        (typeof record.title === "string" && record.title) ||
        (typeof record.name === "string" && record.name) ||
        "Termin";
      const date =
        parseCalendarDate(record.start) ??
        parseCalendarDate(record.startDate) ??
        parseCalendarDate(record.date);
      const id =
        (typeof record.id === "string" && record.id) ||
        (typeof record.uuid === "string" && record.uuid) ||
        `${title}-${record.start ?? record.date ?? Math.random()}`;
      if (!date) {
        return null;
      }
      return { id, title, startDate: date };
    })
    .filter((item): item is CalendarEvent => item !== null);
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
  return requestJson<ModrinthProject>(
    `https://api.modrinth.com/v2/project/${modrinthId}`,
    { signal }
  );
}

async function uploadMediaFile({
  file,
  token,
  endpoint
}: {
  file: File;
  token: string;
  endpoint: string;
}) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || "Upload fehlgeschlagen.");
  }

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  const id =
    (typeof data?.id === "string" && data.id) ||
    (typeof data?.mediaId === "string" && data.mediaId) ||
    (typeof data?.media?.id === "string" && data.media.id);

  if (!id) {
    throw new Error("Upload hat keine Media-ID geliefert.");
  }

  return id as string;
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
  const [newsReady, setNewsReady] = useState(false);
  const [projectsReady, setProjectsReady] = useState(false);
  const [bootDelayDone, setBootDelayDone] = useState(false);
  const [modrinthProjects, setModrinthProjects] = useState<ModrinthProject[]>([]);
  const [modrinthError, setModrinthError] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarError, setCalendarError] = useState(false);
  const [activePage, setActivePage] = useState("home");
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userProjectIds, setUserProjectIds] = useState<string[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [editorModal, setEditorModal] = useState<
    "project" | "news" | "event" | "member" | null
  >(
    null
  );
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] = useState("draft");
  const [projectModrinthId, setProjectModrinthId] = useState("");
  const [projectSource, setProjectSource] = useState<"manual" | "modrinth">("manual");
  const [projectLogoFile, setProjectLogoFile] = useState<File | null>(null);
  const [projectBannerFile, setProjectBannerFile] = useState<File | null>(null);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);
  const [projectSaveSuccess, setProjectSaveSuccess] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaHasMore, setMediaHasMore] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const canJoinSelectedProject = Boolean(
    user && selectedProject && !userProjectIds.includes(selectedProject.id)
  );
  const canLeaveSelectedProject = Boolean(
    user && selectedProject && userProjectIds.includes(selectedProject.id)
  );

  

  

  

  

  

  

  useEffect(() => {
    const timer = window.setTimeout(() => setBootDelayDone(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadNews = () => {
      requestJson<{ items?: NewsItem[] }>(
        "https://api.blizz-developments-official.de/api/news?page=1&limit=5",
        { signal: controller.signal }
      )
        .then((data) => {
          if (Array.isArray(data?.items)) {
            setNewsItems(data.items);
          } else {
            setNewsItems([]);
          }
          setNewsError(false);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setNewsError(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setNewsReady(true);
          }
        });
    };

    loadNews();
    const intervalId = window.setInterval(loadNews, 60000);

    return () => {
      window.clearInterval(intervalId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const CACHE_KEY = "vision.projects.cache.v3";
    // Drop older caches with wrong Modrinth flag handling
    localStorage.removeItem("vision.projects.cache");

    const loadProjects = async () => {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      let cachedItems: ProjectItem[] | null = null;
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw) as ProjectItem[];
          if (Array.isArray(parsed)) {
            cachedItems = parsed;
            if (!controller.signal.aborted) {
              setProjectItems(parsed);
            }
          }
        } catch {
          cachedItems = null;
        }
      }

      try {
        const data = await requestJson<{ items?: ProjectItem[] }>(
          "https://api.blizz-developments-official.de/api/projects?page=1&limit=6",
          { signal: controller.signal }
        );
        if (!Array.isArray(data?.items)) {
          setProjectItems([]);
          return;
        }

        const items = data.items as ProjectItem[];
        const enrichedItems = await Promise.all(
          items.map(async (item) => {
            const { modrinthId } = normalizeModrinthFields(item);
            if (!modrinthId) {
              return item;
            }

            try {
              const modrinth = await fetchModrinthProject(modrinthId, controller.signal);
              const coverUrl = getModrinthCover(modrinth);
              const fallbackCoverUrl = modrinth.icon_url ?? null;

              return {
                ...item,
                modrinthSlug:
                  modrinth.slug ??
                  item.modrinthSlug ??
                  (item as any).modrinth_slug ??
                  null,
                title: modrinth.title ?? item.title,
                description: modrinth.description ?? item.description,
                logoIcon: modrinth.icon_url ? { url: modrinth.icon_url } : item.logoIcon ?? null,
                cover: coverUrl
                  ? { url: coverUrl }
                  : fallbackCoverUrl
                    ? { url: fallbackCoverUrl }
                    : item.cover ?? null
              };
            } catch {
              return item;
            }
          })
        );

        if (!controller.signal.aborted) {
          setProjectItems(enrichedItems);
          setProjectError(false);
          localStorage.setItem(CACHE_KEY, JSON.stringify(enrichedItems));
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          if (cachedItems) {
            setProjectItems(cachedItems);
            setProjectError(false);
          } else {
            setProjectError(true);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setProjectsReady(true);
        }
      }
    };

    loadProjects();
    const intervalId = window.setInterval(loadProjects, 60000);

    return () => {
      window.clearInterval(intervalId);
      controller.abort();
    };
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
          const data = await requestJson<ModrinthProject[]>(
            `https://api.modrinth.com/v2/user/${contributorId}/projects`,
            { signal: controller.signal }
          );
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
      setUserRoles([]);
      return;
    }

    getDoc(doc(db, "users", user.uid))
      .then((snapshot) => {
        const value = snapshot.exists() ? snapshot.get("username") : null;
        setUsername(typeof value === "string" ? value : null);
        const projectsValue = snapshot.exists() ? snapshot.get("projects") : null;
        setUserProjectIds(Array.isArray(projectsValue) ? projectsValue : []);
        const rolesValue = snapshot.exists() ? snapshot.get("roles") : null;
        setUserRoles(Array.isArray(rolesValue) ? rolesValue : []);
      })
      .catch(() => {
        setUsername(null);
        setUserProjectIds([]);
      setUserRoles([]);
    });
  }, [user]);

  const fetchMediaPage = async (page: number, replace = false) => {
    const limit = 20;
    const controller = new AbortController();
    try {
      setMediaLoading(true);
      setMediaError(null);
      const data = await requestJson<{
        items?: MediaItem[];
        total?: number;
        page?: number;
        limit?: number;
      }>(`https://api.blizz-developments-official.de/api/media?page=${page}&limit=${limit}`, {
        signal: controller.signal
      });

      const items = Array.isArray(data?.items) ? data!.items! : [];
      if (replace) {
        setMediaItems(items);
      } else {
        setMediaItems((prev) => [...prev, ...items]);
      }

      const total = typeof data?.total === "number" ? data.total : null;
      const apiLimit = typeof data?.limit === "number" ? data.limit : limit;
      const hasMore =
        total !== null ? page * apiLimit < total : items.length >= apiLimit;
      setMediaHasMore(hasMore);
      setMediaPage(page);
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "AbortError") {
        setMediaError("Media konnten nicht geladen werden.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setMediaLoading(false);
      }
    }
  };

  useEffect(() => {
    if (activePage !== "media") {
      return;
    }

    setMediaItems([]);
    setMediaHasMore(true);
    setMediaPage(1);
    fetchMediaPage(1, true);
  }, [activePage]);

  useEffect(() => {
    const controller = new AbortController();
    const isAdmin = userRoles.includes("admin");

    if (!user || !isAdmin) {
      setCalendarEvents([]);
      setCalendarError(false);
      return () => controller.abort();
    }

    const loadCalendar = async () => {
      try {
        const token = await user.getIdToken();
        const now = new Date();
        const year = now.getFullYear();
        const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
        const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
        const params = new URLSearchParams({
          page: "1",
          limit: "20",
          start,
          end
        });
        const data = await requestJson<{ items?: unknown[] }>(
          `https://api.blizz-developments-official.de/api/calendar?${params.toString()}`,
          {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!controller.signal.aborted) {
          setCalendarEvents(toCalendarEvents(items));
          setCalendarError(false);
        }
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          setCalendarError(true);
        }
      }
    };

    loadCalendar();

    return () => controller.abort();
  }, [user, userRoles]);

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout fehlgeschlagen", error);
    }
  };

  const handleCreateProject = async () => {
    if (!user) {
      setProjectSaveError("Du musst eingeloggt sein.");
      return;
    }

    setProjectSaving(true);
    setProjectSaveError(null);
    setProjectSaveSuccess(false);

    try {
      const token = await user.getIdToken();
      const trimmedModrinthId = projectModrinthId.trim();
      const hasModrinth = projectSource === "modrinth" && Boolean(trimmedModrinthId);

      let logoMediaId: string | null = null;
      let bannerMediaId: string | null = null;

      if (projectLogoFile) {
        logoMediaId = await uploadMediaFile({
          file: projectLogoFile,
          token,
          endpoint: "https://api.blizz-developments-official.de/api/admin/media/logos"
        });
      }

      if (projectBannerFile) {
        bannerMediaId = await uploadMediaFile({
          file: projectBannerFile,
          token,
          endpoint: "https://api.blizz-developments-official.de/api/admin/media/banners"
        });
      }

      const payload: Record<string, unknown> = {
        title: projectTitle,
        slug: projectSlug,
        descriptionMarkdown: projectDescription,
        bannerMediaId,
        logoMediaId,
        links: [],
        status: projectStatus
      };

      if (hasModrinth) {
        payload.modrinthId = trimmedModrinthId;
      }

      await requestText(
        "https://api.blizz-developments-official.de/api/admin/projects",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      setProjectSaveSuccess(true);
    } catch (error) {
      setProjectSaveError(
        error instanceof Error ? error.message : "Projekt konnte nicht gespeichert werden."
      );
    } finally {
      setProjectSaving(false);
    }
  };

  const handleJoinProject = async (projectId: string) => {
    if (!user) {
      setShowLoginForm(true);
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        projects: arrayUnion(projectId)
      });
      setUserProjectIds((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
    } catch {
      return;
    }
  };

  const handleLeaveProject = async (projectId: string) => {
    if (!user) {
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        projects: arrayRemove(projectId)
      });
      setUserProjectIds((prev) => prev.filter((id) => id !== projectId));
    } catch {
      return;
    }
  };


  const isBootLoading = !authReady || !newsReady || !projectsReady || !bootDelayDone;

  if (isBootLoading) {
    return (
      <AppShell>
        <div className="flex h-full w-full items-center justify-center">
        <div className="loader" />
      </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="h-full w-full relative">
        <MainCard>
          <div className="grid h-full w-full min-h-0 grid-cols-[auto,1fr] grid-rows-[auto,1fr,auto]">
            <div className="col-start-1 row-span-3">
              <SideIcons activeId={activePage} onChange={setActivePage} isAdmin={userRoles.includes("admin")} />
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
                calendarEvents,
                calendarError,
                mediaItems,
                mediaLoading,
                mediaError,
                mediaPage,
                mediaHasMore,
                fetchMediaPage,
                user,
                username,
                userProjectIds,
                userRoles,
                showLoginForm,
                setShowLoginForm,
                handleLogin,
                loginLoading,
                loginError,
                setSelectedProject,
                setEditorModal,
                handleLogout
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
        {selectedProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-[720px] overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.12)] bg-[#24262C] shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
              {selectedProject.cover?.url ? (
                <img
                  src={selectedProject.cover.url}
                  alt={`${selectedProject.title} hero`}
                  className="h-[260px] w-full bg-[#0D0E12] object-cover"
                />
              ) : (
                <div className="h-[260px] w-full bg-[#0D0E12]" />
              )}
              <div className="px-5 pb-5 pt-4">
                <div className="flex items-center gap-3">
                  {selectedProject.logoIcon?.url ? (
                    <img
                      src={selectedProject.logoIcon.url}
                      alt={`${selectedProject.title} logo`}
                      className="h-[52px] w-[52px] rounded-[12px] border border-[rgba(255,255,255,0.20)] bg-[#1B1D22] object-cover"
                    />
                  ) : (
                    <div className="h-[52px] w-[52px] rounded-[12px] border border-[rgba(255,255,255,0.20)] bg-[#1B1D22]" />
                  )}
                  <p className="text-[18px] font-semibold text-[rgba(255,255,255,0.95)]">
                    {selectedProject.title}
                  </p>
                </div>
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                    Beschreibung
                  </p>
                  <p className="mt-2 text-[13px] leading-[20px] text-[rgba(255,255,255,0.75)]">
                    {selectedProject.description ?? fallbackProjectDescription}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-end gap-3">
                  {canJoinSelectedProject && (
                    <button
                      type="button"
                      onClick={() => handleJoinProject(selectedProject.id)}
                      className="rounded-[10px] bg-[#2BFE71] px-4 py-2 text-[13px] font-semibold text-[#0D0E12] transition hover:brightness-95"
                    >
                      Beitreten
                    </button>
                  )}
                  {canLeaveSelectedProject && (
                    <button
                      type="button"
                      onClick={() => handleLeaveProject(selectedProject.id)}
                      className="rounded-[10px] bg-[#E24C4C] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#F06060]"
                    >
                      Verlassen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedProject(null)}
                    className="rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[#16181c] px-4 py-2 text-[13px] font-semibold text-[rgba(255,255,255,0.92)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
                  >
                    Schliessen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {editorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className={`w-full rounded-[20px] border border-[rgba(255,255,255,0.12)] bg-[#0F1116] p-6 shadow-[0_40px_80px_rgba(0,0,0,0.55)] ${editorModal === "project" ? "max-w-4xl" : "max-w-2xl"}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-[rgba(255,255,255,0.92)]">
                  {editorModal === "project" && "Neues Projekt erstellen"}
                  {editorModal === "news" && "News erstellen"}
                  {editorModal === "event" && "Kalender-Event anlegen"}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditorModal(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.70)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
                  aria-label="Modal schliessen"
                >
                  <i className="fa-solid fa-xmark text-[12px]" aria-hidden="true" />
                </button>
              </div>

              {editorModal === "project" && (
                <div className="mt-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.55)]">
                      Quelle
                    </p>
                    <div className="flex overflow-hidden rounded-full border border-[rgba(255,255,255,0.12)] bg-[#0F1116]">
                      <button
                        type="button"
                        onClick={() => {
                          setProjectSource("manual");
                          setProjectModrinthId("");
                        }}
                        className={`px-4 py-2 text-[12px] font-semibold transition ${
                          projectSource === "manual"
                            ? "bg-[#2BFE71] text-[#0D0E12]"
                            : "text-[rgba(255,255,255,0.70)] hover:text-white"
                        }`}
                      >
                        Manuell
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectSource("modrinth")}
                        className={`px-4 py-2 text-[12px] font-semibold transition ${
                          projectSource === "modrinth"
                            ? "bg-[#2BFE71] text-[#0D0E12]"
                            : "text-[rgba(255,255,255,0.70)] hover:text-white"
                        }`}
                      >
                        Modrinth
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                        <i className="fa-solid fa-pen-to-square text-[13px] text-[#2BFE71]" aria-hidden="true" />
                        Name
                      </label>
                      <input
                        type="text"
                        placeholder="Projektname"
                        value={projectTitle}
                        onChange={(event) => setProjectTitle(event.target.value)}
                        className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                        <i className="fa-solid fa-link text-[13px] text-[#2BFE71]" aria-hidden="true" />
                        Slug
                      </label>
                      <input
                        type="text"
                        placeholder="mein-projekt"
                        value={projectSlug}
                        onChange={(event) => setProjectSlug(event.target.value)}
                        className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                        <i className="fa-solid fa-align-left text-[13px] text-[#2BFE71]" aria-hidden="true" />
                        Beschreibung
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Kurze Projektbeschreibung"
                        value={projectDescription}
                        onChange={(event) => setProjectDescription(event.target.value)}
                        className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                        <i className="fa-solid fa-image text-[13px] text-[#2BFE71]" aria-hidden="true" />
                        Logo (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setProjectLogoFile(event.target.files?.[0] ?? null)
                        }
                        className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-[rgba(255,255,255,0.75)] file:mr-3 file:rounded-full file:border-0 file:bg-[#1B2A22] file:px-3 file:py-1 file:text-[12px] file:text-[#2BFE71]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                        <i className="fa-solid fa-image text-[13px] text-[#2BFE71]" aria-hidden="true" />
                        Banner (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setProjectBannerFile(event.target.files?.[0] ?? null)
                        }
                        className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-[rgba(255,255,255,0.75)] file:mr-3 file:rounded-full file:border-0 file:bg-[#1B2A22] file:px-3 file:py-1 file:text-[12px] file:text-[#2BFE71]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                        <i className="fa-solid fa-flag text-[13px] text-[#2BFE71]" aria-hidden="true" />
                        Status
                      </label>
                      <select
                        value={projectStatus}
                        onChange={(event) => setProjectStatus(event.target.value)}
                        className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                      >
                        <option value="draft">draft</option>
                        <option value="published">published</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                        <i className="fa-solid fa-cloud-arrow-up text-[13px] text-[#2BFE71]" aria-hidden="true" />
                        Modrinth ID {projectSource === "modrinth" ? "(pflicht)" : "(optional)"}
                      </label>
                      <input
                        type="text"
                        placeholder="Modrinth Project ID"
                        value={projectModrinthId}
                        onChange={(event) => setProjectModrinthId(event.target.value)}
                        className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                      />
                      <p className="text-[11px] text-[rgba(255,255,255,0.55)]">
                        Wenn Modrinth aktiv ist, werden Titel, Beschreibung, Logo und Banner automatisch ersetzt.
                      </p>
                    </div>
                    <div className="md:col-span-2 mt-2 flex items-center justify-between">
                      <div className="text-[12px] text-[rgba(255,255,255,0.65)]">
                        {projectSaveError && (
                          <span className="text-[rgba(255,100,100,0.85)]">
                            {projectSaveError}
                          </span>
                        )}
                        {projectSaveSuccess && !projectSaveError && (
                          <span className="text-[#2BFE71]">Projekt gespeichert.</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateProject}
                        disabled={projectSaving || (projectSource === "modrinth" && !projectModrinthId.trim())}
                        className="rounded-full bg-[#2BFE71] px-4 py-2 text-[12px] font-semibold text-[#0D0E12] disabled:opacity-60"
                      >
                        {projectSaving ? "Speichern..." : "Projekt speichern"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

{editorModal === "news" && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Titel
                    </label>
                    <input
                      type="text"
                      placeholder="News-Titel"
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Kurztext
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Kurzer Teaser"
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Cover-Bild
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-[rgba(255,255,255,0.75)] file:mr-3 file:rounded-full file:border-0 file:bg-[#1B2A22] file:px-3 file:py-1 file:text-[12px] file:text-[#2BFE71]"
                    />
                  </div>
                  <div className="md:col-span-2 mt-2">
                    <button
                      type="button"
                      className="rounded-full bg-[#2BFE71] px-4 py-2 text-[12px] font-semibold text-[#0D0E12]"
                    >
                      News speichern
                    </button>
                  </div>
                </div>
              )}

              {editorModal === "event" && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Titel
                    </label>
                    <input
                      type="text"
                      placeholder="Eventtitel"
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Datum
                    </label>
                    <input
                      type="date"
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Notizen
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Optional: Beschreibung"
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                    />
                  </div>
                  <div className="md:col-span-2 mt-2">
                    <button
                      type="button"
                      className="rounded-full bg-[#2BFE71] px-4 py-2 text-[12px] font-semibold text-[#0D0E12]"
                    >
                      Event speichern
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
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
  calendarEvents: CalendarEvent[],
  calendarError: boolean,
  mediaItems: MediaItem[],
  mediaLoading: boolean,
  mediaError: string | null,
  mediaPage: number,
  mediaHasMore: boolean,
  fetchMediaPage: (page: number, replace?: boolean) => void,
  user: User | null,
  username: string | null,
  userProjectIds: string[],
  userRoles: string[],
  showLoginForm: boolean,
  setShowLoginForm: (value: boolean) => void,
  onLogin: (email: string, password: string) => Promise<void>,
  loginLoading: boolean,
  loginError: string | null,
  onSelectProject: (project: ProjectItem | null) => void,
  setEditorModal: (value: "project" | "news" | "event" | "member" | null) => void,
  onLogout: () => Promise<void>
) {
  const modrinthCards = modrinthProjects.map(toModrinthCard);
  const groupedModrinth = groupModrinthCards(modrinthCards);
  const isAdmin = userRoles.includes("admin");
  const myProjects = projects.filter((item) => userProjectIds.includes(item.id));

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
        <div className="mt-[16px] flex flex-wrap items-start gap-[12px]">
          {myProjects.map((item) => (
            <button
              type="button"
              key={item.title}
              onClick={() => onSelectProject(item)}
              className="group relative flex h-full w-[260px] flex-col rounded-[18px] p-[3px] text-left transition-[width] duration-300 delay-0 group-hover:w-[520px] group-hover:delay-[5000ms]"
            >
              <span
                aria-hidden="true"
                className="rainbow-draw pointer-events-none absolute inset-0 rounded-[18px] blur-[2px]"
              />
              <div className="relative z-10 flex h-full w-full overflow-hidden rounded-[15px] bg-[#24262C]">
                <div className="flex w-[260px] shrink-0 flex-col">
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
                <div className="w-[260px] border-l border-[rgba(255,255,255,0.08)] px-[14px] py-[14px] opacity-0 transition-opacity duration-300 delay-0 group-hover:opacity-100 group-hover:delay-[5000ms]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                    Details
                  </p>
                  <p className="mt-2 text-[13px] font-semibold text-[rgba(255,255,255,0.92)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[11px] text-[rgba(255,255,255,0.6)]">
                    ID: {item.id}
                  </p>
                  {item.slug && (
                    <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.6)]">
                      Slug: {item.slug}
                    </p>
                  )}
                  <p className="mt-3 text-[12px] leading-[18px] text-[rgba(255,255,255,0.7)]">
                    {item.description ?? fallbackProjectDescription}
                  </p>
                </div>
              </div>
            </button>
          ))}
          {!myProjects.length && !projectError && (
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
          <div className="mt-[16px] flex flex-wrap items-start gap-[12px]">
            {projects.map((item) => (
              <button
                type="button"
                key={item.title}
                onClick={() => onSelectProject(item)}
                className="group relative flex h-full w-[260px] flex-col rounded-[18px] p-[3px] text-left transition-[width] duration-300 delay-0 group-hover:w-[520px] group-hover:delay-[5000ms]"
              >
                <span
                  aria-hidden="true"
                  className="rainbow-draw pointer-events-none absolute inset-0 rounded-[18px] blur-[2px]"
                />
                <div className="relative z-10 flex h-full w-full overflow-hidden rounded-[15px] bg-[#24262C]">
                  <div className="flex w-[260px] shrink-0 flex-col">
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
                  <div className="w-[260px] border-l border-[rgba(255,255,255,0.08)] px-[14px] py-[14px] opacity-0 transition-opacity duration-300 delay-0 group-hover:opacity-100 group-hover:delay-[5000ms]">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Details
                    </p>
                    <p className="mt-2 text-[13px] font-semibold text-[rgba(255,255,255,0.92)]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-[11px] text-[rgba(255,255,255,0.6)]">
                      ID: {item.id}
                    </p>
                    {item.slug && (
                      <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.6)]">
                        Slug: {item.slug}
                      </p>
                    )}
                    <p className="mt-3 text-[12px] leading-[18px] text-[rgba(255,255,255,0.7)]">
                      {item.description ?? fallbackProjectDescription}
                    </p>
                  </div>
                </div>
              </button>
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
    if (!isAdmin) {
      return (
        <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
          Keine Berechtigung.
        </p>
      );
    }
    return (
      <div className="space-y-8">
        {/* Header mit Zurück-Button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate("editor")}
            className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.12)] bg-[#16181c] px-4 py-3 text-[14px] font-semibold text-[rgba(255,255,255,0.70)] transition hover:border-[#2BFE71] hover:bg-[rgba(43,254,113,0.1)] hover:text-[#2BFE71]"
            aria-label="Zurück"
          >
            <i className="fa-solid fa-arrow-left text-[14px]" aria-hidden="true" />
            Zurück
          </button>
          <button
            type="button"
            onClick={() => setEditorModal("project")}
            className="flex items-center gap-2 rounded-[12px] bg-[#2BFE71] px-6 py-3 text-[14px] font-semibold text-[#0D0E12] transition hover:bg-[#25e565]"
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Neues Projekt
          </button>
        </div>

        {/* Projektliste */}
        <div>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] mb-6">
                <i className="fa-solid fa-folder-open text-[40px] text-[rgba(255,255,255,0.3)]" aria-hidden="true" />
              </div>
              <h3 className="text-[18px] font-semibold text-[rgba(255,255,255,0.85)]">
                Noch keine Projekte
              </h3>
              <p className="mt-2 text-[14px] text-[rgba(255,255,255,0.55)] max-w-md">
                Erstelle dein erstes Projekt, um loszulegen
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project: ProjectItem) => (
                <div
                  key={project.id}
                  className="group relative overflow-hidden rounded-[20px] p-[3px]"
                >
                  <span
                    aria-hidden="true"
                    className="rainbow-draw pointer-events-none absolute inset-0 rounded-[20px] blur-[2px]"
                  />
                  <div className="relative z-10 overflow-hidden rounded-[17px] bg-[#24262C] transition hover:shadow-[0_0_30px_rgba(43,254,113,0.15)]">
                    {/* Cover Image */}
                    {project.cover?.url ? (
                      <div className="relative h-48 w-full overflow-hidden">
                        <img
                          src={project.cover.url}
                          alt={project.title}
                          className="h-full w-full bg-[#0D0E12] object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#24262C] via-transparent to-transparent opacity-60" />
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-[#0D0E12] flex items-center justify-center">
                        <i className="fa-solid fa-image text-[48px] text-[rgba(255,255,255,0.15)]" aria-hidden="true" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      <h4 className="text-[16px] font-bold text-[rgba(255,255,255,0.95)] truncate">
                        {project.title}
                      </h4>
                      <p className="mt-2 text-[13px] leading-relaxed text-[rgba(255,255,255,0.60)] line-clamp-2 min-h-[40px]">
                        {project.description || "Keine Beschreibung vorhanden"}
                      </p>

                      {/* Action Buttons */}
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-[10px] bg-[rgba(43,254,113,0.15)] px-4 py-2.5 text-[12px] font-semibold text-[#2BFE71] transition hover:bg-[rgba(43,254,113,0.25)]"
                        >
                          <i className="fa-solid fa-pen-to-square mr-2" aria-hidden="true" />
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          className="rounded-[10px] border border-[rgba(255,100,100,0.3)] px-4 py-2.5 text-[12px] font-semibold text-[rgba(255,100,100,0.85)] transition hover:bg-[rgba(255,100,100,0.15)]"
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute right-4 top-4">
                      <div className="rounded-full bg-[rgba(43,254,113,0.2)] border border-[rgba(43,254,113,0.3)] px-3 py-1 text-[11px] font-semibold text-[#2BFE71] backdrop-blur-sm">
                        Aktiv
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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

  if (page === "editor") {
    if (!isAdmin) {
      return (
        <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
          Keine Berechtigung.
        </p>
      );
    }
    return (
      <div className="space-y-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Projekte Button - Grün */}
          <button
            type="button"
            onClick={() => onNavigate("projects")}
            className="group relative flex flex-col items-center justify-center rounded-[24px] p-[3px] transition-all"
          >
            <span
              aria-hidden="true"
              className="rainbow-draw pointer-events-none absolute inset-0 rounded-[24px] blur-[2px]"
            />
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[21px] bg-[#24262C] p-12">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[rgba(43,254,113,0.2)] text-[#2BFE71] transition-all">
                <i className="fa-solid fa-folder-plus text-[56px]" aria-hidden="true" />
              </div>
              <h3 className="mt-8 text-[24px] font-bold text-[rgba(255,255,255,0.92)]">
                Projekte
              </h3>
              <p className="mt-3 text-center text-[15px] text-[rgba(255,255,255,0.65)]">
                Erstelle und verwalte deine Projekte
              </p>
            </div>
          </button>

          {/* News Button - Blau */}
          <button
            type="button"
            onClick={() => setEditorModal("news")}
            className="group relative flex flex-col items-center justify-center rounded-[24px] p-[3px] transition-all"
          >
            <span
              aria-hidden="true"
              className="rainbow-draw pointer-events-none absolute inset-0 rounded-[24px] blur-[2px]"
            />
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[21px] bg-[#24262C] p-12">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[rgba(43,217,255,0.2)] text-[#2BD9FF] transition-all">
                <i className="fa-solid fa-newspaper text-[56px]" aria-hidden="true" />
              </div>
              <h3 className="mt-8 text-[24px] font-bold text-[rgba(255,255,255,0.92)]">
                News
              </h3>
              <p className="mt-3 text-center text-[15px] text-[rgba(255,255,255,0.65)]">
                Erstelle neue Nachrichten und Updates
              </p>
            </div>
          </button>

          {/* Kalender Events Button - Lila */}
          <button
            type="button"
            onClick={() => setEditorModal("event")}
            className="group relative flex flex-col items-center justify-center rounded-[24px] p-[3px] transition-all"
          >
            <span
              aria-hidden="true"
              className="rainbow-draw pointer-events-none absolute inset-0 rounded-[24px] blur-[2px]"
            />
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[21px] bg-[#24262C] p-12">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[rgba(138,91,255,0.2)] text-[#8A5BFF] transition-all">
                <i className="fa-solid fa-calendar-plus text-[56px]" aria-hidden="true" />
              </div>
              <h3 className="mt-8 text-[24px] font-bold text-[rgba(255,255,255,0.92)]">
                Kalender Events
              </h3>
              <p className="mt-3 text-center text-[15px] text-[rgba(255,255,255,0.65)]">
                Plane und erstelle neue Kalender-Events
              </p>
            </div>
          </button>

          {/* Media Button - Cyan */}
          <button
            type="button"
            onClick={() => onNavigate("media")}
            className="group relative flex flex-col items-center justify-center rounded-[24px] p-[3px] transition-all"
          >
            <span
              aria-hidden="true"
              className="rainbow-draw pointer-events-none absolute inset-0 rounded-[24px] blur-[2px]"
            />
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[21px] bg-[#24262C] p-12">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[rgba(45,212,255,0.2)] text-[#2DD4FF] transition-all">
                <i className="fa-solid fa-photo-film text-[56px]" aria-hidden="true" />
              </div>
              <h3 className="mt-8 text-[24px] font-bold text-[rgba(255,255,255,0.92)]">
                Media
              </h3>
              <p className="mt-3 text-center text-[15px] text-[rgba(255,255,255,0.65)]">
                Lade Banner und Logos hoch
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (page === "media") {
    if (!isAdmin) {
      return (
        <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
          Keine Berechtigung.
        </p>
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate("editor")}
            className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.12)] bg-[#16181c] px-4 py-3 text-[14px] font-semibold text-[rgba(255,255,255,0.70)] transition hover:border-[#2BFE71] hover:bg-[rgba(43,254,113,0.1)] hover:text-[#2BFE71]"
            aria-label="Zurueck"
          >
            <i className="fa-solid fa-arrow-left text-[14px]" aria-hidden="true" />
            Zurueck
          </button>
          <button
            type="button"
            onClick={() => fetchMediaPage(1, true)}
            className="rounded-full border border-[rgba(255,255,255,0.14)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
          >
            Neu laden
          </button>
        </div>

        {mediaError && (
          <div className="rounded-[12px] border border-[rgba(255,100,100,0.25)] bg-[rgba(255,100,100,0.08)] px-4 py-3 text-[12px] text-[rgba(255,255,255,0.75)]">
            {mediaError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mediaItems.map((item, index) => {
            const preview =
              item.variants?.thumbUrl ??
              item.variants?.webpUrl ??
              item.variants?.originalUrl ??
              item.thumbUrl ??
              item.url ??
              null;
            const id = item.id ?? `media-${index}`;
            return (
              <div
                key={id}
                className="overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#101218]"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt={item.id ?? "Media"}
                    className="h-[160px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[160px] w-full items-center justify-center text-[12px] text-[rgba(255,255,255,0.35)]">
                    Kein Preview
                  </div>
                )}
                <div className="px-3 py-3">
                  <p className="text-[12px] font-semibold text-[rgba(255,255,255,0.85)]">
                    {item.id ?? "Unbekannt"}
                  </p>
                  <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.45)]">
                    {item.width && item.height
                      ? `${item.width}x${item.height}`
                      : "Unbekannte Groesse"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {!mediaItems.length && !mediaLoading && !mediaError && (
          <div className="text-[12px] text-[rgba(255,255,255,0.55)]">
            Keine Media-Dateien gefunden.
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-[rgba(255,255,255,0.45)]">
            {mediaLoading ? "Lade..." : mediaHasMore ? "Weitere verfuegbar" : "Alles geladen"}
          </div>
          <button
            type="button"
            onClick={() => fetchMediaPage(mediaPage + 1)}
            disabled={!mediaHasMore || mediaLoading}
            className="rounded-full border border-[rgba(255,255,255,0.14)] px-3 py-1 text-[11px] text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71] disabled:opacity-40"
          >
            Mehr laden
          </button>
        </div>
      </div>
    );
  }

  if (page === "analytics") {
    if (!isAdmin) {
      return (
        <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
          Keine Berechtigung.
        </p>
      );
    }
    return (
      <>
        <h1 className="text-[20px] font-semibold text-[rgba(255,255,255,0.92)]">
          Analytics
        </h1>
        <p className="mt-[8px] text-[13px] text-[rgba(255,255,255,0.60)]">
          Analytics-Dashboard kommt noch.
        </p>
      </>
    );
  }

  if (page === "calendar") {
    if (!isAdmin) {
      return (
        <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
          Keine Berechtigung.
        </p>
      );
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const monthStart = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfWeek = (monthStart.getDay() + 6) % 7;
    const leadingDays = Array.from({ length: dayOfWeek }, (_, index) => index);
    const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    const monthLabel = monthStart.toLocaleString("de-DE", {
      month: "long",
      year: "numeric"
    });
    const monthEvents = calendarEvents.filter(
      (event) => event.startDate.getFullYear() === year && event.startDate.getMonth() === month
    );
    const eventsByDay = monthEvents.reduce<Record<number, CalendarEvent[]>>((acc, event) => {
      const day = event.startDate.getDate();
      acc[day] = acc[day] ? [...acc[day], event] : [event];
      return acc;
    }, {});
    return (
      <>
        <h1 className="text-[20px] font-semibold text-[rgba(255,255,255,0.92)]">
          Kalender
        </h1>
        <p className="mt-[8px] text-[13px] text-[rgba(255,255,255,0.60)]">
          Events werden per API geladen.
        </p>
        <div className="mt-[16px] rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#13151A] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
                aria-label="Voriger Monat"
              >
                <i className="fa-solid fa-chevron-left text-[12px]" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
                aria-label="Naechster Monat"
              >
                <i className="fa-solid fa-chevron-right text-[12px]" aria-hidden="true" />
              </button>
              <p className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
                {monthLabel}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1 text-[12px] text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
            >
              Heute
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.40)]">
            <div className="py-2 text-center">Mo</div>
            <div className="py-2 text-center">Di</div>
            <div className="py-2 text-center">Mi</div>
            <div className="py-2 text-center">Do</div>
            <div className="py-2 text-center">Fr</div>
            <div className="py-2 text-center">Sa</div>
            <div className="py-2 text-center">So</div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-[12px] text-[rgba(255,255,255,0.70)]">
            {leadingDays.map((value) => (
              <div
                key={`pad-${value}`}
                className="h-[110px] rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[#0F1116] opacity-40"
              />
            ))}
            {days.map((day) => {
              const events = eventsByDay[day] ?? [];
              return (
                <div
                  key={day}
                  className="flex h-[110px] flex-col rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#101218] p-2 transition hover:border-[#2BFE71]/60"
                >
                  <div className="text-[12px] font-semibold text-[rgba(255,255,255,0.85)]">
                    {day}
                  </div>
                  {events.length ? (
                    <div className="mt-2 space-y-1">
                      {events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="rounded-md bg-[#1B2A22] px-2 py-1 text-[11px] text-[#2BFE71]"
                        >
                          {event.title}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-[10px] text-[rgba(255,255,255,0.50)]">
                          +{events.length - 2} mehr
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-[rgba(255,255,255,0.35)]">
                      Kein Termin
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {calendarError && (
            <div className="mt-3 text-[12px] text-[rgba(255,255,255,0.60)]">
              Kalender konnte nicht geladen werden.
            </div>
          )}
        </div>
      </>
    );
  }

  if (page === "admin") {
    if (!isAdmin) {
      return (
        <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
          Keine Berechtigung.
        </p>
      );
    }
    return (
      <div className="space-y-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Member Button - Orange */}
          <button
            type="button"
            onClick={() => setEditorModal("member")}
            className="group relative flex flex-col items-center justify-center rounded-[24px] p-[3px] transition-all"
          >
            <span
              aria-hidden="true"
              className="rainbow-draw pointer-events-none absolute inset-0 rounded-[24px] blur-[2px]"
            />
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[21px] bg-[#24262C] p-12">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[rgba(255,152,43,0.2)] text-[#FF982B] transition-all">
                <i className="fa-solid fa-users text-[56px]" aria-hidden="true" />
              </div>
              <h3 className="mt-8 text-[24px] font-bold text-[rgba(255,255,255,0.92)]">
                Member
              </h3>
              <p className="mt-3 text-center text-[15px] text-[rgba(255,255,255,0.65)]">
                Verwalte Team-Mitglieder und Rollen
              </p>
            </div>
          </button>
        </div>
      </div>
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
        <button
          type="button"
          onClick={onLogout}
          className="mt-[12px] rounded-full border border-[rgba(255,255,255,0.12)] bg-[#16181c] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.85)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
        >
          Abmelden
        </button>
      </>
    );
  }

  return null;
}
