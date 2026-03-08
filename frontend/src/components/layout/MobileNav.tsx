'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  Home,
  Utensils,
  Dumbbell,
  TrendingUp,
  MoreHorizontal,
  Camera,
  Timer,
  Scan,
  MessageCircle,
  User,
  X,
} from 'lucide-react';

const mainItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/body-scan', label: 'Body Scan', icon: Scan },
  { href: '/chat', label: 'AI Coach', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
];

const moreItems = [
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/calories', label: 'Calories', icon: Utensils },
  { href: '/food-camera', label: 'Food Camera', icon: Camera },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/fasting', label: 'Fasting', icon: Timer },
];

export function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreItems.some((item) => pathname === item.href);

  return (
    <>
      {showMore && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowMore(false)} />
      )}

      {showMore && (
        <div className="lg:hidden fixed bottom-[4.5rem] left-4 right-4 bg-surface border border-border rounded-2xl shadow-xl z-50 p-3">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-sm font-semibold text-text">Extras</span>
            <button onClick={() => setShowMore(false)} className="p-1 rounded-lg hover:bg-surfaceAlt">
              <X className="h-4 w-4 text-text-light" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {moreItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    'flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-surfaceAlt hover:text-text'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs mt-1.5 text-center leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-xl border-t border-border z-50">
        <div className="flex items-center justify-around">
          {mainItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center px-4 py-3 min-w-[4rem] transition-all duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-text-light hover:text-text'
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              'flex flex-col items-center justify-center px-4 py-3 min-w-[4rem] transition-all duration-200',
              isMoreActive || showMore
                ? 'text-primary'
                : 'text-text-light hover:text-text'
            )}
          >
            <MoreHorizontal className="h-6 w-6" />
            <span className="text-xs mt-1">Extras</span>
          </button>
        </div>
      </nav>
    </>
  );
}
