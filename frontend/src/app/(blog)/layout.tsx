'use client';

import Link from 'next/link';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0a0f]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold gradient-text transition-opacity hover:opacity-80">
            {t('common.appName')}
          </Link>

          <nav className="flex items-center gap-6 text-sm text-white/62">
            <Link href="/blog" className="transition-colors hover:text-primary">
              Blog
            </Link>
            <Link href="/try" className="transition-colors hover:text-primary">
              Try
            </Link>
            <Link href="/terms" className="transition-colors hover:text-primary">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">
              Privacy
            </Link>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/[0.06] bg-[#060609]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-white/30 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {t('common.appName')}. {t('legal.allRightsReserved')}
          </p>
          <div className="flex items-center gap-5">
            <Link href="/" className="transition-colors hover:text-primary">
              Home
            </Link>
            <Link href="/blog" className="transition-colors hover:text-primary">
              Blog
            </Link>
            <Link href="/try" className="transition-colors hover:text-primary">
              Try the free body scan
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-primary">
              Terms
            </Link>
            <Link href="/disclaimer" className="transition-colors hover:text-primary">
              Disclaimer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
