'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { authApi } from '@/lib/api/services';

type Step = 'welcome' | 'consent' | 'profile' | 'goals' | 'tour' | 'done';

export default function OnboardingPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const consentAlreadyGiven = !!(user as any)?.consent_terms_at;
  const profileAlreadyFilled = !!(user?.gender && user?.age && user?.height_cm);

  const steps: Step[] = ['welcome'];
  if (!consentAlreadyGiven) steps.push('consent');
  if (!profileAlreadyFilled) steps.push('profile');
  steps.push('goals', 'tour', 'done');
  const STEPS = steps;

  const [step, setStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [consent, setConsent] = useState({
    terms: false,
    privacy: false,
    sensitiveData: false,
    age: false,
  });

  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    gender: user?.gender || '',
    age: user?.age?.toString() || '',
    height_cm: user?.height_cm?.toString() || '',
    weight_kg: user?.weight_kg?.toString() || '',
    ethnicity: user?.ethnicity || '',
    activity_level: (user?.activity_level || 'moderate') as string,
  });

  const [goals, setGoals] = useState({
    target_weight: '',
    calorie_goal: '',
  });

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const prev = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const saveProfileAndGoals = async () => {
    setSaving(true);
    setError('');
    try {
      const update: Record<string, any> = {
        full_name: profile.full_name || undefined,
        gender: profile.gender || undefined,
        age: profile.age ? Number(profile.age) : undefined,
        height_cm: profile.height_cm ? Number(profile.height_cm) : undefined,
        weight_kg: profile.weight_kg ? Number(profile.weight_kg) : undefined,
        ethnicity: profile.ethnicity || undefined,
        activity_level: profile.activity_level || undefined,
        calorie_goal: goals.calorie_goal ? Number(goals.calorie_goal) : undefined,
        onboarding_completed: true,
      };

      await authApi.updateProfile(update);
      next();
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? err.message;
      setError(msg === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response
        ? 'Could not reach the server. Check your connection and try again.'
        : (typeof msg === 'string' ? msg : 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  const finishOnboarding = () => {
    window.location.href = '/home';
  };

  const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-border-light rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-center">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <motion.div key="welcome" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Welcome to Devenira!</h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                  Let&apos;s set up your profile so we can personalize your experience. This only takes a minute.
                </p>
                <button onClick={next} className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
                  Let&apos;s Go
                </button>
              </motion.div>
            )}

            {step === 'consent' && (
              <motion.div key="consent" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('auth.consent.title')}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">Please review and accept the following to continue.</p>

                <div className="space-y-4 flex-1">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      id="ob-agree-all"
                      checked={consent.terms && consent.privacy && consent.sensitiveData && consent.age}
                      onChange={e => {
                        const checked = e.target.checked;
                        setConsent({ terms: checked, privacy: checked, sensitiveData: checked, age: checked });
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="ob-agree-all" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                      Agree to all
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" id="ob-terms" checked={consent.terms} onChange={e => setConsent(c => ({ ...c, terms: e.target.checked }))} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
                    <label htmlFor="ob-terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      {(() => {
                        const termsLink = t('auth.consent.termsLink');
                        const disclaimerLink = t('auth.consent.disclaimerLink');
                        const full = t('auth.consent.terms', { terms: termsLink, disclaimer: disclaimerLink });
                        const parts = full.split(termsLink);
                        const between = parts[1]?.split(disclaimerLink) ?? ['', ''];
                        return <>{parts[0]}<a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{termsLink}</a>{between[0]}<a href="/disclaimer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{disclaimerLink}</a>{between[1]}</>;
                      })()}
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input type="checkbox" id="ob-privacy" checked={consent.privacy} onChange={e => setConsent(c => ({ ...c, privacy: e.target.checked }))} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
                    <label htmlFor="ob-privacy" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      {(() => {
                        const privacyLink = t('auth.consent.privacyLink');
                        const full = t('auth.consent.privacy', { privacy: privacyLink });
                        const parts = full.split(privacyLink);
                        return <>{parts[0]}<a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{privacyLink}</a>{parts[1]}</>;
                      })()}
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input type="checkbox" id="ob-sensitive" checked={consent.sensitiveData} onChange={e => setConsent(c => ({ ...c, sensitiveData: e.target.checked }))} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
                    <label htmlFor="ob-sensitive" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      {t('auth.consent.sensitiveData')}
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <input type="checkbox" id="ob-age" checked={consent.age} onChange={e => setConsent(c => ({ ...c, age: e.target.checked }))} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
                    <label htmlFor="ob-age" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      {t('auth.consent.ageVerification')}
                    </label>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button onClick={prev} className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Back</button>
                  <button
                    onClick={async () => {
                      if (!consent.terms || !consent.privacy || !consent.sensitiveData || !consent.age) {
                        setError('Please accept all required agreements to continue');
                        return;
                      }
                      setError('');
                      setSaving(true);
                      try {
                        const now = new Date().toISOString();
                        await authApi.updateProfile({
                          consent_terms_at: now,
                          consent_privacy_at: now,
                          consent_sensitive_data_at: now,
                          consent_age_verified_at: now,
                          consent_version: '2026-02-26',
                        });
                        next();
                      } catch (err: any) {
                        const msg = err.response?.data?.detail ?? err.message;
                        if (msg === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response) {
                          setError('Could not reach the server. Check your connection and that the app is configured correctly, then try again.');
                        } else {
                          setError(typeof msg === 'string' ? msg : 'Failed to save consent');
                        }
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || !consent.terms || !consent.privacy || !consent.sensitiveData || !consent.age}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Continue'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'profile' && (
              <motion.div key="profile" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Your Profile</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">Help us personalize your experience.</p>

                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Full Name</label>
                    <input type="text" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="John Doe" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Gender *</label>
                      <select value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Age *</label>
                      <input type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} placeholder="30" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Height (cm) *</label>
                      <input type="number" value={profile.height_cm} onChange={e => setProfile(p => ({ ...p, height_cm: e.target.value }))} placeholder="170" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Weight (kg)</label>
                      <input type="number" value={profile.weight_kg} onChange={e => setProfile(p => ({ ...p, weight_kg: e.target.value }))} placeholder="70" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Ethnicity</label>
                      <select value={profile.ethnicity} onChange={e => setProfile(p => ({ ...p, ethnicity: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
                        <option value="">Select...</option>
                        <option value="Asian">Asian</option>
                        <option value="Caucasian">Caucasian</option>
                        <option value="African">African</option>
                        <option value="Hispanic">Hispanic</option>
                        <option value="Middle Eastern">Middle Eastern</option>
                        <option value="Pacific Islander">Pacific Islander</option>
                        <option value="Mixed">Mixed</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Activity Level</label>
                      <select value={profile.activity_level} onChange={e => setProfile(p => ({ ...p, activity_level: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
                        <option value="sedentary">Sedentary</option>
                        <option value="light">Lightly Active</option>
                        <option value="moderate">Moderately Active</option>
                        <option value="active">Very Active</option>
                        <option value="athlete">Athlete</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button onClick={prev} className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors">Back</button>
                  <button
                    onClick={() => {
                      if (!profile.gender || !profile.age || !profile.height_cm) {
                        setError('Please fill in gender, age, and height');
                        return;
                      }
                      setError('');
                      next();
                    }}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'goals' && (
              <motion.div key="goals" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Set Your Goals</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">Optional but helps us tailor recommendations.</p>

                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Target Weight (kg)</label>
                    <input type="number" value={goals.target_weight} onChange={e => setGoals(g => ({ ...g, target_weight: e.target.value }))} placeholder="65" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                    {goals.target_weight && profile.height_cm && (() => {
                      const heightM = Number(profile.height_cm) / 100;
                      const bmi = heightM > 0 ? Number(goals.target_weight) / (heightM * heightM) : 0;
                      if (bmi > 0 && bmi < 18.5) {
                        return (
                          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                              <strong>Warning:</strong> A target weight of {goals.target_weight} kg at your height results in a BMI of {bmi.toFixed(1)}, which is classified as underweight. Please consult a healthcare professional before setting this goal. Extreme weight loss can be dangerous.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Daily Calorie Goal</label>
                    <input type="number" value={goals.calorie_goal} onChange={e => setGoals(g => ({ ...g, calorie_goal: e.target.value }))} placeholder="2000" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">We&apos;ll suggest a goal based on your profile if left blank.</p>
                    {goals.calorie_goal && Number(goals.calorie_goal) < 1200 && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          <strong>Warning:</strong> A daily intake below 1,200 calories is generally considered unsafe without medical supervision. Please consult a healthcare professional.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button onClick={prev} className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors">Back</button>
                  <button onClick={saveProfileAndGoals} disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Continue'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'tour' && (
              <motion.div key="tour" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Quick Tour</h2>
                <div className="space-y-4 flex-1">
                  {[
                    { icon: '📸', title: 'Food Camera', desc: 'Take a photo of your meal to instantly log calories and nutrients.' },
                    { icon: '📊', title: 'Body Scan', desc: 'Upload a photo to get your AI-estimated body fat percentage.' },
                    { icon: '🔄', title: 'Transformation', desc: 'See what you could look like at your target body fat.' },
                    { icon: '📈', title: 'Progress', desc: 'Track your weight, calories, and body composition over time.' },
                  ].map(item => (
                    <div key={item.title} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-950 rounded-xl">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={prev} className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors">Back</button>
                  <button onClick={next} className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
                    Finish
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">You&apos;re All Set!</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Your profile is ready. Let&apos;s start your transformation journey.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={finishOnboarding} className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
                    Go to Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-4 p-3 bg-error/10 border border-error rounded-lg">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
