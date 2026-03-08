'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const testimonialDefs = [
  { name: 'Alex R.', quoteKey: 'landing.testimonial1Quote', roleKey: 'landing.testimonial1Role', avatar: 'A', gradient: 'from-cyan-400 to-cyan-600' },
  { name: 'Sarah K.', quoteKey: 'landing.testimonial2Quote', roleKey: 'landing.testimonial2Role', avatar: 'S', gradient: 'from-violet-400 to-violet-600' },
  { name: 'James L.', quoteKey: 'landing.testimonial3Quote', roleKey: 'landing.testimonial3Role', avatar: 'J', gradient: 'from-cyan-400 to-violet-500' },
];

export function TestimonialsSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6 bg-[#080810] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 60%)' }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('landing.testimonialsTitle')}</h2>
          <p className="text-lg text-white/50">{t('landing.testimonialsSubtitle')}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonialDefs.map((item, i) => (
            <motion.div
              key={item.name}
              className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="flex items-center gap-1 mb-5">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-white/60 leading-relaxed mb-6">
                &ldquo;{t(item.quoteKey)}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white text-sm font-bold`}>
                  {item.avatar}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{item.name}</div>
                  <div className="text-xs text-primary/70 font-medium">{t(item.roleKey)}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
