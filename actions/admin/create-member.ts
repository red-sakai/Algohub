"use server";

import { revalidatePath } from 'next/cache';
import { getServiceSupabase } from '@/lib/supabase/serviceClient';

export type CreateMemberPayload = {
  displayName: string;
  email: string;
  password: string;
  role: 'student' | 'admin';
};

export type CreateMemberResult = {
  success: boolean;
  message?: string;
  userId?: string;
};

const ALLOWED_ROLES: ReadonlyArray<CreateMemberPayload['role']> = ['student', 'admin'];

function normalizeRole(role: string): CreateMemberPayload['role'] | null {
  if (ALLOWED_ROLES.includes(role as CreateMemberPayload['role'])) {
    return role as CreateMemberPayload['role'];
  }
  return null;
}

export async function createMemberAccountAction(payload: CreateMemberPayload): Promise<CreateMemberResult> {
  const supabase = getServiceSupabase();
  const displayName = payload.displayName.trim();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;
  const normalizedRole = normalizeRole(payload.role);

  if (!displayName) {
    return { success: false, message: 'Display name is required.' } satisfies CreateMemberResult;
  }

  if (!email) {
    return { success: false, message: 'Email is required.' } satisfies CreateMemberResult;
  }

  if (!password || password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' } satisfies CreateMemberResult;
  }

  if (!normalizedRole) {
    return { success: false, message: 'Role must be either student or admin.' } satisfies CreateMemberResult;
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role: normalizedRole,
      },
    });

    if (error) {
      console.error('[createMemberAccountAction] Failed to create auth user', error);
      return { success: false, message: error.message ?? 'Unable to create account.' } satisfies CreateMemberResult;
    }

    const userId = data.user?.id;
    if (!userId) {
      console.error('[createMemberAccountAction] Missing user ID after creation');
      return { success: false, message: 'Account created but user ID was missing.' } satisfies CreateMemberResult;
    }

    const { error: profileError } = await supabase.from('users').upsert(
      {
        id: userId,
        display_name: displayName,
        avatar_url: data.user?.user_metadata?.avatar_url ?? null,
        role: normalizedRole,
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      console.error('[createMemberAccountAction] Failed to sync profile row, cleaning up auth user', profileError);
      await supabase.auth.admin.deleteUser(userId);
      return {
        success: false,
        message: 'Created auth account but failed to sync profile. The account has been removed. Please try again.',
      } satisfies CreateMemberResult;
    }

    revalidatePath('/admin/members');
    return { success: true, userId } satisfies CreateMemberResult;
  } catch (error) {
    console.error('[createMemberAccountAction] Unexpected failure', error);
    return { success: false, message: 'Unable to create account. Please try again.' } satisfies CreateMemberResult;
  }
}
