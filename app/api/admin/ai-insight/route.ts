import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/serviceClient';
import { generateAdminInsight } from '@/lib/ai';

export const runtime = 'nodejs';

type CachedInsight = {
  signature: string;
  insight: string;
  generatedAt: string;
  metrics: {
    studentsTotal: number;
    studentsNew7d: number;
    studentsNew30d: number;
    achievementsTotal: number;
    achievementsNew7d: number;
    achievementsNew30d: number;
  };
};

let cached: CachedInsight | null = null;
let inFlight: Promise<CachedInsight> | null = null;
let inFlightSignature: string | null = null;

function isoDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString();
}

async function countRows(
  table: 'users' | 'user_achievements',
  where: Record<string, string | number | undefined> = {},
): Promise<number> {
  const supabase = getServiceSupabase();

  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(where)) {
    if (typeof value === 'undefined') {
      continue;
    }
    // Simple equals filters only; date filters are handled separately.
    query = query.eq(key, value);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message ?? 'Unable to load analytics');
  }
  return count ?? 0;
}

async function countSince(
  table: 'users' | 'user_achievements',
  dateColumn: 'created_at' | 'unlocked_at',
  sinceIso: string,
  where: Record<string, string | number | undefined> = {},
): Promise<number> {
  const supabase = getServiceSupabase();

  let query = supabase.from(table).select('*', { count: 'exact', head: true }).gte(dateColumn, sinceIso);
  for (const [key, value] of Object.entries(where)) {
    if (typeof value === 'undefined') {
      continue;
    }
    query = query.eq(key, value);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message ?? 'Unable to load analytics');
  }
  return count ?? 0;
}

export async function GET() {
  try {
    const asOf = new Date().toISOString();
    const since7d = isoDaysAgo(7);
    const since30d = isoDaysAgo(30);

    const [
      studentsTotal,
      studentsNew7d,
      studentsNew30d,
      achievementsTotal,
      achievementsNew7d,
      achievementsNew30d,
    ] = await Promise.all([
      countRows('users', { role: 'student' }),
      countSince('users', 'created_at', since7d, { role: 'student' }),
      countSince('users', 'created_at', since30d, { role: 'student' }),
      countRows('user_achievements'),
      countSince('user_achievements', 'unlocked_at', since7d),
      countSince('user_achievements', 'unlocked_at', since30d),
    ]);

    const signature = JSON.stringify({
      studentsTotal,
      studentsNew7d,
      studentsNew30d,
      achievementsTotal,
      achievementsNew7d,
      achievementsNew30d,
    });

    if (cached && cached.signature === signature) {
      return NextResponse.json(
        {
          data: {
            insight: cached.insight,
            metrics: cached.metrics,
          },
          generatedAt: cached.generatedAt,
        },
        {
          headers: {
            'Cache-Control': 'no-store',
            ETag: cached.signature,
          },
        },
      );
    }

    if (inFlight && inFlightSignature === signature) {
      const resolved = await inFlight;
      return NextResponse.json(
        {
          data: {
            insight: resolved.insight,
            metrics: resolved.metrics,
          },
          generatedAt: resolved.generatedAt,
        },
        {
          headers: {
            'Cache-Control': 'no-store',
            ETag: resolved.signature,
          },
        },
      );
    }

    inFlightSignature = signature;
    inFlight = (async () => {
      const insight = await generateAdminInsight({
        studentsTotal,
        studentsNew7d,
        studentsNew30d,
        achievementsTotal,
        achievementsNew7d,
        achievementsNew30d,
        asOf,
      });

      const record: CachedInsight = {
        signature,
        insight,
        generatedAt: asOf,
        metrics: {
          studentsTotal,
          studentsNew7d,
          studentsNew30d,
          achievementsTotal,
          achievementsNew7d,
          achievementsNew30d,
        },
      };

      cached = record;
      return record;
    })();

    const resolved = await inFlight;
    inFlight = null;
    inFlightSignature = null;

    return NextResponse.json(
      {
        data: {
          insight: resolved.insight,
          metrics: resolved.metrics,
        },
        generatedAt: resolved.generatedAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          ETag: resolved.signature,
        },
      },
    );
  } catch (error) {
    console.error('[AdminAiInsightRoute] Failed to generate AI insight', error);
    const message = error instanceof Error ? error.message : 'Unable to generate AI insight';
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
