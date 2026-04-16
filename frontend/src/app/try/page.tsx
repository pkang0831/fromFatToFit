'use client';

import { useEffect, useRef, useState, ChangeEvent } from 'react';
import Link from 'next/link';
import { Camera, ArrowRight, Lock, Shield, Sparkles, BarChart3, TrendingUp } from 'lucide-react';
import { ProcessingOverlay, GUEST_SCAN_STEPS } from '@/components/ui/ProcessingOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { guestApi } from '@/lib/api/services';
import { compressAndConvertToBase64 } from '@/lib/utils/image';
import { formatApiError } from '@/lib/utils/apiError';
import { BodyCaptureGuide } from '@/components/features/BodyCaptureGuide';
import { BodyScanPoseGuide } from '@/components/features/BodyScanPoseGuide';
import { IDEAL_BODY_SCAN_POSE_IMAGE } from '@/lib/constants/bodyScanGuide';

type Step = 'upload' | 'details' | 'analyzing' | 'result';

type PhotoFraming = 'upper_body' | 'full_body';

/** Guest validate + body-scan must use the same framing. Uploads use full_body (bbox + mask density checks). */

interface ScanResult {
  body_fat_percentage: number;
  confidence: string;
  category: string;
  insight: string;
  body_fat_range_low?: number;
  body_fat_range_high?: number;
}

function ConfidenceColor(confidence: string) {
  switch (confidence) {
    case 'high': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
    case 'medium': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    default: return 'text-red-400 border-red-400/30 bg-red-400/10';
  }
}

export default function TryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [registerHref, setRegisterHref] = useState('/register?next=%2Fbody-scan%3Ftab%3Djourney');
  const [step, setStep] = useState<Step>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [validating, setValidating] = useState(false);
  /** Set when a file passes validate-photo; must match guest body-scan `framing`. */
  const [photoFraming, setPhotoFraming] = useState<PhotoFraming | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    params.set('next', '/body-scan?tab=journey');

    const currentSearch = new URLSearchParams(window.location.search);
    const source = currentSearch.get('source') || currentSearch.get('ref');
    const shareToken = currentSearch.get('share_token') || currentSearch.get('share');
    const sessionId = currentSearch.get('session_id');
    if (source) params.set('source', source);
    if (shareToken) params.set('share_token', shareToken);
    if (sessionId) params.set('session_id', sessionId);

    setRegisterHref(`/register?${params.toString()}`);
  }, []);

  const processTryFile = async (f: File, framing: PhotoFraming): Promise<boolean> => {
    if (!f.type.startsWith('image/')) return false;
    setValidating(true);
    setError(null);
    try {
      const base64 = await compressAndConvertToBase64(f);
      const v = await guestApi.validatePhoto({ image_base64: base64, framing });
      if (!v.data.ok) {
        setError(v.data.messages.join(' '));
        return false;
      }
      setPhotoFraming(framing);
      setFile(f);
      const reader = new FileReader();
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
          setStep('details');
          resolve();
        };
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(f);
      });
      return true;
    } catch (err) {
      setError(formatApiError(err));
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void processTryFile(f, 'full_body');
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    if (!file || !gender || !age) return;
    setStep('analyzing');
    setError(null);

    try {
      const base64 = await compressAndConvertToBase64(file);
      const framing = photoFraming ?? 'upper_body';
      const v = await guestApi.validatePhoto({ image_base64: base64, framing });
      if (!v.data.ok) {
        setError(v.data.messages.join(' '));
        setStep('details');
        return;
      }
      const res = await guestApi.bodyScan({
        image_base64: base64,
        gender,
        age: parseInt(age),
        ownership_confirmed: confirmed,
        adult_confirmed: confirmed,
        framing,
      });
      setResult(res.data);
      setStep('result');
    } catch (err: unknown) {
      setError(formatApiError(err));
      setStep('details');
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <Link href="/" className="text-white transition-opacity hover:opacity-90">
          <BrandLogo size={42} priority labelClassName="text-xl font-bold text-white" />
        </Link>
        <Link href="/login" className="text-sm text-white/40 hover:text-white/70 transition-colors">
          Already have an account? Sign in
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pb-24">
        {/* Title */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            See where you stand
          </h1>
          <p className="text-white/40 text-lg">
            Free body fat estimate. No sign-up needed.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ========== UPLOAD STEP ========== */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

              <div className="mb-6">
                <BodyScanPoseGuide variant="dark" />
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.12] rounded-2xl p-16 text-center cursor-pointer hover:border-primary/50 transition-all group"
              >
                <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-6 group-hover:border-primary/30 transition-colors">
                  <Camera className="w-10 h-10 text-white/30 group-hover:text-primary/70 transition-colors" />
                </div>
                <p className="text-lg font-medium text-white/80 mb-2">Upload a full-body photo</p>
                <p className="text-sm text-white/30">
                  JPG or PNG — front-facing, good lighting. Mirror selfies work best.
                </p>
              </div>

              {validating && (
                <p className="text-center text-sm text-white/50 mt-4 max-w-md mx-auto leading-relaxed">
                  Checking segmentation and pose… The first check can take 1–3 minutes while the server loads
                  models (watch the backend terminal for{' '}
                  <span className="text-white/70">[guest] validate-photo</span>). Your body should fill most
                  of the frame.
                </p>
              )}
              {error && step === 'upload' && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(true)}
                disabled={validating}
                className="w-full mt-4 py-3 rounded-xl border border-white/[0.12] text-white/80 hover:bg-white/[0.04] transition-colors disabled:opacity-40"
              >
                Use camera with guide
              </button>

              <div className="flex items-center justify-center gap-2 mt-6 text-white/20 text-xs">
                <Shield className="w-3.5 h-3.5" />
                <span>Guest photos are not saved to a Devenira account. They are sent to AI services for analysis.</span>
              </div>
            </motion.div>
          )}

          {/* ========== DETAILS STEP ========== */}
          {step === 'details' && previewUrl && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl!} alt="Your photo" className="w-full max-h-72 object-contain bg-black/30" />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/50 mb-2">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors"
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-white/50 mb-2">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="30"
                      min={18}
                      max={100}
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.1] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/30 text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs text-white/40 leading-relaxed">
                    I confirm this is a photo of myself, that I am 18 or older, and that results are AI visual estimates, not medical measurements.
                  </span>
                </label>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={!gender || !age || !confirmed}
                  className="w-full py-4 bg-gradient-primary text-white font-semibold rounded-xl text-lg transition-all hover:shadow-glow-cyan disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Analyze My Body
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('upload');
                    setPreviewUrl(null);
                    setFile(null);
                    setPhotoFraming(null);
                  }}
                  className="w-full py-2 text-sm text-white/30 hover:text-white/50 transition-colors"
                >
                  Choose a different photo
                </button>
              </div>
            </motion.div>
          )}

          {/* ========== ANALYZING STEP ========== */}
          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <ProcessingOverlay active={step === 'analyzing'} steps={GUEST_SCAN_STEPS} dark />
            </motion.div>
          )}

          {/* ========== RESULT STEP ========== */}
          {step === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Body Fat Result — show range, exact is gated */}
              <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <p className="text-sm text-white/40 mb-2 uppercase tracking-wider">Estimated Body Fat Range</p>
                {result.body_fat_range_low && result.body_fat_range_high ? (
                  <p className="text-6xl font-bold gradient-text mb-3">
                    {result.body_fat_range_low}–{result.body_fat_range_high}%
                  </p>
                ) : (
                  <p className="text-6xl font-bold gradient-text mb-3">
                    {Math.round(result.body_fat_percentage - 2.5)}–{Math.round(result.body_fat_percentage + 2.5)}%
                  </p>
                )}
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${ConfidenceColor(result.confidence)}`}>
                  {result.confidence} confidence
                </span>
                <div className="mt-4 p-3 rounded-xl bg-primary/[0.08] border border-primary/20">
                  <Lock className="w-4 h-4 text-primary/60 mx-auto mb-1" />
                  <p className="text-xs text-primary/80">
                    Create a free account to see your exact body fat %
                  </p>
                </div>
              </div>

              {/* Category & Insight */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-white/40">Category</p>
                    <p className="font-semibold text-white">{result.category}</p>
                  </div>
                </div>
                <p className="text-white/50 leading-relaxed">{result.insight}</p>
              </div>

              {/* Disclaimer */}
              <p className="text-center text-xs text-white/20">
                Visual estimate, not a medical measurement. Always consult a healthcare professional.
              </p>

              {/* ===== LOCKED: Features behind signup ===== */}
              <div className="relative rounded-2xl overflow-hidden">
                <div className="p-10 bg-gradient-to-br from-primary/[0.06] to-secondary/[0.06] border border-white/[0.08] rounded-2xl text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Save This Scan &amp; Track Your Progress
                  </h3>
                  <p className="text-white/40 max-w-md mx-auto mb-6 leading-relaxed">
                    This result disappears when you leave. Create a free account to save it,
                    get your exact body fat %, and start tracking weekly changes.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto mb-8">
                    {[
                      { icon: Lock, label: 'Exact BF%' },
                      { icon: BarChart3, label: 'Percentile ranking' },
                      { icon: TrendingUp, label: 'Weekly tracking' },
                      { icon: Sparkles, label: 'AI goal preview' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Icon className="w-5 h-5 text-primary/60 mx-auto mb-2" />
                        <p className="text-[11px] text-white/40">{label}</p>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={registerHref}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-primary text-white font-semibold rounded-xl text-lg transition-all hover:shadow-glow-cyan hover:-translate-y-0.5 btn-glow"
                  >
                    Create Free Account
                    <ArrowRight className="w-5 h-5" />
                  </Link>

                  <p className="text-xs text-white/20 mt-4">
                    Free plan includes 3 body scans in your first month. No credit card required.
                  </p>
                </div>
              </div>

              {/* Weekly tracking value prop */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">One scan is a number. Weekly scans are proof.</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-white/50">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">Week 1</span>
                    <span>Your starting point — save it.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">Week 4</span>
                    <span>See your body fat trending down, side-by-side.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">Week 8</span>
                    <span>A visual timeline that proves your work paid off.</span>
                  </div>
                </div>
              </div>

              {/* Try Again */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setStep('upload');
                    setPreviewUrl(null);
                    setFile(null);
                    setPhotoFraming(null);
                    setResult(null);
                    setGender('');
                    setAge('');
                    setConfirmed(false);
                    setError(null);
                  }}
                  className="text-sm text-white/30 hover:text-white/50 transition-colors"
                >
                  Try with a different photo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BodyCaptureGuide
        open={showGuide}
        onClose={() => setShowGuide(false)}
        onCapture={(f) => processTryFile(f, 'full_body')}
        guideImageSrc={IDEAL_BODY_SCAN_POSE_IMAGE}
        validationMessage={showGuide ? error : null}
      />
    </main>
  );
}
