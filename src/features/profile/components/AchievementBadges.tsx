import React from 'react';
import type { Achievement } from '../types';

interface AchievementBadgesProps {
  achievements: Achievement[];
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ achievements }) => {
  const earnedAchievements = achievements.filter((a) => a.earned);
  const inProgressAchievements = achievements.filter((a) => !a.earned && a.progress !== undefined);

  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <i className="fas fa-trophy text-yellow-400"></i>
        Achievements
        <span className="text-sm text-muted ml-auto">
          {earnedAchievements.length}/{achievements.length}
        </span>
      </h2>

      {/* Earned Achievements */}
      {earnedAchievements.length > 0 && (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Unlocked</p>
          <div className="grid grid-cols-2 gap-3">
            {earnedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-surface-2/60 border border-border rounded-xl p-3 hover:border-accent/30 hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${achievement.color} group-hover:scale-110 transition-transform`}
                  >
                    <i className={`fas ${achievement.icon} text-xl`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-0.5 truncate">{achievement.name}</p>
                    <p className="text-xs text-muted line-clamp-2">{achievement.description}</p>
                    {achievement.earnedDate && (
                      <p className="text-xs text-accent mt-1">
                        {new Date(achievement.earnedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In Progress Achievements */}
      {inProgressAchievements.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">In Progress</p>
          <div className="space-y-3">
            {inProgressAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-surface-2/60 border border-border rounded-xl p-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${achievement.color} opacity-50`}>
                    <i className={`fas ${achievement.icon}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{achievement.name}</p>
                    <p className="text-xs text-muted">{achievement.description}</p>
                  </div>
                </div>
                {achievement.progress !== undefined && achievement.maxProgress && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted">
                        {achievement.progress}/{achievement.maxProgress}
                      </span>
                      <span className="text-accent font-medium">
                        {Math.round((achievement.progress / achievement.maxProgress) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{
                          width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {achievements.length === 0 && (
        <div className="text-center py-8">
          <i className="fas fa-trophy text-4xl text-muted mb-4"></i>
          <p className="text-muted">No achievements yet</p>
        </div>
      )}
    </div>
  );
};
