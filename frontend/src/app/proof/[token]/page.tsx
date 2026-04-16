'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, CalendarClock, Shield, Target } from 'lucide-react';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { getRetentionSessionId } from '@/lib/analytics';
import type { PublicProofShareResponse } from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function formatDate(date: string | null) {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PublicProofSharePage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [share, setShare] = useState<PublicProofShareResponse | null>(null);
  const [sessionId] = useState<string | null>(() => getRetentionSessionId());
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setUnavailable(false);

    const url = new URL(`${API_BASE}/proof-shares/public/${encodeURIComponent(token)}`);
    if (sessionId) {
      url.searchParams.set('session_id', sessionId);
    }

    void fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async response => {
        if (!response.ok) {
          if (response.status === 404) {
            if (!cancelled) setUnavailable(true);
            return null;
          }
          throw new Error('Failed to load proof share');
        }
        return response.json() as Promise<PublicProofShareResponse>;
      })
      .then(data => {
        if (!cancelled && data) setShare(data);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  const gapLabel = useMemo(() => {
    if (!share || share.goal_summary.gap == null) return 'Goal gap unavailable';
    return `${share.goal_summary.gap.toFixed(1)}% to goal`;
  }, [share]);

  const referredTryHref = useMemo(() => {
    if (!share) return '#';
    if (!sessionId) return share.referred_try_url;
    const url = new URL(share.referred_try_url);
    url.searchParams.set('session_id', sessionId);
    return url.toString();
  }, [sessionId, share]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="mt-4 text-sm text-white/50">Loading public proof card…</p>
        </div>
      </main>
    );
  }

  if (unavailable || !share) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white px-6 py-16">
        <div className="max-w-xl mx-auto text-center rounded-3xl border border-white/10 bg-white/[0.03] p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60">
            <Shield className="h-3.5 w-3.5" />
            Proof share unavailable
          </div>
          <h1 className="mt-6 text-3xl font-bold">This proof card is no longer public.</h1>
          <p className="mt-3 text-white/55">
            The owner may have revoked it, deleted the underlying proof asset, or removed their account.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white text-[#0a0a0f] px-5 py-3 font-medium hover:opacity-90 transition-opacity"
          >
            Back to Devenira
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link href="/" className="text-white transition-opacity hover:opacity-90">
            <BrandLogo size={42} priority labelClassName="text-xl font-bold text-white" />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60">
            <Shield className="h-3.5 w-3.5" />
            Public-safe proof card
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-8">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                data-testid="public-proof-share-image"
                src={share.image_url}
                alt="Shared progress proof"
                className="w-full aspect-[3/4] object-cover"
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-white/60">
              <span>{formatDate(share.photo_summary.taken_at)}</span>
              {share.week_marker != null && (
                <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Week {share.week_marker}
                </span>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <CalendarClock className="h-3.5 w-3.5" />
              Progress proof
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight">
              Real proof beats vague motivation.
            </h1>
            <p className="mt-4 text-lg text-white/65 max-w-2xl">
              This public card shows one opt-in progress proof visual, the owner&apos;s current goal gap, and where the next weekly check-in should go.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Goal target</p>
                <p className="mt-2 text-2xl font-bold">
                  {share.goal_summary.target_bf != null ? `${share.goal_summary.target_bf.toFixed(1)}%` : 'Unknown'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Current scan</p>
                <p className="mt-2 text-2xl font-bold">
                  {share.goal_summary.current_bf != null ? `${share.goal_summary.current_bf.toFixed(1)}%` : 'Unknown'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Gap to goal</p>
                <p className="mt-2 text-2xl font-bold">{gapLabel}</p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-emerald-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Want your own proof loop?</p>
                  <p className="mt-1 text-sm text-white/60">
                    Start with a free body fat estimate, then turn scans into proof photos, comparisons, and weekly check-ins.
                  </p>
                </div>
              </div>
              <a
                data-testid="proof-share-try-link"
                href={referredTryHref}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-400 transition-colors"
              >
                Try Devenira free
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
