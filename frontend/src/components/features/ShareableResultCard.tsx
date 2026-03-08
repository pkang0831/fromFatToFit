'use client';

import { useRef, useState, useCallback } from 'react';
import { Download, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';

interface ShareableResultCardProps {
  bodyFatPercent?: number;
  previousBodyFat?: number;
  weekNumber?: number;
  currentImageUrl?: string;
  transformedImageUrl?: string;
  userName?: string;
}

export function ShareableResultCard({
  bodyFatPercent,
  previousBodyFat,
  weekNumber,
  currentImageUrl,
  transformedImageUrl,
  userName,
}: ShareableResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const delta = previousBodyFat && bodyFatPercent ? previousBodyFat - bodyFatPercent : null;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0f',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `devenira-week${weekNumber || 1}-scan.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
  }, [weekNumber]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0f',
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        if (navigator.share && navigator.canShare) {
          const file = new File([blob], 'devenira-scan.png', { type: 'image/png' });
          const shareData = {
            title: 'My Body Transformation Progress — Devenira',
            text: bodyFatPercent
              ? `Week ${weekNumber || 1}: ${bodyFatPercent.toFixed(1)}% body fat${delta ? ` (${delta > 0 ? '-' : '+'}${Math.abs(delta).toFixed(1)}%)` : ''}`
              : 'Check out my body transformation progress!',
            files: [file],
          };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        }

        const link = document.createElement('a');
        link.download = `devenira-week${weekNumber || 1}-scan.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }, 'image/png');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error(err);
    }
  }, [bodyFatPercent, weekNumber, delta]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="space-y-4">
      {/* The card itself — what gets rendered to image */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0a0a1a] to-[#0f0f20] p-6"
        style={{ width: '100%', maxWidth: 480 }}
      >
        {/* Background glow */}
        <div
          className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-primary-hex, #06b6d4), transparent)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">Devenira</h3>
            <p className="text-xs text-white/40">AI Body Transformation</p>
          </div>
          {weekNumber && (
            <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-xs font-bold text-primary font-number">Week {weekNumber}</span>
            </div>
          )}
        </div>

        {/* Images row */}
        {(currentImageUrl || transformedImageUrl) && (
          <div className="flex gap-3 mb-5">
            {currentImageUrl && (
              <div className="flex-1 rounded-xl overflow-hidden border border-white/[0.06]">
                <img src={currentImageUrl} alt="Current" className="w-full aspect-[3/4] object-cover" />
                <div className="px-2 py-1.5 bg-white/[0.04] text-center">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider">Now</span>
                </div>
              </div>
            )}
            {transformedImageUrl && (
              <div className="flex-1 rounded-xl overflow-hidden border border-primary/20">
                <img src={transformedImageUrl} alt="Goal" className="w-full aspect-[3/4] object-cover" />
                <div className="px-2 py-1.5 bg-primary/[0.08] text-center">
                  <span className="text-[10px] text-primary/80 uppercase tracking-wider">Goal</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {bodyFatPercent !== undefined && (
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Body Fat</span>
              <span className="text-2xl font-bold text-white font-number">{bodyFatPercent.toFixed(1)}%</span>
            </div>
          )}
          {delta !== null && (
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Change</span>
              <span className={`text-2xl font-bold font-number ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-white'}`}>
                {delta > 0 ? '-' : '+'}{Math.abs(delta).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Footer watermark */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] text-white/20">devenira.com</span>
          {userName && <span className="text-[10px] text-white/20">{userName}</span>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleShare} className="flex-1">
          <Share2 className="w-4 h-4 mr-1.5" />
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-1.5" />
          Save
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
