export interface Achievement {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string | null;
  createdAt: string;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
  achievement: Achievement;
}

export type AchievementToastTone = 'success' | 'info' | 'warning' | 'error';

export interface AchievementToastState {
  title: string;
  description?: string | null;
  icon?: string | null;
  tone?: AchievementToastTone;
}
