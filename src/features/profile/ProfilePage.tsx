import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useProfileStore } from "./profileStore";
import type { UserProfile, ProfileStats, Activity, Achievement, SocialLinks } from "./types";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileBanner } from "./components/ProfileBanner";
import { ProjectsTab } from "./components/ProjectsTab";

type CosmeticCatalogEntry = {
  displayName: string;
  type: string | null;
};

export interface ProfilePageProps {
  onLogout?: () => Promise<void> | void;
}

export function ProfilePage({ onLogout }: ProfilePageProps) {
  const {
    profile,
    setProfile,
    setStats,
    setActivities,
    setAchievements,
    setSocialLinks,
    setLoading,
    updateProfile,
  } = useProfileStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editMinecraftName, setEditMinecraftName] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editInterests, setEditInterests] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [interestsInput, setInterestsInput] = useState("");
  const [profileToastMessage, setProfileToastMessage] = useState<string | null>(null);
  const [profileToastVariant, setProfileToastVariant] = useState<"success" | "error">("success");
  const [profileToastVisible, setProfileToastVisible] = useState(false);
  const [profileToastProgress, setProfileToastProgress] = useState(0);
  const [framePickerOpen, setFramePickerOpen] = useState(false);
  const [equippedFrameId, setEquippedFrameId] = useState("");
  const [selectedFrameId, setSelectedFrameId] = useState("");
  const [frameCatalog, setFrameCatalog] = useState<Record<string, CosmeticCatalogEntry>>({});
  const [frameCatalogLoaded, setFrameCatalogLoaded] = useState(false);
  const [unlockedFrameIds, setUnlockedFrameIds] = useState<string[]>([]);
  const [frameSaving, setFrameSaving] = useState(false);
  const showProfileToast = (
    message: string,
    variant: "success" | "error" = "success"
  ) => {
    setProfileToastMessage(message);
    setProfileToastVariant(variant);
    setProfileToastVisible(true);
    setProfileToastProgress(1);
    const startedAt = Date.now();
    const duration = 3200;
    window.setTimeout(() => {
      setProfileToastVisible(false);
    }, duration - 250);
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.max(0, 1 - elapsed / duration);
      setProfileToastProgress(next);
      if (next <= 0) {
        window.clearInterval(intervalId);
        setProfileToastMessage((current) => (current === message ? null : current));
      }
    }, 40);
  };
  const normalizeProjectIds = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    const ids = value
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (entry && typeof entry === "object") {
          const record = entry as Record<string, unknown>;
          const candidate = record.id ?? record.projectId ?? record.project_id ?? null;
          return typeof candidate === "string" ? candidate.trim() : "";
        }
        return "";
      })
      .filter((id): id is string => Boolean(id));
    return Array.from(new Set(ids));
  };

  const avatarUrlFromMediaId = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/-original$/i, "");
    return `https://api.vision-projects.eu/media/${normalized}/thumb`;
  };
  const resolveAvatarUrl = (
    currentPhotoUrl: string | null | undefined,
    record: Record<string, unknown>
  ): string | null => {
    const minecraftName =
      (typeof record.minecraftName === "string" && record.minecraftName.trim()) ||
      (typeof record.minecraft_name === "string" && record.minecraft_name.trim()) ||
      null;
    if (minecraftName) {
      return `https://mc-heads.net/avatar/${encodeURIComponent(minecraftName)}/100`;
    }
    const avatarMediaId =
      (typeof record.avatarMediaId === "string" && record.avatarMediaId.trim()) ||
      (typeof record.avatar_media_id === "string" && record.avatar_media_id.trim()) ||
      null;
    const mediaAvatarUrl = avatarUrlFromMediaId(avatarMediaId);
    const explicitAvatarUrl =
      (typeof record.avatarUrl === "string" && record.avatarUrl.trim()) ||
      (typeof record.avatar_url === "string" && record.avatar_url.trim()) ||
      (typeof record.photoURL === "string" && record.photoURL.trim()) ||
      (typeof record.photoUrl === "string" && record.photoUrl.trim()) ||
      null;
    const discordAvatarUrl =
      (typeof record.discordAvatar === "string" && record.discordAvatar.trim()) ||
      (typeof record.discord_avatar === "string" && record.discord_avatar.trim()) ||
      null;
    return currentPhotoUrl || explicitAvatarUrl || discordAvatarUrl || mediaAvatarUrl || null;
  };
  const resolveFrameUrl = (record: Record<string, unknown>): string | null => {
    const cosmetics =
      typeof record.cosmetics === "object" && record.cosmetics !== null
        ? (record.cosmetics as Record<string, unknown>)
        : null;
    const equippedCosmeticCandidate =
      (typeof record.equippedCosmetic === "object" && record.equippedCosmetic !== null
        ? (record.equippedCosmetic as Record<string, unknown>)
        : null) ||
      (typeof record.equipedCosmetic === "object" && record.equipedCosmetic !== null
        ? (record.equipedCosmetic as Record<string, unknown>)
        : null) ||
      (typeof record.equipped_cosmetic === "object" && record.equipped_cosmetic !== null
        ? (record.equipped_cosmetic as Record<string, unknown>)
        : null);
    const equippedFrameId =
      (typeof equippedCosmeticCandidate?.frame === "string" && equippedCosmeticCandidate.frame.trim()) ||
      (typeof equippedCosmeticCandidate?.frameId === "string" && equippedCosmeticCandidate.frameId.trim()) ||
      (typeof equippedCosmeticCandidate?.frame_id === "string" && equippedCosmeticCandidate.frame_id.trim()) ||
      null;
    const ownedFrames = Array.isArray(cosmetics?.frames)
      ? cosmetics.frames.filter(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
      )
      : [];
    const normalizedOwnedFrames = new Set(ownedFrames.map((entry) => entry.trim()));
    const frameId =
      equippedFrameId && normalizedOwnedFrames.has(equippedFrameId)
        ? equippedFrameId
        : null;
    return frameId
      ? `https://api.vision-projects.eu/media/${encodeURIComponent(frameId)}`
      : null;
  };
  const resolveEquippedFrameId = (record: Record<string, unknown>): string => {
    const equippedCosmeticCandidate =
      (typeof record.equippedCosmetic === "object" && record.equippedCosmetic !== null
        ? (record.equippedCosmetic as Record<string, unknown>)
        : null) ||
      (typeof record.equipedCosmetic === "object" && record.equipedCosmetic !== null
        ? (record.equipedCosmetic as Record<string, unknown>)
        : null) ||
      (typeof record.equipped_cosmetic === "object" && record.equipped_cosmetic !== null
        ? (record.equipped_cosmetic as Record<string, unknown>)
        : null);
    return (
      (typeof equippedCosmeticCandidate?.frame === "string" && equippedCosmeticCandidate.frame.trim()) ||
      (typeof equippedCosmeticCandidate?.frameId === "string" && equippedCosmeticCandidate.frameId.trim()) ||
      (typeof equippedCosmeticCandidate?.frame_id === "string" && equippedCosmeticCandidate.frame_id.trim()) ||
      ""
    );
  };

  const toDateSafe = (value: unknown): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === "object" && value !== null) {
      const withToDate = value as { toDate?: () => Date };
      if (typeof withToDate.toDate === "function") {
        const result = withToDate.toDate();
        if (result instanceof Date && !Number.isNaN(result.getTime())) return result;
      }
      const withSeconds = value as { seconds?: number };
      if (typeof withSeconds.seconds === "number") {
        const fromSeconds = new Date(withSeconds.seconds * 1000);
        if (!Number.isNaN(fromSeconds.getTime())) return fromSeconds;
      }
    }
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return undefined;
  };

  const toNumberSafe = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  // Load user profile data from Firebase
  useEffect(() => {
    const loadProfileData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      console.info("[profile] start loading", { uid: currentUser.uid });
      setLoading(true);

      try {
        // Use users/{uid} as primary profile source, fallback to members/{uid}
        const usersDocRef = doc(db, "users", currentUser.uid);
        const usersDoc = await getDoc(usersDocRef);
        const membersDocRef = doc(db, "members", currentUser.uid);
        const membersDoc = usersDoc.exists() ? null : await getDoc(membersDocRef);
        const userDoc = usersDoc.exists() ? usersDoc : membersDoc;
        console.info("[profile] source resolved", {
          source: usersDoc.exists() ? "users" : membersDoc?.exists() ? "members" : "none"
        });
        const levels = await getDocs(collection(db, "levels"))
          .then((levelsSnapshot) =>
            levelsSnapshot.docs
              .map((levelDoc) => {
                const record = levelDoc.data() as Record<string, unknown>;
                const levelNumber =
                  toNumberSafe(record.level) ?? toNumberSafe(levelDoc.id);
                const xpRequired = toNumberSafe(record.xpRequired ?? record.xprequired);
                const title =
                  typeof record.title === "string" && record.title.trim()
                    ? record.title.trim()
                    : levelNumber !== null
                      ? `Level ${levelNumber}`
                      : null;
                if (levelNumber === null || xpRequired === null) {
                  return null;
                }
                return { level: levelNumber, xpRequired, title };
              })
              .filter(
                (entry): entry is { level: number; xpRequired: number; title: string | null } =>
                  Boolean(entry)
              )
              .sort((a, b) => a.level - b.level)
          )
          .then((entries) => {
            console.info("[profile] levels loaded", { count: entries.length });
            showProfileToast(`Levels geladen: ${entries.length}`, "success");
            return entries;
          })
          .catch((error) => {
            console.warn("Could not load levels collection for profile XP", error);
            showProfileToast("Levels konnten nicht geladen werden.", "error");
            return [];
          });
        let currentStats: ProfileStats;

        if (userDoc?.exists()) {
          const data = userDoc.data();
          const resolvedEquippedFrame = resolveEquippedFrameId(data);
          const profileAvatarUrl = resolveAvatarUrl(currentUser.photoURL, data);
          const userLevel = typeof data.level === "number" && data.level > 0 ? data.level : 1;
          const previousLevelEntry =
            levels.find((entry) => entry.level === Math.max(1, userLevel - 1)) ?? null;
          const currentLevelEntry = levels.find((entry) => entry.level === userLevel) ?? null;
          const nextLevelEntry = levels.find((entry) => entry.level === userLevel + 1) ?? null;
          const avatarMediaId =
            (typeof data.avatarMediaId === "string" && data.avatarMediaId) ||
            (typeof data.avatar_media_id === "string" && data.avatar_media_id) ||
            null;
          const frameUrl = resolveFrameUrl(data);
          const userProfile: UserProfile = {
            uid: currentUser.uid,
            username: data.username || null,
            displayName: currentUser.displayName || data.displayName || null,
            age: typeof data.age === "number" ? data.age : null,
            email: currentUser.email || null,
            photoURL: profileAvatarUrl,
            bio: data.bio || null,
            minecraftName: data.minecraftName || null,
            roles: data.roles || [],
            level: userLevel,
            xpTotal: toNumberSafe(data.xp),
            experience: data.experience || null,
            xpDisplay:
              (typeof data.xp_display === "string" && data.xp_display) ||
              (typeof data.xpDisplay === "string" && data.xpDisplay) ||
              null,
            currentLevelTitle: currentLevelEntry?.title ?? null,
            nextLevelTitle: nextLevelEntry?.title ?? null,
            currentLevelXpRequired:
              previousLevelEntry?.xpRequired ?? (userLevel <= 1 ? 0 : null),
            nextLevelXpRequired: currentLevelEntry?.xpRequired ?? null,
            avatarMediaId,
            avatarUrl: profileAvatarUrl,
            frameUrl,
            projects: normalizeProjectIds(data.projects),
            createdAt: toDateSafe(data.createdAt),
            updatedAt: toDateSafe(data.updatedAt),
          };
          console.info("[profile] user profile loaded", {
            source: usersDoc.exists() ? "users" : "members",
            level: userProfile.level,
            xpTotal: userProfile.xpTotal
          });
          setProfile(userProfile);
          setEquippedFrameId(resolvedEquippedFrame);
          const interests = Array.isArray(data.interests)
            ? (data.interests as unknown[]).filter((value): value is string => typeof value === "string")
            : [];
          setInterestsInput(interests.join(", "));

          // Calculate stats
          const projectCount = normalizeProjectIds(data.projects).length;
          currentStats = {
            projectCount,
            totalCommits: data.totalCommits || 0,
            currentStreak: data.currentStreak || 0,
            longestStreak: data.longestStreak || 0,
            contributionScore: data.contributionScore || projectCount * 10,
            lastActiveDate: toDateSafe(data.lastActiveDate) || new Date(),
          };
          setStats(currentStats);

          // Load social links
          const links: SocialLinks = {
            discord: data.discord || undefined,
            github: data.github || undefined,
            twitter: data.twitter || undefined,
            website: data.website || undefined,
            youtube: data.youtube || undefined,
            twitch: data.twitch || undefined,
          };
          setSocialLinks(links);
          showProfileToast("Profil geladen.", "success");
        } else {
          // Create basic profile from auth data
          const basicProfile: UserProfile = {
            uid: currentUser.uid,
            username: null,
            displayName: currentUser.displayName,
            age: null,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            bio: null,
            minecraftName: null,
            roles: [],
            level: 1,
            xpTotal: null,
            experience: null,
            xpDisplay: null,
            currentLevelTitle: null,
            nextLevelTitle: null,
            currentLevelXpRequired: null,
            nextLevelXpRequired: null,
            avatarMediaId: null,
            avatarUrl: null,
            frameUrl: null,
            projects: [],
          };
          setProfile(basicProfile);
          setEquippedFrameId("");
          setInterestsInput("");

          currentStats = {
            projectCount: 0,
            totalCommits: 0,
            currentStreak: 0,
            longestStreak: 0,
            contributionScore: 0,
            lastActiveDate: null,
          };
          setStats(currentStats);
          console.info("[profile] no firestore profile found, using auth fallback");
          showProfileToast("Kein Firestore-Profil gefunden. Fallback aktiv.", "success");
        }

        // Load recent activities (mock data for now)
        await loadActivities(currentUser.uid);

        // Load achievements (mock data for now)
        loadAchievements(currentStats.projectCount, currentStats.totalCommits);
      } catch (error) {
        console.error("Error loading profile:", error);
        showProfileToast("Profil konnte nicht geladen werden.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [setProfile, setStats, setSocialLinks, setLoading, setActivities, setAchievements]);

  const loadFrameCatalog = async () => {
    if (frameCatalogLoaded) {
      return;
    }
    try {
      const response = await fetch("https://api.vision-projects.eu/api/media/cosmetics/frames?page=1&limit=50");
      if (!response.ok) {
        const message = (await response.text()) || `HTTP ${response.status}`;
        throw new Error(message);
      }
      const raw = (await response.json()) as unknown;
      const items = Array.isArray((raw as { items?: unknown[] })?.items)
        ? ((raw as { items: unknown[] }).items ?? [])
        : Array.isArray(raw)
          ? raw
          : [];
      const mapped = items.reduce<Record<string, CosmeticCatalogEntry>>((acc, entry) => {
        const record = entry as Record<string, unknown>;
        const id =
          (typeof record.id === "string" && record.id.trim()) ||
          (typeof record.cosmeticId === "string" && record.cosmeticId.trim()) ||
          (typeof record.cosmetic_id === "string" && record.cosmetic_id.trim()) ||
          "";
        if (!id) {
          return acc;
        }
        const displayName =
          (typeof record.displayName === "string" && record.displayName.trim()) ||
          (typeof record.display_name === "string" && record.display_name.trim()) ||
          (typeof record.name === "string" && record.name.trim()) ||
          id;
        const type =
          (typeof record.type === "string" && record.type.trim()) ||
          (typeof record.cosmeticType === "string" && record.cosmeticType.trim()) ||
          (typeof record.cosmetic_type === "string" && record.cosmetic_type.trim()) ||
          null;
        acc[id] = { displayName, type };
        return acc;
      }, {});
      setFrameCatalog(mapped);
      setFrameCatalogLoaded(true);
    } catch (error) {
      console.error("Could not load cosmetics catalog:", error);
      showProfileToast("Frame-Liste konnte nicht geladen werden.", "error");
    }
  };

  const loadUnlockedFrames = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("https://api.vision-projects.eu/api/profile/cosmetics/frames", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const message = (await response.text()) || `HTTP ${response.status}`;
        throw new Error(message);
      }
      const raw = (await response.json()) as unknown;
      const rawItems = Array.isArray((raw as { items?: unknown[] })?.items)
        ? ((raw as { items: unknown[] }).items ?? [])
        : Array.isArray(raw)
          ? raw
          : [];
      const ids = Array.from(
        new Set(
          rawItems
            .map((entry) => {
              if (typeof entry === "string") return entry.trim();
              if (entry && typeof entry === "object") {
                const record = entry as Record<string, unknown>;
                return (
                  (typeof record.id === "string" && record.id.trim()) ||
                  (typeof record.cosmeticId === "string" && record.cosmeticId.trim()) ||
                  (typeof record.cosmetic_id === "string" && record.cosmetic_id.trim()) ||
                  ""
                );
              }
              return "";
            })
            .filter(Boolean)
        )
      );
      setUnlockedFrameIds(ids);
    } catch (error) {
      console.error("Could not load unlocked frame cosmetics:", error);
      showProfileToast("Freigeschaltete Frames konnten nicht geladen werden.", "error");
      setUnlockedFrameIds([]);
    }
  };

  const openFramePicker = (_anchor: { x: number; y: number }) => {
    setSelectedFrameId(equippedFrameId);
    setFramePickerOpen(true);
    void loadFrameCatalog();
    void loadUnlockedFrames();
  };

  const applyFrameSelection = async (nextFrameId: string) => {
    if (!profile) {
      return;
    }
    if (nextFrameId && !unlockedFrameIds.includes(nextFrameId)) {
      showProfileToast("Dieser Frame ist nicht freigeschaltet.", "error");
      return;
    }
    setFrameSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Nicht angemeldet.");
      }
      if (nextFrameId) {
        const token = await currentUser.getIdToken();
        const response = await fetch("https://api.vision-projects.eu/api/profile/equipped-cosmetic/frame", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ cosmeticId: nextFrameId })
        });
        if (!response.ok) {
          const message = (await response.text()) || `HTTP ${response.status}`;
          throw new Error(message);
        }
      } else {
        const token = await currentUser.getIdToken();
        const response = await fetch("https://api.vision-projects.eu/api/profile/equipped-cosmetic/frame", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });
        if (!response.ok) {
          const message = (await response.text()) || `HTTP ${response.status}`;
          throw new Error(message);
        }
      }
      setEquippedFrameId(nextFrameId);
      updateProfile({
        frameUrl: nextFrameId
          ? `https://api.vision-projects.eu/media/${encodeURIComponent(nextFrameId)}`
          : null
      });
      setFramePickerOpen(false);
      showProfileToast("Frame gespeichert.", "success");
    } catch (error) {
      console.error("Could not save frame selection:", error);
      showProfileToast("Frame konnte nicht gespeichert werden.", "error");
    } finally {
      setFrameSaving(false);
    }
  };

  const frameOptions = Object.entries(frameCatalog)
    .map(([id, meta]) => ({
      id,
      displayName: meta.displayName ?? id,
      type: meta.type ?? null,
      unlocked: unlockedFrameIds.includes(id)
    }))
    .filter((entry) => !entry.type || entry.type.toLowerCase() === "frame");
  const frameGridOptions = [
    { id: "", displayName: "Ohne Frame", unlocked: true },
    ...frameOptions.map((entry) => ({ id: entry.id, displayName: entry.displayName, unlocked: entry.unlocked }))
  ];

  const loadActivities = async (uid: string) => {
    const sampleActivities: Activity[] = [
      {
        id: "1",
        type: "joined",
        title: "Joined Vision",
        description: "Welcome to the team!",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    ];

    try {
      const projectsRef = collection(db, "projects");
      const q = query(
        projectsRef,
        where("members", "array-contains", uid),
        orderBy("updatedAt", "desc"),
        limit(5)
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sampleActivities.unshift({
          id: doc.id,
          type: "project_updated",
          title: `Updated ${data.name}`,
          description: data.description || "Project activity",
          timestamp: data.updatedAt?.toDate() || new Date(),
        });
      });
    } catch (error) {
      console.log("Could not fetch project activities:", error);
    }

    setActivities(sampleActivities.slice(0, 10));
  };

  const loadAchievements = (projectCount: number, commitCount: number) => {
    const achievementList: Achievement[] = [
      {
        id: "first-project",
        name: "First Project",
        description: "Create your first project",
        icon: "fa-rocket",
        color: "bg-accent/20 text-accent",
        earned: projectCount >= 1,
        earnedDate: projectCount >= 1 ? new Date() : undefined,
      },
      {
        id: "project-master",
        name: "Project Master",
        description: "Create 5 projects",
        icon: "fa-folder-open",
        color: "bg-blue-500/20 text-blue-400",
        earned: projectCount >= 5,
        progress: projectCount,
        maxProgress: 5,
      },
      {
        id: "first-commit",
        name: "First Commit",
        description: "Make your first commit",
        icon: "fa-code-commit",
        color: "bg-purple-500/20 text-purple-400",
        earned: commitCount >= 1,
        earnedDate: commitCount >= 1 ? new Date() : undefined,
      },
      {
        id: "commit-champion",
        name: "Commit Champion",
        description: "Make 100 commits",
        icon: "fa-fire",
        color: "bg-orange-500/20 text-orange-400",
        earned: commitCount >= 100,
        progress: commitCount,
        maxProgress: 100,
      },
      {
        id: "team-player",
        name: "Team Player",
        description: "Collaborate on a project",
        icon: "fa-users",
        color: "bg-green-500/20 text-green-400",
        earned: false,
        progress: 0,
        maxProgress: 1,
      },
      {
        id: "veteran",
        name: "Veteran",
        description: "Be a member for 30 days",
        icon: "fa-medal",
        color: "bg-yellow-500/20 text-yellow-400",
        earned: false,
        progress: 7,
        maxProgress: 30,
      },
    ];

    setAchievements(achievementList);
  };

  const handleAvatarUpload = async (fileUrl: string) => {
    if (!profile) return;
    try {
      setIsSaving(true);
      updateProfile({ photoURL: fileUrl });
      const userDocRef = doc(db, "members", profile.uid);
      await updateDoc(userDocRef, { avatarUrl: fileUrl });
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDisplayName = async (newName: string) => {
    if (!profile) return;
    try {
      setIsSaving(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Nicht angemeldet.");
      }
      const token = await currentUser.getIdToken();
      const response = await fetch("https://api.vision-projects.eu/api/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ displayName: newName.trim() })
      });
      if (!response.ok) {
        const message = (await response.text()) || `HTTP ${response.status}`;
        throw new Error(message);
      }
      updateProfile({ displayName: newName.trim() });
    } catch (error) {
      console.error("Error updating display name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName || profile.username || "");
    setEditAge(typeof profile.age === "number" ? String(profile.age) : "");
    setEditMinecraftName(profile.minecraftName || "");
    setEditExperience(profile.experience || "");
    setEditBio(profile.bio || "");
    setEditInterests(interestsInput);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfileModal = async () => {
    if (!profile) return;
    setEditError(null);
    setIsSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Nicht angemeldet.");
      }
      const nextDisplayName = editDisplayName.trim();
      const nextAgeRaw = editAge.trim();
      const parsedAge = nextAgeRaw ? Number(nextAgeRaw) : null;
      if (nextAgeRaw && (parsedAge === null || !Number.isFinite(parsedAge) || parsedAge <= 0)) {
        throw new Error("Bitte ein gÃƒÆ’Ã‚Â¼ltiges Alter eingeben.");
      }
      const nextAge = parsedAge;
      const nextMinecraftName = editMinecraftName.trim();
      const nextExperience = editExperience.trim();
      const nextBio = editBio.trim();
      const nextInterests = editInterests
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const token = await currentUser.getIdToken();
      const response = await fetch("https://api.vision-projects.eu/api/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          displayName: nextDisplayName || null,
          age: nextAge,
          minecraftName: nextMinecraftName || null,
          experience: nextExperience || null,
          bio: nextBio || null,
          interests: nextInterests
        })
      });
      if (!response.ok) {
        const message = (await response.text()) || `HTTP ${response.status}`;
        throw new Error(message);
      }
      updateProfile({
        displayName: nextDisplayName || null,
        age: nextAge,
        minecraftName: nextMinecraftName || null,
        experience: nextExperience || null,
        bio: nextBio || null
      });
      setInterestsInput(nextInterests.join(", "));
      setIsEditModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
      setEditError(message);
      console.error("Error saving profile modal:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!auth.currentUser) {
    return (
      <div className="space-y-8">
        <header>
          <p className="text-sm text-muted">Account</p>
          <h1 className="text-3xl font-semibold">Profile</h1>
        </header>
        <div className="glass rounded-3xl p-12 text-center">
          <i className="fas fa-user-slash text-6xl text-muted mb-4"></i>
          <p className="text-xl text-muted mb-2">Not Logged In</p>
          <p className="text-sm text-muted">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Banner */}
      <ProfileBanner profile={profile} />

      <div className="max-w-7xl mx-auto">
        <div className="relative z-20 -mt-16 px-4 md:-mt-20">
          <div className="rounded-3xl border border-white/10 bg-[#12141A]/95 p-3 md:p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <ProfileHeader
                isEditable={true}
                onAvatarUpload={handleAvatarUpload}
                onUpdateDisplayName={handleUpdateDisplayName}
                onAvatarClick={openFramePicker}
              />
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <button
                  onClick={openEditModal}
                  className="cta-secondary flex items-center gap-2 px-5 py-2.5 text-[13px]"
                >
                  <i className="fas fa-pen mr-2"></i>
                  Edit
                </button>
                <button
                  onClick={() => void onLogout?.()}
                  className="cta-secondary flex items-center gap-2 px-5 py-2.5 text-[13px] hover:border-red-400/70 hover:bg-red-500/15 hover:text-red-200"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 mb-8">
          <div className="h-4" />
        </div>

        {/* Projects */}
        <div className="px-4">
          <ProjectsTab profile={profile} />
        </div>
      </div>


      {/* Saving Indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 glass rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg z-50">
          <i className="fas fa-spinner fa-spin text-accent"></i>
          <span className="text-sm font-medium">Saving changes...</span>
        </div>
      )}
      {profileToastMessage && (
        <div
          className={`fixed bottom-6 left-1/2 z-[80] w-max max-w-[min(680px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-[14px] border px-4 py-3 text-[12px] font-semibold shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-[6px] transition-all duration-300 ${profileToastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            } ${profileToastVariant === "success"
              ? "border-[rgba(46,204,113,0.32)] bg-[rgba(18,34,25,0.94)] text-[#92FFC0]"
              : "border-[rgba(255,91,91,0.32)] bg-[rgba(44,16,16,0.94)] text-[#FFB0B0]"
            }`}
        >
          <span className="block whitespace-pre-wrap leading-[16px] text-center">
            {profileToastMessage}
          </span>
          <span
            className={`pointer-events-none absolute bottom-0 left-0 h-[3px] transition-[width] ${profileToastVariant === "success" ? "bg-[#2BFE71]" : "bg-[#FF5B5B]"
              }`}
            style={{ width: `${profileToastProgress * 100}%` }}
          />
        </div>
      )}

      <div className="group fixed bottom-5 right-[316px] z-40 hidden lg:flex">
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0F1116]/92 text-[rgba(255,255,255,0.52)] transition group-hover:border-[#2BFE71]/45 group-hover:text-[#2BFE71]">
            <i className="fas fa-question text-[12px]" aria-hidden="true" />
          </div>
          <div className="pointer-events-none absolute bottom-10 right-0 w-[260px] rounded-xl border border-white/10 bg-[#12141A]/96 px-3 py-2 text-[11px] leading-[17px] text-[rgba(255,255,255,0.68)] opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition duration-150 group-hover:opacity-100">
            Die vollstÃƒÆ’Ã‚Â¤ndige Profilverwaltung ist auf der Website unter{" "}
            <span className="font-medium text-[rgba(255,255,255,0.9)]">
              vision-projects.eu/accounting/profile
            </span>
            {" "}erreichbar.
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#12141A] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Profil bearbeiten</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="h-8 w-8 rounded-md border border-white/15 text-sm text-muted transition hover:bg-white/10 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted">Display Name</p>
                <input
                  value={editDisplayName}
                  onChange={(event) => setEditDisplayName(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface-2/60 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/70"
                  placeholder="Display Name"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted">Age</p>
                  <input
                    value={editAge}
                    onChange={(event) => setEditAge(event.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-white/10 bg-surface-2/60 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/70"
                    placeholder="21"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted">Minecraft Name</p>
                  <input
                    value={editMinecraftName}
                    onChange={(event) => setEditMinecraftName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface-2/60 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/70"
                    placeholder="Blizz606"
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted">Experience</p>
                <textarea
                  value={editExperience}
                  onChange={(event) => setEditExperience(event.target.value)}
                  className="h-20 w-full resize-none rounded-xl border border-white/10 bg-surface-2/60 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/70"
                  placeholder="3 Jahre Builder/Dev"
                />
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted">Bio</p>
                <textarea
                  value={editBio}
                  onChange={(event) => setEditBio(event.target.value)}
                  className="h-24 w-full resize-none rounded-xl border border-white/10 bg-surface-2/60 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/70"
                  placeholder="Kurzbeschreibung..."
                />
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted">Interessen</p>
                <input
                  value={editInterests}
                  onChange={(event) => setEditInterests(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface-2/60 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/70"
                  placeholder="Interessen, mit, Komma, trennen"
                />
              </div>
              {editError && <p className="text-xs text-red-400">{editError}</p>}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="cta-secondary px-4 py-2 text-[12px]"
              >
                Abbrechen
              </button>
              <button
                onClick={() => void handleSaveProfileModal()}
                className="cta-primary px-4 py-2 text-[12px]"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
      {framePickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#070D18]/80 backdrop-blur-md transition-opacity"
            onClick={() => !frameSaving && setFramePickerOpen(false)}
          />
          <div className="relative w-full max-w-[760px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0B101A] shadow-[0_0_80px_rgba(43,254,113,0.05),_0_30px_90px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">

            {/* Header Section */}
            <div className="relative border-b border-white/[0.04] bg-white/[0.01] px-6 py-5">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-[20px] font-bold text-white tracking-tight">
                    Avatar Frame
                  </h3>
                  <p className="mt-1 text-[13px] text-white/40">
                    Wähle einen Rahmen aus, um deinen Avatar im Chat und Profil hervorzuheben.
                  </p>
                </div>
                <button
                  onClick={() => setFramePickerOpen(false)}
                  disabled={frameSaving}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  <i className="fas fa-times text-[13px]"></i>
                </button>
              </div>
            </div>

            {/* Grid Section */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {frameGridOptions.map((option) => {
                  const isSelected = option.id === selectedFrameId;
                  const isUnlocked = option.unlocked;
                  const optionFrameUrl = option.id
                    ? `https://api.vision-projects.eu/media/${encodeURIComponent(option.id)}`
                    : null;

                  return (
                    <button
                      key={option.id || "none"}
                      type="button"
                      onClick={() => {
                        if (!isUnlocked) return;
                        setSelectedFrameId(option.id);
                      }}
                      disabled={frameSaving || !isUnlocked}
                      className={`group relative flex flex-col items-center rounded-[20px] p-5 transition-all duration-300 ${isSelected
                        ? "bg-[#2BFE71]/[0.08] shadow-[0_0_0_1px_rgba(43,254,113,0.35)]"
                        : isUnlocked
                          ? "bg-transparent hover:bg-white/[0.04]"
                          : "bg-transparent opacity-65"
                        }`}
                    >
                      {!isUnlocked && (
                        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-white/85">
                          <i className="fas fa-lock text-[9px]" aria-hidden="true" />
                        </div>
                      )}
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#2BFE71] text-[#070D18] shadow-[0_0_10px_rgba(43,254,113,0.4)]">
                          <i className="fas fa-check text-[10px]"></i>
                        </div>
                      )}

                      {/* Avatar Preview */}
                      <div className="relative mb-4 mt-2 flex h-[90px] w-[90px] shrink-0 items-center justify-center">
                        <img
                          src={profile?.photoURL || "https://mc-heads.net/avatar/Steve/100"}
                          alt="Avatar Preview"
                          className={`h-[72px] w-[72px] rounded-full object-cover transition-transform duration-300 ${
                            isUnlocked ? "group-hover:scale-105" : ""
                          } ${isSelected ? "opacity-100" : "opacity-70"} ${isUnlocked ? "group-hover:opacity-100" : ""}`}
                        />
                        {optionFrameUrl ? (
                          <img
                            src={optionFrameUrl}
                            alt=""
                            className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[calc(100%+38px)] w-[calc(100%+38px)] -translate-x-1/2 -translate-y-1/2 object-contain"
                            aria-hidden="true"
                          />
                        ) : (
                          <div className={`absolute inset-0 rounded-full border-2 border-dashed transition-colors ${isSelected ? 'border-[#2BFE71]/50' : 'border-white/15'}`} />
                        )}
                      </div>

                      <span
                        className={`text-center text-[13px] font-medium leading-[1.3] transition-colors line-clamp-2 ${isSelected ? "text-white" : "text-white/50 group-hover:text-white"
                          }`}
                      >
                        {option.displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Section */}
            <div className="border-t border-white/[0.06] bg-[#070D18]/50 p-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFramePickerOpen(false)}
                disabled={frameSaving}
                className="rounded-xl px-5 py-2.5 text-[13px] font-medium text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => void applyFrameSelection(selectedFrameId)}
                disabled={frameSaving || selectedFrameId === equippedFrameId}
                className="cta-primary flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {frameSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Speichert...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    Frame speichern
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
