import type { ReactElement } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getServiceSupabase } from '@/lib/supabase/serviceClient';
import MembersClient from './MembersClient';
import type { AdminMemberRecord } from '@/types/admin-members';

export const dynamic = 'force-dynamic';

type UsersTableRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
  updated_at: string | null;
};

async function listAllAuthUsers(supabase: SupabaseClient): Promise<User[]> {
  const collected: User[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    collected.push(...(data?.users ?? []));

    if (!data?.nextPage) {
      break;
    }

    page = data.nextPage;
  }

  return collected;
}

function mergeMembers(usersRows: UsersTableRow[], authUsers: User[]): AdminMemberRecord[] {
  const profileMap = new Map<string, UsersTableRow>();
  usersRows.forEach((row) => {
    profileMap.set(row.id, row);
  });

  const members: AdminMemberRecord[] = [];

  authUsers.forEach((authUser) => {
    const profile = profileMap.get(authUser.id) ?? null;
    if (profile) {
      profileMap.delete(authUser.id);
    }

    members.push({
      id: authUser.id,
      email: authUser.email ?? null,
      displayName:
        profile?.display_name ??
        (typeof authUser.user_metadata?.display_name === 'string' ? (authUser.user_metadata.display_name as string) : null),
      role: profile?.role ?? (typeof authUser.user_metadata?.role === 'string' ? (authUser.user_metadata.role as string) : null),
      createdAt: profile?.created_at ?? authUser.created_at ?? null,
      updatedAt: profile?.updated_at ?? null,
      lastSignInAt: authUser.last_sign_in_at ?? null,
    });
  });

  profileMap.forEach((profile, id) => {
    members.push({
      id,
      email: null,
      displayName: profile.display_name,
      role: profile.role,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastSignInAt: null,
    });
  });

  return members.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });
}

export default async function AdminMembersPage(): Promise<ReactElement> {
  const supabase = getServiceSupabase();

  let usersRows: UsersTableRow[] = [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, role, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[AdminMembersPage] Failed to load users table rows', error);
    } else if (Array.isArray(data)) {
      usersRows = data as UsersTableRow[];
    }
  } catch (error) {
    console.error('[AdminMembersPage] Unexpected failure fetching users table rows', error);
  }

  let authUsers: User[] = [];
  try {
    authUsers = await listAllAuthUsers(supabase);
  } catch (error) {
    console.error('[AdminMembersPage] Failed to list auth users', error);
  }

  const initialMembers = mergeMembers(usersRows, authUsers);

  return <MembersClient initialMembers={initialMembers} />;
}
