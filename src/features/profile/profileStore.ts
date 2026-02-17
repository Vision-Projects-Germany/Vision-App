import { create } from 'zustand';
import type { UserProfile, ProfileStats, Activity, Achievement, SocialLinks } from './types';

interface ProfileState {
  profile: UserProfile | null;
  stats: ProfileStats | null;
  activities: Activity[];
  achievements: Achievement[];
  socialLinks: SocialLinks;
  isEditing: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: UserProfile | null) => void;
  setStats: (stats: ProfileStats | null) => void;
  setActivities: (activities: Activity[]) => void;
  setAchievements: (achievements: Achievement[]) => void;
  setSocialLinks: (socialLinks: SocialLinks) => void;
  setEditing: (isEditing: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateSocialLinks: (updates: Partial<SocialLinks>) => void;
  reset: () => void;
}

const initialState = {
  profile: null,
  stats: null,
  activities: [],
  achievements: [],
  socialLinks: {},
  isEditing: false,
  isLoading: false,
  error: null,
};

export const useProfileStore = create<ProfileState>((set) => ({
  ...initialState,

  setProfile: (profile) => set({ profile }),
  
  setStats: (stats) => set({ stats }),
  
  setActivities: (activities) => set({ activities }),
  
  setAchievements: (achievements) => set({ achievements }),
  
  setSocialLinks: (socialLinks) => set({ socialLinks }),
  
  setEditing: (isEditing) => set({ isEditing }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    })),
  
  updateSocialLinks: (updates) =>
    set((state) => ({
      socialLinks: { ...state.socialLinks, ...updates },
    })),
  
  reset: () => set(initialState),
}));
