'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import { Camera, ArrowRight, Lock, Shield, Sparkles, BarChart3, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { guestApi } from '@/lib/api/services';
import { compressAndConvertToBase64 } from '@/lib/utils/image';

type Step = 'upload' | 'details' | 'analyzing' | 'result';

interface ScanResult {
  body_fat_percentage: number;
  confidence: string;
  category: string;
  insight: string;
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
  const [step, setStep] = useState<Step>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setStep('details');
      setError(null);
    };
    reader.readAsDataURL(f);
  };

  const handleAnalyze = async () => {
    if (!file || !gender || !age) return;
    setStep('analyzing');
    setError(null);

    try {
      const base64 = await compressAndConvertToBase64(file);
      const res = await guestApi.bodyScan({
        image_base64: base64,
        gender,
        age: parseInt(age),
      });
      setResult(res.data);
      setStep('result');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail || 'Analysis failed. Please try again.';
      setError(message);
      setStep('details');
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <Link href="/" className="text-xl font-bold gradient-text">
          Devenira
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
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.12] rounded-2xl p-16 text-center cursor-pointer hover:border-primary/50 transition-all group"
              >
                <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-6 group-hover:border-primary/30 transition-colors">
                  <Camera className="w-10 h-10 text-white/30 group-hover:text-primary/70 transition-colors" />
                </div>
                <p className="text-lg font-medium text-white/80 mb-2">Upload a full-body photo</p>
                <p className="text-sm text-white/30">JPG or PNG — front-facing, good lighting works best</p>
              </div>

              <div className="flex items-center justify-center gap-2 mt-6 text-white/20 text-xs">
                <Shield className="w-3.5 h-3.5" />
                <span>Your photo is analyzed once and never stored</span>
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
                <img src={previewUrl} alt="Your photo" className="w-full max-h-72 object-contain bg-black/30" />
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
                      min={10}
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
                    I confirm this is a photo of myself. I understand results are AI visual estimates, not medical measurements.
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
                  onClick={() => { setStep('upload'); setPreviewUrl(null); setFile(null); }}
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
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-6" />
              <p className="text-lg text-white/60">Analyzing your body composition...</p>
              <p className="text-sm text-white/30 mt-2">This takes 5-15 seconds</p>
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
              {/* Body Fat Result */}
              <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <p className="text-sm text-white/40 mb-2 uppercase tracking-wider">Estimated Body Fat</p>
                <p className="text-7xl font-bold gradient-text mb-3">
                  {result.body_fat_percentage.toFixed(1)}%
                </p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${ConfidenceColor(result.confidence)}`}>
                  {result.confidence} confidence
                </span>
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

              {/* ===== LOCKED: Transformation Preview ===== */}
              <div className="relative rounded-2xl overflow-hidden">
                <div className="p-10 bg-gradient-to-br from-primary/[0.06] to-secondary/[0.06] border border-white/[0.08] rounded-2xl text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Your Transformation Preview
                  </h3>
                  <p className="text-white/40 max-w-md mx-auto mb-8 leading-relaxed">
                    Create a free account to see an AI preview of your goal body,
                    save your results, and track your progress weekly.
                  </p>

                  <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-8">
                    {[
                      { icon: Sparkles, label: 'AI body preview' },
                      { icon: TrendingUp, label: 'Weekly tracking' },
                      { icon: BarChart3, label: 'Gap-to-goal data' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Icon className="w-5 h-5 text-primary/60 mx-auto mb-2" />
                        <p className="text-[11px] text-white/40">{label}</p>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-primary text-white font-semibold rounded-xl text-lg transition-all hover:shadow-glow-cyan hover:-translate-y-0.5 btn-glow"
                  >
                    Create Free Account
                    <ArrowRight className="w-5 h-5" />
                  </Link>

                  <p className="text-xs text-white/20 mt-4">
                    Free plan includes 1 transformation preview + 1 body scan per month
                  </p>
                </div>
              </div>

              {/* Try Again */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setStep('upload');
                    setPreviewUrl(null);
                    setFile(null);
                    setResult(null);
                    setGender('');
                    setAge('');
                    setConfirmed(false);
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
    </main>
  );
}
