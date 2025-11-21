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
