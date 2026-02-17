import React from 'react';

interface Tab {
    id: string;
    label: string;
    icon: string;
}

interface ProfileTabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({ tabs, activeTab, onChange }) => {
    return (
        <div className="flex items-center gap-2 p-1 bg-surface-2/50 backdrop-blur-md rounded-xl w-fit border border-white/5">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`
            relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
            flex items-center gap-2
            ${activeTab === tab.id
                            ? 'text-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                            : 'text-muted hover:text-foreground hover:bg-white/5'
                        }
          `}
                >
                    <i className={`fas ${tab.icon} ${activeTab === tab.id ? 'text-accent' : ''}`}></i>
                    {tab.label}
                    {activeTab === tab.id && (
                        <span className="absolute inset-0 rounded-lg ring-1 ring-white/10" />
                    )}
                </button>
            ))}
        </div>
    );
};
