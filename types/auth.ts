import type { Session } from "@supabase/supabase-js";

export type AuthMode = "sign-in" | "register";

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export type RegisterStatus = "pending" | "confirmed";

export interface RegisterResult {
  success: boolean;
  message: string;
  status: RegisterStatus;
  userId?: string;
  errorCode?: string;
  profileCreated?: boolean;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "student" | "instructor" | "admin";
  createdAt: string;
  updatedAt: string;
}

export interface AuthUserSummary {
  id: string;
  email?: string | null;
  createdAt?: string | null;
  lastSignInAt?: string | null;
  phone?: string | null;
}

export interface SignInResult {
  success: boolean;
  message: string;
  userId?: string;
  email?: string;
  profile?: UserProfile | null;
  session?: Session | null;
  errorCode?: string;
  authUser?: AuthUserSummary;
}
