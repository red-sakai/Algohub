"use server";

import type { AuthUserSummary, SignInPayload, SignInResult, UserProfile } from "@/types/auth";
import { getServiceSupabase } from "@/lib/supabase/serviceClient";

function mapProfile(row: {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}): UserProfile {
  const allowedRoles: UserProfile["role"][] = ["student", "instructor", "admin"];
  const normalizedRole = allowedRoles.includes((row.role ?? "") as UserProfile["role"])
    ? (row.role as UserProfile["role"])
    : "student";
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: normalizedRole,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function signInUserAction(payload: SignInPayload): Promise<SignInResult> {
  const supabase = getServiceSupabase();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      success: false,
      message: error?.message ?? "We couldn't sign you in with those credentials.",
      errorCode: error?.code,
    } satisfies SignInResult;
  }

  const userId = data.user.id;
  const authUser: AuthUserSummary = {
    id: userId,
    email: data.user.email,
    createdAt: data.user.created_at ?? null,
    lastSignInAt: data.user.last_sign_in_at ?? null,
    phone: data.user.phone ?? null,
  };

  const { data: profileRow, error: profileError } = await supabase
    .from("users")
    .select("id, display_name, avatar_url, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  let profile: UserProfile | null = null;
  if (profileRow && !profileError) {
    profile = mapProfile(profileRow);
  } else if (profileError && profileError.code !== "PGRST116") {
    console.error("Failed to fetch Supabase profile", profileError);
  }

  const displayName = profile?.displayName || data.user.user_metadata?.full_name || data.user.email || email;

  return {
    success: true,
    message: `Welcome back, ${displayName}!`,
    userId,
    email: data.user.email ?? email,
    profile,
    session: data.session ?? null,
    authUser,
  } satisfies SignInResult;
}
