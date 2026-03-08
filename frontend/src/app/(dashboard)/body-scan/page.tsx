'use client';

import { useState, useRef, useCallback, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scan, Crown, Sparkles, Coins, ArrowRight, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Select } from '@/components/ui';
import { ShareButtons } from '@/components/ui/ShareButtons';
import { ShareableResultCard } from '@/components/features/ShareableResultCard';
import { WeeklyRescanPrompt } from '@/components/features/WeeklyRescanPrompt';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { bodyApi, paymentApi } from '@/lib/api/services';
import { compressAndConvertToBase64 } from '@/lib/utils/image';
import { AxiosError } from 'axios';
import dynamic from 'next/dynamic';
import type { BodyScanRequest, BodyFatEstimateResponse, PercentileResponse, TransformationResponse, GapToGoalResponse } from '@/types/api';

const BellCurveChart = dynamic(
  () => import('@/components/charts/BellCurveChart').then(m => m.BellCurveChart),
  { loading: () => <div className="h-[200px] bg-surfaceAlt animate-pulse rounded-lg" />, ssr: false }
);

type ActiveTab = 'scan' | 'journey';

export default function BodyScanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isPremium, refreshLimits } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const journeyFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('scan');

  // Body Scan state
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    bodyfat?: BodyFatEstimateResponse;
    percentile?: PercentileResponse;
  }>({});

  // Journey state
  const [journeyImage, setJourneyImage] = useState<string | null>(null);
  const [journeyFile, setJourneyFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [journeyResult, setJourneyResult] = useState<TransformationResponse | null>(null);
  const [journeyStep, setJourneyStep] = useState(0);

  // Muscle gain inputs
  const [muscleGains, setMuscleGains] = useState({
    arms: 0, chest: 0, back: 0, shoulders: 0, legs: 0, core: 0,
  });

  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);
  const [gapData, setGapData] = useState<GapToGoalResponse | null>(null);

  const scanCost = isPremium ? 0 : 10;
  const journeyCost = 30;

  const [formDefaults, setFormDefaults] = useState({
    gender: '', age: '', height_cm: '', ethnicity: ''
  });

  useEffect(() => {
    if (user) {
      setFormDefaults({
        gender: user.gender ? user.gender.toLowerCase() : '',
        age: user.age ? String(user.age) : '',
        height_cm: user.height_cm ? String(user.height_cm) : '',
        ethnicity: user.ethnicity || ''
      });
    }
  }, [user]);

  const fetchCredits = async () => {
    try {
      const res = await paymentApi.getCreditBalance();
      setCreditBalance(res.data.total_credits);
    } catch {
      setCreditBalance(null);
    }
  };

  const fetchGapData = () => {
    bodyApi.getGapToGoal()
      .then(res => setGapData(res.data))
      .catch(() => {});
  };

  useEffect(() => { fetchCredits(); fetchGapData(); }, []);

  const handleScanFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setScanFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScanImage(reader.result as string);
      setScanResult({});
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleJourneyFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setJourneyFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setJourneyImage(reader.result as string);
      setJourneyResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Combined body fat + percentile scan
  const handleBodyScan = async (formData: Record<string, FormDataEntryValue>) => {
    if (!scanFile) { setError('No file selected'); return; }
    if (!formData.gender || !formData.age) { setError('Gender and age are required'); return; }

    if (scanCost > 0 && creditBalance !== null && creditBalance < scanCost) {
      setError(`Not enough credits. Scan costs ${scanCost} credits.`);
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const base64 = await compressAndConvertToBase64(scanFile);
      const requestData: BodyScanRequest = {
        image_base64: base64,
        scan_type: 'percentile',
        gender: formData.gender as 'male' | 'female',
        age: Number(formData.age),
        ethnicity: (formData.ethnicity as string) || 'Other',
        height_cm: formData.height_cm ? Number(formData.height_cm) : undefined,
      };

      const response = await bodyApi.calculatePercentile(requestData);
      const percData = response.data as PercentileResponse;

      const newResult: typeof scanResult = { percentile: percData };

      if (percData.percentile_data?.body_fat_percentage) {
        newResult.bodyfat = {
          body_fat_percentage: percData.percentile_data.body_fat_percentage,
          confidence: 'medium',
          recommendations: [],
          scan_id: percData.scan_id,
          usage_remaining: percData.usage_remaining,
        };

        try {
          const prevBf = localStorage.getItem('devenira_current_bodyfat');
          if (prevBf) localStorage.setItem('devenira_prev_bodyfat', prevBf);
          localStorage.setItem('devenira_current_bodyfat', String(percData.percentile_data.body_fat_percentage));
          localStorage.setItem('devenira_last_scan_date', new Date().toISOString());
          const count = parseInt(localStorage.getItem('devenira_scan_count') || '0') + 1;
          localStorage.setItem('devenira_scan_count', String(count));
        } catch {}
      }

      setScanResult(newResult);
      await refreshLimits();
      await fetchCredits();
      fetchGapData();
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.status === 402
          ? 'Not enough credits. Upgrade to Pro for unlimited scans.'
          : err.response?.data?.detail || 'Scan failed');
      } else {
        setError(err instanceof Error ? err.message : 'Scan failed');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Transformation journey
  const handleGenerateJourney = async (formData: Record<string, FormDataEntryValue>) => {
    if (!journeyFile) { setError('No file selected'); return; }
    if (!formData.gender) { setError('Gender is required'); return; }
    if (!formData.target_bf) { setError('Target body fat % is required'); return; }

    if (creditBalance !== null && creditBalance < journeyCost) {
      setError(`Not enough credits. Journey costs ${journeyCost} credits.`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const base64 = await compressAndConvertToBase64(journeyFile);
      const requestData: BodyScanRequest = {
        image_base64: base64,
        scan_type: 'transformation',
        gender: formData.gender as 'male' | 'female',
        age: formData.age ? Number(formData.age) : undefined,
        target_bf: Number(formData.target_bf),
      };

      const response = await bodyApi.generateTransformation(requestData);
      setJourneyResult(response.data);
      setJourneyStep(0);

      // Auto-save goal for gap-to-goal loop
      if (response.data.transformed_image_url) {
        bodyApi.saveGoal({
          goal_image_url: response.data.transformed_image_url,
          target_bf: Number(formData.target_bf),
        }).catch(() => {});
        fetchGapData();
      }

      await refreshLimits();
      await fetchCredits();
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.status === 402
          ? 'Not enough credits for journey generation.'
          : err.response?.data?.detail || 'Journey generation failed');
      } else {
        setError(err instanceof Error ? err.message : 'Journey generation failed');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const canScan = scanCost === 0 || (creditBalance !== null && creditBalance >= scanCost);
  const canJourney = creditBalance !== null && creditBalance >= journeyCost;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <WeeklyRescanPrompt variant="full" />

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'scan'
              ? 'bg-gradient-primary text-white shadow-glow-cyan'
              : 'bg-surface border border-border text-text-secondary hover:bg-surfaceAlt'
          }`}
        >
          <Scan className="h-5 w-5" />
          Body Scan
          {scanCost === 0 && (
            <Badge variant="success" className="text-[10px] ml-1">Free</Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('journey')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'journey'
              ? 'bg-gradient-primary text-white shadow-glow-cyan'
              : 'bg-surface border border-border text-text-secondary hover:bg-surfaceAlt'
          }`}
        >
          <Sparkles className="h-5 w-5" />
          Transformation Journey
          <Badge variant="info" className="text-[10px] ml-1">{journeyCost} cr</Badge>
        </button>
      </div>

      {/* Credit Balance */}
      <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
        <Coins className="h-5 w-5 text-amber-500" />
        <span className="text-sm text-text-secondary">Credits:</span>
        <span className="font-bold text-text">{creditBalance ?? '—'}</span>
        <Button variant="secondary" size="sm" onClick={() => router.push('/upgrade')} className="ml-auto text-xs">
          {isPremium ? 'Buy More' : 'Upgrade'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* ==================== BODY SCAN TAB ==================== */}
      {activeTab === 'scan' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Body Scan</h1>
            <p className="text-text-secondary mt-1">
              AI body fat estimate + percentile ranking in one scan
            </p>
          </div>

          <Card variant="elevated">
            <CardContent className="p-6">
              {!scanImage ? (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScanFileSelect} className="hidden" />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    <Scan className="h-16 w-16 text-text-light mx-auto mb-4" />
                    <p className="text-lg font-medium text-text mb-2">Upload a full-body photo</p>
                    <p className="text-sm text-text-secondary">Get your body fat estimate and see where you rank</p>
                  </div>
                </div>
              ) : !scanResult.percentile ? (
                <div className="space-y-6">
                  <Image src={scanImage} alt="Selected" width={800} height={600} className="w-full max-h-80 object-contain rounded-lg" unoptimized />

                  <form
                    key={JSON.stringify(formDefaults)}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleBodyScan(Object.fromEntries(new FormData(e.currentTarget)));
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <Select name="gender" label="Gender" required defaultValue={formDefaults.gender}>
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </Select>
                      <Input name="age" label="Age" type="number" placeholder="30" defaultValue={formDefaults.age} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Select name="ethnicity" label="Ethnicity" defaultValue={formDefaults.ethnicity || 'Other'}>
                        <option value="Asian">Asian</option>
                        <option value="Caucasian">Caucasian</option>
                        <option value="African">African</option>
                        <option value="Hispanic">Hispanic</option>
                        <option value="Other">Other</option>
                      </Select>
                      <Input name="height_cm" label="Height (cm)" type="number" placeholder="170" defaultValue={formDefaults.height_cm} />
                    </div>

                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" id="scanConfirm" checked={photoConfirmed} onChange={(e) => setPhotoConfirmed(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
                        <label htmlFor="scanConfirm" className="text-xs text-amber-800 dark:text-amber-200 cursor-pointer">
                          I confirm this is a photo of myself. Results are AI approximations, not medical assessments.
                        </label>
                      </div>
                    </div>

                    <Button type="submit" variant="primary" size="lg" isLoading={isScanning} disabled={!canScan || !photoConfirmed} className="w-full">
                      <Scan className="h-5 w-5 mr-2" />
                      {scanCost === 0 ? 'Scan (Pro: Free)' : `Scan (${scanCost} credits)`}
                    </Button>
                  </form>
                </div>
              ) : (
                /* Combined Result: Body Fat + Percentile */
                <div className="space-y-8">
                  {/* Body Fat Result */}
                  {scanResult.bodyfat && (
                    <div className="text-center">
                      <p className="text-sm text-text-secondary mb-1">Estimated Body Fat</p>
                      <p className="text-6xl font-bold text-primary mb-2">
                        {scanResult.bodyfat.body_fat_percentage.toFixed(1)}%
                      </p>
                      <Badge variant={scanResult.bodyfat.confidence === 'high' ? 'success' : scanResult.bodyfat.confidence === 'medium' ? 'warning' : 'error'}>
                        {scanResult.bodyfat.confidence} confidence
                      </Badge>
                    </div>
                  )}

                  {/* Percentile Ranking */}
                  {scanResult.percentile?.percentile_data && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-primary/10 rounded-xl border border-primary/20">
                          <p className="text-sm text-text-secondary mb-1">Your Ranking</p>
                          <p className="text-3xl font-bold text-primary">
                            Top {(100 - scanResult.percentile.percentile_data.percentile).toFixed(0)}%
                          </p>
                          <p className="text-sm text-primary/80">{scanResult.percentile.percentile_data.rank_text}</p>
                        </div>
                        <div className="text-center p-4 bg-surfaceAlt rounded-xl border border-border">
                          <p className="text-sm text-text-secondary mb-1">Comparison Group</p>
                          <p className="text-lg font-semibold text-text">{scanResult.percentile.percentile_data.comparison_group}</p>
                        </div>
                      </div>

                      {scanResult.percentile.distribution_data && (
                        <BellCurveChart
                          mean={scanResult.percentile.distribution_data.mean}
                          std={scanResult.percentile.distribution_data.std}
                          userValue={scanResult.percentile.distribution_data.user_value}
                          percentile={scanResult.percentile.distribution_data.better_than_percent || scanResult.percentile.percentile_data.percentile}
                          unit="%"
                        />
                      )}
                    </>
                  )}

                  {/* Shareable Card */}
                  {scanResult.bodyfat && (
                    <div className="pt-4 border-t border-border">
                      <ShareableResultCard
                        bodyFatPercent={scanResult.bodyfat.body_fat_percentage}
                        previousBodyFat={(() => { try { const p = localStorage.getItem('devenira_prev_bodyfat'); return p ? parseFloat(p) : undefined; } catch { return undefined; } })()}
                        weekNumber={(() => { try { return parseInt(localStorage.getItem('devenira_scan_count') || '1'); } catch { return 1; } })()}
                        currentImageUrl={scanImage || undefined}
                        userName={user?.full_name || undefined}
                      />
                    </div>
                  )}

                  {/* Side-by-side: Current vs Goal (if goal exists) */}
                  {gapData?.goal_image_url && scanResult.bodyfat && (
                    <div className="pt-6 border-t border-border">
                      <h3 className="font-semibold text-text mb-4 text-center">Your Scan vs Your Goal</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-xs text-text-secondary mb-2">Current ({scanResult.bodyfat.body_fat_percentage.toFixed(1)}%)</p>
                          <Image src={scanImage!} alt="Current" width={400} height={300} className="w-full rounded-lg border border-border" unoptimized />
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-primary mb-2">Goal ({gapData.target_bf?.toFixed(1)}%)</p>
                          <Image src={gapData.goal_image_url} alt="Goal" width={400} height={300} className="w-full rounded-lg border-2 border-primary/30" unoptimized />
                        </div>
                      </div>
                      {gapData.gap != null && (
                        <div className="text-center p-4 bg-primary/10 rounded-xl border border-primary/20">
                          <p className="text-sm text-text-secondary">Gap to Goal</p>
                          <p className="text-3xl font-bold text-primary">{gapData.gap.toFixed(1)}% to go</p>
                          {gapData.scan_history.length >= 2 && (() => {
                            const prev = gapData.scan_history[gapData.scan_history.length - 2].bf;
                            const curr = gapData.current_bf!;
                            const weekDelta = prev - curr;
                            return weekDelta > 0 ? (
                              <p className="text-sm text-emerald-400 mt-1">-{weekDelta.toFixed(1)}% since last scan</p>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CTA: Go to Journey (if no goal yet) */}
                  {!gapData?.goal_image_url && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-text-secondary mb-3">Ready to see your goal physique?</p>
                      <Button variant="primary" onClick={() => setActiveTab('journey')}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Start Your Transformation Journey
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  {/* New Scan button */}
                  <div className="text-center">
                    <Button variant="secondary" size="sm" onClick={() => { setScanImage(null); setScanFile(null); setScanResult({}); setPhotoConfirmed(false); }}>
                      New Scan
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TRANSFORMATION JOURNEY TAB ==================== */}
      {activeTab === 'journey' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Transformation Journey</h1>
            <p className="text-text-secondary mt-1">
              Set your goal, see the AI preview, and get a 10-step plan to get there
            </p>
          </div>

          <Card variant="elevated">
            <CardContent className="p-6">
              {!journeyImage ? (
                <div>
                  <input ref={journeyFileInputRef} type="file" accept="image/*" onChange={handleJourneyFileSelect} className="hidden" />
                  <div
                    onClick={() => journeyFileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    <Sparkles className="h-16 w-16 text-text-light mx-auto mb-4" />
                    <p className="text-lg font-medium text-text mb-2">Upload your current body photo</p>
                    <p className="text-sm text-text-secondary">We'll generate your transformation journey</p>
                  </div>
                </div>
              ) : !journeyResult ? (
                <div className="space-y-6">
                  <Image src={journeyImage} alt="Current" width={800} height={600} className="w-full max-h-64 object-contain rounded-lg" unoptimized />

                  <form
                    key={JSON.stringify(formDefaults)}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleGenerateJourney(Object.fromEntries(new FormData(e.currentTarget)));
                    }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <Select name="gender" label="Gender" required defaultValue={formDefaults.gender}>
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </Select>
                      <Input name="age" label="Age" type="number" placeholder="30" defaultValue={formDefaults.age} />
                    </div>

                    {/* Goal Settings */}
                    <div className="p-4 bg-surfaceAlt rounded-xl border border-border space-y-4">
                      <h3 className="font-semibold text-text flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-primary" />
                        Your Goal
                      </h3>
                      <Input
                        name="target_bf"
                        label="Target Body Fat %"
                        type="number"
                        step="0.5"
                        min="3"
                        max="45"
                        placeholder="12"
                        required
                      />

                      {/* Muscle Gain per Body Part */}
                      <div>
                        <p className="text-sm font-medium text-text mb-3">Muscle Gain by Area (kg)</p>
                        <div className="grid grid-cols-3 gap-3">
                          {Object.entries(muscleGains).map(([part, val]) => (
                            <div key={part}>
                              <label className="text-xs text-text-secondary capitalize">{part}</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                value={val}
                                onChange={(e) => setMuscleGains(prev => ({ ...prev, [part]: parseFloat(e.target.value) || 0 }))}
                                className="w-full mt-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm"
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-text-light mt-2">
                          Total: +{Object.values(muscleGains).reduce((a, b) => a + b, 0).toFixed(1)}kg muscle
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" id="journeyConfirm" checked={photoConfirmed} onChange={(e) => setPhotoConfirmed(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
                        <label htmlFor="journeyConfirm" className="text-xs text-amber-800 dark:text-amber-200 cursor-pointer">
                          I confirm this is a photo of myself. AI previews are visualizations, not predictions or guarantees.
                        </label>
                      </div>
                    </div>

                    <Button type="submit" variant="primary" size="lg" isLoading={isGenerating} disabled={!canJourney || !photoConfirmed} className="w-full">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate My Journey ({journeyCost} credits)
                    </Button>

                    {!canJourney && (
                      <Button type="button" variant="secondary" onClick={() => router.push('/upgrade')} className="w-full">
                        <Coins className="h-5 w-5 mr-2" />
                        Get Credits
                      </Button>
                    )}
                  </form>
                </div>
              ) : (
                /* Journey Result */
                <div className="space-y-6">
                  {/* Current vs Goal */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-2">Current</p>
                      <Image src={journeyImage} alt="Current" width={800} height={600} className="w-full rounded-lg" unoptimized />
                      {journeyResult.current_bf != null && (
                        <p className="text-center text-sm text-text-secondary mt-2">{journeyResult.current_bf.toFixed(1)}% body fat</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-2">Goal Preview</p>
                      <Image src={journeyResult.transformed_image_url} alt="Goal" width={800} height={600} className="w-full rounded-lg border-2 border-primary/30" unoptimized />
                      {journeyResult.target_bf != null && (
                        <p className="text-center text-sm text-primary font-medium mt-2">{journeyResult.target_bf.toFixed(1)}% body fat</p>
                      )}
                      <ShareButtons imageUrl={journeyResult.transformed_image_url} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-surfaceAlt rounded-lg text-center">
                      <p className="text-xs text-text-secondary">Direction</p>
                      <p className="text-lg font-bold text-text capitalize">{journeyResult.direction}</p>
                    </div>
                    {journeyResult.muscle_gain_estimate && (
                      <div className="p-3 bg-surfaceAlt rounded-lg text-center">
                        <p className="text-xs text-text-secondary">Est. Muscle Gain</p>
                        <p className="text-lg font-bold text-text">+{journeyResult.muscle_gain_estimate}</p>
                      </div>
                    )}
                    <div className="p-3 bg-surfaceAlt rounded-lg text-center">
                      <p className="text-xs text-text-secondary">Timeline</p>
                      <p className="text-lg font-bold text-text">{journeyResult.estimated_timeline_weeks} weeks</p>
                    </div>
                  </div>

                  {/* Progress Steps (using progress_frames if available) */}
                  {journeyResult.progress_frames && journeyResult.progress_frames.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-text">Your 10-Step Journey</h3>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setJourneyStep(Math.max(0, journeyStep - 1))}
                          disabled={journeyStep === 0}
                          className="p-2 rounded-lg bg-surfaceAlt border border-border disabled:opacity-30"
                        >
                          <ChevronLeft className="h-5 w-5 text-text" />
                        </button>
                        <div className="flex-1 text-center">
                          <p className="text-sm font-medium text-primary mb-2">
                            Step {journeyStep + 1} of {journeyResult.progress_frames.length}
                          </p>
                          <Image
                            src={journeyResult.progress_frames[journeyStep]}
                            alt={`Step ${journeyStep + 1}`}
                            width={600}
                            height={400}
                            className="w-full max-h-80 object-contain rounded-lg"
                            unoptimized
                          />
                        </div>
                        <button
                          onClick={() => setJourneyStep(Math.min(journeyResult.progress_frames!.length - 1, journeyStep + 1))}
                          disabled={journeyStep === journeyResult.progress_frames.length - 1}
                          className="p-2 rounded-lg bg-surfaceAlt border border-border disabled:opacity-30"
                        >
                          <ChevronRight className="h-5 w-5 text-text" />
                        </button>
                      </div>
                      {/* Step indicators */}
                      <div className="flex justify-center gap-1.5">
                        {journeyResult.progress_frames.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setJourneyStep(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              i === journeyStep ? 'bg-primary scale-125' : i < journeyStep ? 'bg-primary/40' : 'bg-border'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {journeyResult.recommendations && journeyResult.recommendations.length > 0 && (
                    <div className="p-4 bg-surfaceAlt rounded-xl border border-border">
                      <h3 className="font-semibold text-text mb-3">What It Takes</h3>
                      <ul className="space-y-2">
                        {journeyResult.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                            <span className="text-primary font-bold">{i + 1}.</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* New Journey */}
                  <div className="text-center">
                    <Button variant="secondary" size="sm" onClick={() => { setJourneyImage(null); setJourneyFile(null); setJourneyResult(null); setPhotoConfirmed(false); }}>
                      Start New Journey
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
