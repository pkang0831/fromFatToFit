'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Scan, 
  TrendingUp,
  Sparkles,
  Crown,
  ArrowRight,
  Target,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { bodyApi } from '@/lib/api/services';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { QuickStatsCard } from '@/components/features/QuickStatsCard';
import { StreakBadge } from '@/components/features/StreakBadge';
import type { GapToGoalResponse } from '@/types/api';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';
import { WeeklyRescanPrompt } from '@/components/features/WeeklyRescanPrompt';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isPremium } = useSubscription();
  const [gapData, setGapData] = useState<GapToGoalResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bodyApi.getGapToGoal()
      .then(res => setGapData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <SkeletonStats count={3} />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">
            {getGreeting()}, <span className="gradient-text">{user?.full_name || 'there'}</span>
          </h1>
          <p className="text-text-secondary mt-1">See your future body. Close the gap every week.</p>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge />
          {isPremium && (
            <Badge variant="premium" className="text-base px-4 py-2">
              <Crown className="h-4 w-4 mr-2" />
              Pro
            </Badge>
          )}
        </div>
      </div>

      {/* Primary CTA: Body Scan / Weekly Check-in */}
      <WeeklyRescanPrompt variant="full" />

      {/* Gap-to-Goal Stats from API */}
      <div data-tour="home-stats" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickStatsCard
          title="Current Body Fat"
          value={gapData?.current_bf != null ? `${gapData.current_bf.toFixed(1)}%` : '—'}
          subtitle={gapData && gapData.scan_count > 0 ? `${gapData.scan_count} scan${gapData.scan_count !== 1 ? 's' : ''} completed` : 'Scan to measure'}
          icon={Scan}
        />
        <QuickStatsCard
          title="Gap to Goal"
          value={gapData?.gap != null ? `${gapData.gap.toFixed(1)}% to go` : '—'}
          subtitle={gapData?.target_bf != null ? `Target: ${gapData.target_bf}%` : 'Set your target in Body Scan'}
          icon={Target}
        />
        <QuickStatsCard
          title="Weekly Check-ins"
          value={gapData?.scan_count ?? 0}
          subtitle={gapData && gapData.scan_count > 0 ? 'Keep the streak going' : 'Start your first scan'}
          icon={TrendingUp}
        />
      </div>

      {/* Core Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/body-scan" className="group">
          <Card hover className="h-full border-primary/20 bg-primary/[0.03]">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl">
                  <Scan className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text mb-1">Body Scan</h3>
                  <p className="text-sm text-text-secondary">Measure & compare to your goal</p>
                </div>
                <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/body-scan#transformation" className="group">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text mb-1">Goal Preview</h3>
                  <p className="text-sm text-text-secondary">See your AI-generated target physique</p>
                </div>
                <ArrowRight className="h-5 w-5 text-text-light opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/progress" className="group">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text mb-1">Progress Timeline</h3>
                  <p className="text-sm text-text-secondary">Side-by-side photos & trend lines</p>
                </div>
                <ArrowRight className="h-5 w-5 text-text-light opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Premium Upgrade CTA */}
      {!isPremium && (
        <Card variant="elevated" className="bg-gradient-to-r from-primary/[0.06] to-secondary/[0.06] border border-primary/20">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-text mb-2 flex items-center justify-center md:justify-start">
                  <Crown className="h-6 w-6 text-premium mr-2" />
                  Unlimited Weekly Scans. No Credit Cost.
                </h3>
                <p className="text-text-secondary mb-4">
                  Pro includes unlimited body scans, side-by-side comparisons, and full gap-to-goal analytics. Credits are only for premium AI previews.
                </p>
              </div>
              <Button variant="primary" size="lg" onClick={() => router.push('/upgrade')}>
                <Crown className="h-5 w-5 mr-2" />
                Go Pro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
