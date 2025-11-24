"use client";

import type { ReactElement, FormEvent } from 'react';
import { useMemo } from '@/hooks/useMemo';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback } from '@/hooks/useCallback';
import { useEffect } from '@/hooks/useEffect';
import { useState } from '@/hooks/useState';
import { decodeStateParam } from '@/lib/utils';
import type { AuthUserSummary, UserProfile } from '@/types/auth';
import { createMemberAccountAction } from '@/actions/admin/create-member';
import { deleteMemberAccountAction } from '@/actions/admin/delete-member';
import type {
  AdminMemberRecord,
  CreateFormState,
  MembersClientProps,
  MembersNavTarget,
  RoleOption,
} from '@/types/admin-members';

const initialFormState: CreateFormState = {
  displayName: '',
  email: '',
  password: '',
  role: 'student',
};

const roleLabels: Record<RoleOption, string> = {
  student: 'Learner',
  admin: 'Administrator',
};

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export default function MembersClient({ initialMembers }: MembersClientProps): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const profileParam = searchParams.get('profile');
  const authParam = searchParams.get('auth');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeNav: MembersNavTarget = 'members';

  const profile = useMemo(() => (profileParam ? decodeStateParam<UserProfile>(profileParam) : null), [profileParam]);
  const authSummary = useMemo(
    () => (authParam ? decodeStateParam<AuthUserSummary>(authParam) : null),
    [authParam],
  );

  const displayName = profile?.displayName || authSummary?.email || 'Administrator';

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(initialFormState);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setCreateModalOpen(false);
    setDeleteTargetId(null);
    setDeleteError(null);
    setSidebarOpen(false);
  }, []);

  const metrics = useMemo(() => {
    const totalMembers = initialMembers.length;
    const adminCount = initialMembers.filter((member) => member.role === 'admin').length;
    return {
      totalMembers,
      adminCount,
    };
  }, [initialMembers]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const buildNavPath = useCallback(
    (target: MembersNavTarget) => {
      const params = new URLSearchParams();
      if (profileParam) {
        params.set('profile', profileParam);
      }
      if (authParam) {
        params.set('auth', authParam);
      }
      const basePath = target === 'dashboard' ? '/admin' : '/admin/members';
      return params.size > 0 ? `${basePath}?${params.toString()}` : basePath;
    },
    [authParam, profileParam],
  );

  const handleNavigate = useCallback(
    (target: MembersNavTarget) => {
      setSidebarOpen(false);
      router.push(buildNavPath(target));
    },
    [buildNavPath, router],
  );

  const handleOpenCreate = useCallback(() => {
    setCreateForm(initialFormState);
    setCreateError(null);
    setCreateModalOpen(true);
  }, []);

  const handleChangeField = useCallback((field: keyof CreateFormState, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmitCreate = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      if (event) {
        event.preventDefault();
      }
      setCreateError(null);
      setCreatePending(true);
      try {
        const result = await createMemberAccountAction({
          displayName: createForm.displayName,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
        });

        if (!result.success) {
          setCreateError(result.message ?? 'Unable to create account.');
          return;
        }

        setCreateModalOpen(false);
        setCreateForm(initialFormState);
        router.refresh();
      } catch (error) {
        console.error('[MembersClient] Failed to create member', error);
        setCreateError('Unexpected error while creating account.');
      } finally {
        setCreatePending(false);
      }
    },
    [createForm, router],
  );

  const handleRequestDelete = useCallback((member: AdminMemberRecord) => {
    setDeleteTargetId(member.id);
    setDeleteTargetLabel(member.email ?? member.displayName ?? member.id);
    setDeleteError(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteTargetId(null);
    setDeletePending(false);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetId) {
      return;
    }

    setDeletePending(true);
    setDeleteError(null);
    try {
      const result = await deleteMemberAccountAction(deleteTargetId);
      if (!result.success) {
        setDeleteError(result.message ?? 'Unable to delete account.');
        return;
      }

      setDeleteTargetId(null);
      setDeleteTargetLabel(null);
      router.refresh();
    } catch (error) {
      console.error('[MembersClient] Failed to delete member', error);
      setDeleteError('Unexpected error while deleting account.');
    } finally {
      setDeletePending(false);
    }
  }, [deleteTargetId, router]);

  return (
    <main className="relative min-h-[100dvh] w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%)]" aria-hidden />
      <div className="relative flex min-h-[100dvh] w-full gap-0 px-4 py-10 sm:px-6 lg:px-8 lg:gap-10">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 max-w-full translate-x-[-100%] bg-slate-950/95 p-6 text-slate-100 shadow-2xl ring-1 ring-slate-800 transition-transform duration-300 ease-out backdrop-blur lg:relative lg:inset-auto lg:w-72 lg:translate-x-0 lg:bg-slate-950/75 lg:shadow-lg lg:ring-1 lg:ring-white/15 ${sidebarOpen ? 'translate-x-0' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-sky-400/70">AlgoHub Admin</p>
              <h2 className="text-xl font-semibold text-white">Control Center</h2>
            </div>
            <button
              type="button"
              onClick={handleToggleSidebar}
              className="rounded-full bg-white/10 p-2 text-white/90 transition hover:bg-white/20 lg:hidden"
              aria-label="Close sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L9.17 12l7.71-7.71z" /></svg>
            </button>
          </div>
          <nav className="mt-8 space-y-1">
            {([
              {
                id: 'dashboard',
                label: 'Dashboard',
                icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /></svg>),
              },
              {
                id: 'members',
                label: 'Members',
                icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C18 14.17 13.33 13 11 13zm8 0c-.29 0-.62.02-.97.05C19.19 13.56 22 14.72 22 16.5V19h-4v-2.5c0-.87-.39-1.65-1-2.22.64-.17 1.31-.28 2-.28z" /></svg>),
              },
            ] as const).map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-sky-500/20 text-white ring-1 ring-sky-400/40' : 'text-slate-300 hover:bg-white/10 hover:text-white/90'}`}
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? 'bg-sky-500/25 text-sky-100' : 'bg-white/10 text-white/70'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            onClick={handleToggleSidebar}
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            aria-label="Close sidebar overlay"
          />
        )}

        <div className="relative flex w-full flex-1 flex-col gap-8 rounded-[2.5rem] border border-white/10 bg-white/[0.05] px-6 py-10 shadow-[0_32px_70px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:px-8 lg:px-12 xl:px-16">
          <header className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-sky-300/80">AlgoHub Admin</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Member Directory</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300/85">
                Review every account managed by AlgoHub. Create new admin or student accounts, or retire credentials for users who no longer need access.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <div className="inline-flex items-center justify-end rounded-full bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 shadow ring-1 ring-white/15 backdrop-blur">
                {displayName}
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500/90 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg ring-1 ring-sky-300/40 transition hover:bg-sky-400/90 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" /></svg>
                Add account
              </button>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.35)] backdrop-blur">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Total Accounts</h2>
              <div className="mt-3 text-3xl font-bold tracking-tight text-white">{metrics.totalMembers}</div>
              <p className="mt-2 text-xs text-slate-300/80">All auth + profile records</p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.35)] backdrop-blur">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Admin Accounts</h2>
              <div className="mt-3 text-3xl font-bold tracking-tight text-white">{metrics.adminCount}</div>
              <p className="mt-2 text-xs text-slate-300/80">Includes the current administrator</p>
            </article>
          </section>

          <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-[0_18px_34px_rgba(2,6,23,0.55)] backdrop-blur">
            <header className="flex flex-col justify-between gap-3 border-b border-white/10 px-6 py-4 text-sm text-slate-300/80 sm:flex-row sm:items-center">
              <div className="font-semibold uppercase tracking-[0.2em] text-slate-200/90">Accounts Overview</div>
              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" /> Active accounts
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-sky-300" /> Admin role
                </span>
              </div>
            </header>
            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm text-slate-200/90">
                <thead className="sticky top-0 bg-slate-900/90 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Display name</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Created</th>
                    <th className="px-6 py-4 font-semibold">Last sign-in</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {initialMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-300/70">
                        No accounts found yet.
                      </td>
                    </tr>
                  ) : (
                    initialMembers.map((member) => {
                      const isAdmin = member.role === 'admin';
                      const badgeColor = isAdmin ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40' : 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/30';
                      return (
                        <tr key={member.id} className="border-t border-white/5 transition hover:bg-white/5">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{member.displayName ?? '—'}</div>
                            <div className="text-xs text-slate-400">{member.id}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div>{member.email ?? '—'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${badgeColor}`}>
                              {isAdmin ? 'Admin' : 'Student'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-200/80">{formatDate(member.createdAt)}</td>
                          <td className="px-6 py-4 text-slate-200/80">{formatDate(member.lastSignInAt)}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRequestDelete(member)}
                              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-200 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-rose-200"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m19 7-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7h14Zm-6 3h-2v7h2v-7Zm5-6v2H6V4h3.5l1-1h3l1 1H18Z" /></svg>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <button
          type="button"
          onClick={handleToggleSidebar}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-sky-500/90 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg ring-1 ring-sky-300/40 transition hover:bg-sky-400/90 focus:outline-none focus:ring-2 focus:ring-sky-200 lg:hidden"
          aria-label="Toggle admin navigation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3zm6 5h12v2H9zm4 5h8v2h-8z" /></svg>
          Admin menu
        </button>
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-slate-100 shadow-2xl">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Create new account</h2>
                <p className="mt-1 text-sm text-slate-300/80">Provide credentials for the new user. Passwords must be at least 6 characters.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20"
                aria-label="Close create account form"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m12 10.586 4.95-4.95 1.414 1.414L13.414 12l4.95 4.95-1.414 1.414L12 13.414l-4.95 4.95-1.414-1.414L10.586 12l-4.95-4.95L7.05 5.636z" /></svg>
              </button>
            </header>
            <form className="mt-6 space-y-4" onSubmit={handleSubmitCreate}>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Display name</span>
                <input
                  type="text"
                  value={createForm.displayName}
                  onChange={(event) => handleChangeField('displayName', event.currentTarget.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300 focus:bg-white/10 focus:ring-1 focus:ring-sky-300"
                  placeholder="Jane Admin"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Email</span>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) => handleChangeField('email', event.currentTarget.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300 focus:bg-white/10 focus:ring-1 focus:ring-sky-300"
                  placeholder="user@example.com"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Password</span>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => handleChangeField('password', event.currentTarget.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300 focus:bg-white/10 focus:ring-1 focus:ring-sky-300"
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Role</span>
                <div className="mt-2 flex gap-2">
                  {(Object.keys(roleLabels) as RoleOption[]).map((role) => {
                    const isActive = createForm.role === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleChangeField('role', role)}
                        className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] transition ${isActive ? 'bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/40' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                      >
                        {roleLabels[role]}
                      </button>
                    );
                  })}
                </div>
              </label>

              {createError && (
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPending}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500/90 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-lg ring-1 ring-sky-300/40 transition hover:bg-sky-400/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createPending ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-slate-100 shadow-2xl">
            <header>
              <h2 className="text-xl font-semibold text-white">Delete account</h2>
              <p className="mt-1 text-sm text-slate-300/80">
                This will permanently remove {deleteTargetLabel ?? 'the selected account'} from Supabase auth and the users table. This action cannot be undone.
              </p>
            </header>
            {deleteError && (
              <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletePending}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500/90 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-lg ring-1 ring-rose-300/40 transition hover:bg-rose-400/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletePending ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
