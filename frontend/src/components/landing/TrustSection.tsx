'use client';

import { motion } from 'framer-motion';
import { Lock, EyeOff, Trash2, Stethoscope } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const trustItems = [
  { icon: Lock, titleKey: 'landing.trust1Title', descKey: 'landing.trust1Desc' },
  { icon: EyeOff, titleKey: 'landing.trust2Title', descKey: 'landing.trust2Desc' },
  { icon: Trash2, titleKey: 'landing.trust3Title', descKey: 'landing.trust3Desc' },
  { icon: Stethoscope, titleKey: 'landing.trust4Title', descKey: 'landing.trust4Desc' },
];

export function TrustSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6 bg-[#0a0a0f] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(201,169,110,0.06) 0%, transparent 60%)' }}
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
            {t('landing.trustTitle')}{' '}
            <span className="gradient-text">{t('landing.trustHighlight')}</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            {t('landing.trustSubtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.titleKey}
                className="flex gap-5 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary/80" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t(item.titleKey)}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{t(item.descKey)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
