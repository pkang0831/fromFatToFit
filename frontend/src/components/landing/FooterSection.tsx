'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export function FooterSection() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-white/[0.04] py-16 px-6" style={{ backgroundColor: '#060609' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold gradient-text mb-3">{t('common.appName')}</h3>
            <p className="text-white/30 text-sm leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h4 className="text-white/80 font-semibold mb-4 text-sm uppercase tracking-wider">{t('legal.product')}</h4>
            <ul className="space-y-2">
              {[
                { labelKey: 'landing.features', href: '#features' },
                { labelKey: 'landing.pricing', href: '#pricing' },
                { labelKey: 'landing.faq', href: '#faq' },
              ].map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-white/30 hover:text-primary text-sm transition-colors">
                    {t(item.labelKey)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white/80 font-semibold mb-4 text-sm uppercase tracking-wider">{t('legal.account')}</h4>
            <ul className="space-y-2">
              {[
                { labelKey: 'auth.signInButton', href: '/login' },
                { labelKey: 'auth.createOne', href: '/register' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/30 hover:text-primary text-sm transition-colors">
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white/80 font-semibold mb-4 text-sm uppercase tracking-wider">{t('legal.legal')}</h4>
            <ul className="space-y-2">
              {[
                { labelKey: 'legal.privacyPolicy', href: '/privacy' },
                { labelKey: 'legal.termsOfService', href: '/terms' },
                { labelKey: 'legal.healthDisclaimer', href: '/disclaimer' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/30 hover:text-primary text-sm transition-colors">
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-white/20 text-sm">
            &copy; {new Date().getFullYear()} {t('common.appName')}. {t('legal.allRightsReserved')}
          </p>
          <LanguageSwitcher variant="footer" />
        </div>
      </div>
    </footer>
  );
}
