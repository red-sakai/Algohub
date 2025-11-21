import type { MutableRefObject } from 'react';
import type { MouseEventHandler } from 'react';
import type { AuthUserSummary, UserProfile } from '@/types/auth';
import type { IrisHandle } from '@/app/components/ui/IrisTransition';

export interface LandingSessionRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandingSessionResult {
  authSummary: AuthUserSummary | null;
  profile: UserProfile | null;
}

export interface UseHomePageResult {
  authUser: AuthUserSummary | null;
  userProfile: UserProfile | null;
  userInitial: string;
  profileHref: string;
  isProfilePanelOpen: boolean;
  profileButtonRef: MutableRefObject<HTMLButtonElement | null>;
  profilePanelRef: MutableRefObject<HTMLDivElement | null>;
  irisRef: MutableRefObject<IrisHandle | null>;
  defaultLogoRef: MutableRefObject<HTMLImageElement | null>;
  logoShineRef: MutableRefObject<HTMLImageElement | null>;
  showAuthModal: boolean;
  showLoader: boolean;
  skipIrisOpen: boolean;
  isShaking: boolean;
  isFlashing: boolean;
  flashOpacity: number;
  isLogoShining: boolean;
  isBulletVisible: boolean;
  bulletCycle: number;
  logoShineCycle: number;
  defaultLogoOpacity: number;
  defaultLogoAnimationValue: string;
  defaultLogoOpacityTransition: string;
  bulletAnimationValue: string;
  handleSignInSelect: MouseEventHandler<HTMLButtonElement>;
  handleContinueAsGuest: () => void;
  handleButtonHover: () => void;
  handleProfileToggle: () => void;
  handleProfileView: MouseEventHandler<HTMLAnchorElement>;
  handleLogoClick: () => void;
  handleStartClick: MouseEventHandler<HTMLAnchorElement>;
}
