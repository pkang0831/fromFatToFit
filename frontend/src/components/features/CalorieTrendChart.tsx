'use client';

import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDateShort } from '@/lib/utils/date';
import { useThemeColors } from '@/contexts/ThemeContext';

interface CalorieTrendChartProps {
  data: Array<{ date: string; calories: number; goal: number }>;
  averageCalories: number;
}

export default function CalorieTrendChart({ data, averageCalories }: CalorieTrendChartProps) {
  const { primary, secondary } = useThemeColors();
  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primary} stopOpacity={0.2} />
              <stop offset="95%" stopColor={primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => formatDateShort(date)}
            stroke="rgba(255,255,255,0.3)"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              color: 'var(--color-text)',
            }}
          />
          <Legend />
          <Area type="monotone" dataKey="calories" stroke={primary} fill="url(#calorieGradient)" strokeWidth={2} name="Calories" />
          <Line type="monotone" dataKey="goal" stroke={secondary} strokeWidth={2} strokeDasharray="5 5" name="Goal" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-center text-sm text-text-secondary mt-4">
        Average: <span className="font-number font-semibold text-primary">{Math.round(averageCalories)}</span> calories/day
      </p>
    </>
  );
}
