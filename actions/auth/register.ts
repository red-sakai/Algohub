"use server";

import type { RegisterPayload, RegisterResult, RegisterStatus } from "@/types/auth";
import { getServiceSupabase } from "@/lib/supabase/serviceClient";

function maskEmail(email: string): string {
  return email.replace(/(.{2}).+(@.+)/, "$1•••$2");
}

export async function registerUserAction(payload: RegisterPayload): Promise<RegisterResult> {
  const supabase = getServiceSupabase();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;
  const desiredDisplayName = payload.displayName.trim();

  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo ? `${redirectTo}/auth/callback` : undefined,
    },
  });

  if (error) {
    return {
      success: false,
      message: `We couldn't register ${maskEmail(email)}. ${error.message}`,
      status: "pending",
      errorCode: error.code,
    } satisfies RegisterResult;
  }

  const status: RegisterStatus = data.session ? "confirmed" : "pending";
  const userId = data.user?.id;
  let profileCreated = false;
  const baseMessage =
    status === "confirmed"
      ? `Account created for ${maskEmail(email)}. You're ready to jump in!`
      : `Almost there! Check your inbox at ${maskEmail(email)} to confirm your account.`;
  let message = baseMessage;
  let errorCode: string | undefined;

  if (userId) {
    const userMetadata = (data.user?.user_metadata ?? {}) as {
      full_name?: string;
      avatar_url?: string;
      [key: string]: unknown;
    };

    const displayName = desiredDisplayName || userMetadata.full_name || email.split("@")[0];
    const avatarUrl = typeof userMetadata.avatar_url === "string" ? userMetadata.avatar_url : null;

    const { error: profileError } = await supabase.from("users").upsert(
      {
        id: userId,
        display_name: displayName || null,
        avatar_url: avatarUrl,
        role: "student",
      },
      { onConflict: "id" },
    );

    if (profileError) {
      console.error("Failed to create profile row", profileError);
      errorCode = profileError.code ?? errorCode;
      message =
        status === "confirmed"
          ? `Account created for ${maskEmail(email)}, but we couldn't finish your profile setup just yet.`
          : `Almost there! Check your inbox at ${maskEmail(email)} to confirm your account. We'll finish setting up your profile once you land inside.`;
    } else {
      profileCreated = true;
    }
  }

  return {
    success: true,
    message,
    status,
    userId,
    profileCreated,
    errorCode,
  } satisfies RegisterResult;
}
