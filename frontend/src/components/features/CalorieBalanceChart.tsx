'use client';

import { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts';
import { dashboardApi } from '@/lib/api/services';
import type { CalorieBalanceTrendPoint } from '@/types/api';
import { Card, CardContent } from '@/components/ui';
import { useThemeColors } from '@/contexts/ThemeContext';

interface Props {
  days: number;
}

export function CalorieBalanceChart({ days }: Props) {
  const [data, setData] = useState<CalorieBalanceTrendPoint[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { primary, secondary } = useThemeColors();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getCalorieBalanceTrend(days);
      setData(response.data.data);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to load calorie balance trend:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const d = payload[0].payload;
    const isDeficitPositive = d.deficit > 0;

    return (
      <div className="bg-surface p-4 shadow-xl rounded-xl border border-border backdrop-blur-xl">
        <p className="font-bold text-text mb-3">{formatDate(d.date)}</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-6">
            <span className="text-orange-400">Intake:</span>
            <span className="font-semibold text-text font-number">{Math.round(d.consumed)} kcal</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-cyan-400">Burned:</span>
            <span className="font-semibold text-text font-number">{Math.round(d.burned)} kcal</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-text-secondary">Net Cal:</span>
            <span className="font-semibold text-text font-number">{Math.round(d.net)} kcal</span>
          </div>
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex items-center justify-between gap-6">
              <span className={isDeficitPositive ? 'text-emerald-400' : 'text-rose-400'}>Deficit:</span>
              <span className={`font-bold font-number ${isDeficitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isDeficitPositive ? '+' : ''}{Math.round(d.deficit)} kcal
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="h-80 bg-surfaceAlt dark:bg-white/[0.04] rounded-2xl skeleton-shimmer" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <p>No data available</p>
      </div>
    );
  }

  const avgGoal = data.length > 0 ? data[0].goal : 2000;

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 10, right: 60, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="consumedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="burnedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primary} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={primary} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="rgba(255,255,255,0.3)"
            style={{ fontSize: '12px' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)"
            style={{ fontSize: '12px' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
            formatter={(value) => {
              if (value === 'consumed') return 'Intake';
              if (value === 'burned') return 'Burned';
              if (value === 'net') return 'Net Cal';
              return value;
            }}
          />
          
          <ReferenceLine 
            y={avgGoal} 
            stroke="rgba(255,255,255,0.2)" 
            strokeDasharray="5 5"
            label={{ value: 'Goal', position: 'right', fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
          />
          
          <Area 
            type="monotone" 
            dataKey="consumed" 
            stroke="#F97316" 
            fill="url(#consumedGradient)"
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="burned" 
            stroke={primary} 
            fill="url(#burnedGradient)"
            strokeWidth={2}
          />
          
          <Line 
            type="monotone" 
            dataKey="net" 
            stroke={secondary} 
            strokeWidth={3}
            dot={{ fill: secondary, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: secondary, stroke: secondary, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-orange-500/20 dark:border-orange-500/10 bg-orange-500/[0.04]">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-orange-400 mb-1">Avg Intake</div>
              <div className="text-3xl font-bold text-orange-400 font-number">
                {Math.round(summary.avg_consumed)}
              </div>
              <div className="text-xs text-orange-400/60 mt-1">kcal/day</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 dark:border-primary/10 bg-primary/[0.04]">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-primary mb-1">Avg Burned</div>
              <div className="text-3xl font-bold text-primary font-number">
                {Math.round(summary.avg_burned)}
              </div>
              <div className="text-xs text-primary/60 mt-1">kcal/day</div>
            </CardContent>
          </Card>

          <Card className={`${
            summary.avg_deficit > 0 
              ? 'border-emerald-500/20 dark:border-emerald-500/10 bg-emerald-500/[0.04]'
              : 'border-rose-500/20 dark:border-rose-500/10 bg-rose-500/[0.04]'
          }`}>
            <CardContent className="p-4 text-center">
              <div className={`text-sm mb-1 ${summary.avg_deficit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Avg Deficit
              </div>
              <div className={`text-3xl font-bold font-number ${summary.avg_deficit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {summary.avg_deficit > 0 ? '+' : ''}{Math.round(summary.avg_deficit)}
              </div>
              <div className={`text-xs mt-1 ${summary.avg_deficit > 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                kcal/day
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
