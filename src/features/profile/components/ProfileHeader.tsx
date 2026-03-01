import React from 'react';
import { ProfileAvatar } from './ProfileAvatar';
import { EditableField } from './EditableField';
import { useProfileStore } from '../profileStore';

interface ProfileHeaderProps {
  isEditable: boolean;
  onAvatarUpload?: (fileUrl: string) => void;
  onUpdateDisplayName?: (name: string) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isEditable,
  onAvatarUpload,
  onUpdateDisplayName,
}) => {
  const { profile, isEditing } = useProfileStore();

  if (!profile) return null;
  const handle = profile.username
    ? `@${profile.username.replace(/^@+/, "")}`
    : profile.minecraftName
      ? `@${profile.minecraftName.replace(/^@+/, "")}`
      : null;
  const levelValue = typeof profile.level === "number" && profile.level > 0 ? profile.level : 1;
  const parseXpProgress = (value: string | null | undefined): number | null => {
    if (!value || typeof value !== "string") {
      return null;
    }
    const match = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!match) {
      return null;
    }
    const current = Number(match[1]);
    const max = Number(match[2]);
    if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) {
      return null;
    }
    return Math.max(0, Math.min(100, (current / max) * 100));
  };
  const xpProgress = parseXpProgress(profile.xpDisplay);
  const levelProgress = xpProgress ?? Math.max(8, Math.min(100, levelValue % 100 === 0 ? 100 : levelValue % 100));

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
        {/* Avatar Section with Level Ring concept */}
        <div className="relative self-start">
          <div className="relative p-1">
            {/* Subtle outer glow for the avatar */}
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl opacity-50 animate-pulse" />
            <ProfileAvatar
              photoURL={profile.photoURL}
              displayName={profile.displayName || profile.username}
              size="xl"
              editable={isEditable && isEditing}
              onUpload={onAvatarUpload}
            />
          </div>
        </div>

        {/* Identity & Stats Information */}
        <div className="flex-1 min-w-0 pb-1">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              {isEditing && isEditable ? (
                <EditableField
                  value={profile.displayName || profile.username || ''}
                  onSave={(newValue) => onUpdateDisplayName?.(newValue)}
                  placeholder="Enter your display name"
                  maxLength={50}
                  className="mb-1"
                />
              ) : (
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  {profile.displayName || profile.username || 'Anonymous User'}
                </h1>
              )}

              {/* Refined Level Pill */}
              <div className="flex items-center rounded-full border border-accent/25 bg-accent/5 px-2.5 py-1 backdrop-blur-md">
                <span className="text-[11px] font-bold uppercase tracking-wide text-accent/90">
                  Level {levelValue}
                </span>
              </div>
            </div>

            {handle && (
              <p className="text-[15px] font-medium text-white/40 tracking-tight flex items-center gap-2">
                <span>{handle}</span>
                {profile.roles?.includes('admin') && (
                  <i className="fas fa-check-circle text-accent/60 text-[12px]" title="Verified Admin"></i>
                )}
              </p>
            )}
          </div>

          {/* Roles display */}
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.roles && profile.roles.map((role) => {
              const isAdminRole = role.toLowerCase() === "admin";
              const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
              return (
                <span
                  key={role}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition-all hover:scale-105 duration-200 ${isAdminRole
                      ? "border border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                      : "border border-white/10 bg-white/5 text-white/50"
                    }`}
                >
                  {isAdminRole && <i className="fas fa-shield-alt text-[9px]"></i>}
                  {roleLabel}
                </span>
              );
            })}
          </div>

          <div className="mt-5 w-full md:min-w-[520px]">
            <div className="relative h-8 rounded-full bg-[#313B4F] shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#35FF84] to-[#2BFE71] transition-all"
                style={{ width: `${levelProgress}%` }}
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-[#0E1624] px-3 py-1 text-[10px] font-bold text-[#B6FFC9]">
                Lvl. {levelValue}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
