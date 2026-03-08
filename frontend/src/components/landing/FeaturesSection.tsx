'use client';

import { motion } from 'framer-motion';
import { Sparkles, Scan, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const features = [
  {
    icon: Sparkles,
    color: 'from-cyan-400 to-violet-500',
    titleKey: 'landing.feature1Title',
    descKey: 'landing.feature1Desc',
  },
  {
    icon: Scan,
    color: 'from-violet-400 to-violet-600',
    titleKey: 'landing.feature2Title',
    descKey: 'landing.feature2Desc',
  },
  {
    icon: TrendingUp,
    color: 'from-emerald-400 to-emerald-600',
    titleKey: 'landing.feature3Title',
    descKey: 'landing.feature3Desc',
  },
];

export function FeaturesSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6 bg-[#0a0a0f] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 60%)' }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('landing.featuresTitle')}{' '}
            <span className="gradient-text">{t('landing.featuresHighlight')}</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            {t('landing.featuresSubtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.titleKey}
                className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{t(feature.titleKey)}</h3>
                <p className="text-white/45 leading-relaxed">{t(feature.descKey)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
