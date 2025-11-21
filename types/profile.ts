import type { MouseEvent } from "react";
import type { AuthUserSummary, UserProfile } from "@/types/auth";
import type { UserAchievement } from "@/types/achievements";

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileAchievementRow {
  achievement_id: string;
  unlocked_at: string;
  achievements: {
    id: string;
    slug: string;
    title: string;
    description: string;
    icon: string | null;
    created_at: string;
  } | null;
}

export interface ProfileDataResponse {
  authSummary: AuthUserSummary | null;
  profile: UserProfile | null;
  achievements: UserAchievement[];
  errorMessage?: string;
}

export interface UseProfilePageResult {
  isLoading: boolean;
  isSigningOut: boolean;
  errorMessage: string | null;
  currentAuth: AuthUserSummary | null;
  currentProfile: UserProfile | null;
  achievements: UserAchievement[];
  handleBackToLanding: (event: MouseEvent<HTMLAnchorElement>) => void;
  handleSignOut: () => void;
}
