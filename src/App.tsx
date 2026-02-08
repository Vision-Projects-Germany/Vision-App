import { useEffect, useState, type DragEvent } from "react";
import { useMemo, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import { AppShell } from "./components/AppShell";
import { MainCard } from "./components/MainCard";
import { SideIcons } from "./components/SideIcons";
import { LoginView } from "./components/LoginView";
import { auth, db } from "./firebase";
import clippyImage from "./assets/clippy/Clippy.png";

interface NewsItem {
  id: string;
  deleteId?: string;
  slug?: string;
  title: string;
  excerpt: string;
  cover: { url: string } | null;
}

interface ProjectItem {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  descriptionHtml?: string | null;
  descriptionMarkdown?: string | null;
  loader?: "Fabric" | "Forge" | "Vanilla" | string | null;
  version?: string | null;
  cover: { url: string } | null;
  banner?: { url: string } | null;
  logoIcon?: { url: string } | null;
  logo?: { url: string } | null;
  activityStatus?: "Ended" | "Coming Soon" | "Active" | "Starting shortly" | null;
  status?: string | null;
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
  loaders?: string[];
  game_versions?: string[];
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

interface MemberProfile {
  uid: string;
  username?: string | null;
  email?: string | null;
  roles?: string[];
  experience?: string | null;
  level?: number | null;
  minecraftName?: string | null;
  avatarMediaId?: string | null;
  avatarUrl?: string | null;
}

interface ModrinthGalleryItem {
  url?: string;
  raw_url?: string;
  featured?: boolean;
}

interface ModrinthVersion {
  id?: string;
  loaders?: string[];
  game_versions?: string[];
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

interface OAuthProviderConfig {
  client_id: string;
  client_secret?: string | null;
  authorization_endpoint: string;
  token_endpoint: string;
  redirect_uri: string;
  scopes: string[];
  extra_auth_params?: Record<string, string> | null;
  extra_token_params?: Record<string, string> | null;
}

interface OAuthPrepareLoginResponse {
  state: string;
  code_verifier: string;
  code_challenge: string;
  authorization_url: string;
}

interface OAuthAuthStatus {
  is_authenticated: boolean;
  expires_at?: number | null;
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

const MIN_MC_VERSION = "1.20";

const activityStatusLabels: Record<
  NonNullable<ProjectItem["activityStatus"]>,
  string
> = {
  "Starting shortly": "Starting shortly",
  "Coming Soon": "Coming Soon",
  Active: "Active",
  Ended: "Ended"
};

const activityStatusOrder: Record<string, number> = {
  Active: 0,
  "Coming Soon": 1,
  "Starting shortly": 2,
  Ended: 3
};

const MEDIA_SECTIONS = [
  {
    key: "logos",
    label: "Logos",
    endpoint: "https://api.blizz-developments-official.de/api/media/logos"
  },
  {
    key: "banners",
    label: "Banner",
    endpoint: "https://api.blizz-developments-official.de/api/media/banners"
  },
  {
    key: "news-banners",
    label: "News Banner",
    endpoint: "https://api.blizz-developments-official.de/api/media/news-banners"
  },
  {
    key: "avatars",
    label: "Avatars",
    endpoint: "https://api.blizz-developments-official.de/api/media/avatars"
  }
] as const;

const PROJECT_PERMISSIONS = [
  "projects.read",
  "projects.read.admin",
  "projects.create",
  "projects.edit",
  "projects.delete",
  "projects.publish",
  "projects.unpublish",
  "project.read",
  "project.view",
  "project.create",
  "project.edit",
  "project.delete",
  "project.join",
  "project.leave"
];
const MEDIA_PERMISSIONS = [
  "media.read.admin",
  "media.upload",
  "media.delete",
  "media.moderate"
];
const NEWS_PERMISSIONS = [
  "news.read",
  "news.create",
  "news.edit",
  "news.delete",
  "news.publish",
  "news.unpublish"
];
const CALENDAR_PERMISSIONS = [
  "calendar.read",
  "calendar.read.admin",
  "calendar.create",
  "calendar.edit",
  "calendar.delete",
  "calendar.publish",
  "calendar.unpublish"
];
const MEMBER_PERMISSIONS = ["users.read.admin", "users.edit.admin"];
const ROLE_PERMISSIONS = ["users.roles.manage", "users.permissions.manage"];
const ADMIN_PERMISSIONS = [
  ...MEMBER_PERMISSIONS,
  ...ROLE_PERMISSIONS,
  "content.audit.read",
  "content.audit.write",
  "content.restore",
  "system.config.read",
  "system.config.write",
  "system.health.read",
  "system.logs.read",
  "system.logs.purge",
  "system.rate_limit.manage",
  "storage.cleanup",
  "storage.rebuild",
  "backups.create",
  "backups.restore",
  "exports.create",
  "exports.download"
];

type PermissionFlags = {
  canAccessProjects: boolean;
  canCreateProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canAccessMedia: boolean;
  canUploadMedia: boolean;
  canDeleteMedia: boolean;
  canAccessNews: boolean;
  canDeleteNews: boolean;
  canAccessCalendar: boolean;
  canAccessEditor: boolean;
  canAccessAnalytics: boolean;
  canAccessAdmin: boolean;
  canAccessMembers: boolean;
  canAccessRoles: boolean;
  canBanUsers: boolean;
  canWarnUsers: boolean;
  isModerator: boolean;
};

const buildPermissionFlags = (
  permissions: string[],
  roles: string[]
): PermissionFlags => {
  const permissionSet = new Set(permissions);
  const has = (perm: string) => permissionSet.has(perm);
  const hasAny = (perms: string[]) => perms.some((perm) => permissionSet.has(perm));
  const hasPrefix = (prefix: string) =>
    permissions.some((perm) => perm.startsWith(prefix));
  const hasAdminRole = roles.includes("admin");
  const hasModeratorRole = roles.includes("moderator");
  if (hasAdminRole) {
    return {
      canAccessProjects: true,
      canCreateProject: true,
      canEditProject: true,
      canDeleteProject: true,
      canAccessMedia: true,
      canUploadMedia: true,
      canDeleteMedia: true,
      canAccessNews: true,
      canDeleteNews: true,
      canAccessCalendar: true,
      canAccessEditor: true,
      canAccessAnalytics: true,
      canAccessAdmin: true,
      canAccessMembers: true,
      canAccessRoles: true,
      canBanUsers: true,
      canWarnUsers: true,
      isModerator: false
    };
  }
  const canAccessProjects =
    hasAny(PROJECT_PERMISSIONS) || hasPrefix("projects.") || hasPrefix("project.");
  const canCreateProject = has("projects.create") || has("project.create");
  const canEditProject = has("projects.edit") || has("project.edit");
  const canDeleteProject = has("projects.delete") || has("project.delete");
  const canAccessMedia = hasAny(MEDIA_PERMISSIONS) || hasPrefix("media.");
  const canUploadMedia = has("media.upload");
  const canDeleteMedia =
    has("media.delete") || has("media.moderate") || hasPrefix("media.delete");
  const canAccessNews = hasAny(NEWS_PERMISSIONS) || hasPrefix("news.");
  const canDeleteNews = has("news.delete");
  const canAccessCalendar =
    hasAny(CALENDAR_PERMISSIONS) || hasPrefix("calendar.");
  const canAccessEditor =
    canAccessProjects || canAccessMedia || canAccessNews || canAccessCalendar;
  const canAccessAnalytics = has("stats.read.admin");
  const canAccessMembers = hasAny(MEMBER_PERMISSIONS);
  const canAccessRoles = hasAdminRole && hasAny(ROLE_PERMISSIONS);
  const canAccessAdmin = hasAny(ADMIN_PERMISSIONS);
  const canBanUsers = has("users.ban");
  const canWarnUsers = has("users.warn");

  return {
    canAccessProjects,
    canCreateProject,
    canEditProject,
    canDeleteProject,
    canAccessMedia,
    canUploadMedia,
    canDeleteMedia,
    canAccessNews,
    canDeleteNews,
    canAccessCalendar,
    canAccessEditor,
    canAccessAnalytics,
    canAccessAdmin,
    canAccessMembers,
    canAccessRoles,
    canBanUsers,
    canWarnUsers,
    isModerator: hasModeratorRole
  };
};

const isPageAllowed = (pageId: string, flags: PermissionFlags) => {
  switch (pageId) {
    case "home":
    case "explore":
    case "settings":
    case "settings-debug":
    case "profile":
      return true;
    case "editor":
      return flags.canAccessEditor;
    case "projects":
      return flags.canAccessProjects;
    case "news":
      return flags.canAccessNews;
    case "media":
      return flags.canAccessMedia;
    case "analytics":
      return flags.canAccessAnalytics;
    case "calendar":
      return flags.canAccessCalendar;
    case "admin":
      return flags.canAccessAdmin || flags.isModerator;
    case "members":
      return flags.canAccessMembers || flags.isModerator;
    case "roles":
      return flags.canAccessRoles;
    default:
      return true;
  }
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
    "news",
    "explore",
    "media",
    "settings",
    "settings-debug",
    "profile",
    "editor",
    "analytics",
    "calendar",
    "admin",
    "roles",
    "members"
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

function normalizeProjectMedia(item: ProjectItem): ProjectItem {
  const rawDescription =
    item.description ??
    item.descriptionMarkdown ??
    // @ts-ignore backend may use snake case
    (item as any).description_markdown ??
    item.descriptionHtml ??
    // @ts-ignore backend may use snake case or different casing
    (item as any).description_html ??
    (item as any).descriptionHTML ??
    null;
  const coverFromBanner =
    item.cover ??
    item.banner ??
    // @ts-ignore backend may use snake case
    (item as any).banner ??
    null;
  const logoFromLogo =
    item.logoIcon ??
    item.logo ??
    // @ts-ignore backend may use snake case
    (item as any).logo ??
    null;
  return {
    ...item,
    description: rawDescription ?? item.description ?? null,
    cover: coverFromBanner,
    logoIcon: logoFromLogo
  };
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").trim();
}

function formatNewsDate(value?: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function refreshPageSoon(delayMs = 800) {
  if (typeof window === "undefined") {
    return;
  }
  window.setTimeout(() => {
    window.location.reload();
  }, delayMs);
}

function mapNewsItems(items: unknown[]) {
  return items
    .map((item) => {
      const raw = item as any;
      const deleteId =
        raw.id ??
        raw.newsId ??
        raw.uuid ??
        raw._id ??
        raw.slug ??
        null;
      return {
        ...raw,
        id: deleteId ?? `${raw.title ?? "news"}-${Math.random()}`,
        deleteId: deleteId ?? undefined,
        slug: typeof raw.slug === "string" ? raw.slug : undefined
      } as NewsItem;
    })
    .filter((item) => item.id);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

const AUTHZ_CACHE_KEY = "vision.authz.cache.v1";

function getProjectDescriptionText(item: ProjectItem) {
  const value =
    item.description ??
    item.descriptionMarkdown ??
    // @ts-ignore backend may use snake case
    (item as any).description_markdown ??
    item.descriptionHtml ??
    // @ts-ignore backend may use snake case or different casing
    (item as any).description_html ??
    (item as any).descriptionHTML ??
    null;
  if (!value) {
    return null;
  }
  return value.includes("<") ? stripHtml(value) : value;
}

function getActivityStatusBadge(status: ProjectItem["activityStatus"]) {
  if (!status) {
    return null;
  }
  const label = activityStatusLabels[status] ?? status;
  switch (status) {
    case "Active":
      return {
        label,
        className: "bg-[#2BFE71] text-[#0D0E12]"
      };
    case "Coming Soon":
      return {
        label,
        className: "bg-[#2BD9FF] text-[#0D0E12]"
      };
    case "Starting shortly":
      return {
        label,
        className: "bg-[#FFD166] text-[#0D0E12]"
      };
    case "Ended":
      return {
        label,
        className: "bg-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.85)]"
      };
    default:
      return { label, className: "border-[rgba(255,255,255,0.2)] text-white/70" };
  }
}

function getModrinthProjectLink(project: ModrinthProject) {
  const handle = project.slug ?? project.id ?? null;
  return handle ? `https://modrinth.com/project/${handle}` : null;
}

function getProjectModrinthLink(project: ProjectItem) {
  const handle =
    project.modrinthSlug ??
    project.modrinth_slug ??
    project.modrinthId ??
    project.modrinth_id ??
    null;
  return handle ? `https://modrinth.com/project/${handle}` : null;
}

function sortProjectsByActivity(items: ProjectItem[]) {
  return [...items].sort((a, b) => {
    const orderA = activityStatusOrder[a.activityStatus ?? ""] ?? 99;
    const orderB = activityStatusOrder[b.activityStatus ?? ""] ?? 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

function isTruthyFlag(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

function getOAuthProviderConfig(): OAuthProviderConfig {
  const authBase =
    (import.meta.env.VITE_AUTH_BASE_URL as string | undefined)?.trim() ||
    "https://api.blizz-developments-official.de";
  const clientId =
    (import.meta.env.VITE_OAUTH_CLIENT_ID as string | undefined)?.trim() || "vision-desktop";
  const redirectUri =
    (import.meta.env.VITE_OAUTH_REDIRECT_URI as string | undefined)?.trim() ||
    "vision://auth/callback";
  const scopesRaw =
    (import.meta.env.VITE_OAUTH_SCOPES as string | undefined)?.trim() ||
    "openid profile email offline_access";
  const scopes = scopesRaw
    .split(/[ ,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    client_id: clientId,
    authorization_endpoint: `${authBase.replace(/\/+$/, "")}/oauth/authorize`,
    token_endpoint: `${authBase.replace(/\/+$/, "")}/oauth/token`,
    redirect_uri: redirectUri,
    scopes
  };
}

function parseMcVersion(value: string) {
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [major, minor, patch = 0] = parts;
  return { major, minor, patch };
}

function isMcVersionAtLeast(value: string, min: string) {
  const parsed = parseMcVersion(value);
  const minParsed = parseMcVersion(min);
  if (!parsed || !minParsed) {
    return false;
  }
  if (parsed.major !== minParsed.major) {
    return parsed.major > minParsed.major;
  }
  if (parsed.minor !== minParsed.minor) {
    return parsed.minor > minParsed.minor;
  }
  return parsed.patch >= minParsed.patch;
}

function normalizeMediaId(value?: string | null) {
  if (!value) {
    return null;
  }
  let trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const urlMatch = trimmed.match(/\/media\/([^/]+)/i);
  if (urlMatch?.[1]) {
    trimmed = urlMatch[1];
  }
  trimmed = trimmed.replace(/\/thumb$/i, "");
  trimmed = trimmed.replace(/-original$/i, "");
  trimmed = trimmed.replace(/-thumb$/i, "");
  return trimmed || null;
}

function getAvatarThumbUrl(avatarMediaId?: string | null) {
  const normalized = normalizeMediaId(avatarMediaId);
  if (!normalized) {
    return null;
  }
  return `https://api.blizz-developments-official.de/media/${normalized}/thumb`;
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
    if (await isRunningInTauri()) {
      await openUrl(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
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

async function fetchModrinthVersions(modrinthId: string, signal: AbortSignal) {
  return requestJson<ModrinthVersion[]>(
    `https://api.modrinth.com/v2/project/${modrinthId}/version`,
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
  const [userProjectIds, setUserProjectIds] = useState<string[]>([]);
  const [userProfileData, setUserProfileData] = useState<Record<string, unknown> | null>(
    null
  );
  const [authzPermissions, setAuthzPermissions] = useState<string[]>([]);
  const [authzRoles, setAuthzRoles] = useState<string[]>([]);
  const [authzFetchLoading, setAuthzFetchLoading] = useState(false);
  const [authzFetchError, setAuthzFetchError] = useState<string | null>(null);
  const [redirectSeconds, setRedirectSeconds] = useState<number | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [oauthLoginLoading, setOauthLoginLoading] = useState(false);
  const [oauthAuthReady, setOauthAuthReady] = useState(false);
  const [oauthIsAuthenticated, setOauthIsAuthenticated] = useState(false);
  const [oauthExpiresAt, setOauthExpiresAt] = useState<number | null>(null);
  const [authzUid, setAuthzUid] = useState<string | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [editorModal, setEditorModal] = useState<
    "project" | "news" | "event" | "member" | "media" | null
  >(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectLoader, setProjectLoader] = useState<"" | "Fabric" | "Forge" | "Vanilla">(
    ""
  );
  const [projectVersion, setProjectVersion] = useState("");
  const [projectActivityStatus, setProjectActivityStatus] = useState<
    NonNullable<ProjectItem["activityStatus"]>
  >("Active");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectModrinthId, setProjectModrinthId] = useState("");
  const [projectSource, setProjectSource] = useState<"manual" | "modrinth">("manual");
  const [modrinthAutoLoading, setModrinthAutoLoading] = useState(false);
  const [modrinthAutoError, setModrinthAutoError] = useState<string | null>(null);
  const [projectLogoFile, setProjectLogoFile] = useState<File | null>(null);
  const [projectBannerFile, setProjectBannerFile] = useState<File | null>(null);
  const [projectLogoMediaId, setProjectLogoMediaId] = useState<string>("");
  const [projectBannerMediaId, setProjectBannerMediaId] = useState<string>("");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsExcerpt, setNewsExcerpt] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsTags, setNewsTags] = useState("");
  const [newsCoverMediaId, setNewsCoverMediaId] = useState("");
  const [newsCoverFile, setNewsCoverFile] = useState<File | null>(null);
  const [newsCoverUploading, setNewsCoverUploading] = useState(false);
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsSaveError, setNewsSaveError] = useState<string | null>(null);
  const [newsDeleteCandidate, setNewsDeleteCandidate] = useState<NewsItem | null>(null);
  const [newsDeleteError, setNewsDeleteError] = useState<string | null>(null);
  const [newsDeleting, setNewsDeleting] = useState(false);
  const [existingLogos, setExistingLogos] = useState<MediaItem[]>([]);
  const [existingBanners, setExistingBanners] = useState<MediaItem[]>([]);
  const [existingMediaLoading, setExistingMediaLoading] = useState(false);
  const [showExistingLogos, setShowExistingLogos] = useState(false);
  const [showExistingBanners, setShowExistingBanners] = useState(false);
  const [showExistingNewsBanners, setShowExistingNewsBanners] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);
  const [projectSaveSuccess, setProjectSaveSuccess] = useState(false);
  const [projectDeleteError, setProjectDeleteError] = useState<string | null>(null);
  const [projectDeleteCandidate, setProjectDeleteCandidate] = useState<ProjectItem | null>(
    null
  );
  const [mediaUploadFile, setMediaUploadFile] = useState<File | null>(null);
  const [mediaUploadType, setMediaUploadType] = useState<"logos" | "banners" | "avatars" | "news-banners">(
    "logos"
  );
  const [mediaUploadLoading, setMediaUploadLoading] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [mediaUploadSuccess, setMediaUploadSuccess] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<
    { id: string; section: string }[]
  >([]);
  const [mediaItems, setMediaItems] = useState<Record<string, MediaItem[]>>({
    logos: [],
    banners: [],
    "news-banners": [],
    avatars: []
  });
  const [mediaLoading, setMediaLoading] = useState<Record<string, boolean>>({
    logos: false,
    banners: false,
    "news-banners": false,
    avatars: false
  });
  const [mediaError, setMediaError] = useState<Record<string, string | null>>({
    logos: null,
    banners: null,
    "news-banners": null,
    avatars: null
  });
  const [mediaPage, setMediaPage] = useState<Record<string, number>>({
    logos: 1,
    banners: 1,
    "news-banners": 1,
    avatars: 1
  });
  const [mediaHasMore, setMediaHasMore] = useState<Record<string, boolean>>({
    logos: true,
    banners: true,
    "news-banners": true,
    avatars: true
  });
  const [mediaFilter, setMediaFilter] = useState<"all" | "logos" | "banners" | "news-banners" | "avatars">(
    "all"
  );
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [banCandidate, setBanCandidate] = useState<MemberProfile | null>(null);
  const [banReason, setBanReason] = useState("Spamming");
  const [banProgress, setBanProgress] = useState(0);
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);
  const banHoldIntervalRef = useRef<number | null>(null);
  const [warnCandidate, setWarnCandidate] = useState<MemberProfile | null>(null);
  const [warnMessage, setWarnMessage] = useState("Bitte keine Werbung im Chat.");
  const [warnProgress, setWarnProgress] = useState(0);
  const [warnSubmitting, setWarnSubmitting] = useState(false);
  const [warnError, setWarnError] = useState<string | null>(null);
  const warnHoldIntervalRef = useRef<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastProgress, setToastProgress] = useState(0);
  const toastTimerRef = useRef<number | null>(null);
  const toastIntervalRef = useRef<number | null>(null);
  const [mcVersions, setMcVersions] = useState<string[]>([]);
  const [mcVersionsLoading, setMcVersionsLoading] = useState(false);
  const [mcVersionsError, setMcVersionsError] = useState(false);
  const [showClippy, setShowClippy] = useState(false);
  const permissionFlags = useMemo(
    () => buildPermissionFlags(authzPermissions, authzRoles),
    [authzPermissions, authzRoles]
  );
  const visiblePages = useMemo(() => {
    const isModRole = authzRoles.includes("moderator") || authzRoles.includes("admin");
    const pages = ["home", "explore", "settings", "profile"];
    if (permissionFlags.canAccessEditor) {
      pages.push("editor");
    }
    if (permissionFlags.canAccessAnalytics) {
      pages.push("analytics");
    }
    if (permissionFlags.canAccessCalendar) {
      pages.push("calendar");
    }
    if (permissionFlags.canAccessAdmin || isModRole) {
      pages.push("admin");
    }
    return pages;
  }, [
    authzRoles,
    permissionFlags.canAccessAdmin,
    permissionFlags.canAccessAnalytics,
    permissionFlags.canAccessCalendar,
    permissionFlags.canAccessEditor
  ]);
  const userAvatarUrl = useMemo(() => {
    const record = userProfileData ?? {};
    const avatarMediaId =
      typeof (record as any).avatarMediaId === "string"
        ? (record as any).avatarMediaId
        : typeof (record as any).avatar_media_id === "string"
          ? (record as any).avatar_media_id
          : null;
    return getAvatarThumbUrl(avatarMediaId);
  }, [userProfileData]);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [projectParticipants, setProjectParticipants] = useState<MemberProfile[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const isSelectedProjectEnded =
    selectedProject?.activityStatus === "Ended";
  const canJoinSelectedProject = Boolean(
    user &&
      selectedProject &&
      !userProjectIds.includes(selectedProject.id) &&
      !isSelectedProjectEnded
  );
  const canLeaveSelectedProject = Boolean(
    user &&
      selectedProject &&
      userProjectIds.includes(selectedProject.id) &&
      !isSelectedProjectEnded
  );

  const handleMediaDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    setMediaUploadFile(file ?? null);
  };

  const normalizeModrinthLoader = (loader?: string | null) => {
    if (!loader) {
      return "";
    }
    const normalized = loader.toLowerCase();
    if (normalized === "fabric" || normalized === "quilt") {
      return "Fabric";
    }
    if (normalized === "forge" || normalized === "neoforge") {
      return "Forge";
    }
    if (normalized === "vanilla") {
      return "Vanilla";
    }
    return "";
  };

  useEffect(() => {
    if (!mediaUploadFile) {
      setMediaPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(mediaUploadFile);
    setMediaPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [mediaUploadFile]);

  useEffect(() => {
    const trimmed = projectModrinthId.trim();
    if (!trimmed || projectSource !== "modrinth") {
      setModrinthAutoError(null);
      setModrinthAutoLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setModrinthAutoLoading(true);
    setModrinthAutoError(null);
    Promise.all([
      fetchModrinthProject(trimmed, controller.signal),
      fetchModrinthVersions(trimmed, controller.signal)
    ])
      .then(([modrinth, versions]) => {
        if (!active) {
          return;
        }
        if (modrinth?.title) {
          setProjectTitle(modrinth.title);
        }
        if (modrinth?.description) {
          setProjectDescription(modrinth.description);
        }
        const latestVersion = Array.isArray(versions) ? versions[0] : null;
        const versionValue =
          latestVersion?.game_versions?.[0] ?? modrinth?.game_versions?.[0] ?? "";
        if (versionValue) {
          setProjectVersion(versionValue);
        }
        const loaderValue =
          latestVersion?.loaders?.[0] ?? modrinth?.loaders?.[0] ?? "";
        const normalizedLoader = normalizeModrinthLoader(loaderValue);
        if (normalizedLoader) {
          setProjectLoader(normalizedLoader as "Fabric" | "Forge" | "Vanilla");
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setModrinthAutoError("Modrinth konnte nicht geladen werden.");
      })
      .finally(() => {
        if (active) {
          setModrinthAutoLoading(false);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [projectModrinthId, projectSource]);

  useEffect(() => {
    let active = true;
    setMcVersionsLoading(true);
    setMcVersionsError(false);
    requestJson<{
      versions?: { id: string; type: string }[];
    }>("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json")
      .then((data) => {
        const versions = Array.isArray(data?.versions) ? data.versions : [];
        const latestReleases = versions
          .filter((version) => version.type === "release")
          .map((version) => version.id)
          .filter((version) => isMcVersionAtLeast(version, MIN_MC_VERSION));
        if (active) {
          setMcVersions(latestReleases);
          setMcVersionsError(latestReleases.length === 0);
        }
      })
      .catch(() => {
        if (active) {
          setMcVersionsError(true);
          setMcVersions([]);
        }
      })
      .finally(() => {
        if (active) {
          setMcVersionsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleMediaUpload = async () => {
    if (!user && !oauthIsAuthenticated) {
      setMediaUploadError("Bitte zuerst anmelden.");
      return;
    }
    if (!mediaUploadFile) {
      setMediaUploadError("Bitte eine Datei auswaehlen.");
      return;
    }
    setMediaUploadLoading(true);
    setMediaUploadError(null);
    setMediaUploadSuccess(false);
    try {
      const token = await getApiToken();
      const uploadEndpoint =
        mediaUploadType === "news-banners"
          ? "https://api.blizz-developments-official.de/api/admin/media/news-banners"
          : `https://api.blizz-developments-official.de/api/admin/media?category=${mediaUploadType}`;
      await uploadMediaFile({
        file: mediaUploadFile,
        token,
        endpoint: uploadEndpoint
      });
      setMediaUploadFile(null);
      setMediaPreviewUrl(null);
      setEditorModal(null);
      setMediaUploadSuccess(true);
      window.setTimeout(() => {
        setMediaUploadSuccess(false);
      }, 1600);
      fetchMediaPage(mediaUploadType, 1, true);
      showToast("Media erfolgreich hochgeladen.", "success");
      refreshPageSoon(900);
    } catch (error) {
      setMediaUploadError(
        error instanceof Error ? error.message : "Upload fehlgeschlagen."
      );
      showToast("Media-Upload fehlgeschlagen.", "error");
    } finally {
      setMediaUploadLoading(false);
    }
  };

  const handleCreateNews = async () => {
    if (!user && !oauthIsAuthenticated) {
      setNewsSaveError("Du musst eingeloggt sein.");
      return;
    }
    if (!newsTitle.trim() || !newsExcerpt.trim() || !newsContent.trim()) {
      setNewsSaveError("Titel, Kurztext und Inhalt sind erforderlich.");
      return;
    }

    setNewsSaving(true);
    setNewsSaveError(null);

    try {
      console.info("[news] create: start", {
        title: newsTitle,
        excerptLength: newsExcerpt.length,
        contentLength: newsContent.length,
        tags: newsTags,
        coverMediaId: newsCoverMediaId,
        hasCoverFile: Boolean(newsCoverFile)
      });
      const token = await getApiToken();
      let coverMediaId = newsCoverMediaId || undefined;

      if (newsCoverFile) {
        setNewsCoverUploading(true);
        const formData = new FormData();
        formData.append("file", newsCoverFile);
        const response = await fetch(
          "https://api.blizz-developments-official.de/api/admin/media/news-banners",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formData
          }
        );
        const text = await response.text();
        console.info("[news] cover upload response", {
          ok: response.ok,
          status: response.status,
          body: text
        });
        if (!response.ok) {
          throw new Error(text || "Cover-Upload fehlgeschlagen.");
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
          throw new Error("Cover-Upload hat keine Media-ID geliefert.");
        }
        coverMediaId = id as string;
        console.info("[news] cover upload resolved id", coverMediaId);
      }
      const payload: Record<string, unknown> = {
        title: newsTitle.trim(),
        excerpt: newsExcerpt.trim(),
        contentMarkdown: newsContent.trim(),
        coverMediaId,
        tags: newsTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        status: "published"
      };

      console.info("[news] create payload", payload);
      await requestText("https://api.blizz-developments-official.de/api/admin/news", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      setNewsTitle("");
      setNewsExcerpt("");
      setNewsContent("");
      setNewsTags("");
      setNewsCoverMediaId("");
      setNewsCoverFile(null);
      setShowExistingNewsBanners(false);
      setEditorModal(null);
      showToast("News erstellt.", "success");
      refreshPageSoon(900);
    } catch (error) {
      const message = error instanceof Error ? error.message : "News konnte nicht erstellt werden.";
      console.warn("[news] create failed", message, error);
      setNewsSaveError(message);
      showToast("News konnte nicht erstellt werden.", "error");
    } finally {
      setNewsSaving(false);
      setNewsCoverUploading(false);
    }
  };

  const reloadNewsItems = async (cacheBust = false) => {
    const url = cacheBust
      ? `https://api.blizz-developments-official.de/api/news?page=1&limit=5&_ts=${Date.now()}`
      : "https://api.blizz-developments-official.de/api/news?page=1&limit=5";
    const data = await requestJson<{ items?: NewsItem[] }>(url);
    if (Array.isArray(data?.items)) {
      setNewsItems(mapNewsItems(data.items));
      setNewsError(false);
    } else {
      setNewsItems([]);
    }
  };

  const requestDeleteNews = (item: NewsItem) => {
    if (!permissionFlags.canDeleteNews) {
      console.info("[news] delete blocked: missing permission", {
        canDeleteNews: permissionFlags.canDeleteNews,
        permissions: authzPermissions,
        roles: authzRoles
      });
      return;
    }
    console.info("[news] delete requested", item);
    setNewsDeleteCandidate(item);
    setNewsDeleteError(null);
  };

  const confirmDeleteNews = async () => {
    if (!newsDeleteCandidate || (!user && !oauthIsAuthenticated)) {
      return;
    }
    const deleteId = newsDeleteCandidate.deleteId ?? newsDeleteCandidate.slug ?? newsDeleteCandidate.id;
    if (!deleteId) {
      setNewsDeleteError("News-ID fehlt.");
      return;
    }
    console.info("[news] delete permission check", {
      canDeleteNews: permissionFlags.canDeleteNews,
      permissions: authzPermissions,
      roles: authzRoles
    });
    setNewsDeleting(true);
    setNewsDeleteError(null);
    try {
      console.info("[news] delete start", {
        id: newsDeleteCandidate.id,
        deleteId
      });
      const token = await getApiToken();
      let resolvedId: string | null = null;
      try {
        const adminList = await requestJson<{ items?: any[] }>(
          "https://api.blizz-developments-official.de/api/admin/news?page=1&limit=50",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const adminItems = Array.isArray(adminList?.items) ? adminList.items : [];
        const match = adminItems.find(
          (item) => item?.id === deleteId || item?.slug === deleteId
        );
        resolvedId = typeof match?.id === "string" ? match.id : null;
        console.info("[news] delete resolve", {
          deleteId,
          resolvedId,
          found: Boolean(resolvedId)
        });
      } catch (error) {
        console.warn("[news] delete resolve failed", error);
      }
      const finalId = resolvedId ?? (looksLikeUuid(deleteId) ? deleteId : null);
      if (!finalId) {
        throw new Error("News-ID konnte nicht aus dem Admin-Listing ermittelt werden.");
      }
      const response = await fetch(
        `https://api.blizz-developments-official.de/api/admin/news/${finalId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const responseText = await response.text();
      console.info("[news] delete response", {
        ok: response.ok,
        status: response.status,
        body: responseText
      });
      if (!response.ok) {
        throw new Error(responseText || `HTTP ${response.status}`);
      }
      setNewsItems((prev) =>
        prev.filter((item) => item.id !== newsDeleteCandidate.id)
      );
      setNewsDeleteCandidate(null);
      reloadNewsItems(true).catch(() => undefined);
      showToast("News geloescht.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "News konnte nicht geloescht werden.";
      console.warn("[news] delete failed", message, error);
      setNewsDeleteError(message);
      showToast("News konnte nicht geloescht werden.", "error");
    } finally {
      setNewsDeleting(false);
    }
  };

  const toggleMediaSelection = (section: string, id: string) => {
    setSelectedMediaIds((prev) => {
      const exists = prev.some((entry) => entry.id === id);
      if (exists) {
        return prev.filter((entry) => entry.id !== id);
      }
      return [...prev, { id, section }];
    });
  };

  const handleDeleteMedia = async (section: string, id: string) => {
    if (!user && !oauthIsAuthenticated) {
      setMediaError((prev) => ({ ...prev, [section]: "Bitte zuerst anmelden." }));
      return;
    }
    try {
      const token = await getApiToken();
      await requestText(
        `https://api.blizz-developments-official.de/api/admin/media/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMediaItems((prev) => ({
        ...prev,
        [section]: (prev[section] ?? []).filter((item) => item.id !== id)
      }));
      setSelectedMediaIds((prev) => prev.filter((entry) => entry.id !== id));
    } catch (error) {
      setMediaError((prev) => ({
        ...prev,
        [section]:
          error instanceof Error ? error.message : "Loeschen fehlgeschlagen."
      }));
    }
  };

  const handleDeleteSelectedMedia = async () => {
    if (!selectedMediaIds.length) {
      return;
    }
    const entries = [...selectedMediaIds];
    for (const entry of entries) {
      await handleDeleteMedia(entry.section, entry.id);
    }
  };

  const [authzTestLoading, setAuthzTestLoading] = useState(false);
  const [authzTestError, setAuthzTestError] = useState<string | null>(null);
  const [authzResult, setAuthzResult] = useState<string | null>(null);
  const [authzCopied, setAuthzCopied] = useState(false);

  const handleAuthzTest = async () => {
    if (!user && !oauthIsAuthenticated) {
      setAuthzTestError("Bitte zuerst anmelden.");
      return;
    }
    setAuthzTestLoading(true);
    setAuthzTestError(null);
    setAuthzResult(null);
    try {
      const token = await getApiToken();
      const response = await requestText(
        "https://api.blizz-developments-official.de/me/authz",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAuthzResult(response || "OK");
    } catch (error) {
      setAuthzTestError(
        error instanceof Error ? error.message : "Request fehlgeschlagen."
      );
    } finally {
      setAuthzTestLoading(false);
    }
  };

  const handleAuthzCopy = async () => {
    if (!authzResult) {
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(authzResult);
      }
      setAuthzCopied(true);
      window.setTimeout(() => setAuthzCopied(false), 1200);
    } catch {
      setAuthzCopied(false);
    }
  };

  const resetBanHold = () => {
    if (banHoldIntervalRef.current !== null) {
      window.clearInterval(banHoldIntervalRef.current);
      banHoldIntervalRef.current = null;
    }
    setBanProgress(0);
  };

  const resetWarnHold = () => {
    if (warnHoldIntervalRef.current !== null) {
      window.clearInterval(warnHoldIntervalRef.current);
      warnHoldIntervalRef.current = null;
    }
    setWarnProgress(0);
  };

  const showToast = (message: string, variant: "success" | "error" = "success") => {
    const duration = 4000;
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (toastIntervalRef.current !== null) {
      window.clearInterval(toastIntervalRef.current);
      toastIntervalRef.current = null;
    }
    setToastMessage(message);
    setToastVariant(variant);
    setToastVisible(true);
    setToastProgress(1);
    const start = Date.now();
    toastIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const next = Math.max(0, 1 - elapsed / duration);
      setToastProgress(next);
      if (next <= 0) {
        if (toastIntervalRef.current !== null) {
          window.clearInterval(toastIntervalRef.current);
          toastIntervalRef.current = null;
        }
      }
    }, 50);
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
      toastTimerRef.current = window.setTimeout(() => {
        setToastMessage(null);
      }, 400);
    }, duration);
  };

  const submitBan = async (member: MemberProfile, reason: string) => {
    if (!user && !oauthIsAuthenticated) {
      setBanError("Bitte zuerst anmelden.");
      return;
    }
    setBanSubmitting(true);
    setBanError(null);
    try {
      const token = await getApiToken();
      await requestText(
        `https://api.blizz-developments-official.de/api/admin/users/${member.uid}/ban`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ banned: true, reason })
        }
      );
      setBanCandidate(null);
      resetBanHold();
      showToast("Ban erfolgreich gesetzt.", "success");
    } catch (error) {
      setBanError(error instanceof Error ? error.message : "Ban fehlgeschlagen.");
      showToast("Ban fehlgeschlagen.", "error");
    } finally {
      setBanSubmitting(false);
    }
  };

  const submitWarn = async (member: MemberProfile, message: string) => {
    if (!user && !oauthIsAuthenticated) {
      setWarnError("Bitte zuerst anmelden.");
      return;
    }
    setWarnSubmitting(true);
    setWarnError(null);
    try {
      const token = await getApiToken();
      await requestText(
        `https://api.blizz-developments-official.de/api/admin/users/${member.uid}/warn`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ message })
        }
      );
      setWarnCandidate(null);
      resetWarnHold();
      showToast("Warnung gesendet.", "success");
    } catch (error) {
      setWarnError(error instanceof Error ? error.message : "Warnung fehlgeschlagen.");
      showToast("Warnung fehlgeschlagen.", "error");
    } finally {
      setWarnSubmitting(false);
    }
  };

  const startBanHold = (member: MemberProfile) => {
    if (banSubmitting) {
      return;
    }
    resetBanHold();
    const start = Date.now();
    const duration = 3000;
    banHoldIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const next = Math.min(1, elapsed / duration);
      setBanProgress(next);
      if (next >= 1) {
        resetBanHold();
        submitBan(member, banReason.trim() || "Spamming");
      }
    }, 50);
  };

  const startWarnHold = (member: MemberProfile) => {
    if (warnSubmitting) {
      return;
    }
    resetWarnHold();
    const start = Date.now();
    const duration = 3000;
    warnHoldIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const next = Math.min(1, elapsed / duration);
      setWarnProgress(next);
      if (next >= 1) {
        resetWarnHold();
        submitWarn(member, warnMessage.trim() || "Bitte keine Werbung im Chat.");
      }
    }, 50);
  };

  const openBanDialog = (member: MemberProfile) => {
    if (!permissionFlags.canBanUsers) {
      return;
    }
    setBanCandidate(member);
    setBanReason("Spamming");
    setBanError(null);
    resetBanHold();
  };

  const openWarnDialog = (member: MemberProfile) => {
    if (!permissionFlags.canWarnUsers) {
      return;
    }
    setWarnCandidate(member);
    setWarnMessage("Bitte keine Werbung im Chat.");
    setWarnError(null);
    resetWarnHold();
  };













  useEffect(() => {
    const timer = window.setTimeout(() => setBootDelayDone(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === "#") {
        event.preventDefault();
        setShowClippy(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadNews = () => {
      console.info("[news] load start");
      requestJson<{ items?: NewsItem[] }>(
        `https://api.blizz-developments-official.de/api/news?page=1&limit=5&_ts=${Date.now()}`,
        { signal: controller.signal }
      )
        .then((data) => {
          if (Array.isArray(data?.items)) {
            const mapped = mapNewsItems(data.items);
            console.info("[news] load mapped", mapped);
            setNewsItems(mapped);
          } else {
            console.info("[news] load empty list");
            setNewsItems([]);
          }
          setNewsError(false);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.warn("[news] load failed", error);
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
    let active = true;
    if (activePage !== "home") {
      return () => {
        active = false;
      };
    }
    const appId = (import.meta.env.VITE_DISCORD_APP_ID as string | undefined) ?? "";
    if (!appId) {
      console.warn("[discord] VITE_DISCORD_APP_ID missing; presence not updated.");
      return () => {
        active = false;
      };
    }
    (async () => {
      if (!(await isRunningInTauri())) {
        return;
      }
      if (!active) {
        return;
      }
      try {
        await invoke("discord_update_presence", {
          appId,
          presence: {
            state: "Managing Projects",
            startTimestamp: 1507665886,
            endTimestamp: 150766588,
            largeImageKey: "launcher_icon_full",
            largeImageText: "Vision",
            smallImageKey: "grass_block",
            smallImageText: "Vision Desktop",
            partyId: "ae488379-351d-4a4f-ad32-2b9b01c91657",
            joinSecret: "MTI4NzM0OjFpMmhuZToxMjMxMjM= "
          }
        });
      } catch (error) {
        console.error("[discord] presence update failed", error);
      }
    })();
    return () => {
      active = false;
    };
  }, [activePage]);

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
            cachedItems = parsed.map(normalizeProjectMedia);
            if (!controller.signal.aborted) {
              setProjectItems(cachedItems);
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

        const items = (data.items as ProjectItem[]).map(normalizeProjectMedia);
        if (!controller.signal.aborted) {
          setProjectItems(items);
          setProjectError(false);
        }
        const enrichedItems = await Promise.all(
          items.map(async (item) => {
            const { modrinthId } = normalizeModrinthFields(item);
            const srcModrinth = isTruthyFlag(
              item.srcModrinth ??
                item.src_modrinth ??
                (item as any).src_modrinth ??
                false
            );
            if (!modrinthId || !srcModrinth) {
              return item;
            }

            try {
              const modrinth = await fetchModrinthProject(modrinthId, controller.signal);
              const coverUrl = getModrinthCover(modrinth);
              const fallbackCoverUrl = modrinth.icon_url ?? null;

              return normalizeProjectMedia({
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
              });
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
    let unlistenNavigate: (() => void) | null = null;
    let unlistenAuthError: (() => void) | null = null;
    let unlistenAuthChanged: (() => void) | null = null;

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
        unlistenNavigate = stop;
      })
      .catch(() => undefined);

    listen("auth:error", (event) => {
      const message = String(event.payload ?? "").trim();
      setOauthLoginLoading(false);
      showToast(message || "Login fehlgeschlagen.", "error");
    })
      .then((stop) => {
        unlistenAuthError = stop;
      })
      .catch(() => undefined);

    listen("auth:changed", (event) => {
      const payload = (event.payload ?? {}) as Partial<OAuthAuthStatus>;
      const isAuthenticated = payload.is_authenticated === true;
      setOauthAuthReady(true);
      setOauthIsAuthenticated(isAuthenticated);
      setOauthExpiresAt(typeof payload.expires_at === "number" ? payload.expires_at : null);
      setLoginError(null);
      setOauthLoginLoading(false);
      if (isAuthenticated) {
        setShowLoginForm(false);
        showToast("OAuth Login abgeschlossen.", "success");
      }
    })
      .then((stop) => {
        unlistenAuthChanged = stop;
      })
      .catch(() => undefined);

    return () => {
      if (unlistenNavigate) {
        unlistenNavigate();
      }
      if (unlistenAuthError) {
        unlistenAuthError();
      }
      if (unlistenAuthChanged) {
        unlistenAuthChanged();
      }
    };
  }, [showToast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!(await isRunningInTauri())) {
        if (active) {
          setOauthAuthReady(true);
        }
        return;
      }
      try {
        const status = await invoke<OAuthAuthStatus>("oauth_get_auth_state");
        if (!active) {
          return;
        }
        setOauthIsAuthenticated(Boolean(status?.is_authenticated));
        setOauthExpiresAt(typeof status?.expires_at === "number" ? status.expires_at : null);
      } catch {
        if (active) {
          setOauthIsAuthenticated(false);
          setOauthExpiresAt(null);
        }
      } finally {
        if (active) {
          setOauthAuthReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUsername(null);
      setUserProjectIds([]);
      setUserProfileData(null);
      return;
    }

    getDoc(doc(db, "users", user.uid))
      .then((snapshot) => {
        setUserProfileData(snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null);
        const value = snapshot.exists() ? snapshot.get("username") : null;
        setUsername(typeof value === "string" ? value : null);
        const projectsValue = snapshot.exists() ? snapshot.get("projects") : null;
        setUserProjectIds(Array.isArray(projectsValue) ? projectsValue : []);
      })
      .catch(() => {
        setUsername(null);
        setUserProjectIds([]);
        setUserProfileData(null);
      });
  }, [user]);

  useEffect(() => {
    if (!selectedProject?.id) {
      setProjectParticipants([]);
      setParticipantsError(null);
      setParticipantsLoading(false);
      return;
    }

    setParticipantsLoading(true);
    setParticipantsError(null);

    const projectId = selectedProject.id;

    (async () => {
      const collected: Record<string, unknown>[] = [];
      let nextPageToken: string | null = null;
      let pageCount = 0;

      do {
        const params = new URLSearchParams({
          limit: "50",
          project: projectId
        });
        if (nextPageToken) {
          params.set("pageToken", nextPageToken);
        }
        const data = await requestJson<{
          items?: Record<string, unknown>[];
          nextPageToken?: string | null;
        }>(`https://api.blizz-developments-official.de/api/users?${params.toString()}`);
        const items = Array.isArray(data?.items) ? data.items : [];
        collected.push(...items);
        nextPageToken = typeof data?.nextPageToken === "string" ? data.nextPageToken : null;
        pageCount += 1;
      } while (nextPageToken && pageCount < 10);

      const mapped = collected
        .map((entry) => {
          const record = entry as Record<string, unknown>;
          const avatarMediaId =
            typeof record.avatarMediaId === "string"
              ? record.avatarMediaId
              : typeof record.avatar_media_id === "string"
                ? record.avatar_media_id
                : null;
          return {
            uid: typeof record.uid === "string" ? record.uid : "",
            username: typeof record.username === "string" ? record.username : null,
            email: typeof record.email === "string" ? record.email : null,
            roles: Array.isArray(record.roles) ? (record.roles as string[]) : [],
            experience: typeof record.experience === "string" ? record.experience : null,
            level: typeof record.level === "number" ? record.level : null,
            minecraftName:
              typeof record.minecraftName === "string" ? record.minecraftName : null,
            avatarMediaId,
            avatarUrl: getAvatarThumbUrl(avatarMediaId)
          } as MemberProfile;
        })
        .filter((entry) => entry.uid);

      setProjectParticipants(mapped);
    })()
      .catch((error) => {
        console.error("Failed to load project participants", error);
        setParticipantsError("Teilnehmende konnten nicht geladen werden.");
      })
      .finally(() => {
        setParticipantsLoading(false);
      });
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!user && !oauthIsAuthenticated) {
      setAuthzUid(null);
      setAuthzPermissions([]);
      setAuthzRoles([]);
      setAuthzFetchError(null);
      setAuthzFetchLoading(false);
      return;
    }
    let active = true;
    const cachedRaw = localStorage.getItem(AUTHZ_CACHE_KEY);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as {
          uid: string;
          permissions: string[];
          roles: string[];
          expiresAt: number;
        };
        if (cached.expiresAt > Date.now() && (user ? cached.uid === user.uid : true)) {
          setAuthzPermissions(Array.isArray(cached.permissions) ? cached.permissions : []);
          setAuthzRoles(Array.isArray(cached.roles) ? cached.roles : []);
          setAuthzUid(typeof cached.uid === "string" ? cached.uid : null);
          setAuthzFetchError(null);
          setAuthzFetchLoading(false);
        }
      } catch {
        // ignore cache parse errors
      }
    }

    setAuthzFetchLoading(true);
    setAuthzFetchError(null);
    (async () => {
      const token = await getApiToken();
      const response = await requestJson<{
        uid: string;
        roles?: string[];
        permissions?: string[];
        expiresIn?: number;
      }>("https://api.blizz-developments-official.de/me/authz", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuthzUid(typeof response?.uid === "string" ? response.uid : null);
      const permissions = Array.isArray(response?.permissions)
        ? response.permissions
        : [];
      const roles = Array.isArray(response?.roles) ? response.roles : [];
      const expiresIn = typeof response?.expiresIn === "number" ? response.expiresIn : 60;
      const expiresAt = Date.now() + expiresIn * 1000;
      if (!active) {
        return;
      }
      setAuthzPermissions(permissions);
      setAuthzRoles(roles);
      setAuthzFetchError(null);
      localStorage.setItem(
        AUTHZ_CACHE_KEY,
        JSON.stringify({
          uid: typeof response?.uid === "string" ? response.uid : user?.uid ?? "",
          permissions,
          roles,
          expiresAt
        })
      );
    })()
      .catch((error) => {
        if (!active) {
          return;
        }
        setAuthzFetchError(error instanceof Error ? error.message : "Authz Fehler.");
        setAuthzUid(null);
        setAuthzPermissions([]);
        setAuthzRoles([]);
      })
      .finally(() => {
        if (active) {
          setAuthzFetchLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, oauthIsAuthenticated]);

  const fetchMediaPage = async (section: string, page: number, replace = false) => {
    const config = MEDIA_SECTIONS.find((entry) => entry.key === section);
    if (!config?.endpoint) {
      return;
    }
    const limit = 20;
    const controller = new AbortController();
    try {
      setMediaLoading((prev) => ({ ...prev, [section]: true }));
      setMediaError((prev) => ({ ...prev, [section]: null }));
      const data = await requestJson<{
        items?: MediaItem[];
        total?: number;
        page?: number;
        limit?: number;
      }>(`${config.endpoint}?page=${page}&limit=${limit}`, { signal: controller.signal });

      const items = Array.isArray(data?.items) ? data!.items! : [];
      if (replace) {
        setMediaItems((prev) => ({ ...prev, [section]: items }));
      } else {
        setMediaItems((prev) => ({
          ...prev,
          [section]: [...(prev[section] ?? []), ...items]
        }));
      }

      const total = typeof data?.total === "number" ? data.total : null;
      const apiLimit = typeof data?.limit === "number" ? data.limit : limit;
      const hasMore =
        total !== null ? page * apiLimit < total : items.length >= apiLimit;
      setMediaHasMore((prev) => ({ ...prev, [section]: hasMore }));
      setMediaPage((prev) => ({ ...prev, [section]: page }));
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "AbortError") {
        setMediaError((prev) => ({
          ...prev,
          [section]: "Media konnten nicht geladen werden."
        }));
      }
    } finally {
      if (!controller.signal.aborted) {
        setMediaLoading((prev) => ({ ...prev, [section]: false }));
      }
    }
  };

  useEffect(() => {
    if (activePage !== "media") {
      return;
    }

    setMediaItems({ logos: [], banners: [], "news-banners": [], avatars: [] });
    setMediaHasMore({ logos: true, banners: true, "news-banners": true, avatars: true });
    setMediaPage({ logos: 1, banners: 1, "news-banners": 1, avatars: 1 });
    if (!permissionFlags.canAccessMedia) {
      return;
    }
    MEDIA_SECTIONS.forEach((section) => {
      if (!section.endpoint) {
        return;
      }
      fetchMediaPage(section.key, 1, true);
    });
  }, [activePage, permissionFlags.canAccessMedia]);

  useEffect(() => {
    if (editorModal === "project" && projectSource !== "manual") {
      return;
    }
    if (editorModal !== "project" && editorModal !== "news") {
      return;
    }
    let active = true;
    setExistingMediaLoading(true);
    const bannersEndpoint =
      editorModal === "news"
        ? "https://api.blizz-developments-official.de/api/media/news-banners?page=1&limit=20"
        : "https://api.blizz-developments-official.de/api/media/banners?page=1&limit=20";
    const requests = [
      requestJson<{ items?: MediaItem[] }>(
        "https://api.blizz-developments-official.de/api/media/logos?page=1&limit=20"
      ),
      requestJson<{ items?: MediaItem[] }>(bannersEndpoint)
    ];
    Promise.all(requests)
      .then(([logos, banners]) => {
        if (!active) {
          return;
        }
        setExistingLogos(Array.isArray(logos?.items) ? logos.items : []);
        setExistingBanners(Array.isArray(banners?.items) ? banners.items : []);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setExistingLogos([]);
        setExistingBanners([]);
      })
      .finally(() => {
        if (active) {
          setExistingMediaLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [editorModal, projectSource]);

  useEffect(() => {
    if (activePage !== "members") {
      return;
    }
    if (!permissionFlags.canAccessMembers && !permissionFlags.isModerator) {
      return;
    }
    if (!user && !oauthIsAuthenticated) {
      setMembers([]);
      setMembersLoading(false);
      setMembersError("Bitte zuerst anmelden.");
      return;
    }
    setMembers([]);
    setMembersLoading(true);
    setMembersError(null);
    (async () => {
      const token = await getApiToken();
      const data = await requestJson<{
        items?: Record<string, unknown>[];
      }>("https://api.blizz-developments-official.de/api/admin/users?limit=200", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      const mapped = items.map((entry) => {
        const record = entry as Record<string, unknown>;
        const avatarMediaId =
          typeof record.avatarMediaId === "string"
            ? record.avatarMediaId
            : typeof record.avatar_media_id === "string"
              ? record.avatar_media_id
              : null;
        return {
          uid: typeof record.uid === "string" ? record.uid : "",
          username: typeof record.username === "string" ? record.username : null,
          email: typeof record.email === "string" ? record.email : null,
          roles: Array.isArray(record.roles) ? (record.roles as string[]) : [],
          experience: typeof record.experience === "string" ? record.experience : null,
          level: typeof record.level === "number" ? record.level : null,
          minecraftName:
            typeof record.minecraftName === "string" ? record.minecraftName : null,
          avatarMediaId,
          avatarUrl: getAvatarThumbUrl(avatarMediaId)
        } as MemberProfile;
      });
      const filtered = mapped.filter((item) => item.uid);
      setMembers(filtered);
      showToast(`Mitglieder geladen (${filtered.length}).`, "success");
    })()
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unbekannter Fehler.";
        console.error("Failed to load members", error);
        setMembersError(`Mitglieder konnten nicht geladen werden. (${message})`);
        showToast("Mitglieder konnten nicht geladen werden.", "error");
      })
      .finally(() => {
        setMembersLoading(false);
      });
  }, [
    activePage,
    permissionFlags.canAccessMembers,
    permissionFlags.isModerator,
    user,
    oauthIsAuthenticated
  ]);

  useEffect(() => {
    if (activePage === "home") {
      setRedirectSeconds(null);
      return;
    }
    if (authzFetchLoading) {
      setRedirectSeconds(null);
      return;
    }
    if (isPageAllowed(activePage, permissionFlags)) {
      setRedirectSeconds(null);
      return;
    }

    setRedirectSeconds(4);
    const intervalId = window.setInterval(() => {
      setRedirectSeconds((prev) => {
        if (prev === null) {
          return null;
        }
        if (prev <= 1) {
          setActivePage("home");
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activePage, authzFetchLoading, permissionFlags]);

  useEffect(() => {
    const controller = new AbortController();
    const canLoadCalendar = permissionFlags.canAccessCalendar;

    if ((!user && !oauthIsAuthenticated) || !canLoadCalendar) {
      setCalendarEvents([]);
      setCalendarError(false);
      return () => controller.abort();
    }

    const loadCalendar = async () => {
      try {
        const token = await getApiToken();
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
  }, [user, oauthIsAuthenticated, permissionFlags.canAccessCalendar]);

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

  const handleOAuthLogin = async () => {
    setOauthLoginLoading(true);
    setLoginError(null);
    try {
      if (!(await isRunningInTauri())) {
        throw new Error("OAuth Login ist nur in der Desktop-App verfuegbar.");
      }

      const provider = getOAuthProviderConfig();
      const prepared = await invoke<OAuthPrepareLoginResponse>("oauth_prepare_login", {
        provider
      });

      await openUrl(prepared.authorization_url);
      showToast("Browser fuer OAuth Login geoeffnet.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "OAuth Login fehlgeschlagen.";
      setLoginError(message);
      showToast("OAuth Login fehlgeschlagen.", "error");
    } finally {
      setOauthLoginLoading(false);
    }
  };

  const getApiToken = async () => {
    if (user) {
      return user.getIdToken();
    }
    if (await isRunningInTauri()) {
      return invoke<string>("oauth_get_access_token");
    }
    throw new Error("Du musst eingeloggt sein.");
  };

  const handleLogout = async () => {
    try {
      if (await isRunningInTauri()) {
        try {
          await invoke("oauth_logout");
        } catch {
          // ignore
        }
      }
      setOauthIsAuthenticated(false);
      setOauthExpiresAt(null);
      setAuthzUid(null);
      setAuthzPermissions([]);
      setAuthzRoles([]);

      try {
        await signOut(auth);
      } catch {
        // ignore
      }
    } catch (error) {
      console.error("Logout fehlgeschlagen", error);
    }
  };

  const handleCreateProject = async () => {
    if (!user && !oauthIsAuthenticated) {
      setProjectSaveError("Du musst eingeloggt sein.");
      return;
    }
    if (projectSource !== "modrinth" && (!projectLoader || !projectVersion)) {
      setProjectSaveError("Bitte Loader und Version auswaehlen.");
      showToast("Loader und Version fehlen.", "error");
      return;
    }

    setProjectSaving(true);
    setProjectSaveError(null);
    setProjectSaveSuccess(false);

    try {
      const token = await getApiToken();
      const trimmedModrinthId = projectModrinthId.trim();
      const hasModrinth = Boolean(trimmedModrinthId);

      let logoMediaId: string | null = projectLogoMediaId || null;
      let bannerMediaId: string | null = projectBannerMediaId || null;

      let payload: Record<string, unknown>;
      if (projectSource === "modrinth") {
        if (!hasModrinth) {
          setProjectSaveError("Bitte Modrinth ID eingeben.");
          showToast("Modrinth ID fehlt.", "error");
          return;
        }
        payload = {
          srcModrinth: true,
          // @ts-ignore backend might accept snake_case
          src_modrinth: true,
          modrinthId: trimmedModrinthId,
          activityStatus: projectActivityStatus,
          // @ts-ignore backend might accept snake_case
          activity_status: projectActivityStatus,
          status: "published"
        };
      } else {
        if (projectLogoFile) {
          logoMediaId = await uploadMediaFile({
            file: projectLogoFile,
            token,
            endpoint:
              "https://api.blizz-developments-official.de/api/admin/media?category=logos"
          });
        }

        if (projectBannerFile) {
          bannerMediaId = await uploadMediaFile({
            file: projectBannerFile,
            token,
            endpoint:
              "https://api.blizz-developments-official.de/api/admin/media?category=banners"
          });
        }

        payload = {
          title: projectTitle,
          slug: projectSlug,
          descriptionMarkdown: projectDescription,
          bannerMediaId,
          coverMediaId: bannerMediaId,
          logoMediaId,
          loader: projectLoader,
          version: projectVersion,
          activityStatus: projectActivityStatus,
          // @ts-ignore backend might accept snake_case
          activity_status: projectActivityStatus,
          links: [],
          status: "published"
        };

        if (hasModrinth) {
          payload.modrinthId = trimmedModrinthId;
        }
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
      showToast("Projekt erstellt.", "success");
    } catch (error) {
      setProjectSaveError(
        error instanceof Error ? error.message : "Projekt konnte nicht gespeichert werden."
      );
      showToast("Projekt konnte nicht gespeichert werden.", "error");
    } finally {
      setProjectSaving(false);
    }
  };

  const handleEditProject = (project: ProjectItem) => {
    setEditingProjectId(project.id);
    setProjectTitle(project.title ?? "");
    setProjectSlug(project.slug ?? "");
    const descriptionValue =
      project.description ??
      project.descriptionMarkdown ??
      // @ts-ignore backend may use snake case
      (project as any).description_markdown ??
      project.descriptionHtml ??
      "";
    setProjectDescription(
      project.descriptionHtml ? stripHtml(descriptionValue) : descriptionValue
    );
    setProjectLoader((project.loader as "Fabric" | "Forge" | "Vanilla") ?? "");
    setProjectVersion(project.version ?? "");
    setProjectActivityStatus(project.activityStatus ?? "Active");
    setProjectSource(isTruthyFlag(project.srcModrinth ?? (project as any).src_modrinth) ? "modrinth" : "manual");
    setProjectModrinthId(project.modrinthId ?? project.modrinth_id ?? "");
    setProjectLogoFile(null);
    setProjectBannerFile(null);
    setProjectLogoMediaId("");
    setProjectBannerMediaId("");
    setShowExistingLogos(false);
    setShowExistingBanners(false);
    setProjectSaveError(null);
    setProjectSaveSuccess(false);
    setEditorModal("project");
  };

  const handleNewProject = () => {
    setEditingProjectId(null);
    setProjectTitle("");
    setProjectSlug("");
    setProjectDescription("");
    setProjectLoader("");
    setProjectVersion("");
    setProjectActivityStatus("Active");
    setProjectSource("manual");
    setProjectModrinthId("");
    setProjectLogoFile(null);
    setProjectBannerFile(null);
    setProjectLogoMediaId("");
    setProjectBannerMediaId("");
    setShowExistingLogos(false);
    setShowExistingBanners(false);
    setProjectSaveError(null);
    setProjectSaveSuccess(false);
    setEditorModal("project");
  };

  const handleUpdateProject = async () => {
    if ((!user && !oauthIsAuthenticated) || !editingProjectId) {
      setProjectSaveError("Du musst eingeloggt sein.");
      return;
    }

    setProjectSaving(true);
    setProjectSaveError(null);
    setProjectSaveSuccess(false);

    try {
      const token = await getApiToken();
      const trimmedModrinthId = projectModrinthId.trim();
      const hasModrinth = Boolean(trimmedModrinthId);

      let logoMediaId: string | null = projectLogoMediaId || null;
      let bannerMediaId: string | null = projectBannerMediaId || null;

      if (projectLogoFile) {
        logoMediaId = await uploadMediaFile({
          file: projectLogoFile,
          token,
          endpoint:
            "https://api.blizz-developments-official.de/api/admin/media?category=logos"
        });
      }

      if (projectBannerFile) {
        bannerMediaId = await uploadMediaFile({
          file: projectBannerFile,
          token,
          endpoint:
            "https://api.blizz-developments-official.de/api/admin/media?category=banners"
        });
      }

      const payload: Record<string, unknown> = {
        title: projectTitle,
        slug: projectSlug,
        descriptionMarkdown: projectDescription,
        bannerMediaId,
        logoMediaId,
        loader: projectLoader || undefined,
        version: projectVersion || undefined,
        activityStatus: projectActivityStatus,
        // @ts-ignore backend might accept snake_case
        activity_status: projectActivityStatus,
        links: [],
        status: "published"
      };

      if (hasModrinth) {
        payload.modrinthId = trimmedModrinthId;
      }
      payload.srcModrinth = projectSource === "modrinth";

      await requestText(
        `https://api.blizz-developments-official.de/api/admin/projects/${editingProjectId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      setProjectItems((prev) =>
        prev.map((project) =>
          project.id === editingProjectId
            ? normalizeProjectMedia({
                ...project,
                title: projectTitle,
                slug: projectSlug,
                description: projectDescription,
                loader: projectLoader || project.loader || null,
                version: projectVersion || project.version || null,
                activityStatus: projectActivityStatus,
                srcModrinth: hasModrinth
              })
            : project
        )
      );

      setProjectSaveSuccess(true);
      setEditingProjectId(null);
      showToast("Projekt aktualisiert.", "success");
    } catch (error) {
      setProjectSaveError(
        error instanceof Error ? error.message : "Projekt konnte nicht gespeichert werden."
      );
      showToast("Projekt konnte nicht aktualisiert werden.", "error");
    } finally {
      setProjectSaving(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user && !oauthIsAuthenticated) {
      setProjectDeleteError("Du musst eingeloggt sein.");
      return;
    }
    setProjectDeleteError(null);
    try {
      const token = await getApiToken();
      await requestText(
        `https://api.blizz-developments-official.de/api/admin/projects/${projectId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setProjectItems((prev) => prev.filter((project) => project.id !== projectId));
    } catch (error) {
      setProjectDeleteError(
        error instanceof Error ? error.message : "Projekt konnte nicht geloescht werden."
      );
    }
  };

  const requestDeleteProject = (project: ProjectItem) => {
    setProjectDeleteCandidate(project);
  };

  const confirmDeleteProject = async () => {
    if (!projectDeleteCandidate) {
      return;
    }
    const id = projectDeleteCandidate.id;
    setProjectDeleteCandidate(null);
    await handleDeleteProject(id);
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
              <SideIcons
                activeId={activePage}
                onChange={setActivePage}
                visiblePages={visiblePages}
                avatarUrl={user ? userAvatarUrl : null}
              />
            </div>
            <div className="col-start-2 row-start-2 min-h-0 pl-[24px] pr-[340px] pt-[24px]">
              <div className="h-full min-h-0 overflow-hidden">
                <div className="h-full min-h-0 overflow-auto pr-2">
                  {renderContent(
                    activePage,
                    setActivePage,
                    projectItems,
                    projectError,
                    newsItems,
                    newsError,
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
                    mediaFilter,
                    setMediaFilter,
                    selectedMediaIds,
                    toggleMediaSelection,
                    handleDeleteMedia,
                    handleDeleteSelectedMedia,
                    projectDeleteError,
                    requestDeleteProject,
                    requestDeleteNews,
                    handleEditProject,
                    handleNewProject,
                    permissionFlags,
                    authzFetchLoading,
                    authzFetchError,
                userProfileData,
                redirectSeconds,
                members,
                membersLoading,
                membersError,
                openBanDialog,
                openWarnDialog,
                handleAuthzTest,
                authzTestLoading,
                authzTestError,
                authzResult,
                handleAuthzCopy,
                authzCopied,
                user,
                oauthIsAuthenticated,
                oauthAuthReady,
                oauthExpiresAt,
                authzUid,
                    username,
                    userProjectIds,
                    showLoginForm,
                    setShowLoginForm,
                    handleLogin,
                    handleOAuthLogin,
                    loginLoading,
                    oauthLoginLoading,
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
            <h2 className="text-[18px] font-normal text-[rgba(255,255,255,0.92)]">News</h2>
          </div>
          <div className="px-4 space-y-6 overflow-auto">
            {newsItems.map((item) => (
              <div key={item.title} className="w-full">
                <div className="w-full overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.12)] bg-[#0D0E12]">
                  {item.cover?.url ? (
                    <div
                      className="h-[160px] w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.cover.url})` }}
                    />
                  ) : (
                    <div className="h-[160px] w-full bg-[#0D0E12]" />
                  )}
                </div>
                <div className="px-1 pt-3">
                  <p className="text-[16px] font-semibold text-[rgba(255,255,255,0.96)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[12px] leading-[18px] text-[rgba(255,255,255,0.62)]">
                    {item.excerpt}
                  </p>
                  {formatNewsDate((item as any).publishedAt ?? (item as any).createdAt ?? null) && (
                    <p className="mt-3 text-[11px] text-[rgba(255,255,255,0.45)]">
                      {formatNewsDate((item as any).publishedAt ?? (item as any).createdAt ?? null)}
                    </p>
                  )}
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
        {banCandidate && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-[420px] rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[#14161B] p-5 shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
                  Nutzer bannen
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setBanCandidate(null);
                    resetBanHold();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[rgba(255,255,255,0.7)] transition hover:bg-[rgba(255,255,255,0.08)]"
                  aria-label="Dialog schliessen"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-3 text-[12px] text-[rgba(255,255,255,0.6)]">
                Bist du sicher, dass du{" "}
                <span className="text-[rgba(255,255,255,0.85)] font-semibold">
                  {banCandidate.username ?? banCandidate.uid}
                </span>{" "}
                bannen willst?
              </p>
              <div className="mt-4 space-y-2">
                <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                  Grund
                </label>
                <input
                  value={banReason}
                  onChange={(event) => setBanReason(event.target.value)}
                  className="w-full rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#0F1116] px-3 py-2 text-[12px] text-[rgba(255,255,255,0.8)] outline-none focus:border-[#FF5B5B]"
                  placeholder="Grund fuer den Bann"
                />
              </div>
              {banError && (
                <div className="mt-3 rounded-[10px] border border-[rgba(255,100,100,0.25)] bg-[rgba(255,100,100,0.08)] px-3 py-2 text-[11px] text-[rgba(255,255,255,0.8)]">
                  {banError}
                </div>
              )}
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onMouseDown={() => startBanHold(banCandidate)}
                  onMouseUp={resetBanHold}
                  onMouseLeave={resetBanHold}
                  onTouchStart={() => startBanHold(banCandidate)}
                  onTouchEnd={resetBanHold}
                  disabled={banSubmitting}
                  className="relative w-full overflow-hidden rounded-[12px] border border-[rgba(255,91,91,0.35)] bg-[rgba(255,91,91,0.12)] px-4 py-3 text-[12px] font-semibold text-[#FF8A8A] transition hover:bg-[rgba(255,91,91,0.2)] disabled:opacity-60"
                >
                  <span className="relative z-10">
                    {banSubmitting ? "Wird gebannt..." : "3 Sekunden halten zum Bannen"}
                  </span>
                  <span
                    className="absolute inset-0 z-0 bg-[rgba(255,91,91,0.4)] transition-all"
                    style={{ width: `${banProgress * 100}%` }}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBanCandidate(null);
                    resetBanHold();
                  }}
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.7)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
        {warnCandidate && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-[420px] rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[#14161B] p-5 shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
                  Nutzer warnen
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setWarnCandidate(null);
                    resetWarnHold();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[rgba(255,255,255,0.7)] transition hover:bg-[rgba(255,255,255,0.08)]"
                  aria-label="Dialog schliessen"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-3 text-[12px] text-[rgba(255,255,255,0.6)]">
                Sende eine Warnung an{" "}
                <span className="text-[rgba(255,255,255,0.85)] font-semibold">
                  {warnCandidate.username ?? warnCandidate.uid}
                </span>
                .
              </p>
              <div className="mt-4 space-y-2">
                <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                  Nachricht
                </label>
                <input
                  value={warnMessage}
                  onChange={(event) => setWarnMessage(event.target.value)}
                  className="w-full rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#0F1116] px-3 py-2 text-[12px] text-[rgba(255,255,255,0.8)] outline-none focus:border-[#FFD166]"
                  placeholder="Warn-Nachricht"
                />
              </div>
              {warnError && (
                <div className="mt-3 rounded-[10px] border border-[rgba(255,201,120,0.25)] bg-[rgba(255,201,120,0.08)] px-3 py-2 text-[11px] text-[rgba(255,255,255,0.8)]">
                  {warnError}
                </div>
              )}
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onMouseDown={() => startWarnHold(warnCandidate)}
                  onMouseUp={resetWarnHold}
                  onMouseLeave={resetWarnHold}
                  onTouchStart={() => startWarnHold(warnCandidate)}
                  onTouchEnd={resetWarnHold}
                  disabled={warnSubmitting}
                  className="relative w-full overflow-hidden rounded-[12px] border border-[rgba(255,209,102,0.35)] bg-[rgba(255,209,102,0.12)] px-4 py-3 text-[12px] font-semibold text-[#FFD166] transition hover:bg-[rgba(255,209,102,0.2)] disabled:opacity-60"
                >
                  <span className="relative z-10">
                    {warnSubmitting ? "Wird gesendet..." : "3 Sekunden halten zum Warnen"}
                  </span>
                  <span
                    className="absolute inset-0 z-0 bg-[rgba(255,209,102,0.4)] transition-all"
                    style={{ width: `${warnProgress * 100}%` }}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWarnCandidate(null);
                    resetWarnHold();
                  }}
                  className="w-full rounded-[12px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.7)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
        {toastMessage && (
          <div
            className={`fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 overflow-hidden rounded-[12px] border px-4 py-3 text-[12px] font-semibold shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-all duration-300 ${toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"} ${toastVariant === "success"
              ? "border-[rgba(46,204,113,0.45)] bg-[rgba(21,40,28,0.92)] text-[#7CFFB0]"
              : "border-[rgba(255,91,91,0.45)] bg-[rgba(48,16,16,0.92)] text-[#FF9C9C]"
              }`}
          >
            <span>{toastMessage}</span>
            <span
              className={`pointer-events-none absolute bottom-0 left-0 h-[3px] transition-[width] ${toastVariant === "success"
                ? "bg-[#2BFE71]"
                : "bg-[#FF5B5B]"
                }`}
              style={{ width: `${toastProgress * 100}%` }}
            />
          </div>
        )}
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
                    <div className="h-[52px] w-[52px] overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.20)] bg-[#1B1D22]">
                      <img
                        src={selectedProject.logoIcon.url}
                        alt={`${selectedProject.title} logo`}
                        className="h-full w-full object-cover"
                      />
                    </div>
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
                    {getProjectDescriptionText(selectedProject) ?? fallbackProjectDescription}
                  </p>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Teilnehmende
                    </p>
                    <span className="text-[11px] text-[rgba(255,255,255,0.55)]">
                      {projectParticipants.length}
                    </span>
                  </div>
                  {participantsLoading && (
                    <p className="mt-2 text-[12px] text-[rgba(255,255,255,0.6)]">
                      Teilnehmer werden geladen...
                    </p>
                  )}
                  {participantsError && (
                    <p className="mt-2 text-[12px] text-[rgba(255,180,180,0.8)]">
                      {participantsError}
                    </p>
                  )}
                  {!participantsLoading && !participantsError && (
                    <>
                      {projectParticipants.length ? (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {projectParticipants.map((member) => (
                            <div
                              key={member.uid}
                              className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#14161C] px-3 py-2 text-[12px] text-[rgba(255,255,255,0.85)]"
                            >
                              {member.avatarUrl ? (
                                <img
                                  src={member.avatarUrl}
                                  alt={`${member.username ?? "User"} avatar`}
                                  className="h-7 w-7 rounded-full border border-[rgba(255,255,255,0.15)] object-cover"
                                />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)]">
                                  <i className="fa-solid fa-user text-[10px]" aria-hidden="true" />
                                </div>
                              )}
                              <span className="text-[12px]">
                                {member.username ?? member.minecraftName ?? "Unbekannt"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[12px] text-[rgba(255,255,255,0.6)]">
                          Noch keine Teilnehmenden.
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-5 flex items-center justify-end gap-3">
                  {(() => {
                    const modrinthUrl = getProjectModrinthLink(selectedProject);
                    if (!modrinthUrl) {
                      return null;
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => openModrinth(modrinthUrl)}
                        className="rounded-[10px] bg-[#2BFE71] px-4 py-2 text-[13px] font-semibold text-[#0D0E12] transition hover:brightness-95"
                      >
                        Modrinth
                      </button>
                    );
                  })()}
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
                  {editorModal === "project" &&
                    (editingProjectId ? "Projekt bearbeiten" : "Neues Projekt erstellen")}
                  {editorModal === "news" && "News erstellen"}
                  {editorModal === "event" && "Kalender-Event anlegen"}
                  {editorModal === "media" && "Bild hochladen"}
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
                        disabled={Boolean(editingProjectId) && projectSource === "modrinth"}
                        className={`px-4 py-2 text-[12px] font-semibold transition ${projectSource === "manual"
                          ? "bg-[#2BFE71] text-[#0D0E12]"
                          : "text-[rgba(255,255,255,0.70)] hover:text-white"
                          } ${Boolean(editingProjectId) && projectSource === "modrinth"
                          ? "opacity-40 cursor-not-allowed"
                          : ""}`}
                      >
                        Manuell
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectSource("modrinth")}
                        disabled={Boolean(editingProjectId) && projectSource === "manual"}
                        className={`px-4 py-2 text-[12px] font-semibold transition ${projectSource === "modrinth"
                          ? "bg-[#2BFE71] text-[#0D0E12]"
                          : "text-[rgba(255,255,255,0.70)] hover:text-white"
                          } ${Boolean(editingProjectId) && projectSource === "manual"
                          ? "opacity-40 cursor-not-allowed"
                          : ""}`}
                      >
                        Modrinth
                      </button>
                    </div>
                  </div>

                  {projectSource === "modrinth" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                          <i className="fa-solid fa-cloud-arrow-up text-[13px] text-[#2BFE71]" aria-hidden="true" />
                          Modrinth-Projekt ID (erforderlich)
                        </label>
                        <input
                          type="text"
                          placeholder="z.B. AANobbMI oder fabric-api"
                          value={projectModrinthId}
                          onChange={(event) => setProjectModrinthId(event.target.value)}
                          className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                        />
                        {modrinthAutoLoading && (
                          <p className="text-[11px] text-[rgba(255,255,255,0.55)]">
                            Modrinth wird geladen...
                          </p>
                        )}
                        {modrinthAutoError && (
                          <p className="text-[11px] text-[rgba(255,150,150,0.8)]">
                            {modrinthAutoError}
                          </p>
                        )}
                        <p className="text-[11px] text-[rgba(255,255,255,0.55)]">
                          Modrinth-Daten werden im Client geladen.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                          <i className="fa-solid fa-bolt text-[13px] text-[#2BFE71]" aria-hidden="true" />
                          Activity Status (erforderlich)
                        </label>
                        <select
                          value={projectActivityStatus}
                          onChange={(event) =>
                            setProjectActivityStatus(
                              event.target.value as NonNullable<ProjectItem["activityStatus"]>
                            )
                          }
                          className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                        >
                          <option value="Active">Active</option>
                          <option value="Starting shortly">Starting shortly</option>
                          <option value="Coming Soon">Coming Soon</option>
                          <option value="Ended">Ended</option>
                        </select>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-[12px] text-[rgba(255,255,255,0.65)]">
                          {projectSaveError && (
                            <span className="text-[rgba(255,100,100,0.85)]">
                              {projectSaveError}
                            </span>
                          )}
                          {projectSaveSuccess && !projectSaveError && (
                            <span className="text-[#2BFE71]">
                              {editingProjectId ? "Projekt aktualisiert." : "Projekt gespeichert."}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={editingProjectId ? handleUpdateProject : handleCreateProject}
                          disabled={projectSaving || !projectModrinthId.trim()}
                          className="rounded-full bg-[#2BFE71] px-4 py-2 text-[12px] font-semibold text-[#0D0E12] disabled:opacity-60"
                        >
                          {projectSaving
                            ? "Speichern..."
                            : editingProjectId
                              ? "Projekt aktualisieren"
                              : "Projekt speichern"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                          <i className="fa-solid fa-pen-to-square text-[13px] text-[#2BFE71]" aria-hidden="true" />
                          Projektname
                        </label>
                        <input
                          type="text"
                          placeholder="z.B. Mein Minecraft Modpack"
                          value={projectTitle}
                          onChange={(event) => setProjectTitle(event.target.value)}
                          className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                          <i className="fa-solid fa-link text-[13px] text-[#2BFE71]" aria-hidden="true" />
                          URL-Slug
                        </label>
                        <input
                          type="text"
                          placeholder="mein-minecraft-modpack"
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
                          placeholder="Beschreibe dein Projekt: Features, Zielgruppe und Besonderheiten..."
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
                          onChange={(event) => {
                            setProjectLogoFile(event.target.files?.[0] ?? null);
                            setProjectLogoMediaId("");
                          }}
                          className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-[rgba(255,255,255,0.75)] file:mr-3 file:rounded-full file:border-0 file:bg-[#1B2A22] file:px-3 file:py-1 file:text-[12px] file:text-[#2BFE71]"
                        />
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setShowExistingLogos((prev) => !prev)}
                            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]"
                          >
                            <i
                              className={`fa-solid fa-chevron-${showExistingLogos ? "up" : "down"} text-[10px]`}
                              aria-hidden="true"
                            />
                            Aus Medienbibliothek wählen
                          </button>
                          {showExistingLogos && (
                            <>
                              {existingMediaLoading && (
                                <p className="mt-2 text-[12px] text-[rgba(255,255,255,0.6)]">
                                  Lade Logos...
                                </p>
                              )}
                              {!existingMediaLoading && (
                                <div className="mt-2 grid grid-cols-5 gap-2">
                                  {existingLogos.map((item) => {
                                    const url = item.thumbUrl ?? item.variants?.thumbUrl ?? item.url;
                                    if (!item.id || !url) {
                                      return null;
                                    }
                                    const isSelected = projectLogoMediaId === item.id;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                          setProjectLogoMediaId(item.id ?? "");
                                          setProjectLogoFile(null);
                                        }}
                                        className={`relative h-12 w-full overflow-hidden rounded-[10px] border ${isSelected
                                          ? "border-[#2BFE71]"
                                          : "border-[rgba(255,255,255,0.12)]"
                                          }`}
                                        title={item.id}
                                      >
                                        <img src={url} alt="Logo" className="h-full w-full object-cover" />
                                      </button>
                                    );
                                  })}
                                  {!existingLogos.length && (
                                    <p className="col-span-5 text-[12px] text-[rgba(255,255,255,0.5)]">
                                      Keine Logos gefunden.
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                          <i className="fa-solid fa-image text-[13px] text-[#2BFE71]" aria-hidden="true" />
                          Banner (optional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            setProjectBannerFile(event.target.files?.[0] ?? null);
                            setProjectBannerMediaId("");
                          }}
                          className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-[rgba(255,255,255,0.75)] file:mr-3 file:rounded-full file:border-0 file:bg-[#1B2A22] file:px-3 file:py-1 file:text-[12px] file:text-[#2BFE71]"
                        />
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setShowExistingBanners((prev) => !prev)}
                            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]"
                          >
                            <i
                              className={`fa-solid fa-chevron-${showExistingBanners ? "up" : "down"} text-[10px]`}
                              aria-hidden="true"
                            />
                            Aus Medienbibliothek wählen
                          </button>
                          {showExistingBanners && (
                            <>
                              {existingMediaLoading && (
                                <p className="mt-2 text-[12px] text-[rgba(255,255,255,0.6)]">
                                  Lade Banner...
                                </p>
                              )}
                              {!existingMediaLoading && (
                                <div className="mt-2 grid grid-cols-4 gap-2">
                                  {existingBanners.map((item) => {
                                    const url = item.thumbUrl ?? item.variants?.thumbUrl ?? item.url;
                                    if (!item.id || !url) {
                                      return null;
                                    }
                                    const isSelected = projectBannerMediaId === item.id;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                          setProjectBannerMediaId(item.id ?? "");
                                          setProjectBannerFile(null);
                                        }}
                                        className={`relative h-16 w-full overflow-hidden rounded-[10px] border ${isSelected
                                          ? "border-[#2BFE71]"
                                          : "border-[rgba(255,255,255,0.12)]"
                                          }`}
                                        title={item.id}
                                      >
                                        <img src={url} alt="Banner" className="h-full w-full object-cover" />
                                      </button>
                                    );
                                  })}
                                  {!existingBanners.length && (
                                    <p className="col-span-4 text-[12px] text-[rgba(255,255,255,0.5)]">
                                      Keine Banner gefunden.
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                          <i className="fa-solid fa-bolt text-[13px] text-[#2BFE71]" aria-hidden="true" />
                          Entwicklungsstatus
                        </label>
                        <select
                          value={projectActivityStatus}
                          onChange={(event) =>
                            setProjectActivityStatus(
                              event.target.value as NonNullable<ProjectItem["activityStatus"]>
                            )
                          }
                          className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                        >
                          <option value="Active">Active</option>
                          <option value="Starting shortly">Starting shortly</option>
                          <option value="Coming Soon">Coming Soon</option>
                          <option value="Ended">Ended</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                          <i className="fa-solid fa-layer-group text-[13px] text-[#2BFE71]" aria-hidden="true" />
                          Mod-Loader (erforderlich)
                        </label>
                        <select
                          value={projectLoader}
                          onChange={(event) =>
                            setProjectLoader(event.target.value as "Fabric" | "Forge" | "Vanilla" | "")
                          }
                          className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                        >
                          <option value="">Loader auswählen...</option>
                          <option value="Fabric">Fabric</option>
                          <option value="Forge">Forge</option>
                          <option value="Vanilla">Vanilla</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                          <i className="fa-solid fa-cube text-[13px] text-[#2BFE71]" aria-hidden="true" />
                          Minecraft-Version (erforderlich)
                        </label>
                        {mcVersionsError ? (
                          <input
                            type="text"
                            placeholder="z.B. 1.21.4 oder 1.20.1"
                            value={projectVersion}
                            onChange={(event) => setProjectVersion(event.target.value)}
                            className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                          />
                        ) : (
                          <select
                            value={projectVersion}
                            onChange={(event) => setProjectVersion(event.target.value)}
                            disabled={mcVersionsLoading}
                            className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71] disabled:opacity-60"
                          >
                            <option value="">
                              {mcVersionsLoading ? "Lade Versionen..." : "Version auswählen..."}
                            </option>
                            {mcVersions.map((version) => (
                              <option key={version} value={version}>
                                {version}
                              </option>
                            ))}
                          </select>
                        )}
                        {mcVersionsError && (
                          <p className="text-[11px] text-[rgba(255,255,255,0.55)]">
                            Versionsliste nicht verfügbar. Gib die Version manuell ein.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-[rgba(255,255,255,0.82)]">
                          <i className="fa-solid fa-cloud-arrow-up text-[13px] text-[#2BFE71]" aria-hidden="true" />
                          Modrinth-Verknüpfung (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Verknüpfe mit einem Modrinth-Projekt für zusätzliche Infos"
                          value={projectModrinthId}
                          onChange={(event) => setProjectModrinthId(event.target.value)}
                          className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                        />
                      </div>
                      <div className="md:col-span-2 mt-2 flex items-center justify-between">
                        <div className="text-[12px] text-[rgba(255,255,255,0.65)]">
                          {projectSaveError && (
                            <span className="text-[rgba(255,100,100,0.85)]">
                              {projectSaveError}
                            </span>
                          )}
                          {projectSaveSuccess && !projectSaveError && (
                            <span className="text-[#2BFE71]">
                              {editingProjectId ? "Projekt aktualisiert." : "Projekt gespeichert."}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={editingProjectId ? handleUpdateProject : handleCreateProject}
                          disabled={
                            projectSaving ||
                            (!editingProjectId && (!projectLoader || !projectVersion))
                          }
                          className="rounded-full bg-[#2BFE71] px-4 py-2 text-[12px] font-semibold text-[#0D0E12] disabled:opacity-60"
                        >
                          {projectSaving
                            ? "Speichern..."
                            : editingProjectId
                              ? "Projekt aktualisieren"
                              : "Projekt speichern"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editorModal === "media" && (
                <div className="mt-6">
                  {!mediaUploadFile && (
                    <label
                      htmlFor="media-upload"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={handleMediaDrop}
                      className="flex min-h-[180px] w-full cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[rgba(255,255,255,0.2)] bg-[#0F1116] text-center transition hover:border-[#2BFE71]"
                    >
                      <i className="fa-solid fa-cloud-arrow-up text-[28px] text-[rgba(255,255,255,0.7)]" aria-hidden="true" />
                      <p className="mt-3 text-[14px] font-semibold text-[rgba(255,255,255,0.85)]">
                        Datei hier ablegen oder klicken
                      </p>
                      <p className="mt-1 text-[12px] text-[rgba(255,255,255,0.55)]">
                        PNG, JPG oder WEBP
                      </p>
                    </label>
                  )}
                  {mediaPreviewUrl && (
                    <div className="mt-4 overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116]">
                      <img
                        src={mediaPreviewUrl}
                        alt="Upload preview"
                        className="h-[160px] w-full object-cover"
                      />
                    </div>
                  )}
                  <input
                    id="media-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => setMediaUploadFile(event.target.files?.[0] ?? null)}
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.55)]">
                      Typ
                    </p>
                    <div className="flex overflow-hidden rounded-full border border-[rgba(255,255,255,0.12)] bg-[#0F1116]">
                      {([
                        { id: "logos", label: "Logo" },
                        { id: "banners", label: "Banner" },
                        { id: "news-banners", label: "News Banner" },
                        { id: "avatars", label: "Avatar" }
                      ] as const).map((option) => {
                        const active = mediaUploadType === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setMediaUploadType(option.id)}
                            className={`px-4 py-2 text-[12px] font-semibold transition ${active
                              ? "bg-[#2BFE71] text-[#0D0E12]"
                              : "text-[rgba(255,255,255,0.70)] hover:text-white"
                              }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-[12px] text-[rgba(255,255,255,0.65)]">
                      {mediaUploadError && (
                        <span className="text-[rgba(255,100,100,0.85)]">
                          {mediaUploadError}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-2 text-[#2BFE71] transition-all duration-500 ${mediaUploadSuccess && !mediaUploadError
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 -translate-y-1 pointer-events-none"
                          }`}
                      >
                        <i className="fa-solid fa-check" aria-hidden="true" />
                        Upload abgeschlossen.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleMediaUpload}
                      disabled={mediaUploadLoading || !mediaUploadFile}
                      className="rounded-full bg-[#2BFE71] px-4 py-2 text-[12px] font-semibold text-[#0D0E12] disabled:opacity-60"
                    >
                      {mediaUploadLoading ? "Hochladen..." : "Upload starten"}
                    </button>
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
                      value={newsTitle}
                      onChange={(event) => setNewsTitle(event.target.value)}
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
                      value={newsExcerpt}
                      onChange={(event) => setNewsExcerpt(event.target.value)}
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Inhalt (Markdown)
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Langer Inhalt in Markdown..."
                      value={newsContent}
                      onChange={(event) => setNewsContent(event.target.value)}
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Tags (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="update, release"
                      value={newsTags}
                      onChange={(event) => setNewsTags(event.target.value)}
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-white outline-none focus:border-[#2BFE71]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
                      Neues Cover hochladen
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        setNewsCoverFile(event.target.files?.[0] ?? null);
                        setNewsCoverMediaId("");
                      }}
                      className="mt-2 w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] px-3 py-2 text-[13px] text-[rgba(255,255,255,0.75)] file:mr-3 file:rounded-full file:border-0 file:bg-[#1B2A22] file:px-3 file:py-1 file:text-[12px] file:text-[#2BFE71]"
                    />
                    {newsCoverFile && (
                      <p className="mt-2 text-[11px] text-[rgba(255,255,255,0.55)]">
                        Datei ausgewählt: {newsCoverFile.name}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowExistingNewsBanners((prev) => !prev)}
                      className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]"
                    >
                      <i
                        className={`fa-solid fa-chevron-${showExistingNewsBanners ? "up" : "down"} text-[10px]`}
                        aria-hidden="true"
                      />
                      Cover-Bild aus Media
                    </button>
                    {showExistingNewsBanners && (
                      <>
                        {existingMediaLoading && (
                          <p className="mt-2 text-[12px] text-[rgba(255,255,255,0.6)]">
                            Lade Banner...
                          </p>
                        )}
                        {!existingMediaLoading && (
                          <div className="mt-2 grid grid-cols-4 gap-2">
                            {existingBanners.map((item) => {
                              const url = item.thumbUrl ?? item.variants?.thumbUrl ?? item.url;
                              if (!item.id || !url) {
                                return null;
                              }
                              const isSelected = newsCoverMediaId === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setNewsCoverMediaId(item.id ?? "")}
                                  className={`relative h-16 w-full overflow-hidden rounded-[10px] border ${isSelected
                                    ? "border-[#2BFE71]"
                                    : "border-[rgba(255,255,255,0.12)]"
                                    }`}
                                  title={item.id}
                                >
                                  <img src={url} alt="Banner" className="h-full w-full object-cover" />
                                </button>
                              );
                            })}
                            {!existingBanners.length && (
                              <p className="col-span-4 text-[12px] text-[rgba(255,255,255,0.5)]">
                                Keine Banner gefunden.
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="md:col-span-2 mt-2 flex items-center justify-between">
                    <div className="text-[12px] text-[rgba(255,255,255,0.65)]">
                      {newsSaveError && (
                        <span className="text-[rgba(255,100,100,0.85)]">
                          {newsSaveError}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateNews}
                      disabled={newsSaving || newsCoverUploading}
                      className="rounded-full bg-[#2BFE71] px-4 py-2 text-[12px] font-semibold text-[#0D0E12] disabled:opacity-60"
                    >
                      {newsSaving || newsCoverUploading ? "Speichern..." : "News speichern"}
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
        {projectDeleteCandidate && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[#0F1116] p-6 shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
              <h3 className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
                Projekt loeschen?
              </h3>
              <p className="mt-2 text-[13px] text-[rgba(255,255,255,0.65)]">
                {projectDeleteCandidate.title} wird dauerhaft geloescht.
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProjectDeleteCandidate(null)}
                  className="rounded-[10px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProject}
                  className="rounded-[10px] bg-[#FF5B5B] px-4 py-2 text-[12px] font-semibold text-[#0D0E12] transition hover:brightness-95"
                >
                  Loeschen
                </button>
              </div>
            </div>
          </div>
        )}
        {newsDeleteCandidate && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[#0F1116] p-6 shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
              <h3 className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
                News loeschen?
              </h3>
              <p className="mt-2 text-[13px] text-[rgba(255,255,255,0.65)]">
                {newsDeleteCandidate.title} wird dauerhaft geloescht.
              </p>
              {newsDeleteError && (
                <div className="mt-3 rounded-[10px] border border-[rgba(255,100,100,0.25)] bg-[rgba(255,100,100,0.08)] px-3 py-2 text-[11px] text-[rgba(255,255,255,0.8)]">
                  {newsDeleteError}
                </div>
              )}
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNewsDeleteCandidate(null)}
                  className="rounded-[10px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
                  disabled={newsDeleting}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteNews}
                  className="rounded-[10px] bg-[#FF5B5B] px-4 py-2 text-[12px] font-semibold text-[#0D0E12] transition hover:brightness-95 disabled:opacity-60"
                  disabled={newsDeleting}
                >
                  {newsDeleting ? "Loeschen..." : "Loeschen"}
                </button>
              </div>
            </div>
          </div>
        )}
        {showClippy && (
          <div className="fixed bottom-6 right-6 z-[90]">
            <img
              src={clippyImage}
              alt="Clippy"
              className="h-28 w-auto select-none"
              draggable={false}
            />
          </div>
        )}
        {mediaUploadSuccess && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-transparent">
            <div className="flex flex-col items-center gap-3 rounded-[20px] border border-[rgba(255,255,255,0.12)] bg-[#111319] px-8 py-6 text-center shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
              <div className="success-animation">
                <svg
                  className="checkmark"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 52 52"
                >
                  <circle
                    className="checkmark__circle"
                    cx="26"
                    cy="26"
                    r="25"
                    fill="none"
                  />
                  <path
                    className="checkmark__check"
                    fill="none"
                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  />
                </svg>
              </div>
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
  newsItems: NewsItem[],
  newsError: boolean,
  modrinthProjects: ModrinthProject[],
  modrinthError: boolean,
  calendarEvents: CalendarEvent[],
  calendarError: boolean,
  mediaItems: Record<string, MediaItem[]>,
  mediaLoading: Record<string, boolean>,
  mediaError: Record<string, string | null>,
  mediaPage: Record<string, number>,
  mediaHasMore: Record<string, boolean>,
  fetchMediaPage: (section: string, page: number, replace?: boolean) => void,
  mediaFilter: "all" | "logos" | "banners" | "news-banners" | "avatars",
  setMediaFilter: (value: "all" | "logos" | "banners" | "news-banners" | "avatars") => void,
  selectedMediaIds: { id: string; section: string }[],
  toggleMediaSelection: (section: string, id: string) => void,
  handleDeleteMedia: (section: string, id: string) => void,
  handleDeleteSelectedMedia: () => void,
  projectDeleteError: string | null,
  requestDeleteProject: (project: ProjectItem) => void,
  requestDeleteNews: (item: NewsItem) => void,
  handleEditProject: (project: ProjectItem) => void,
  handleNewProject: () => void,
  permissionFlags: PermissionFlags,
  authzFetchLoading: boolean,
  authzFetchError: string | null,
  userProfileData: Record<string, unknown> | null,
  redirectSeconds: number | null,
  members: MemberProfile[],
  membersLoading: boolean,
  membersError: string | null,
  onOpenBanDialog: (member: MemberProfile) => void,
  onOpenWarnDialog: (member: MemberProfile) => void,
  handleAuthzTest: () => void,
  authzTestLoading: boolean,
  authzTestError: string | null,
  authzResult: string | null,
  handleAuthzCopy: () => void,
  authzCopied: boolean,
  user: User | null,
  oauthIsAuthenticated: boolean,
  oauthAuthReady: boolean,
  oauthExpiresAt: number | null,
  authzUid: string | null,
  username: string | null,
  userProjectIds: string[],
  showLoginForm: boolean,
  setShowLoginForm: (value: boolean) => void,
  onLogin: (email: string, password: string) => Promise<void>,
  onOAuthLogin: () => Promise<void>,
  loginLoading: boolean,
  oauthLoginLoading: boolean,
  loginError: string | null,
  onSelectProject: (project: ProjectItem | null) => void,
  setEditorModal: (value: "project" | "news" | "event" | "member" | "media" | null) => void,
  onLogout: () => Promise<void>
) {
  const modrinthCards = modrinthProjects.map(toModrinthCard);
  const groupedModrinth = groupModrinthCards(modrinthCards);
  const myProjects = sortProjectsByActivity(
    projects.filter((item) => userProjectIds.includes(item.id))
  );
  const sortedProjects = sortProjectsByActivity(projects);
  void newsError;
  const canAccessPage = (pageId: string) => isPageAllowed(pageId, permissionFlags);
  const isPublicPage = ["home", "explore", "settings", "settings-debug", "profile"].includes(
    page
  );

  if (authzFetchLoading && !isPublicPage) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  if (!canAccessPage(page)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-full max-w-md rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[#0F1116] p-6 text-center shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)]">
            <i className="fa-solid fa-lock text-[22px]" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-[18px] font-semibold text-[rgba(255,255,255,0.92)]">
            Keine Berechtigung
          </h2>
          <p className="mt-2 text-[13px] text-[rgba(255,255,255,0.60)]">
            Diese Seite ist fuer dein Profil nicht freigeschaltet.
          </p>
          <p className="mt-4 text-[12px] text-[rgba(255,255,255,0.55)]">
            Weiterleitung zu Home in{" "}
            <span className="text-[#2BFE71] font-semibold">
              {redirectSeconds ?? 0}
            </span>{" "}
            Sekunden
          </p>
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
          >
            <i className="fa-solid fa-house" aria-hidden="true" />
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

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
              className="group relative flex h-[320px] w-[260px] flex-col rounded-[18px] p-[3px] text-left"
            >
              <span
                aria-hidden="true"
                className="rainbow-draw pointer-events-none absolute inset-0 rounded-[18px] blur-[2px]"
              />
              <div className="relative z-10 flex h-full w-full overflow-hidden rounded-[15px] bg-[#24262C]">
                <div className="flex w-full flex-col">
                  {item.cover?.url ? (
                    <div className="relative h-[180px] w-full overflow-hidden">
                      <img
                        src={item.cover.url}
                        alt={`${item.title} hero`}
                        className="h-full w-full bg-[#0D0E12] object-cover transition duration-200 group-hover:brightness-90"
                      />
                      {(() => {
                        const badge = getActivityStatusBadge(item.activityStatus ?? null);
                        if (!badge) {
                          return null;
                        }
                        return (
                          <div className="absolute right-5 top-3">
                            <span
                              className={`inline-flex rounded-[10px] px-3 py-1 text-[11px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="h-[180px] w-full bg-[#0D0E12]" />
                  )}
                  <div className="px-[16px] pb-[18px] pt-[14px]">
                    <div className="flex items-center gap-[12px]">
                      {item.logoIcon?.url ? (
                        <div className="h-[48px] w-[48px] overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22]">
                          <img
                            src={item.logoIcon.url}
                            alt={`${item.title} logo`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-[48px] w-[48px] rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22]" />
                      )}
                      <p className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)] line-clamp-1">
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-[12px] text-[12px] leading-[18px] text-[rgba(255,255,255,0.70)] line-clamp-3">
                      {getProjectDescriptionText(item) ?? fallbackProjectDescription}
                    </p>
                  </div>
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
            {sortedProjects.map((item) => (
              <button
                type="button"
                key={item.title}
                onClick={() => onSelectProject(item)}
                className="group relative flex h-[320px] w-[260px] flex-col rounded-[18px] p-[3px] text-left"
              >
                <span
                  aria-hidden="true"
                  className="rainbow-draw pointer-events-none absolute inset-0 rounded-[18px] blur-[2px]"
                />
                <div className="relative z-10 flex h-full w-full overflow-hidden rounded-[15px] bg-[#24262C]">
                  <div className="flex w-full flex-col">
                  {item.cover?.url ? (
                    <div className="relative h-[180px] w-full overflow-hidden">
                      <img
                        src={item.cover.url}
                        alt={`${item.title} hero`}
                        className="h-full w-full bg-[#0D0E12] object-cover transition duration-200 group-hover:brightness-90"
                      />
                      {(() => {
                        const badge = getActivityStatusBadge(item.activityStatus ?? null);
                        if (!badge) {
                          return null;
                        }
                        return (
                          <div className="absolute right-5 top-3">
                            <span
                              className={`inline-flex rounded-[10px] px-3 py-1 text-[11px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="h-[180px] w-full bg-[#0D0E12]" />
                  )}
                  <div className="px-[16px] pb-[18px] pt-[14px]">
                    <div className="flex items-center gap-[12px]">
                        {item.logoIcon?.url ? (
                          <div className="h-[48px] w-[48px] overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22]">
                            <img
                              src={item.logoIcon.url}
                              alt={`${item.title} logo`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-[48px] w-[48px] rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-[#1B1D22]" />
                        )}
                      <p className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)] line-clamp-1">
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-[12px] text-[12px] leading-[18px] text-[rgba(255,255,255,0.70)] line-clamp-3">
                      {getProjectDescriptionText(item) ?? fallbackProjectDescription}
                    </p>
                    </div>
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
    if (!permissionFlags.canAccessProjects) {
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
          {permissionFlags.canCreateProject && (
            <button
              type="button"
              onClick={handleNewProject}
              className="flex items-center gap-2 rounded-[12px] bg-[#2BFE71] px-6 py-3 text-[14px] font-semibold text-[#0D0E12] transition hover:bg-[#25e565]"
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Neues Projekt
            </button>
          )}
        </div>
        {projectDeleteError && (
          <div className="rounded-[12px] border border-[rgba(255,100,100,0.25)] bg-[rgba(255,100,100,0.08)] px-4 py-3 text-[12px] text-[rgba(255,255,255,0.75)]">
            {projectDeleteError}
          </div>
        )}

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
                        {permissionFlags.canEditProject && (
                          <button
                            type="button"
                            onClick={() => handleEditProject(project)}
                            className="flex-1 rounded-[10px] bg-[rgba(43,254,113,0.15)] px-4 py-2.5 text-[12px] font-semibold text-[#2BFE71] transition hover:bg-[rgba(43,254,113,0.25)]"
                          >
                            <i className="fa-solid fa-pen-to-square mr-2" aria-hidden="true" />
                            Bearbeiten
                          </button>
                        )}
                        {permissionFlags.canDeleteProject && (
                          <button
                            type="button"
                            onClick={() => requestDeleteProject(project)}
                            className="rounded-[8px] bg-[#E24C4C] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#F06060]"
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    {(() => {
                      const badge = getActivityStatusBadge(project.activityStatus ?? null);
                      if (!badge) {
                        return null;
                      }
                      return (
                        <div className="absolute right-4 top-4">
                          <div
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur-sm ${badge.className}`}
                          >
                            {badge.label}
                          </div>
                        </div>
                      );
                    })()}
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
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => item.url && openModrinth(item.url)}
                        className="group relative flex h-[320px] w-[260px] flex-col rounded-[18px] p-[3px] text-left"
                      >
                        <span
                          aria-hidden="true"
                          className="rainbow-draw pointer-events-none absolute inset-0 rounded-[18px] blur-[2px]"
                        />
                        <div className="relative z-10 flex h-full w-full overflow-hidden rounded-[15px] bg-[#24262C]">
                          <div className="flex w-full flex-col">
                            {item.coverUrl ? (
                              <div className="relative h-[180px] w-full overflow-hidden">
                                <img
                                  src={item.coverUrl}
                                  alt={`${item.title} hero`}
                                  className="h-full w-full bg-[#0D0E12] object-cover transition duration-200 group-hover:brightness-90"
                                />
                              </div>
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
                                <p className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)] line-clamp-1">
                                  {item.title}
                                </p>
                              </div>
                              <p className="mt-[12px] text-[12px] leading-[18px] text-[rgba(255,255,255,0.70)] line-clamp-3">
                                {item.description ?? fallbackProjectDescription}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
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
        <button
          type="button"
          onClick={() => onNavigate("settings-debug")}
          className="mt-4 rounded-[10px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
        >
          Profil-Debug (Test)
        </button>
        <div className="mt-4 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
              Authz-Test
            </p>
            <button
              type="button"
              onClick={handleAuthzTest}
              disabled={authzTestLoading}
              className="rounded-[10px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71] disabled:opacity-60"
            >
              {authzTestLoading ? "Teste..." : "Authz pruefen"}
            </button>
          </div>
          {authzTestError && (
            <p className="mt-3 text-[12px] text-[rgba(255,100,100,0.85)]">
              {authzTestError}
            </p>
          )}
          {authzFetchError && (
            <p className="mt-2 text-[12px] text-[rgba(255,160,160,0.8)]">
              Authz konnte nicht geladen werden: {authzFetchError}
            </p>
          )}
          {authzResult && !authzTestError && (
            <div className="mt-3 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0D0F14] p-3">
              <pre className="text-[12px] text-[rgba(255,255,255,0.75)] whitespace-pre-wrap">
                {authzResult}
              </pre>
              <div className="mt-3 flex items-center justify-start">
                <button
                  type="button"
                  onClick={handleAuthzCopy}
                  className="rounded-[8px] border border-[rgba(255,255,255,0.14)] px-3 py-1 text-[11px] font-semibold text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-copy" aria-hidden="true" />
                    {authzCopied ? "Kopiert" : "Kopieren"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  if (page === "settings-debug") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-[rgba(255,255,255,0.92)]">
            Profil-Debug
          </h1>
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className="rounded-[10px] border border-[rgba(255,255,255,0.12)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.75)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
          >
            Zurueck
          </button>
        </div>
        <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] p-4">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
            users/{user?.uid}
          </p>
          <pre className="mt-3 text-[12px] text-[rgba(255,255,255,0.75)] whitespace-pre-wrap">
            {userProfileData ? JSON.stringify(userProfileData, null, 2) : "Keine Daten."}
          </pre>
        </div>
      </div>
    );
  }

  if (page === "editor") {
    const canShowProjects = permissionFlags.canAccessProjects;
    const canShowNews = permissionFlags.canAccessNews;
    const canShowEvents = permissionFlags.canAccessCalendar;
    const canShowMedia = permissionFlags.canAccessMedia;
    return (
      <div className="space-y-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Projekte Button - Grün */}
          {canShowProjects && (
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
          )}

          {/* News Button - Blau */}
          {canShowNews && (
          <button
            type="button"
            onClick={() => onNavigate("news")}
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
          )}

          {/* Kalender Events Button - Lila */}
          {canShowEvents && (
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
          )}

          {/* Media Button - Cyan */}
          {canShowMedia && (
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
          )}
        </div>
        {!canShowProjects && !canShowNews && !canShowEvents && !canShowMedia && (
          <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
            Keine Module freigeschaltet.
          </p>
        )}
      </div>
    );
  }

  if (page === "news") {
    if (!permissionFlags.canAccessNews) {
      return (
        <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
          Keine Berechtigung.
        </p>
      );
    }
    return (
      <div className="space-y-8">
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
            onClick={() => setEditorModal("news")}
            className="flex items-center gap-2 rounded-[12px] bg-[#2BFE71] px-6 py-3 text-[14px] font-semibold text-[#0D0E12] transition hover:bg-[#25e565]"
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Neue News
          </button>
        </div>

        <div>
          {newsItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)]">
                <i className="fa-solid fa-newspaper text-[40px] text-[rgba(255,255,255,0.3)]" aria-hidden="true" />
              </div>
              <h3 className="text-[18px] font-semibold text-[rgba(255,255,255,0.85)]">
                Noch keine News
              </h3>
              <p className="mt-2 text-[14px] text-[rgba(255,255,255,0.55)] max-w-md">
                Erstelle deine erste News, um Updates zu teilen
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {newsItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-[20px] p-[3px]"
                >
                  <span
                    aria-hidden="true"
                    className="rainbow-draw pointer-events-none absolute inset-0 rounded-[20px] blur-[2px]"
                  />
                  <div className="relative z-10 overflow-hidden rounded-[17px] bg-[#24262C]">
                    {item.cover?.url ? (
                      <div className="relative h-48 w-full overflow-hidden">
                        <img
                          src={item.cover.url}
                          alt={item.title}
                          className="h-full w-full bg-[#0D0E12] object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#24262C] via-transparent to-transparent opacity-60" />
                      </div>
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center bg-[#0D0E12]">
                        <i className="fa-solid fa-image text-[48px] text-[rgba(255,255,255,0.15)]" aria-hidden="true" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="truncate text-[16px] font-bold text-[rgba(255,255,255,0.95)]">
                          {item.title}
                        </h4>
                        {permissionFlags.canDeleteNews && (
                          <button
                            type="button"
                            onClick={() => requestDeleteNews(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(255,91,91,0.18)] text-[#FF8A8A] shadow-[0_0_0_1px_rgba(255,91,91,0.25)] transition hover:bg-[rgba(255,91,91,0.28)] hover:text-[#FF5B5B]"
                            aria-label="News loeschen"
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[rgba(255,255,255,0.60)] min-h-[54px]">
                        {item.excerpt}
                      </p>
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

  if (page === "media") {
    const canAccessMedia = permissionFlags.canAccessMedia;
    const canUploadMedia = permissionFlags.canUploadMedia;
    const canDeleteMedia = permissionFlags.canDeleteMedia;
    const visibleSections = canAccessMedia ? MEDIA_SECTIONS : [];
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
          {canUploadMedia && (
            <button
              type="button"
              onClick={() => setEditorModal("media")}
              className="flex items-center gap-2 rounded-[12px] bg-[#2BFE71] px-6 py-3 text-[14px] font-semibold text-[#0D0E12] transition hover:bg-[#25e565]"
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Bild hochladen
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1">
          {([
            { id: "all", label: "Alle" },
            { id: "logos", label: "Logos" },
            { id: "banners", label: "Banner" },
            { id: "news-banners", label: "News Banner" },
            { id: "avatars", label: "Avatars" }
          ] as const).map((option) => {
            if (!canAccessMedia) {
              return null;
            }
            const active = mediaFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMediaFilter(option.id)}
                className={`rounded-[8px] border px-4 py-2 text-[12px] font-semibold transition-all duration-300 ${active
                  ? "border-[#2BFE71] bg-[rgba(43,254,113,0.12)] text-[#2BFE71] shadow-[0_0_15px_rgba(43,254,113,0.25)]"
                  : "border-[rgba(255,255,255,0.14)] text-[rgba(255,255,255,0.75)] hover:border-[#2BFE71] hover:text-[#2BFE71] hover:bg-[rgba(43,254,113,0.05)]"
                  }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {canDeleteMedia && selectedMediaIds.length > 0 && (
          <div className="flex items-center justify-between rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#111319] px-4 py-3 animate-[slideDown_0.3s_ease-out]">
            <p className="text-[12px] font-semibold text-[rgba(255,255,255,0.8)] transition-all duration-300">
              {selectedMediaIds.length} ausgewaehlt
            </p>
            <button
              type="button"
              onClick={handleDeleteSelectedMedia}
              className="flex items-center gap-2 rounded-[8px] border border-[rgba(255,255,255,0.14)] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.75)] transition-all duration-300 hover:border-[#FF5B5B] hover:text-[#FF5B5B] hover:bg-[rgba(255,91,91,0.1)] hover:scale-105"
            >
              <i className="fa-solid fa-trash-can" aria-hidden="true" />
              Loeschen
            </button>
          </div>
        )}

        {visibleSections.map((section) => {
          if (mediaFilter !== "all" && mediaFilter !== section.key) {
            return null;
          }
          const items = mediaItems[section.key] ?? [];
          const loading = mediaLoading[section.key] ?? false;
          const error = mediaError[section.key];
          const pageValue = mediaPage[section.key] ?? 1;
          const hasMore = mediaHasMore[section.key] ?? false;
          return (
            <div key={section.key} className="space-y-4 animate-[fadeIn_0.4s_ease-out]">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-[rgba(255,255,255,0.9)] transition-all duration-300">
                  {section.label}
                </h2>
                {section.endpoint ? (
                  <button
                    type="button"
                    onClick={() => fetchMediaPage(section.key, 1, true)}
                    className="rounded-[8px] border border-[rgba(255,255,255,0.14)] px-4 py-2 text-[12px] text-[rgba(255,255,255,0.75)] transition-all duration-300 hover:border-[#2BFE71] hover:text-[#2BFE71] hover:bg-[rgba(43,254,113,0.08)] hover:scale-105"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                        Laden...
                      </span>
                    ) : (
                      "Neu laden"
                    )}
                  </button>
                ) : null}
              </div>

              {error && (
                <div className="rounded-[12px] border border-[rgba(255,100,100,0.25)] bg-[rgba(255,100,100,0.08)] px-4 py-3 text-[12px] text-[rgba(255,255,255,0.75)] flex items-center gap-3 animate-[slideDown_0.3s_ease-out]">
                  <i className="fa-solid fa-circle-exclamation text-[#FF5B5B] text-[16px]" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {!section.endpoint && (
                <div className="flex items-center gap-3 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-[12px] text-[rgba(255,255,255,0.55)] animate-[fadeIn_0.4s_ease-out]">
                  <i className="fa-solid fa-info-circle text-[rgba(255,255,255,0.35)]" aria-hidden="true" />
                  Avatar-Endpoint fehlt noch.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 p-2">
                {loading && items.length === 0 ? (
                  // Skeleton Loading
                  Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={`skeleton-${idx}`}
                      className="relative overflow-hidden rounded-[10px] bg-[#0F1116] animate-pulse"
                    >
                      <div className="aspect-[4/3] w-full bg-gradient-to-r from-[#0F1116] via-[#1A1C22] to-[#0F1116] bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
                    </div>
                  ))
                ) : (
                  items.map((item, index) => {
                    const preview =
                      item.variants?.webpUrl ??
                      item.variants?.originalUrl ??
                      item.variants?.thumbUrl ??
                      item.thumbUrl ??
                      item.url ??
                      null;
                    const id = item.id ?? `${section.key}-${index}`;
                    const isSelected = Boolean(
                      item.id && selectedMediaIds.some((entry) => entry.id === item.id)
                    );
                    return (
                      <div
                        key={id}
                        className={`group relative overflow-hidden rounded-[10px] bg-[#0F1116] transition-all duration-300 animate-[fadeInScale_0.4s_ease-out] ${isSelected ? "ring-2 ring-[#2BFE71] shadow-[0_0_20px_rgba(43,254,113,0.3)]" : "ring-1 ring-transparent hover:ring-[rgba(43,254,113,0.3)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                          }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        {preview ? (
                          <img
                            src={preview}
                            alt={item.id ?? "Media"}
                            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] w-full items-center justify-center text-[11px] text-[rgba(255,255,255,0.35)]">
                            Kein Preview
                          </div>
                        )}
                        {item.id && (
                          <>
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            {canDeleteMedia && (
                              <div className="absolute right-2 top-2 flex gap-2 opacity-0 translate-y-[-10px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                                <button
                                  type="button"
                                  onClick={() => toggleMediaSelection(section.key, item.id!)}
                                  className={`flex h-8 w-8 items-center justify-center rounded-[8px] border text-[12px] transition-all duration-300 transform hover:scale-110 ${isSelected
                                    ? "border-[#2BFE71] bg-[#2BFE71] text-[#0D0E12] shadow-[0_0_15px_rgba(43,254,113,0.5)]"
                                    : "border-[rgba(255,255,255,0.35)] bg-black/40 backdrop-blur-sm text-white hover:border-[#2BFE71] hover:bg-[rgba(43,254,113,0.2)]"
                                    }`}
                                  aria-label="Auswaehlen"
                                >
                                  <i className="fa-solid fa-check" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMedia(section.key, item.id!)}
                                  className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[rgba(255,255,255,0.35)] bg-black/40 backdrop-blur-sm text-[12px] text-white transition-all duration-300 transform hover:scale-110 hover:border-[#FF5B5B] hover:text-[#FF5B5B] hover:bg-[rgba(255,91,91,0.2)]"
                                  aria-label="Loeschen"
                                >
                                  <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {!items.length && !loading && !error && section.endpoint && (
                <div className="flex flex-col items-center justify-center py-12 animate-[fadeIn_0.5s_ease-out]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] mb-4">
                    <i className="fa-solid fa-image text-[28px] text-[rgba(255,255,255,0.25)]" aria-hidden="true" />
                  </div>
                  <p className="text-[13px] text-[rgba(255,255,255,0.55)]">
                    Keine Media-Dateien gefunden.
                  </p>
                </div>
              )}

              {section.endpoint && (
                <div className="flex items-center justify-between mt-2 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                  <div className="text-[11px] text-[rgba(255,255,255,0.45)] transition-all duration-300 flex items-center gap-2">
                    {loading && (
                      <i className="fa-solid fa-spinner fa-spin text-[#2BFE71]" aria-hidden="true" />
                    )}
                    {loading ? "Lade..." : hasMore ? "Weitere verfuegbar" : (
                      <span className="flex items-center gap-2">
                        <i className="fa-solid fa-check text-[#2BFE71]" aria-hidden="true" />
                        Alles geladen
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchMediaPage(section.key, pageValue + 1)}
                    disabled={!hasMore || loading}
                    className="rounded-[8px] border border-[rgba(255,255,255,0.14)] px-4 py-2 text-[12px] text-[rgba(255,255,255,0.75)] transition-all duration-300 hover:border-[#2BFE71] hover:text-[#2BFE71] hover:bg-[rgba(43,254,113,0.08)] hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-transparent"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                        Laden...
                      </span>
                    ) : (
                      "Mehr laden"
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {visibleSections.length === 0 && (
          <div className="text-[12px] text-[rgba(255,255,255,0.55)]">
            Keine Media-Module freigeschaltet.
          </div>
        )}
      </div>
    );
  }

  if (page === "analytics") {
    if (!permissionFlags.canAccessAnalytics) {
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
    if (!permissionFlags.canAccessCalendar) {
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
    if (!permissionFlags.canAccessAdmin && !permissionFlags.isModerator) {
      return (
        <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
          Keine Berechtigung.
        </p>
      );
    }
    const canShowMembers =
      permissionFlags.canAccessMembers || permissionFlags.isModerator;
    const canShowRoles = permissionFlags.canAccessRoles;
    return (
      <div className="space-y-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Member Button - Orange */}
          {canShowMembers && (
            <button
              type="button"
              onClick={() => onNavigate("members")}
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
          )}

          {/* Roles Button - Purple */}
          {canShowRoles && (
            <button
              type="button"
              onClick={() => onNavigate("roles")}
              className="group relative flex flex-col items-center justify-center rounded-[24px] p-[3px] transition-all"
            >
              <span
                aria-hidden="true"
                className="rainbow-draw pointer-events-none absolute inset-0 rounded-[24px] blur-[2px]"
              />
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[21px] bg-[#24262C] p-12">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[rgba(138,91,255,0.2)] text-[#8A5BFF] transition-all">
                  <i className="fa-solid fa-user-shield text-[56px]" aria-hidden="true" />
                </div>
                <h3 className="mt-8 text-[24px] font-bold text-[rgba(255,255,255,0.92)]">
                  Roles
                </h3>
                <p className="mt-3 text-center text-[15px] text-[rgba(255,255,255,0.65)]">
                  Rollen und Berechtigungen verwalten
                </p>
              </div>
            </button>
          )}
        </div>
        {!canShowMembers && !canShowRoles && (
          <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
            Keine Module freigeschaltet.
          </p>
        )}
      </div>
    );
  }

  if (page === "members") {
    if (!permissionFlags.canAccessMembers && !permissionFlags.isModerator) {
      return (
        <p className="text-[13px] text-[rgba(255,255,255,0.60)]">
          Keine Berechtigung.
        </p>
      );
    }
    const canBanUsers = permissionFlags.canBanUsers;
    const canWarnUsers = permissionFlags.canWarnUsers;
    const showActions = canBanUsers || canWarnUsers;
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate("admin")}
            className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.12)] bg-[#16181c] px-4 py-3 text-[14px] font-semibold text-[rgba(255,255,255,0.70)] transition hover:border-[#2BFE71] hover:bg-[rgba(43,254,113,0.1)] hover:text-[#2BFE71]"
            aria-label="Zurueck"
          >
            <i className="fa-solid fa-arrow-left text-[14px]" aria-hidden="true" />
            Zurueck
          </button>
          <p className="text-[13px] text-[rgba(255,255,255,0.55)]">
            {membersLoading ? "Lade..." : `${members.length} Mitglieder`}
          </p>
        </div>

        {membersError && (
          <div className="rounded-[12px] border border-[rgba(255,100,100,0.25)] bg-[rgba(255,100,100,0.08)] px-4 py-3 text-[12px] text-[rgba(255,255,255,0.75)]">
            {membersError}
          </div>
        )}

        <div className="overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#12141A]">
          <div
            className={`grid gap-4 border-b border-[rgba(255,255,255,0.08)] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)] ${showActions
              ? "grid-cols-[1.6fr,1.3fr,1fr,1fr,0.7fr]"
              : "grid-cols-[1.6fr,1.3fr,1fr,1fr]"
              }`}
          >
            <span>User</span>
            <span>UID</span>
            <span>Roles</span>
            <span>Details</span>
            {showActions && <span>Aktionen</span>}
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            {members.map((member) => (
              <div
                key={member.uid}
                className={`grid gap-4 px-4 py-3 text-[12px] text-[rgba(255,255,255,0.75)] ${showActions
                  ? "grid-cols-[1.6fr,1.3fr,1fr,1fr,0.7fr]"
                  : "grid-cols-[1.6fr,1.3fr,1fr,1fr]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={`${member.username ?? "User"} avatar`}
                      className="h-9 w-9 rounded-full border border-[rgba(255,255,255,0.12)] object-cover"
                      onLoad={() =>
                        console.log("Avatar geladen:", member.avatarUrl)
                      }
                      onError={() =>
                        console.warn("Avatar konnte nicht geladen werden:", member.avatarUrl)
                      }
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.8)]">
                      <i className="fa-solid fa-user" aria-hidden="true" />
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-semibold text-[rgba(255,255,255,0.92)]">
                      {member.username ?? "Unbekannt"}
                    </p>
                    <p className="text-[11px] text-[rgba(255,255,255,0.55)]">
                      {member.email ?? "Keine Email"}
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-[rgba(255,255,255,0.6)]">
                  {member.uid}
                </div>
                <div className="text-[11px] text-[rgba(255,255,255,0.6)]">
                  {member.roles && member.roles.length > 0
                    ? member.roles.join(", ")
                    : "—"}
                </div>
                <div className="text-[11px] text-[rgba(255,255,255,0.6)]">
                  {member.minecraftName ? `MC: ${member.minecraftName}` : "—"}
                  {typeof member.level === "number" ? ` · Lvl ${member.level}` : ""}
                  {member.experience ? ` · ${member.experience}` : ""}
                </div>
                {showActions && (
                  <div className="flex items-center gap-2">
                    {canBanUsers && (
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[rgba(255,91,91,0.18)] text-[#FF8A8A] shadow-[0_0_0_1px_rgba(255,91,91,0.25)] transition hover:bg-[rgba(255,91,91,0.28)] hover:text-[#FF5B5B]"
                        title="Bannen"
                        aria-label="Bannen"
                        onClick={() => onOpenBanDialog(member)}
                      >
                        <i className="fa-solid fa-ban" aria-hidden="true" />
                      </button>
                    )}
                    {canWarnUsers && (
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[rgba(255,209,102,0.18)] text-[#FFD166] shadow-[0_0_0_1px_rgba(255,209,102,0.25)] transition hover:bg-[rgba(255,209,102,0.28)] hover:text-[#FFC857]"
                        title="Warnen"
                        aria-label="Warnen"
                        onClick={() => onOpenWarnDialog(member)}
                      >
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!membersLoading && !members.length && !membersError && (
              <div className="px-4 py-6 text-[12px] text-[rgba(255,255,255,0.55)]">
                Keine Mitglieder gefunden.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (page === "roles") {
    if (!permissionFlags.canAccessRoles) {
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
            onClick={() => onNavigate("admin")}
            className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.12)] bg-[#16181c] px-4 py-3 text-[14px] font-semibold text-[rgba(255,255,255,0.70)] transition hover:border-[#2BFE71] hover:bg-[rgba(43,254,113,0.1)] hover:text-[#2BFE71]"
            aria-label="Zurueck"
          >
            <i className="fa-solid fa-arrow-left text-[14px]" aria-hidden="true" />
            Zurueck
          </button>
        </div>
        <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0F1116] p-4">
          <p className="text-[13px] text-[rgba(255,255,255,0.65)]">
            Roles-Verwaltung kommt noch.
          </p>
        </div>
      </div>
    );
  }

  if (page === "profile") {
    if (!user && !oauthIsAuthenticated) {
      if (showLoginForm) {
        return (
          <LoginView
            onLogin={onLogin}
            onOAuthLogin={onOAuthLogin}
            loading={loginLoading}
            oauthLoading={oauthLoginLoading}
            error={loginError}
          />
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

    if (!user && oauthIsAuthenticated) {
      const expiresLabel =
        typeof oauthExpiresAt === "number"
          ? new Date(oauthExpiresAt * 1000).toLocaleString()
          : null;
      return (
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#13151A] px-[16px] py-[14px]">
          <p className="text-[14px] font-semibold text-[rgba(255,255,255,0.92)]">
            Profil
          </p>
          <p className="mt-[6px] text-[12px] text-[rgba(255,255,255,0.60)]">
            Status:{" "}
            <span className="text-[#2BFE71] font-semibold">
              {oauthAuthReady ? "OAuth angemeldet" : "OAuth wird geprueft..."}
            </span>
          </p>
          {authzUid && (
            <p className="mt-[6px] text-[12px] text-[rgba(255,255,255,0.60)]">
              UID: <span className="text-[rgba(255,255,255,0.85)]">{authzUid}</span>
            </p>
          )}
          {expiresLabel && (
            <p className="mt-[6px] text-[12px] text-[rgba(255,255,255,0.60)]">
              Token Ablauf:{" "}
              <span className="text-[rgba(255,255,255,0.85)]">{expiresLabel}</span>
            </p>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="mt-[12px] rounded-full border border-[rgba(255,255,255,0.12)] bg-[#16181c] px-4 py-2 text-[12px] font-semibold text-[rgba(255,255,255,0.85)] transition hover:border-[#2BFE71] hover:text-[#2BFE71]"
          >
            Abmelden
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
