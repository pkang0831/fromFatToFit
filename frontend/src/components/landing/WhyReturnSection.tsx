'use client';

import { motion } from 'framer-motion';
import { Target, BarChart3, ImageIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

const returnReasons = [
  { icon: Target, titleKey: 'landing.whyReturn1Title', descKey: 'landing.whyReturn1Desc' },
  { icon: BarChart3, titleKey: 'landing.whyReturn2Title', descKey: 'landing.whyReturn2Desc' },
  { icon: ImageIcon, titleKey: 'landing.whyReturn3Title', descKey: 'landing.whyReturn3Desc' },
];

export function WhyReturnSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6 bg-[#080810] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(168,139,122,0.06) 0%, transparent 60%)' }}
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
            {t('landing.whyReturnTitle')}{' '}
            <span className="gradient-text">{t('landing.whyReturnHighlight')}</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            {t('landing.whyReturnSubtitle')}
          </p>
        </motion.div>

        <div className="space-y-6 mb-16">
          {returnReasons.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={reason.titleKey}
                className="flex flex-col md:flex-row items-start gap-6 p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all"
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{t(reason.titleKey)}</h3>
                  <p className="text-white/45 leading-relaxed">{t(reason.descKey)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link
            href="/try"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-primary text-white font-semibold rounded-xl text-lg transition-all hover:shadow-glow-cyan hover:-translate-y-0.5 btn-glow"
          >
            {t('landing.getStarted')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
