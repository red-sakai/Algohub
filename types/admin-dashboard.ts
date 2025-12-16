export type AdminNavTarget = 'dashboard' | 'members';

export type StudentGrowthPoint = {
  date: string;
  newStudents: number;
  totalStudents: number;
};

export type AchievementGainPoint = {
  date: string;
  unlocked: number;
  totalUnlocked: number;
};

export type StudentGrowthResponse = {
  data?: StudentGrowthPoint[];
  meta?: {
    totalStudents?: number;
    windowStart?: string;
    windowEnd?: string;
  };
  generatedAt?: string;
  error?: string;
};

export type AchievementGainResponse = {
  data?: AchievementGainPoint[];
  meta?: {
    totalUnlocked?: number;
    windowStart?: string;
    windowEnd?: string;
  };
  generatedAt?: string;
  error?: string;
};

export type StudentGrowthCardProps = {
  data: StudentGrowthPoint[] | null;
  loading: boolean;
  error: string | null;
};

export type StudentGrowthChartProps = {
  data: StudentGrowthPoint[];
  formatter: Intl.NumberFormat;
  comparisonLabel: string;
};

export type AchievementGainCardProps = {
  data: AchievementGainPoint[] | null;
  loading: boolean;
  error: string | null;
};

export type AchievementGainChartProps = {
  data: AchievementGainPoint[];
  formatter: Intl.NumberFormat;
  comparisonLabel: string;
};

export type AiInsightData = {
  insight: string;
  metrics: {
    studentsTotal: number;
    studentsNew7d: number;
    studentsNew30d: number;
    achievementsTotal: number;
    achievementsNew7d: number;
    achievementsNew30d: number;
  };
};

export type AiInsightResponse = {
  data?: AiInsightData;
  generatedAt?: string;
  error?: string;
};
