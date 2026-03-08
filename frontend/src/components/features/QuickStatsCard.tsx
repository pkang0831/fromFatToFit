import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { LucideIcon } from 'lucide-react';

interface QuickStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  progress?: {
    current: number;
    max: number;
  };
}

function CircularProgress({ current, max }: { current: number; max: number }) {
  const pct = Math.min((current / max) * 100, 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const root = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const themeColor = root?.getPropertyValue('--color-primary-hex').trim() || '#06b6d4';
  let strokeColor = themeColor;
  if (pct >= 90) strokeColor = '#22c55e';
  else if (pct >= 70) strokeColor = '#f59e0b';

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-white/[0.06]" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={strokeColor} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text font-number">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export function QuickStatsCard({ title, value, subtitle, icon: Icon, progress }: QuickStatsCardProps) {
  return (
    <Card hover className="group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
            <p className="text-3xl font-bold text-text font-number">{value}</p>
            {subtitle && <p className="text-sm text-text-light mt-1 truncate">{subtitle}</p>}
          </div>
          {progress ? (
            <CircularProgress current={progress.current} max={progress.max} />
          ) : (
            <div className="p-3 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
