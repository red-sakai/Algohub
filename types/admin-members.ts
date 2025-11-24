import type { AdminNavTarget } from './admin-dashboard';

export type RoleOption = 'student' | 'admin';

export type CreateFormState = {
  displayName: string;
  email: string;
  password: string;
  role: RoleOption;
};

export type AdminMemberRecord = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastSignInAt: string | null;
};

export type MembersClientProps = {
  initialMembers: AdminMemberRecord[];
};

export type MembersNavTarget = AdminNavTarget;
