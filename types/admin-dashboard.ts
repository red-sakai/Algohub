export type AdminNavTarget = 'dashboard' | 'members';

export type StudentGrowthPoint = {
  date: string;
  newStudents: number;
  totalStudents: number;
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
