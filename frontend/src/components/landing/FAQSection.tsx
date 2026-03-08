'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const faqKeys = [
  { qKey: 'faq.photosPrivacy.q', aKey: 'faq.photosPrivacy.a' },
  { qKey: 'faq.transformation.q', aKey: 'faq.transformation.a' },
  { qKey: 'faq.bodyfatAccuracy.q', aKey: 'faq.bodyfatAccuracy.a' },
  { qKey: 'faq.weeklyReturn.q', aKey: 'faq.weeklyReturn.a' },
  { qKey: 'faq.credits.q', aKey: 'faq.credits.a' },
  { qKey: 'faq.cancel.q', aKey: 'faq.cancel.a' },
  { qKey: 'faq.notMedical.q', aKey: 'faq.notMedical.a' },
];

export function FAQSection() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 px-6 bg-[#0a0a0f] relative overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('landing.faq')}</h2>
          <p className="text-lg text-white/50">{t('landing.faqSubtitle')}</p>
        </motion.div>

        <div className="space-y-3">
          {faqKeys.map((faq, i) => (
            <motion.div
              key={i}
              className="border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <span className="font-medium text-white pr-4">{t(faq.qKey)}</span>
                <motion.div
                  className="flex-shrink-0 text-white/40"
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-white/50 leading-relaxed">
                      {t(faq.aKey)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
