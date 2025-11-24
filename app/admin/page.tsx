"use client";

import type { ReactElement } from 'react';
import { Suspense } from 'react';
import { useMemo } from '@/hooks/useMemo';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback } from '@/hooks/useCallback';
import { useEffect } from '@/hooks/useEffect';
import { useState } from '@/hooks/useState';
import { signOutUser } from '@/actions/auth/sign-out';
import type {
  AdminNavTarget,
  StudentGrowthCardProps,
  StudentGrowthChartProps,
  StudentGrowthPoint,
  StudentGrowthResponse,
} from '@/types/admin-dashboard';
import { decodeStateParam } from '@/lib/utils';
import type { AuthUserSummary, UserProfile } from '@/types/auth';

const PLACEHOLDER_METRICS: Array<{ id: string; label: string; value: string; sublabel: string }> = [
  { id: 'total-users', label: 'Total Learners', value: '—', sublabel: 'Live analytics coming soon' },
  { id: 'active-today', label: 'Active Today', value: '—', sublabel: 'Tracking daily activity shortly' },
  { id: 'completion-rate', label: 'Module Completion', value: '—%', sublabel: 'Insights in progress' },
  { id: 'avg-session', label: 'Avg Session Length', value: '— min', sublabel: 'Session analytics pending' },
];

const PLACEHOLDER_PANELS: Array<{ id: string; title: string; description: string; cta: string }> = [
  {
    id: 'engagement-trends',
    title: 'Engagement Trends',
    description: 'Visualize daily unique visitors, returning learners, and content hotspots.',
    cta: 'Coming soon: performance charts',
  },
  {
    id: 'achievement-tracking',
    title: 'Achievement Tracking',
    description: 'Monitor badge unlocks, streaks, and milestone progress across the platform.',
    cta: 'Coming soon: badge analytics',
  },
  {
    id: 'content-heatmap',
    title: 'Content Heatmap',
    description: 'Identify which lessons drive the most engagement and where learners drop off.',
    cta: 'Coming soon: heatmap insights',
  },
];

export default function AdminDashboardPage(): ReactElement {
  return (
    <Suspense fallback={<AdminDashboardFallback />}>
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardFallback(): ReactElement {
  return (
    <main className="relative min-h-[100dvh] w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%)]" aria-hidden />
      <div className="relative flex min-h-[100dvh] w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-10 text-center shadow-[0_32px_70px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:px-8 lg:px-12">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/80">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 4 4h-3v10h-2V6H8l4-4Zm-7 9h2v7h12v-7h2v9H5v-9Z" /></svg>
          </span>
          <h1 className="text-2xl font-semibold text-white">Loading dashboard…</h1>
          <p className="text-sm text-slate-300/80">Hang tight while we prepare your admin analytics.</p>
        </div>
      </div>
    </main>
  );
}

function AdminDashboardContent(): ReactElement {
  const searchParams = useSearchParams();
  const profileParam = searchParams.get('profile');
  const authParam = searchParams.get('auth');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const activeNav: AdminNavTarget = 'dashboard';
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [studentGrowth, setStudentGrowth] = useState<StudentGrowthPoint[] | null>(null);
  const [studentGrowthLoading, setStudentGrowthLoading] = useState<boolean>(true);
  const [studentGrowthError, setStudentGrowthError] = useState<string | null>(null);

  const profile = useMemo(() => (profileParam ? decodeStateParam<UserProfile>(profileParam) : null), [profileParam]);
  const authSummary = useMemo(
    () => (authParam ? decodeStateParam<AuthUserSummary>(authParam) : null),
    [authParam],
  );

  const displayName = profile?.displayName || authSummary?.email || 'Administrator';

  useEffect(() => {
    let isActive = true;

    async function loadStudentGrowth(): Promise<void> {
      setStudentGrowthLoading(true);
      try {
        const response = await fetch('/api/admin/student-growth', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const payload = (await response.json()) as StudentGrowthResponse;
        if (!isActive) {
          return;
        }
        setStudentGrowth(Array.isArray(payload.data) ? payload.data : []);
        setStudentGrowthError(null);
      } catch (error) {
        console.error('[AdminDashboardPage] Failed to load student growth data', error);
        if (!isActive) {
          return;
        }
        setStudentGrowth(null);
        setStudentGrowthError('Unable to load student growth data.');
      } finally {
        if (isActive) {
          setStudentGrowthLoading(false);
        }
      }
    }

    void loadStudentGrowth();

    return () => {
      isActive = false;
    };
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleNavigate = useCallback(
    (target: AdminNavTarget) => {
      const params = new URLSearchParams();
      if (profileParam) {
        params.set('profile', profileParam);
      }
      if (authParam) {
        params.set('auth', authParam);
      }

      const basePath = target === 'dashboard' ? '/admin' : '/admin/members';
      const path = params.size > 0 ? `${basePath}?${params.toString()}` : basePath;

      setSidebarOpen(false);
      router.push(path);
    },
    [authParam, profileParam, router],
  );

  const handleSignOut = useCallback(async () => {
    if (signOutPending) {
      return;
    }

    setSignOutPending(true);
    setSignOutError(null);
    try {
      const result = await signOutUser();
      if (result.error) {
        setSignOutError(result.error);
        return;
      }
      router.push('/sign-in');
    } catch (error) {
      console.error('[AdminDashboardPage] Failed to sign out', error);
      setSignOutError('Unable to sign out. Please try again.');
    } finally {
      setSignOutPending(false);
    }
  }, [router, signOutPending]);

  const metrics = useMemo(() => {
    const latestTotal = studentGrowth && studentGrowth.length > 0 ? studentGrowth[studentGrowth.length - 1].totalStudents : null;
    return PLACEHOLDER_METRICS.map((metric) => {
      if (metric.id !== 'total-users') {
        return { ...metric };
      }

      if (studentGrowthLoading) {
        return {
          ...metric,
          value: '…',
          sublabel: 'Loading student totals',
        };
      }

      if (studentGrowthError) {
        return {
          ...metric,
          value: '—',
          sublabel: 'Unable to load student totals',
        };
      }

      if (latestTotal === null) {
        return {
          ...metric,
          value: '0',
          sublabel: 'No student accounts yet',
        };
      }

      return {
        ...metric,
        value: new Intl.NumberFormat('en-US').format(latestTotal),
        sublabel: 'Total student accounts to date',
      };
    });
  }, [studentGrowth, studentGrowthError, studentGrowthLoading]);

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
              onClick={toggleSidebar}
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
            onClick={toggleSidebar}
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            aria-label="Close sidebar overlay"
          />
        )}

        <div className="relative flex w-full flex-1 flex-col gap-8 rounded-[2.5rem] border border-white/10 bg-white/[0.05] px-6 py-10 shadow-[0_32px_70px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:px-8 lg:px-12 xl:px-16">
          <header className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-sky-300/80">AlgoHub Admin</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300/85">
                Analytics for AlgoHub are getting ready. Once the data pipeline is wired up, this dashboard will surface
                real-time engagement, learner journeys, and content performance stats.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="inline-flex items-center justify-end rounded-full bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 shadow ring-1 ring-white/15 backdrop-blur">
                Admin access only
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signOutPending}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-200 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m16 13 1.293 1.293a1 1 0 0 1-1.414 1.414l-3-3a1 1 0 0 1 0-1.414l3-3a1 1 0 1 1 1.414 1.414L16 11h4a1 1 0 1 1 0 2h-4Zm-2 7H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2h-2V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2h2v2a3 3 0 0 1-3 3Z" /></svg>
                {signOutPending ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </header>

          {signOutError && (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
              {signOutError}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.id}
                className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.35)] backdrop-blur"
              >
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{metric.label}</h2>
                <div className="mt-3 text-3xl font-bold tracking-tight text-white">{metric.value}</div>
                <p className="mt-2 text-xs text-slate-300/80">{metric.sublabel}</p>
              </article>
            ))}
          </section>

          <StudentGrowthCard data={studentGrowth} loading={studentGrowthLoading} error={studentGrowthError} />

          <section className="grid gap-5 lg:grid-cols-3">
            {PLACEHOLDER_PANELS.map((panel) => (
              <article
                key={panel.id}
                className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_34px_rgba(2,6,23,0.55)] backdrop-blur"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white">{panel.title}</h3>
                  <p className="mt-2 text-sm text-slate-300/85">{panel.description}</p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-sky-300" />
                  {panel.cta}
                </div>
              </article>
            ))}
            <article className="rounded-3xl border border-emerald-300/40 bg-emerald-500/15 p-6 text-emerald-100 shadow-[0_20px_42px_rgba(15,118,110,0.35)] backdrop-blur lg:col-span-3">
              <h3 className="text-lg font-semibold">Next steps</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  Wire analytics events from the learning modules into the Supabase data warehouse.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  Define retention, completion, and engagement KPIs for the executive summary.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  Enable CSV exports and schedule automated email digests for stakeholders.
                </li>
              </ul>
            </article>
          </section>
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-sky-500/90 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg ring-1 ring-sky-300/40 transition hover:bg-sky-400/90 focus:outline-none focus:ring-2 focus:ring-sky-200 lg:hidden"
          aria-label="Toggle admin navigation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3zm6 5h12v2H9zm4 5h8v2h-8z" /></svg>
          Admin menu
        </button>
      </div>
    </main>
  );
}

function StudentGrowthCard({ data, loading, error }: StudentGrowthCardProps): ReactElement {
  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);
  const hasData = Boolean(data && data.length > 0);
  const latestPoint = hasData && data ? data[data.length - 1] : null;
  const previousPoint = hasData && data && data.length > 1 ? data[data.length - 2] : null;
  const dailyChange = latestPoint ? latestPoint.newStudents : 0;
  const changeLabel = dailyChange >= 0 ? `+${dailyChange}` : `${dailyChange}`;
  const comparisonLabel = previousPoint
    ? `vs. ${previousPoint.date}`
    : 'First recorded day';

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_34px_rgba(2,6,23,0.55)] backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Student Growth</h2>
          <p className="mt-1 text-sm text-slate-300/80">
            Total student accounts over time. Admin accounts are excluded from this view.
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-2 text-right text-xs uppercase tracking-[0.18em] text-white/80 shadow-inner ring-1 ring-white/10">
          <div className="text-[10px] font-semibold text-sky-200/85">Total Students</div>
          <div className="mt-1 text-base font-bold text-white">
            {latestPoint ? numberFormatter.format(latestPoint.totalStudents) : loading ? '…' : '0'}
          </div>
          <div className="mt-1 text-[10px] font-medium text-emerald-200/80">
            {loading || !hasData ? 'Awaiting data' : `${changeLabel} today`}
          </div>
        </div>
      </div>

      <div className="mt-6 min-h-[16rem] w-full">
        {loading ? (
          <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-900/60 text-sm text-slate-300/70">
            Loading student growth…
          </div>
        ) : error ? (
          <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-sm font-medium text-red-200">
            {error}
          </div>
        ) : hasData && data ? (
          <StudentGrowthChart data={data} formatter={numberFormatter} comparisonLabel={comparisonLabel} />
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-white/15 bg-slate-900/60 text-sm text-slate-300/70">
            No student accounts found yet.
          </div>
        )}
      </div>
    </article>
  );
}

function StudentGrowthChart({ data, formatter, comparisonLabel }: StudentGrowthChartProps): ReactElement {
  const chart = useMemo(() => {
    if (!data.length) {
      return null;
    }

    const width = 720;
    const height = 260;
    const padding = { top: 32, right: 36, bottom: 56, left: 72 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const dateValues = data.map((point) => new Date(`${point.date}T00:00:00.000Z`).getTime());
    const minDateValue = Math.min(...dateValues);
    const maxDateValue = Math.max(...dateValues);
    const dateRange = Math.max(1, maxDateValue - minDateValue);

    const totals = data.map((point) => point.totalStudents);
    const maxTotal = Math.max(...totals, 0);
    const valueRange = Math.max(1, maxTotal);

    const scaledPoints = data.map((point, index) => {
      const dateValue = dateValues[index];
      const x = padding.left + ((dateValue - minDateValue) / dateRange) * chartWidth;
      const valueRatio = valueRange > 0 ? point.totalStudents / valueRange : 0;
      const y = padding.top + (1 - valueRatio) * chartHeight;
      return { ...point, x, y };
    });

    const pathD = scaledPoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');

    const baseY = padding.top + chartHeight;
    const areaD = `${pathD} L${scaledPoints[scaledPoints.length - 1].x.toFixed(2)} ${baseY.toFixed(2)} L${scaledPoints[0].x.toFixed(2)} ${baseY.toFixed(2)} Z`;

    const targetTickCount = Math.min(6, scaledPoints.length);
    const tickInterval = targetTickCount > 1 ? Math.round((scaledPoints.length - 1) / (targetTickCount - 1)) : 1;
    const xTicks = scaledPoints.reduce<{ x: number; label: string; date: string }[]>((acc, point, index) => {
      if (index % tickInterval === 0 || index === scaledPoints.length - 1) {
        acc.push({ x: point.x, label: point.date, date: point.date });
      }
      return acc;
    }, []);

    const yTickCount = 4;
    const yTicks = Array.from({ length: yTickCount + 1 }).map((_, idx) => {
      const ratio = idx / yTickCount;
      const value = Math.round(maxTotal * ratio);
      const y = padding.top + (1 - ratio) * chartHeight;
      return { y, value };
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: data.length > 40 ? undefined : 'numeric',
      year: data.length > 120 ? 'numeric' : undefined,
    });

    return {
      width,
      height,
      padding,
      pathD,
      areaD,
      scaledPoints,
      xTicks: xTicks.map((tick) => ({ x: tick.x, label: dateFormatter.format(new Date(`${tick.date}T00:00:00.000Z`)) })),
      yTicks,
      maxTotal,
    };
  }, [data]);

  if (!chart) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-white/15 bg-slate-900/60 text-sm text-slate-300/70">
        No data available.
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full">
      <svg
        role="img"
        aria-label="Line chart showing student account growth over time"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="student-growth-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.65)" />
            <stop offset="95%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
        </defs>

        <g stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6">
          {chart.xTicks.map((tick) => (
            <line key={`grid-x-${tick.label}`} x1={tick.x} y1={chart.padding.top} x2={tick.x} y2={chart.height - chart.padding.bottom} />
          ))}
          {chart.yTicks.map((tick, index) => (
            <line key={`grid-y-${index}`} x1={chart.padding.left} y1={tick.y} x2={chart.width - chart.padding.right} y2={tick.y} />
          ))}
        </g>

        <path d={chart.areaD} fill="url(#student-growth-gradient)" opacity="0.55" />
        <path d={chart.pathD} fill="none" stroke="rgba(56,189,248,0.95)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {chart.scaledPoints.map((point) => (
          <circle key={`marker-${point.date}`} cx={point.x} cy={point.y} r={4.5} fill="rgba(56,189,248,1)" />
        ))}

        <g fontSize="12" fill="rgba(226,232,240,0.75)" fontWeight="500">
          {chart.xTicks.map((tick) => (
            <text key={`label-x-${tick.label}`} x={tick.x} y={chart.height - chart.padding.bottom + 28} textAnchor="middle">
              {tick.label}
            </text>
          ))}
          {chart.yTicks.map((tick, index) => (
            <text key={`label-y-${index}`} x={chart.padding.left - 12} y={tick.y + 4} textAnchor="end">
              {formatter.format(tick.value)}
            </text>
          ))}
        </g>

        <text
          x={chart.padding.left}
          y={chart.padding.top - 12}
          fill="rgba(226,232,240,0.9)"
          fontSize="12"
          fontWeight="600"
        >
          Total Students ({comparisonLabel})
        </text>
      </svg>
    </div>
  );
}
