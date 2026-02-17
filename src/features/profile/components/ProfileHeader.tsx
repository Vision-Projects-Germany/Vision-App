import React from 'react';
import { ProfileAvatar } from './ProfileAvatar';
import { EditableField } from './EditableField';
import { useProfileStore } from '../profileStore';

interface ProfileHeaderProps {
  isEditable: boolean;
  onAvatarUpload?: (fileUrl: string) => void;
  onUpdateDisplayName?: (name: string) => void;
  onUpdateBio?: (bio: string) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isEditable,
  onAvatarUpload,
  onUpdateDisplayName,
  onUpdateBio,
}) => {
  const { profile, isEditing } = useProfileStore();

  if (!profile) return null;
  const minecraftHandle = profile.minecraftName
    ? `@${profile.minecraftName.replace(/^@+/, "")}`
    : null;

  return (
    <div className="relative px-1 md:px-2">
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-center">
        {/* Avatar - Overlapping Banner */}
        <div className="flex-shrink-0 self-center mx-auto my-auto relative group">
          <ProfileAvatar
            photoURL={profile.photoURL}
            displayName={profile.displayName || profile.username}
            size="xl"
            editable={isEditable && isEditing}
            onUpload={onAvatarUpload}
          />
        </div>

        {/* User Info */}
        <div className="flex-1 w-full min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              {/* Display Name */}
              {isEditing && isEditable ? (
                <EditableField
                  value={profile.displayName || profile.username || ''}
                  onSave={(newValue) => onUpdateDisplayName?.(newValue)}
                  placeholder="Enter your display name"
                  maxLength={50}
                  className="mb-2"
                />
              ) : (
                <>
                  <h1
                    className="text-4xl font-bold mb-0 leading-tight text-white"
                  >
                    {profile.displayName || profile.username || 'Anonymous User'}
                  </h1>
                  {minecraftHandle && (
                    <p className="text-sm text-muted">{minecraftHandle}</p>
                  )}
                </>
              )}

              {/* Badges / Roles */}
              <div className="flex flex-wrap gap-2">
                {profile.level && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent/20 border border-accent/20 text-accent flex items-center gap-1">
                    <i className="fas fa-star text-[10px]"></i>
                    Lvl {profile.level}
                  </span>
                )}
                {profile.roles && profile.roles.map((role) => {
                  const isAdminRole = role.toLowerCase() === "admin";
                  return (
                    <span
                      key={role}
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        isAdminRole
                          ? "bg-fuchsia-500/20 border-fuchsia-400/70 text-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.45)]"
                          : "bg-white/5 border-white/15 text-foreground/80"
                      }`}
                    >
                      {role}
                    </span>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Expandable Bio - Only show if present */}
          {(profile.bio || isEditing) && (
            <div className="mt-6 max-w-2xl">
              <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-muted">
                Bio
              </p>
              {isEditing && isEditable ? (
                <EditableField
                  value={profile.bio || ''}
                  onSave={(newValue) => onUpdateBio?.(newValue)}
                  placeholder="Tell us about yourself..."
                  multiline
                  maxLength={500}
                />
              ) : (
                <p className="text-left text-muted text-sm leading-relaxed line-clamp-2 hover:line-clamp-none transition-all cursor-default">
                  {profile.bio}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
