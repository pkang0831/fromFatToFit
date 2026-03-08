'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Camera, Star, Scan, Eye, PenTool, Smile, CircleDot,
  Palette, Scissors, Droplets, Wand2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { beautyApi } from '@/lib/api/services';
import { compressAndConvertToBase64 } from '@/lib/utils/image';
import { detectFace, type FaceDetectionResult } from '@/lib/utils/faceDetection';
import { FaceOverlay } from '@/components/features/FaceOverlay';
import { FeatureRatings } from '@/components/features/FeatureRatings';
import { ShapeProbabilities } from '@/components/features/ShapeProbabilities';
import type { BeautyAnalysis, StyledImage } from '@/types/api';
import { useLanguage } from '@/contexts/LanguageContext';

type Step = 'upload' | 'analyzing' | 'results';
type TabId = 'score' | 'shape' | 'eyes' | 'brows' | 'lips' | 'nose' | 'color' | 'hair' | 'makeup' | 'styles';

const TAB_ICONS: Record<TabId, typeof Star> = {
  score: Star, shape: Scan, eyes: Eye, brows: PenTool,
  lips: Smile, nose: CircleDot, color: Palette, hair: Scissors,
  makeup: Droplets, styles: Wand2,
};
const TAB_IDS: TabId[] = ['score', 'shape', 'eyes', 'brows', 'lips', 'nose', 'color', 'hair', 'makeup', 'styles'];

function MeasurementGrid({ measurements, t }: { measurements: Record<string, number>; t: (k: string) => string }) {
  const labels: Record<string, string> = {
    eyeSpan: 'Eye Span',
    faceHeight: 'Face Height',
    faceWidth: 'Face Width',
    foreheadWidth: 'Forehead Width',
    interocularDistance: 'Interocular Distance',
    jawWidth: 'Jaw Width',
    mouthWidth: 'Mouth Width',
    noseLength: 'Nose Length',
    noseWidth: 'Nose Width',
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-primary mb-3">{t('beautyScan.facialMeasurements')}</h4>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(measurements).map(([key, val]) => (
          <div key={key} className="p-3 rounded-xl border border-border bg-white/[0.02] text-center">
            <span className="text-xs text-text-light block">{labels[key] || key}</span>
            <span className="text-base font-bold text-text font-number">{val}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureDetailTab({ title, analysis, t }: { title: string; analysis: any; t: (k: string, p?: Record<string, string>) => string }) {
  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-text-secondary">
          {t('beautyScan.analysisNotAvailable', { title })}
        </CardContent>
      </Card>
    );
  }

  const attrs = ['shape', 'size', 'spacing', 'thickness', 'arch', 'fullness', 'symmetry', 'bridge', 'tip']
    .filter((k) => analysis[k]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-text mb-3">{title} {t('beautyScan.analysis')}</h3>
          {analysis.description && (
            <p className="text-text-secondary mb-4">{analysis.description}</p>
          )}
          {attrs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {attrs.map((k) => (
                <div key={k} className="p-3 rounded-xl border border-border bg-white/[0.02]">
                  <span className="text-xs text-text-light capitalize">{k}</span>
                  <p className="text-sm font-semibold text-text mt-0.5">{analysis[k]}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {analysis.recommendations?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t('beautyScan.recommendations')}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.recommendations.map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                    {i + 1}
                  </div>
                  <p className="text-text-secondary text-sm">{r}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BeautyScanPage() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [gender, setGender] = useState('female');
  const [generateImages, setGenerateImages] = useState(false);

  const [faceResult, setFaceResult] = useState<FaceDetectionResult | null>(null);
  const [analysis, setAnalysis] = useState<BeautyAnalysis | null>(null);
  const [styledImages, setStyledImages] = useState<StyledImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('score');
  const [aiLoading, setAiLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setFaceResult(null);
    setAnalysis(null);
    setStyledImages([]);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const runFaceDetection = useCallback(async () => {
    if (!imgRef.current) return;
    try {
      const result = await detectFace(imgRef.current);
      setFaceResult(result);
    } catch (err) {
      console.error('Face detection failed:', err);
    }
  }, []);

  useEffect(() => {
    if (preview && step === 'results' && !faceResult) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = preview;
      img.onload = async () => {
        try {
          const result = await detectFace(img);
          setFaceResult(result);
        } catch (err) {
          console.error('Face detection error:', err);
        }
      };
    }
  }, [preview, step, faceResult]);

  const handleAnalyze = async () => {
    if (!file) return;
    setStep('analyzing');
    setError(null);
    setAiLoading(true);

    try {
      const base64 = await compressAndConvertToBase64(file);

      const faceImg = new window.Image();
      faceImg.crossOrigin = 'anonymous';
      faceImg.src = `data:image/jpeg;base64,${base64}`;
      faceImg.onload = async () => {
        try {
          const fd = await detectFace(faceImg);
          setFaceResult(fd);
        } catch {}
      };

      const res = await beautyApi.analyze({
        image_base64: base64,
        gender,
        generate_images: generateImages,
      });
      setAnalysis(res.data.analysis);
      setStyledImages(res.data.styled_images || []);
      setStep('results');

      try {
        localStorage.setItem('beauty_analysis', JSON.stringify(res.data.analysis));
      } catch {}

    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Analysis failed');
      setStep('upload');
    } finally {
      setAiLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setPreview(null);
    setFile(null);
    setAnalysis(null);
    setStyledImages([]);
    setFaceResult(null);
    setActiveTab('score');
  };

  const TAB_LABELS: Record<TabId, string> = {
    score: t('beautyScan.tabScore'), shape: t('beautyScan.tabShape'),
    eyes: t('beautyScan.tabEyes'), brows: t('beautyScan.tabBrows'),
    lips: t('beautyScan.tabLips'), nose: t('beautyScan.tabNose'),
    color: t('beautyScan.tabColor'), hair: t('beautyScan.tabHair'),
    makeup: t('beautyScan.tabMakeup'), styles: t('beautyScan.tabStyles'),
  };
  const visibleTabs = TAB_IDS
    .filter((id) => id !== 'styles' || styledImages.length > 0)
    .map((id) => ({ id, label: TAB_LABELS[id], icon: TAB_ICONS[id] }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-text">
          {t('beautyScan.titleAI')} <span className="gradient-text">{t('beautyScan.title')}</span>
        </h1>
        <p className="text-text-secondary mt-1">
          {t('beautyScan.subtitle')}
        </p>
      </div>

      {/* Upload */}
      {step === 'upload' && (
        <Card variant="elevated">
          <CardContent className="p-8">
            <div className="space-y-6">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

              {!preview ? (
                <div className="space-y-6">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-primary/30 rounded-2xl p-10 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/[0.02] transition-all group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-lg font-semibold text-text mb-1">{t('beautyScan.uploadCta')}</p>
                    <p className="text-sm text-text-secondary">{t('beautyScan.uploadHint')}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">{t('beautyScan.whatYouGet')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {[
                        { icon: Star, label: t('beautyScan.featureScore'), desc: t('beautyScan.featureScoreDesc') },
                        { icon: Scan, label: t('beautyScan.faceShape'), desc: t('beautyScan.faceShapeDesc') },
                        { icon: Palette, label: t('beautyScan.personalColor'), desc: t('beautyScan.personalColorDesc') },
                        { icon: Scissors, label: t('beautyScan.hairAdvice'), desc: t('beautyScan.hairAdviceDesc') },
                        { icon: Droplets, label: t('beautyScan.makeupTips'), desc: t('beautyScan.makeupTipsDesc') },
                      ].map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="p-3 rounded-xl border border-border bg-white/[0.02] text-center">
                          <Icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
                          <p className="text-xs font-semibold text-text">{label}</p>
                          <p className="text-[10px] text-text-light mt-0.5">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Eye, items: [t('beautyScan.eyeDetails'), t('beautyScan.browDetails'), t('beautyScan.lipDetails')] },
                      { icon: CircleDot, items: [t('beautyScan.noseDetails'), t('beautyScan.jawDetails'), t('beautyScan.foreheadDetails')] },
                      { icon: Wand2, items: [t('beautyScan.aiStyled'), t('beautyScan.skincareRoutine'), t('beautyScan.accessorySuggestions')] },
                    ].map(({ icon: Icon, items }, i) => (
                      <div key={i} className="p-3 rounded-xl border border-border bg-white/[0.02]">
                        <Icon className="w-4 h-4 text-primary mb-2" />
                        <ul className="space-y-1">
                          {items.map((item) => (
                            <li key={item} className="text-[11px] text-text-light flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-primary/50 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-text-light text-center">
                    {t('beautyScan.creditInfo')}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <Image src={preview} alt="Preview" width={300} height={300} className="rounded-2xl object-cover max-h-80" unoptimized />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1.5">{t('beautyScan.gender')}</label>
                      <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text">
                        <option value="female">{t('beautyScan.female')}</option>
                        <option value="male">{t('beautyScan.male')}</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={generateImages} onChange={(e) => setGenerateImages(e.target.checked)} className="w-4 h-4 rounded border-border text-primary" />
                        <div>
                          <span className="text-sm font-medium text-text">{t('beautyScan.generateStyled')}</span>
                          <span className="text-xs text-text-secondary block">{t('beautyScan.styledCredits')}</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => { setPreview(null); setFile(null); }}>{t('beautyScan.changePhoto')}</Button>
                    <Button variant="primary" size="lg" onClick={handleAnalyze} className="flex-1">
                      <Sparkles className="h-5 w-5 mr-2" />
                      {t('beautyScan.analyze')} ({generateImages ? '40' : '10'} {t('beautyScan.credits')})
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-error/10 border border-error/20 rounded-xl">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyzing */}
      {step === 'analyzing' && (
        <Card variant="elevated">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-white/10" />
                <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-text">{t('beautyScan.analyzing')}</p>
                <p className="text-sm text-text-secondary mt-1">
                  {faceResult ? t('beautyScan.faceDetected') : t('beautyScan.detectingFace')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {step === 'results' && (
        <>
          {/* Two-panel layout */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left panel: Photo + Ratings */}
            <div className="md:w-[340px] flex-shrink-0 space-y-4">
              {preview && (
                <FaceOverlay
                  imageSrc={preview}
                  bbox={faceResult?.bbox ?? null}
                  landmarks={faceResult?.landmarks ?? null}
                />
              )}

              <FeatureRatings scores={analysis?.feature_scores ?? null} />

              <Button variant="outline" onClick={handleReset} className="w-full">
                {t('beautyScan.uploadNew')}
              </Button>
            </div>

            {/* Right panel: Tabs + Content */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Tab navigation */}
              <div className="flex flex-wrap gap-1.5">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-primary text-white shadow-glow-cyan'
                          : 'text-text-secondary hover:text-text hover:bg-surfaceAlt'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                  {activeTab === 'score' && (
                    <div className="space-y-6">
                      {/* Overall score */}
                      {analysis?.feature_scores && (
                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-6">
                              <div className="relative w-24 h-24 flex-shrink-0">
                                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                                  <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/[0.06]" />
                                  <circle cx="48" cy="48" r="40" fill="none" stroke="var(--color-primary-hex, #06b6d4)" strokeWidth="6" strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 40}
                                    strokeDashoffset={2 * Math.PI * 40 * (1 - (analysis.feature_scores.overall || 7.5) / 10)}
                                    className="transition-all duration-1000 ease-out"
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-text font-number">
                                  {(analysis.feature_scores.overall || 7.5).toFixed(1)}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-text">{t('beautyScan.overallScore')}</h3>
                                <p className="text-sm text-text-secondary mt-1">{t('beautyScan.overallScoreDesc')}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Feature grid */}
                      {analysis?.feature_scores && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(analysis.feature_scores)
                            .filter(([k]) => k !== 'overall')
                            .map(([key, val]) => (
                              <div key={key} className="p-4 rounded-2xl border border-border bg-white/[0.02] text-center">
                                <span className="text-xs text-text-light capitalize">{key}</span>
                                <p className={`text-2xl font-bold font-number mt-1 ${
                                  val >= 8 ? 'text-emerald-400' : val >= 6 ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                  {val.toFixed(1)}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}

                      {!analysis?.feature_scores && (
                        <Card><CardContent className="p-8 text-center text-text-secondary">
                          {aiLoading ? t('beautyScan.aiInProgress') : t('beautyScan.scoreNotAvailable')}
                        </CardContent></Card>
                      )}
                    </div>
                  )}

                  {activeTab === 'shape' && (
                    <div className="space-y-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Scan className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-text">
                                Face Shape: <span className="gradient-text capitalize">{analysis?.face_shape || faceResult?.shapeProbs?.[0]?.shape || '—'}</span>
                              </h3>
                              <p className="text-sm text-text-secondary mt-1">{analysis?.face_shape_description || ''}</p>
                            </div>
                          </div>

                          {/* Characteristics */}
                          {analysis?.face_characteristics && (
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-primary mb-3">{t('beautyScan.characteristics')}</h4>
                              <div className="grid grid-cols-2 gap-3">
                                {Object.entries(analysis.face_characteristics).map(([key, val]) => (
                                  <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-border bg-white/[0.02]">
                                    <span className="text-sm text-text-secondary capitalize">{key.replace(/_/g, ' ')}</span>
                                    <span className="text-sm font-semibold text-text">{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Shape probabilities */}
                            {faceResult?.shapeProbs && (
                              <ShapeProbabilities probabilities={faceResult.shapeProbs} />
                            )}

                            {/* Style recommendations */}
                            {analysis?.style_recommendations && analysis.style_recommendations.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-primary mb-3">{t('beautyScan.styleRecommendations')}</h4>
                                <ul className="space-y-2">
                                  {analysis.style_recommendations.map((r, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                                      <span className="text-primary mt-0.5">&#8226;</span>
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Measurements */}
                      {faceResult?.measurements && (
                        <Card>
                          <CardContent className="p-6">
                            <MeasurementGrid measurements={faceResult.measurements as unknown as Record<string, number>} t={t} />
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {activeTab === 'eyes' && <FeatureDetailTab title={t('beautyScan.tabEyes')} analysis={analysis?.eyes_analysis} t={t} />}
                  {activeTab === 'brows' && <FeatureDetailTab title={t('beautyScan.tabBrows')} analysis={analysis?.brows_analysis} t={t} />}
                  {activeTab === 'lips' && <FeatureDetailTab title={t('beautyScan.tabLips')} analysis={analysis?.lips_analysis} t={t} />}
                  {activeTab === 'nose' && <FeatureDetailTab title={t('beautyScan.tabNose')} analysis={analysis?.nose_analysis} t={t} />}

                  {activeTab === 'color' && (
                    <div className="space-y-6">
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-xl font-bold text-text mb-1">{t('beautyScan.personalColor')}</h3>
                          <p className="text-2xl font-bold gradient-text capitalize mb-2">
                            {analysis?.personal_color_sub?.replace(/_/g, ' ') || '—'}
                          </p>
                          <p className="text-sm text-text-secondary mb-4">{analysis?.personal_color_description}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-xl border border-border">
                              <span className="text-xs text-text-light">{t('beautyScan.skinTone')}</span>
                              <p className="text-sm font-semibold text-text capitalize">{analysis?.skin_tone}</p>
                            </div>
                            <div className="p-3 rounded-xl border border-border">
                              <span className="text-xs text-text-light">{t('beautyScan.undertone')}</span>
                              <Badge variant={analysis?.skin_undertone === 'warm' ? 'warning' : analysis?.skin_undertone === 'cool' ? 'info' : 'default'}>
                                {analysis?.skin_undertone}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle>{t('beautyScan.bestColors')}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="flex gap-3 flex-wrap">
                            {analysis?.best_colors?.map((c, i) => (
                              <div key={i} className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 rounded-xl border border-white/10" style={{ backgroundColor: c }} />
                                <span className="text-[10px] text-text-light font-mono">{c}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      {analysis?.avoid_colors && analysis.avoid_colors.length > 0 && (
                        <Card>
                          <CardHeader><CardTitle>{t('beautyScan.colorsToAvoid')}</CardTitle></CardHeader>
                          <CardContent>
                            <div className="flex gap-3 flex-wrap">
                              {analysis.avoid_colors.map((c, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 opacity-60">
                                  <div className="w-12 h-12 rounded-xl border border-white/10 relative" style={{ backgroundColor: c }}>
                                    <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">✕</div>
                                  </div>
                                  <span className="text-[10px] text-text-light font-mono">{c}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {activeTab === 'hair' && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader><CardTitle>{t('beautyScan.hairstyleRec')}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis?.hairstyle_recommendations?.map((h, i) => (
                              <div key={i} className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                                <h4 className="font-semibold text-text mb-1">{h.style}</h4>
                                <p className="text-sm text-text-secondary">{h.reason}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle>{t('beautyScan.hairColorRec')}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis?.hair_color_recommendations?.map((h, i) => (
                              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border">
                                <div className="w-12 h-12 rounded-full border border-white/10 flex-shrink-0" style={{ backgroundColor: h.hex }} />
                                <div>
                                  <h4 className="font-semibold text-text">{h.color}</h4>
                                  <p className="text-sm text-text-secondary">{h.reason}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {activeTab === 'makeup' && (
                    <div className="space-y-6">
                      {analysis?.makeup_recommendations && (
                        <Card>
                          <CardHeader><CardTitle>{t('beautyScan.makeupRec')}</CardTitle></CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border border-border">
                                <h4 className="font-semibold text-text mb-2">{t('beautyScan.foundation')}</h4>
                                <p className="text-sm text-text-secondary">{analysis.makeup_recommendations.foundation_tone}</p>
                              </div>
                              <div className="p-4 rounded-xl border border-border">
                                <h4 className="font-semibold text-text mb-2">{t('beautyScan.blush')}</h4>
                                <p className="text-sm text-text-secondary">{analysis.makeup_recommendations.blush}</p>
                              </div>
                              <div className="p-4 rounded-xl border border-border">
                                <h4 className="font-semibold text-text mb-2">{t('beautyScan.lipColors')}</h4>
                                <div className="flex gap-2 flex-wrap">
                                  {analysis.makeup_recommendations.lip_colors?.map((c, i) => (
                                    <Badge key={i} variant="default">{c}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="p-4 rounded-xl border border-border">
                                <h4 className="font-semibold text-text mb-2">{t('beautyScan.eyeShadow')}</h4>
                                <div className="flex gap-2 flex-wrap">
                                  {analysis.makeup_recommendations.eye_shadow?.map((c, i) => (
                                    <Badge key={i} variant="default">{c}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      <Card>
                        <CardHeader><CardTitle>{t('beautyScan.skincareTips')}</CardTitle></CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {analysis?.skincare_recommendations?.map((r, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">{i + 1}</div>
                                <p className="text-text-secondary text-sm">{r}</p>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {activeTab === 'styles' && styledImages.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {styledImages.map((img, i) => (
                        <Card key={i} hover>
                          <CardContent className="p-0 overflow-hidden rounded-2xl">
                            {img.image_url ? (
                              <Image src={img.image_url} alt={img.title} width={512} height={512} className="w-full aspect-square object-cover" unoptimized />
                            ) : (
                              <div className="w-full aspect-square bg-surfaceAlt flex items-center justify-center text-text-light">
                                {t('beautyScan.failedToGenerate')}
                              </div>
                            )}
                            <div className="p-4">
                              <h4 className="font-semibold text-text mb-1">{img.title}</h4>
                              <p className="text-sm text-text-secondary line-clamp-2">{img.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
