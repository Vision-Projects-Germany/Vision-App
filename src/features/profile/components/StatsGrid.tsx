import React from 'react';
import type { ProfileStats } from '../types';

interface StatsGridProps {
  stats: ProfileStats | null;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  if (!stats) {
    return (
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass rounded-3xl p-6 animate-pulse">
            <div className="h-4 bg-surface-2 rounded w-20 mb-3"></div>
            <div className="h-8 bg-surface-2 rounded w-16 mb-2"></div>
            <div className="h-3 bg-surface-2 rounded w-24"></div>
          </div>
        ))}
      </section>
    );
  }

  const statCards = [
    {
      icon: 'fa-folder-open',
      label: 'Projects',
      value: stats.projectCount,
      detail: 'Active projects',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: 'fa-code-commit',
      label: 'Commits',
      value: stats.totalCommits,
      detail: 'Total contributions',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: 'fa-fire',
      label: 'Streak',
      value: `${stats.currentStreak}d`,
      detail: `Best: ${stats.longestStreak}d`,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      icon: 'fa-trophy',
      label: 'Score',
      value: stats.contributionScore,
      detail: 'Contribution points',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  return (
    <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <div
          key={stat.label}
          className="glass rounded-3xl p-6 hover:-translate-y-1 transition-all duration-300 group"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <i className={`fas ${stat.icon} ${stat.color} text-lg`}></i>
            </div>
            <p className="text-sm text-muted uppercase tracking-wider">{stat.label}</p>
          </div>
          <p className="text-3xl font-bold mb-1">{stat.value.toLocaleString()}</p>
          <p className="text-xs text-muted">{stat.detail}</p>
        </div>
      ))}
    </section>
  );
};
