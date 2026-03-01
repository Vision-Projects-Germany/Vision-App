export interface UserProfile {
  uid: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio: string | null;
  minecraftName: string | null;
  roles: string[];
  level: number;
  experience: string | null;
  xpDisplay: string | null;
  avatarMediaId: string | null;
  avatarUrl: string | null;
  projects: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProfileStats {
  projectCount: number;
  totalCommits: number;
  currentStreak: number;
  longestStreak: number;
  contributionScore: number;
  lastActiveDate: Date | null;
}

export interface Activity {
  id: string;
  type: 'project_created' | 'project_updated' | 'commit' | 'achievement' | 'joined' | 'other';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedDate?: Date;
  progress?: number;
  maxProgress?: number;
}

export interface SocialLink {
  platform: 'discord' | 'github' | 'twitter' | 'website' | 'youtube' | 'twitch';
  url: string;
  displayName?: string;
}

export interface SocialLinks {
  discord?: string;
  github?: string;
  twitter?: string;
  website?: string;
  youtube?: string;
  twitch?: string;
}
