'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scan, ArrowRight, Clock, TrendingDown, Trophy } from 'lucide-react';
import { bodyApi } from '@/lib/api/services';
import type { GapToGoalResponse } from '@/types/api';

type PromptState = 'first_scan' | 'too_early' | 'ready' | 'overdue';

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getPromptState(data: GapToGoalResponse): PromptState {
  if (data.scan_count === 0 || !data.last_scan_date) return 'first_scan';
  const days = daysSince(data.last_scan_date);
  if (days < 5) return 'too_early';
  if (days <= 10) return 'ready';
  return 'overdue';
}

function syncToLocalStorage(data: GapToGoalResponse) {
  try {
    if (data.current_bf != null) localStorage.setItem('devenira_current_bodyfat', String(data.current_bf));
    if (data.last_scan_date) localStorage.setItem('devenira_last_scan_date', data.last_scan_date);
    localStorage.setItem('devenira_scan_count', String(data.scan_count));
    if (data.target_bf != null) localStorage.setItem('devenira_target_bodyfat', String(data.target_bf));

    if (data.scan_history.length >= 2) {
      localStorage.setItem('devenira_prev_bodyfat', String(data.scan_history[data.scan_history.length - 2].bf));
    }
  } catch {}
}

interface WeeklyRescanPromptProps {
  variant?: 'full' | 'compact';
}

export function WeeklyRescanPrompt({ variant = 'full' }: WeeklyRescanPromptProps) {
  const [data, setData] = useState<GapToGoalResponse | null>(null);
  const [state, setState] = useState<PromptState>('first_scan');

  useEffect(() => {
    bodyApi.getGapToGoal()
      .then(res => {
        setData(res.data);
        setState(getPromptState(res.data));
        syncToLocalStorage(res.data);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;
  if (variant === 'compact' && state === 'too_early') return null;

  const daysAgo = data.last_scan_date ? daysSince(data.last_scan_date) : 0;
  const daysUntilReady = Math.max(0, 7 - daysAgo);
  const prevBf = data.scan_history.length >= 2 ? data.scan_history[data.scan_history.length - 2].bf : null;
  const delta = prevBf != null && data.current_bf != null ? prevBf - data.current_bf : null;

  if (variant === 'compact') {
    return (
      <Link
        href="/body-scan"
        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:-translate-y-0.5 ${
          state === 'ready' || state === 'overdue'
            ? 'border-primary/30 bg-primary/[0.04] hover:border-primary/50 hover:shadow-glow-cyan'
            : state === 'first_scan'
            ? 'border-white/[0.08] bg-white/[0.02] hover:border-primary/30'
            : 'border-white/[0.06] bg-white/[0.02]'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          state === 'ready' || state === 'overdue' ? 'bg-primary/20' : 'bg-white/[0.06]'
        }`}>
          {state === 'ready' || state === 'overdue' ? (
            <Scan className="w-6 h-6 text-primary animate-pulse" />
          ) : (
            <Scan className="w-6 h-6 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text">
            {state === 'first_scan' && 'Get your first body scan'}
            {state === 'ready' && 'Weekly scan ready!'}
            {state === 'overdue' && `${daysAgo} days since last scan`}
            {state === 'too_early' && `Next scan in ${daysUntilReady} days`}
          </p>
          <p className="text-xs text-text-secondary truncate">
            {state === 'first_scan' && 'AI body fat estimation from a photo'}
            {state === 'ready' && (data.gap != null ? `${data.gap.toFixed(1)}% gap to close` : 'Track your week-over-week progress')}
            {state === 'overdue' && 'Scan now to stay on track'}
            {state === 'too_early' && data.current_bf != null && `Current: ${data.current_bf.toFixed(1)}% body fat`}
          </p>
        </div>

        {(state === 'ready' || state === 'overdue' || state === 'first_scan') && (
          <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
        )}
      </Link>
    );
  }

  // Full variant
  return (
    <div className={`rounded-2xl border p-6 ${
      state === 'ready' || state === 'overdue'
        ? 'border-primary/30 bg-gradient-to-r from-primary/[0.06] to-transparent'
        : 'border-border bg-surface'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          state === 'ready' || state === 'overdue' ? 'bg-primary/20' : 'bg-surfaceAlt'
        }`}>
          {state === 'ready' || state === 'overdue' ? (
            <Scan className="w-7 h-7 text-primary" />
          ) : (
            <Scan className="w-7 h-7 text-text-secondary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {state === 'first_scan' && (
            <>
              <h3 className="text-lg font-bold text-text mb-1">Start your transformation journey</h3>
              <p className="text-sm text-text-secondary">
                Upload a full-body photo to get your AI body fat estimate. Come back weekly to track real changes.
              </p>
            </>
          )}

          {state === 'too_early' && (
            <>
              <h3 className="text-lg font-bold text-text mb-1">
                Next scan in {daysUntilReady} day{daysUntilReady !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-text-secondary">
                Weekly scans give the most accurate progress tracking. Your body needs time to show changes.
              </p>
              {data.current_bf != null && (
                <div className="mt-3 flex items-center gap-4">
                  <div className="px-3 py-1.5 rounded-lg bg-surfaceAlt">
                    <span className="text-xs text-text-light">Current</span>
                    <span className="text-sm font-bold text-text ml-2 font-number">{data.current_bf.toFixed(1)}%</span>
                  </div>
                  {data.gap != null && (
                    <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <span className="text-xs text-primary/70">Gap to goal</span>
                      <span className="text-sm font-bold text-primary ml-2 font-number">{data.gap.toFixed(1)}%</span>
                    </div>
                  )}
                  {delta != null && (
                    <div className="flex items-center gap-1">
                      {delta > 0 ? (
                        <TrendingDown className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-400 rotate-180" />
                      )}
                      <span className={`text-sm font-bold font-number ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {delta > 0 ? '-' : '+'}{Math.abs(delta).toFixed(1)}%
                      </span>
                      <span className="text-xs text-text-light ml-1">vs last week</span>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3">
                <div className="w-full h-2 rounded-full bg-surfaceAlt overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (daysAgo / 7) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-text-light">Last scan</span>
                  <span className="text-[10px] text-text-light">7 days</span>
                </div>
              </div>
            </>
          )}

          {(state === 'ready' || state === 'overdue') && (
            <>
              <h3 className="text-lg font-bold text-text mb-1">
                {state === 'overdue'
                  ? `It's been ${daysAgo} days — time for your weekly scan!`
                  : 'Your weekly scan is ready!'}
              </h3>
              <p className="text-sm text-text-secondary">
                {data.scan_count > 1
                  ? `Week ${data.scan_count + 1} check-in. ${data.gap != null ? `${data.gap.toFixed(1)}% gap remaining.` : 'See how your body has changed.'}`
                  : 'Get your second data point and start seeing real trends.'}
              </p>
              {data.current_bf != null && (
                <div className="mt-3 flex items-center gap-4">
                  <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-xs text-primary/70">Last result</span>
                    <span className="text-sm font-bold text-primary ml-2 font-number">{data.current_bf.toFixed(1)}%</span>
                  </div>
                  {data.gap != null && (
                    <div className="px-3 py-1.5 rounded-lg bg-surfaceAlt">
                      <span className="text-xs text-text-light">Gap to goal</span>
                      <span className="text-sm font-bold text-text ml-2 font-number">{data.gap.toFixed(1)}%</span>
                    </div>
                  )}
                  {data.scan_count > 1 && (
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-text-secondary">{data.scan_count} scans</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
