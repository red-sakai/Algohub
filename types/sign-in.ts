import type { FormEvent, MouseEvent } from 'react';
import type { MutableRefObject } from 'react';
import type { AuthMode } from '@/types/auth';
import type { IrisHandle } from '@/app/components/ui/IrisTransition';

export interface PersistSessionParams {
  accessToken: string;
  refreshToken: string;
}

export interface PersistSessionResult {
  error?: string;
}

export interface UseSignInPageResult {
  authMode: AuthMode;
  heading: string;
  description: string;
  isSubmitting: boolean;
  statusMessage: string | null;
  showRegisterModal: boolean;
  registerModalMessage: string;
  showLoader: boolean;
  irisRef: MutableRefObject<IrisHandle | null>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleBackHome: () => void;
  handleButtonHover: () => void;
  handleAuthModeChange: (mode: AuthMode) => void;
  handleRegisterModalDismiss: () => void;
  handleRegisterModalContentClick: (event: MouseEvent<HTMLDivElement>) => void;
}
