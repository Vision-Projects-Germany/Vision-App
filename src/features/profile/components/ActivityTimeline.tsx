import React from 'react';
import type { Activity } from '../types';

interface ActivityTimelineProps {
  activities: Activity[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const getActivityIcon = (type: Activity['type']): string => {
    switch (type) {
      case 'project_created':
        return 'fa-folder-plus';
      case 'project_updated':
        return 'fa-pen-to-square';
      case 'commit':
        return 'fa-code-commit';
      case 'achievement':
        return 'fa-trophy';
      case 'joined':
        return 'fa-user-plus';
      default:
        return 'fa-circle-dot';
    }
  };

  const getActivityColor = (type: Activity['type']): string => {
    switch (type) {
      case 'project_created':
        return 'text-accent bg-accent/10';
      case 'project_updated':
        return 'text-blue-400 bg-blue-500/10';
      case 'commit':
        return 'text-purple-400 bg-purple-500/10';
      case 'achievement':
        return 'text-yellow-400 bg-yellow-500/10';
      case 'joined':
        return 'text-green-400 bg-green-500/10';
      default:
        return 'text-muted bg-surface-2';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (activities.length === 0) {
    return (
      <div className="glass rounded-3xl p-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="text-center py-12">
          <i className="fas fa-clock-rotate-left text-4xl text-muted mb-4"></i>
          <p className="text-muted">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <i className="fas fa-clock-rotate-left text-accent"></i>
        Recent Activity
      </h2>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex gap-4 group hover:bg-white/5 p-3 rounded-lg transition-colors"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
              <i className={`fas ${getActivityIcon(activity.type)}`}></i>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium group-hover:text-accent transition-colors">
                {activity.title}
              </p>
              {activity.description && (
                <p className="text-sm text-muted mt-0.5 line-clamp-2">
                  {activity.description}
                </p>
              )}
              <p className="text-xs text-muted mt-1">
                {formatTimeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
