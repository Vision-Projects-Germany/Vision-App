import React, { useState } from 'react';
import type { SocialLinks as SocialLinksType } from '../types';

interface SocialLinksProps {
  socialLinks: SocialLinksType;
  isEditing: boolean;
  onUpdate?: (updates: Partial<SocialLinksType>) => void;
}

interface SocialPlatform {
  key: keyof SocialLinksType;
  name: string;
  icon: string;
  color: string;
  placeholder: string;
}

const platforms: SocialPlatform[] = [
  {
    key: 'discord',
    name: 'Discord',
    icon: 'fa-brands fa-discord',
    color: 'text-[#5865F2] bg-[#5865F2]/10',
    placeholder: 'username#0000',
  },
  {
    key: 'github',
    name: 'GitHub',
    icon: 'fa-brands fa-github',
    color: 'text-[#fff] bg-white/10',
    placeholder: 'github.com/username',
  },
  {
    key: 'twitter',
    name: 'Twitter',
    icon: 'fa-brands fa-twitter',
    color: 'text-[#1DA1F2] bg-[#1DA1F2]/10',
    placeholder: '@username',
  },
  {
    key: 'youtube',
    name: 'YouTube',
    icon: 'fa-brands fa-youtube',
    color: 'text-[#FF0000] bg-[#FF0000]/10',
    placeholder: 'youtube.com/@channel',
  },
  {
    key: 'twitch',
    name: 'Twitch',
    icon: 'fa-brands fa-twitch',
    color: 'text-[#9146FF] bg-[#9146FF]/10',
    placeholder: 'twitch.tv/username',
  },
  {
    key: 'website',
    name: 'Website',
    icon: 'fa-solid fa-globe',
    color: 'text-accent bg-accent/10',
    placeholder: 'https://yourwebsite.com',
  },
];

export const SocialLinks: React.FC<SocialLinksProps> = ({
  socialLinks,
  isEditing,
  onUpdate,
}) => {
  const [editValues, setEditValues] = useState<SocialLinksType>(socialLinks);

  const handleInputChange = (key: keyof SocialLinksType, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editValues);
    }
  };

  const hasAnySocial = Object.values(socialLinks).some((link) => link);

  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <i className="fas fa-link text-accent"></i>
        Social Links
      </h2>

      {isEditing ? (
        <div className="space-y-4">
          {platforms.map((platform) => (
            <div key={platform.key}>
              <label className="block text-xs uppercase tracking-[0.2em] text-muted mb-2">
                {platform.name}
              </label>
              <div className="flex gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${platform.color}`}>
                  <i className={platform.icon}></i>
                </div>
                <input
                  type="text"
                  value={editValues[platform.key] || ''}
                  onChange={(e) => handleInputChange(platform.key, e.target.value)}
                  placeholder={platform.placeholder}
                  className="flex-1 px-3 py-2 bg-surface-2 border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
          ))}
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-accent text-black rounded-lg font-medium hover:bg-accent/90 transition-colors mt-4"
          >
            <i className="fas fa-save mr-2"></i>
            Save Social Links
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {platforms.map((platform) => {
            const link = socialLinks[platform.key];
            if (!link) return null;

            const isUrl = link.startsWith('http://') || link.startsWith('https://');

            return (
              <a
                key={platform.key}
                href={isUrl ? link : `https://${link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-surface-2/60 border border-border rounded-xl hover:border-accent/30 hover:-translate-y-0.5 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${platform.color} group-hover:scale-110 transition-transform`}>
                  <i className={platform.icon}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{platform.name}</p>
                  <p className="text-xs text-muted truncate">{link}</p>
                </div>
                <i className="fas fa-external-link-alt text-xs text-muted group-hover:text-accent transition-colors"></i>
              </a>
            );
          })}

          {!hasAnySocial && (
            <div className="text-center py-8">
              <i className="fas fa-link text-4xl text-muted mb-4"></i>
              <p className="text-muted">No social links added yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
