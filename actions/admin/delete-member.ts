"use server";

import { revalidatePath } from 'next/cache';
import { getServiceSupabase } from '@/lib/supabase/serviceClient';

export type DeleteMemberResult = {
  success: boolean;
  message?: string;
};

export async function deleteMemberAccountAction(userId: string): Promise<DeleteMemberResult> {
  const supabase = getServiceSupabase();
  const trimmedId = userId.trim();

  if (!trimmedId) {
    return { success: false, message: 'User ID is required to delete an account.' } satisfies DeleteMemberResult;
  }

  try {
    const { error: authError } = await supabase.auth.admin.deleteUser(trimmedId);
    if (authError) {
      console.error('[deleteMemberAccountAction] Failed to delete auth user', authError);
      return { success: false, message: authError.message ?? 'Unable to delete account.' } satisfies DeleteMemberResult;
    }

    const { error: profileError } = await supabase.from('users').delete().eq('id', trimmedId);
    if (profileError) {
      console.error('[deleteMemberAccountAction] Deleted auth user but failed to remove profile row', profileError);
    }

    revalidatePath('/admin/members');
    return { success: true } satisfies DeleteMemberResult;
  } catch (error) {
    console.error('[deleteMemberAccountAction] Unexpected failure', error);
    return { success: false, message: 'Unable to delete account. Please try again.' } satisfies DeleteMemberResult;
  }
}
