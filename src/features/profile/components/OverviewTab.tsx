import React from 'react';
import type { ProfileStats, Activity, Achievement, SocialLinks as SocialLinksType } from '../types';
import { StatsGrid } from './StatsGrid';
import { ActivityTimeline } from './ActivityTimeline';
import { AchievementBadges } from './AchievementBadges';
import { SocialLinks } from './SocialLinks';

interface OverviewTabProps {
    stats: ProfileStats | null;
    activities: Activity[];
    achievements: Achievement[];
    socialLinks: SocialLinksType;
    isEditing: boolean;
    onUpdateSocialLinks: (updates: Partial<SocialLinksType>) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
    stats,
    activities,
    achievements,
    socialLinks,
    isEditing,
    onUpdateSocialLinks,
}) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Row */}
            <StatsGrid stats={stats} />

            {/* Main Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <ActivityTimeline activities={activities} />
                    <AchievementBadges achievements={achievements} />
                </div>

                {/* Right Column (1/3) */}
                <div className="space-y-6">
                    <SocialLinks
                        socialLinks={socialLinks}
                        isEditing={isEditing}
                        onUpdate={onUpdateSocialLinks}
                    />
                    {/* We could add a "Connect" or "Friends" widget here later */}
                </div>
            </div>
        </div>
    );
};
