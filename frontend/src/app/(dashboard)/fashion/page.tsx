'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, Sun, Leaf, Snowflake, CloudRain, Sparkles, Palette, Scan, AlertCircle, User, Ruler, ArrowRight, CheckCircle2, Camera } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { fashionApi } from '@/lib/api/services';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OutfitRecommendation, BeautyAnalysis } from '@/types/api';

const SEASON_KEYS = [
  { id: 'spring', key: 'fashion.spring', icon: Sun, gradient: 'from-pink-400 to-rose-500' },
  { id: 'summer', key: 'fashion.summer', icon: CloudRain, gradient: 'from-cyan-400 to-blue-500' },
  { id: 'fall', key: 'fashion.fall', icon: Leaf, gradient: 'from-amber-400 to-orange-500' },
  { id: 'winter', key: 'fashion.winter', icon: Snowflake, gradient: 'from-slate-400 to-indigo-500' },
];

export default function FashionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeSeason, setActiveSeason] = useState('spring');
  const [outfits, setOutfits] = useState<Record<string, OutfitRecommendation[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beautyData, setBeautyData] = useState<BeautyAnalysis | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('beauty_analysis');
      if (stored) setBeautyData(JSON.parse(stored));
    } catch {}
  }, []);

  const hasBeautyData = !!beautyData;
  const hasBodyData = !!(user?.height_cm || user?.weight_kg);

  const profileSummary = {
    personalColor: beautyData?.personal_color_sub?.replace(/_/g, ' ') || null,
    faceShape: beautyData?.face_shape || null,
    bestColors: beautyData?.best_colors || [],
    height: user?.height_cm || null,
    gender: user?.gender || 'male',
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const bodyNotes = [
        user?.activity_level ? `Activity: ${user.activity_level}` : '',
      ].filter(Boolean).join(', ');

      const fc = beautyData?.face_characteristics;

      const res = await fashionApi.recommend({
        season: activeSeason,
        gender: profileSummary.gender,
        height_cm: profileSummary.height || undefined,
        weight_kg: user?.weight_kg || undefined,
        body_notes: bodyNotes,
        personal_color: beautyData?.personal_color_sub || '',
        best_colors: profileSummary.bestColors.join(', '),
        avoid_colors: beautyData?.avoid_colors?.join(', ') || '',
        face_shape: beautyData?.face_shape || '',
        forehead_ratio: beautyData?.forehead_ratio || '',
        cheekbone_ratio: beautyData?.cheekbone_ratio || '',
        jawline_ratio: beautyData?.jawline_ratio || '',
        chin_type: fc?.chin || '',
        skin_tone: beautyData?.skin_tone || '',
        skin_undertone: beautyData?.skin_undertone || '',
        generate_images: true,
      });

      setOutfits((prev) => ({
        ...prev,
        [activeSeason]: res.data.outfits,
      }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const currentOutfits = outfits[activeSeason] || [];
  const activeSeasonLabel = t(`fashion.${activeSeason}`);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-text">
          {t('fashion.titleAI')} <span className="gradient-text">{t('fashion.title')}</span>
        </h1>
        <p className="text-text-secondary mt-1">
          {t('fashion.subtitle')}
        </p>
      </div>

      {/* Profile data card */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">{t('fashion.stylingProfile')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-3 rounded-xl border ${hasBeautyData ? 'border-primary/20 bg-primary/[0.04]' : 'border-border bg-white/[0.02]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-xs text-text-light">{t('fashion.personalColor')}</span>
              </div>
              {profileSummary.personalColor ? (
                <p className="text-sm font-semibold text-text capitalize">{profileSummary.personalColor}</p>
              ) : (
                <Link href="/beauty-scan" className="text-xs text-primary hover:underline">{t('fashion.runBeautyScan')}</Link>
              )}
            </div>

            <div className={`p-3 rounded-xl border ${hasBeautyData ? 'border-primary/20 bg-primary/[0.04]' : 'border-border bg-white/[0.02]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Scan className="w-4 h-4 text-primary" />
                <span className="text-xs text-text-light">{t('fashion.faceShape')}</span>
              </div>
              {profileSummary.faceShape ? (
                <p className="text-sm font-semibold text-text capitalize">{profileSummary.faceShape}</p>
              ) : (
                <Link href="/beauty-scan" className="text-xs text-primary hover:underline">{t('fashion.runBeautyScan')}</Link>
              )}
            </div>

            <div className={`p-3 rounded-xl border ${hasBodyData ? 'border-primary/20 bg-primary/[0.04]' : 'border-border bg-white/[0.02]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Ruler className="w-4 h-4 text-primary" />
                <span className="text-xs text-text-light">{t('fashion.height')}</span>
              </div>
              {profileSummary.height ? (
                <p className="text-sm font-semibold text-text font-number">{profileSummary.height} cm</p>
              ) : (
                <Link href="/profile" className="text-xs text-primary hover:underline">{t('fashion.setInProfile')}</Link>
              )}
            </div>

            <div className="p-3 rounded-xl border border-border bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-primary" />
                <span className="text-xs text-text-light">{t('fashion.bestColors')}</span>
              </div>
              {profileSummary.bestColors.length > 0 ? (
                <div className="flex gap-1 mt-0.5">
                  {profileSummary.bestColors.slice(0, 5).map((c, i) => (
                    <div key={i} className="w-5 h-5 rounded border border-white/10" style={{ backgroundColor: c }} />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-text-light">--</span>
              )}
            </div>
          </div>

          {(!hasBeautyData || !hasBodyData) && (
            <div className="mt-4 rounded-xl overflow-hidden border border-amber-500/20">
              <div className="px-4 py-3 bg-amber-500/[0.08] border-b border-amber-500/15 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-300">
                  {!hasBeautyData && !hasBodyData
                    ? t('fashion.completeBothScans')
                    : !hasBeautyData
                    ? t('fashion.beautyScanNeeded')
                    : t('fashion.bodyDataNeeded')}
                </p>
              </div>

              <div className="p-4 bg-amber-500/[0.03] space-y-3">
                <p className="text-xs text-text-light">
                  {t('fashion.genericWarning')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href="/beauty-scan"
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      hasBeautyData
                        ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
                        : 'border-primary/30 bg-primary/[0.06] hover:bg-primary/[0.1] hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      hasBeautyData ? 'bg-emerald-500/20' : 'bg-primary/20'
                    }`}>
                      {hasBeautyData
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        : <Scan className="w-5 h-5 text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${hasBeautyData ? 'text-emerald-400' : 'text-text'}`}>
                        {hasBeautyData ? t('fashion.beautyScanComplete') : t('fashion.runBeautyScan')}
                      </p>
                      <p className="text-xs text-text-light truncate">
                        {hasBeautyData ? t('fashion.faceShapeDetected') : t('fashion.analyzeFace')}
                      </p>
                    </div>
                    {!hasBeautyData && <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />}
                  </Link>

                  <Link
                    href="/body-scan"
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      hasBodyData
                        ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
                        : 'border-primary/30 bg-primary/[0.06] hover:bg-primary/[0.1] hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      hasBodyData ? 'bg-emerald-500/20' : 'bg-primary/20'
                    }`}>
                      {hasBodyData
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        : <Camera className="w-5 h-5 text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${hasBodyData ? 'text-emerald-400' : 'text-text'}`}>
                        {hasBodyData ? t('fashion.bodyDataComplete') : t('fashion.runBodyScan')}
                      </p>
                      <p className="text-xs text-text-light truncate">
                        {hasBodyData ? `${user?.height_cm}cm, ${user?.weight_kg}kg` : t('fashion.analyzeBody')}
                      </p>
                    </div>
                    {!hasBodyData && <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />}
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
                      style={{ width: `${(Number(hasBeautyData) + Number(hasBodyData)) * 50}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-light font-medium">
                    {Number(hasBeautyData) + Number(hasBodyData)}/2
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Season tabs */}
      <div className="flex gap-3">
        {SEASON_KEYS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSeason(s.id)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl transition-all ${
                activeSeason === s.id
                  ? `bg-gradient-to-br ${s.gradient} text-white shadow-lg`
                  : 'bg-surface border border-border text-text-secondary hover:border-primary/30'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-semibold">{t(s.key)}</span>
            </button>
          );
        })}
      </div>

      {/* Generate button */}
      <Button variant="primary" size="lg" onClick={handleGenerate} isLoading={loading} className="w-full">
        <Sparkles className="h-5 w-5 mr-2" />
        {hasBeautyData && hasBodyData
          ? t('fashion.getMyOutfits', { season: activeSeasonLabel, cost: '20' })
          : t('fashion.getOutfits', { season: activeSeasonLabel, cost: '20' })
        }
      </Button>

      {!hasBeautyData && !hasBodyData && (
        <p className="text-xs text-center text-text-light -mt-3">
          {t('fashion.moreAccurate', { beautyScan: `[${t('nav.beautyScan')}]`, bodyScan: `[${t('nav.bodyScan')}]` })
            .split(/\[|\]/)
            .map((part, i) =>
              part === t('nav.beautyScan') ? <Link key={i} href="/beauty-scan" className="text-primary hover:underline">{part}</Link> :
              part === t('nav.bodyScan') ? <Link key={i} href="/body-scan" className="text-primary hover:underline">{part}</Link> :
              <span key={i}>{part}</span>
            )}
        </p>
      )}

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Outfit recommendations */}
      <AnimatePresence mode="wait">
        {currentOutfits.length > 0 && (
          <motion.div
            key={activeSeason}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {hasBeautyData && (
              <p className="text-sm text-text-secondary mb-4">
                {t('fashion.tailoredFor', { color: profileSummary.personalColor || '' })}
                {profileSummary.faceShape ? t('fashion.withFaceShape', { shape: profileSummary.faceShape }) : ''}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentOutfits.map((outfit, i) => (
                <Card key={i} hover>
                  <CardContent className="p-0 overflow-hidden rounded-2xl">
                    {outfit.image_url ? (
                      <Image src={outfit.image_url} alt={outfit.style_name} width={512} height={512} className="w-full aspect-[4/5] object-cover" unoptimized />
                    ) : (
                      <div className="w-full aspect-[4/5] bg-gradient-to-br from-surfaceAlt to-surface flex items-center justify-center">
                        <Shirt className="w-16 h-16 text-text-light" />
                      </div>
                    )}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-text">{outfit.style_name}</h3>
                        <Badge variant="default">{outfit.occasion}</Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex gap-2">
                          <span className="text-text-light w-16 flex-shrink-0">{t('fashion.top')}:</span>
                          <span className="text-text-secondary">{outfit.top}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-text-light w-16 flex-shrink-0">{t('fashion.bottom')}:</span>
                          <span className="text-text-secondary">{outfit.bottom}</span>
                        </div>
                        {outfit.outerwear && (
                          <div className="flex gap-2">
                            <span className="text-text-light w-16 flex-shrink-0">{t('fashion.outer')}:</span>
                            <span className="text-text-secondary">{outfit.outerwear}</span>
                          </div>
                        )}
                        {outfit.accessories?.length > 0 && (
                          <div className="flex gap-2">
                            <span className="text-text-light w-16 flex-shrink-0">{t('fashion.acc')}:</span>
                            <span className="text-text-secondary">{outfit.accessories.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Palette className="w-4 h-4 text-text-light" />
                        <div className="flex gap-1.5">
                          {outfit.color_palette?.map((c, j) => (
                            <div key={j} className="w-6 h-6 rounded-md border border-white/10" style={{ backgroundColor: c }} title={c} />
                          ))}
                        </div>
                      </div>
                      {outfit.color_reasoning && (
                        <p className="text-xs text-text-light">
                          <span className="text-primary/70 font-medium">{t('fashion.colorLabel')}:</span> {outfit.color_reasoning}
                        </p>
                      )}
                      {outfit.fit_reasoning && (
                        <p className="text-xs text-text-light">
                          <span className="text-cyan-400/70 font-medium">{t('fashion.fitLabel')}:</span> {outfit.fit_reasoning}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
