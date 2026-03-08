'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { 
  Home, 
  Utensils, 
  Camera, 
  Dumbbell, 
  Scan, 
  User,
  Crown,
  TrendingUp,
  Zap,
  MessageCircle,
  Play,
  Moon,
  Sun,
  Timer,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { paymentApi } from '@/lib/api/services';
import { TOUR_START_EVENT, resetAllTours } from '@/components/tour/FeatureTour';
import { useTheme, COLOR_THEMES } from '@/contexts/ThemeContext';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const coreItems = [
  { href: '/home', labelKey: 'nav.home', icon: Home },
  { href: '/body-scan', labelKey: 'nav.bodyScan', icon: Scan },
  { href: '/chat', labelKey: 'nav.chat', icon: MessageCircle },
  { href: '/profile', labelKey: 'nav.profile', icon: User },
];

const extraItems = [
  { href: '/progress', labelKey: 'nav.progress', icon: TrendingUp },
  { href: '/calories', labelKey: 'nav.calories', icon: Utensils },
  { href: '/food-camera', labelKey: 'nav.foodCamera', icon: Camera },
  { href: '/workouts', labelKey: 'nav.workouts', icon: Dumbbell },
  { href: '/fasting', labelKey: 'nav.fasting', icon: Timer },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { isPremium } = useSubscription();
  const { theme, colorTheme, toggleTheme, setColorTheme } = useTheme();
  const [credits, setCredits] = useState<number | null>(null);
  const [extrasOpen, setExtrasOpen] = useState(() => {
    return extraItems.some((item) => item.href === pathname);
  });

  useEffect(() => {
    paymentApi.getCreditBalance()
      .then(res => setCredits(res.data.total_credits))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (extraItems.some((item) => item.href === pathname)) {
      setExtrasOpen(true);
    }
  }, [pathname]);

  const startTour = () => {
    resetAllTours();
    window.dispatchEvent(new Event(TOUR_START_EVENT));
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-surface border-r border-border h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold gradient-text">Devenira</h1>
        <div className="flex items-center gap-2 mt-2">
          {isPremium && (
            <Badge variant="premium">
              <Crown className="h-3 w-3 mr-1" />
              Pro
            </Badge>
          )}
          {credits !== null && (
            <Link href="/upgrade" className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors">
              <Zap className="h-3 w-3" />
              <span className="font-number">{credits}</span> credits
            </Link>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {coreItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const tourId = `nav-${item.href.slice(1)}`;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={tourId}
              className={cn(
                'flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-gradient-primary text-white shadow-glow-cyan'
                  : 'text-text-secondary hover:bg-surfaceAlt hover:text-text'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium text-sm">{t(item.labelKey)}</span>
            </Link>
          );
        })}

        {/* Extras collapsible */}
        <div className="pt-2">
          <button
            onClick={() => setExtrasOpen(!extrasOpen)}
            className="flex items-center justify-between w-full px-4 py-2 rounded-xl text-text-light hover:bg-surfaceAlt hover:text-text-secondary transition-all duration-200"
          >
            <span className="text-xs font-semibold uppercase tracking-wider">Extras</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', extrasOpen && 'rotate-180')} />
          </button>

          <div className={cn(
            'space-y-0.5 overflow-hidden transition-all duration-200',
            extrasOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
          )}>
            {extraItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const tourId = `nav-${item.href.slice(1)}`;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={tourId}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-2 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-primary text-white shadow-glow-cyan'
                      : 'text-text-light hover:bg-surfaceAlt hover:text-text-secondary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="px-3 pb-2 space-y-1">
        <div className="flex items-center justify-between px-4 py-2">
          <LanguageSwitcher variant="compact" />
        </div>

        <div className="flex items-center gap-2 px-4 py-2">
          {COLOR_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setColorTheme(t.id)}
              title={t.label}
              className="relative w-7 h-7 rounded-full flex-shrink-0 transition-transform hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}
            >
              {colorTheme === t.id && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white drop-shadow-md" strokeWidth={3} />
                </span>
              )}
              {colorTheme === t.id && (
                <span className="absolute -inset-[3px] rounded-full border-2 border-white/40" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={toggleTheme}
          className="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-text-secondary hover:bg-surfaceAlt hover:text-text transition-all duration-200 w-full"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={startTour}
          className="flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-text-secondary hover:bg-surfaceAlt hover:text-text w-full"
        >
          <Play className="h-5 w-5" />
          <span className="text-sm font-medium">Start Tour</span>
        </button>
      </div>

      {!isPremium && (
        <div className="p-3 border-t border-border">
          <Link
            href="/upgrade"
            className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-gradient-primary text-white font-semibold rounded-xl hover:shadow-glow-cyan transition-all duration-200"
          >
            <Crown className="h-5 w-5" />
            <span>{t('nav.upgrade')}</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
