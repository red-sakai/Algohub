"use server";

import { getServiceSupabase } from "@/lib/supabase/serviceClient";
import type { Achievement, UserAchievement } from "@/types/achievements";

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("user_achievements")
    .select("user_id, achievement_id, unlocked_at, achievements:achievement_id (id, slug, title, description, icon, created_at)")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch user achievements", error);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const achievementData = Array.isArray(row.achievements)
      ? row.achievements[0]
      : row.achievements;

    if (!achievementData) {
      return [];
    }

    const achievement: Achievement = {
      id: achievementData.id,
      slug: achievementData.slug,
      title: achievementData.title,
      description: achievementData.description,
      icon: achievementData.icon,
      createdAt: achievementData.created_at,
    };

    return [
      {
        userId: row.user_id,
        achievementId: row.achievement_id,
        unlockedAt: row.unlocked_at,
        achievement,
      } satisfies UserAchievement,
    ];
  });
}
