import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/serviceClient';

type StudentRow = {
  created_at: string | null;
};

type StudentGrowthPoint = {
  date: string;
  newStudents: number;
  totalStudents: number;
};

const MS_PER_DAY = 86_400_000;
const MAX_DAY_WINDOW = 365;

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseUtcDateOnly(dateString: string): Date | null {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[StudentGrowthRoute] Failed to query student users', error);
      return NextResponse.json({ error: error.message ?? 'Unable to load student growth data' }, { status: 400 });
    }

    const rows = (data ?? []).filter((row): row is StudentRow & { created_at: string } => {
      return typeof row.created_at === 'string' && row.created_at.length > 0;
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { data: [], meta: { totalStudents: 0 }, generatedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const dayCounts = new Map<string, number>();
    for (const row of rows) {
      const createdAt = new Date(row.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        continue;
      }
      const dayKey = toDateKey(createdAt);
      dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
    }

    const sortedDays = Array.from(dayCounts.keys()).sort();
    if (sortedDays.length === 0) {
      return NextResponse.json(
        { data: [], meta: { totalStudents: 0 }, generatedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const firstDay = parseUtcDateOnly(sortedDays[0]);
    const lastDataDay = parseUtcDateOnly(sortedDays[sortedDays.length - 1]);

    if (!firstDay || !lastDataDay) {
      return NextResponse.json(
        { data: [], meta: { totalStudents: 0 }, generatedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endDate = lastDataDay > today ? lastDataDay : today;

    const maxWindowStart = new Date(endDate.getTime() - (MAX_DAY_WINDOW - 1) * MS_PER_DAY);
    const startDate = firstDay < maxWindowStart ? maxWindowStart : firstDay;

    let baseTotal = 0;
    if (startDate > firstDay) {
      for (const dayKey of sortedDays) {
        const dayDate = parseUtcDateOnly(dayKey);
        if (!dayDate || dayDate >= startDate) {
          break;
        }
        baseTotal += dayCounts.get(dayKey) ?? 0;
      }
    }

    const timeline: StudentGrowthPoint[] = [];
    let runningTotal = baseTotal;
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const dayKey = toDateKey(cursor);
      const newStudents = dayCounts.get(dayKey) ?? 0;
      runningTotal += newStudents;
      timeline.push({ date: dayKey, newStudents, totalStudents: runningTotal });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return NextResponse.json(
      {
        data: timeline,
        meta: {
          totalStudents: runningTotal,
          windowStart: timeline.length > 0 ? timeline[0].date : toDateKey(startDate),
          windowEnd: timeline.length > 0 ? timeline[timeline.length - 1].date : toDateKey(endDate),
        },
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[StudentGrowthRoute] Unexpected failure', error);
    return NextResponse.json({ error: 'Unable to load student growth data' }, { status: 500 });
  }
}
