'use client';

import { motion } from 'framer-motion';
import { Camera, Sparkles, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const steps = [
  { number: '01', icon: Camera },
  { number: '02', icon: Sparkles },
  { number: '03', icon: RefreshCw },
];

const stepKeys = [
  { titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
  { titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
  { titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' },
];

export function HowItWorksSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6 bg-[#080810] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.08) 0%, transparent 60%)' }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('landing.howItWorks')}</h2>
          <p className="text-lg text-white/50">{t('landing.howItWorksSubtitle')}</p>
        </motion.div>

        <div className="relative">
          <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-primary/40 via-secondary/40 to-primary/40" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  className="relative text-center"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: i * 0.2 }}
                >
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-primary mb-6 mx-auto">
                    <Icon className="w-9 h-9" />
                    <span className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-primary text-white text-sm font-bold rounded-full flex items-center justify-center shadow-glow-cyan font-number">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{t(stepKeys[i].titleKey)}</h3>
                  <p className="text-white/40 leading-relaxed max-w-xs mx-auto">{t(stepKeys[i].descKey)}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
