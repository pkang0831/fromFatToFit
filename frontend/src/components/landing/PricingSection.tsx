'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const planDefs = [
  {
    nameKey: 'landing.planFree',
    price: '$0',
    periodKey: 'landing.planFreePeriod',
    creditsKey: 'landing.planFreeCredits',
    highlight: false,
    featureKeys: [
      'landing.planFreeFeature1', 'landing.planFreeFeature2', 'landing.planFreeFeature3',
      'landing.planFreeFeature5',
    ],
    ctaKey: 'landing.planFreeCta',
    href: '/try',
  },
  {
    nameKey: 'landing.planPro',
    price: '$9.99',
    periodKey: 'landing.planProPeriod',
    creditsKey: 'landing.planProCredits',
    highlight: true,
    featureKeys: [
      'landing.planProFeature1', 'landing.planProFeature2', 'landing.planProFeature3',
      'landing.planProFeature4', 'landing.planProFeature5', 'landing.planProFeature6',
    ],
    ctaKey: 'landing.planProCta',
    href: '/register',
    badgeKey: 'landing.planProBadge',
  },
  {
    nameKey: 'landing.planPack',
    price: '$4.99',
    periodKey: 'landing.planPackPeriod',
    creditsKey: 'landing.planPackCredits',
    highlight: false,
    featureKeys: [
      'landing.planPackFeature1', 'landing.planPackFeature2',
      'landing.planPackFeature3', 'landing.planPackFeature4',
    ],
    ctaKey: 'landing.planPackCta',
    href: '/register',
  },
];

export function PricingSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6 bg-[#0a0a0f] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(6,182,212,0.06) 0%, transparent 60%)' }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('landing.pricingTitle')}</h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            {t('landing.pricingSubtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {planDefs.map((plan, i) => (
            <motion.div
              key={plan.nameKey}
              className={`relative rounded-2xl p-8 transition-all ${
                plan.highlight
                  ? 'bg-white/[0.04] border-2 border-primary/40 shadow-glow-primary md:scale-105'
                  : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]'
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              {plan.badgeKey && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary text-white text-xs font-semibold rounded-full shadow-glow-cyan">
                  {t(plan.badgeKey)}
                </span>
              )}

              <h3 className="text-xl font-semibold text-white mb-2">
                {t(plan.nameKey)}
              </h3>
              <div className="mb-1">
                <span className="text-4xl font-bold text-white font-number">
                  {plan.price}
                </span>
                <span className="text-sm ml-1 text-white/40">
                  {t(plan.periodKey)}
                </span>
              </div>
              <p className={`text-sm mb-6 ${plan.highlight ? 'text-primary font-medium' : 'text-primary/70'}`}>
                {t(plan.creditsKey)}
              </p>

              <ul className="space-y-3 mb-8">
                {plan.featureKeys.map((fKey) => (
                  <li key={fKey} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      plan.highlight ? 'bg-primary/20 text-primary' : 'bg-white/[0.06] text-white/50'
                    }`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-white/60">
                      {t(fKey)}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full py-3 text-center font-semibold rounded-xl transition-all ${
                  plan.highlight
                    ? 'bg-gradient-primary text-white hover:shadow-glow-cyan btn-glow'
                    : 'bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]'
                }`}
              >
                {t(plan.ctaKey)}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
