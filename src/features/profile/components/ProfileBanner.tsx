import React from 'react';
import type { UserProfile } from '../types';

interface ProfileBannerProps {
    profile: UserProfile | null;
}

export const ProfileBanner: React.FC<ProfileBannerProps> = ({ profile: _profile }) => {
    void _profile;
    // Vision app palette: dark base + neon green/cyan accents.
    const gradientClass = "bg-[radial-gradient(circle_at_20%_20%,rgba(43,254,113,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(110,214,255,0.16),transparent_50%),linear-gradient(135deg,rgba(13,14,18,0.96),rgba(18,20,26,0.92))]";

    return (
        <div className="relative h-64 w-full rounded-3xl overflow-hidden mb-[-4rem]">
            <div className={`absolute inset-0 ${gradientClass}`} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 brightness-100 contrast-150"></div>
            {/* Abstract shapes or pattern overlay could go here */}
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

            {/* Optional: Add a subtle animated element if desired */}
        </div>
    );
};
