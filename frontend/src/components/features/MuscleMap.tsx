'use client';

import React, { useMemo, useState, useEffect } from 'react';

interface MuscleMapProps {
  activeMuscles: string[];
  className?: string;
}

const MUSCLE_ALIASES: Record<string, string[]> = {
  quadriceps: ['quadriceps', 'quads', 'quad'],
  hamstrings: ['hamstrings', 'hamstring', 'hams'],
  glutes: ['glutes', 'gluteus', 'gluteals', 'glute'],
  calves: ['calves', 'calf', 'gastrocnemius', 'soleus'],
  chest: ['chest', 'pectorals', 'pecs', 'pec'],
  shoulders: ['shoulders', 'deltoids', 'delts', 'anterior deltoid', 'lateral deltoid', 'posterior deltoid'],
  biceps: ['biceps', 'bicep'],
  triceps: ['triceps', 'tricep'],
  forearms: ['forearms', 'forearm', 'wrist flexors', 'wrist extensors'],
  abs: ['abs', 'abdominals', 'core', 'rectus abdominis', 'abdominal'],
  obliques: ['obliques', 'oblique', 'external obliques', 'internal obliques'],
  lats: ['lats', 'latissimus dorsi', 'latissimus'],
  traps: ['traps', 'trapezius', 'trap'],
  lower_back: ['lower back', 'erector spinae', 'spinal erectors', 'lumbar'],
  upper_back: ['upper back', 'rhomboids', 'rear delts', 'back'],
  hip_flexors: ['hip flexors', 'hip', 'hips', 'iliopsoas'],
  adductors: ['adductors', 'adductor', 'inner thigh', 'inner thighs'],
  tibialis: ['tibialis', 'tibialis anterior', 'shin', 'shins'],
};

function normalizeMuscleName(name: string): string[] {
  const lower = name.toLowerCase().trim();
  const matched: string[] = [];
  for (const [key, aliases] of Object.entries(MUSCLE_ALIASES)) {
    if (aliases.some(a => lower.includes(a) || a.includes(lower))) {
      matched.push(key);
    }
  }
  return matched.length > 0 ? matched : [lower];
}

const INACTIVE_COLOR = '#334155';
const INACTIVE_STROKE = '#475569';

function useThemeMuscleColors() {
  const [colors, setColors] = useState({ primary: '#06b6d4', glow: '#22d3ee' });
  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    setColors({
      primary: s.getPropertyValue('--color-primary-hex').trim() || '#06b6d4',
      glow: s.getPropertyValue('--color-primary-light-hex').trim() || '#22d3ee',
    });
  }, []);
  return colors;
}

function FrontBody({ active, primaryColor, glowColor }: { active: Set<string>; primaryColor: string; glowColor: string }) {
  const mc = (muscle: string) => active.has(muscle) ? primaryColor : INACTIVE_COLOR;
  const sc = (muscle: string) => active.has(muscle) ? glowColor : INACTIVE_STROKE;
  const isActive = (muscle: string) => active.has(muscle);

  return (
    <svg viewBox="0 0 200 420" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Head */}
      <ellipse cx="100" cy="32" rx="22" ry="28" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />

      {/* Neck */}
      <rect x="90" y="58" width="20" height="16" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />

      {/* Shoulders / Deltoids */}
      <ellipse cx="58" cy="88" rx="18" ry="14" fill={mc('shoulders')} stroke={sc('shoulders')} strokeWidth="1.2"
        filter={isActive('shoulders') ? 'url(#glow)' : undefined} opacity={isActive('shoulders') ? 1 : 0.6} />
      <ellipse cx="142" cy="88" rx="18" ry="14" fill={mc('shoulders')} stroke={sc('shoulders')} strokeWidth="1.2"
        filter={isActive('shoulders') ? 'url(#glow)' : undefined} opacity={isActive('shoulders') ? 1 : 0.6} />

      {/* Chest / Pectorals */}
      <path d="M68,82 Q80,78 100,82 Q120,78 132,82 L132,112 Q115,120 100,118 Q85,120 68,112 Z"
        fill={mc('chest')} stroke={sc('chest')} strokeWidth="1.2"
        filter={isActive('chest') ? 'url(#glow)' : undefined} opacity={isActive('chest') ? 1 : 0.6} />

      {/* Biceps */}
      <path d="M42,92 Q36,110 38,134 Q42,138 50,134 Q52,110 48,92 Z"
        fill={mc('biceps')} stroke={sc('biceps')} strokeWidth="1"
        filter={isActive('biceps') ? 'url(#glow)' : undefined} opacity={isActive('biceps') ? 1 : 0.6} />
      <path d="M158,92 Q164,110 162,134 Q158,138 150,134 Q148,110 152,92 Z"
        fill={mc('biceps')} stroke={sc('biceps')} strokeWidth="1"
        filter={isActive('biceps') ? 'url(#glow)' : undefined} opacity={isActive('biceps') ? 1 : 0.6} />

      {/* Forearms */}
      <path d="M36,136 Q32,160 30,186 Q34,190 40,186 Q44,160 44,136 Z"
        fill={mc('forearms')} stroke={sc('forearms')} strokeWidth="1"
        filter={isActive('forearms') ? 'url(#glow)' : undefined} opacity={isActive('forearms') ? 1 : 0.6} />
      <path d="M164,136 Q168,160 170,186 Q166,190 160,186 Q156,160 156,136 Z"
        fill={mc('forearms')} stroke={sc('forearms')} strokeWidth="1"
        filter={isActive('forearms') ? 'url(#glow)' : undefined} opacity={isActive('forearms') ? 1 : 0.6} />

      {/* Abs */}
      <path d="M80,118 L120,118 L118,196 Q100,200 82,196 Z"
        fill={mc('abs')} stroke={sc('abs')} strokeWidth="1.2"
        filter={isActive('abs') ? 'url(#glow)' : undefined} opacity={isActive('abs') ? 1 : 0.6} />
      {/* Ab lines */}
      <line x1="100" y1="120" x2="100" y2="194" stroke={sc('abs')} strokeWidth="0.6" opacity="0.5" />
      <line x1="82" y1="138" x2="118" y2="138" stroke={sc('abs')} strokeWidth="0.5" opacity="0.4" />
      <line x1="82" y1="156" x2="118" y2="156" stroke={sc('abs')} strokeWidth="0.5" opacity="0.4" />
      <line x1="82" y1="174" x2="118" y2="174" stroke={sc('abs')} strokeWidth="0.5" opacity="0.4" />

      {/* Obliques */}
      <path d="M68,114 L80,118 L82,196 Q72,200 66,190 Q62,160 64,130 Z"
        fill={mc('obliques')} stroke={sc('obliques')} strokeWidth="1"
        filter={isActive('obliques') ? 'url(#glow)' : undefined} opacity={isActive('obliques') ? 1 : 0.5} />
      <path d="M132,114 L120,118 L118,196 Q128,200 134,190 Q138,160 136,130 Z"
        fill={mc('obliques')} stroke={sc('obliques')} strokeWidth="1"
        filter={isActive('obliques') ? 'url(#glow)' : undefined} opacity={isActive('obliques') ? 1 : 0.5} />

      {/* Hip Flexors */}
      <path d="M78,196 Q86,208 88,218 L78,218 Q72,210 74,198 Z"
        fill={mc('hip_flexors')} stroke={sc('hip_flexors')} strokeWidth="0.8"
        opacity={isActive('hip_flexors') ? 1 : 0.4} />
      <path d="M122,196 Q114,208 112,218 L122,218 Q128,210 126,198 Z"
        fill={mc('hip_flexors')} stroke={sc('hip_flexors')} strokeWidth="0.8"
        opacity={isActive('hip_flexors') ? 1 : 0.4} />

      {/* Quadriceps */}
      <path d="M72,218 L92,218 Q94,270 92,310 L80,314 Q70,280 68,240 Z"
        fill={mc('quadriceps')} stroke={sc('quadriceps')} strokeWidth="1.2"
        filter={isActive('quadriceps') ? 'url(#glow)' : undefined} opacity={isActive('quadriceps') ? 1 : 0.6} />
      <path d="M128,218 L108,218 Q106,270 108,310 L120,314 Q130,280 132,240 Z"
        fill={mc('quadriceps')} stroke={sc('quadriceps')} strokeWidth="1.2"
        filter={isActive('quadriceps') ? 'url(#glow)' : undefined} opacity={isActive('quadriceps') ? 1 : 0.6} />

      {/* Adductors (inner thigh) */}
      <path d="M92,220 L100,220 L100,280 Q96,282 92,278 Z"
        fill={mc('adductors')} stroke={sc('adductors')} strokeWidth="0.8"
        opacity={isActive('adductors') ? 1 : 0.4} />
      <path d="M108,220 L100,220 L100,280 Q104,282 108,278 Z"
        fill={mc('adductors')} stroke={sc('adductors')} strokeWidth="0.8"
        opacity={isActive('adductors') ? 1 : 0.4} />

      {/* Tibialis / Shins */}
      <path d="M76,318 L88,316 Q90,350 88,384 L78,388 Q74,360 74,332 Z"
        fill={mc('tibialis')} stroke={sc('tibialis')} strokeWidth="1"
        filter={isActive('tibialis') ? 'url(#glow)' : undefined} opacity={isActive('tibialis') ? 1 : 0.5} />
      <path d="M124,318 L112,316 Q110,350 112,384 L122,388 Q126,360 126,332 Z"
        fill={mc('tibialis')} stroke={sc('tibialis')} strokeWidth="1"
        filter={isActive('tibialis') ? 'url(#glow)' : undefined} opacity={isActive('tibialis') ? 1 : 0.5} />

      {/* Feet */}
      <ellipse cx="82" cy="398" rx="14" ry="6" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
      <ellipse cx="118" cy="398" rx="14" ry="6" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />

      {/* Hands */}
      <ellipse cx="32" cy="196" rx="8" ry="12" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
      <ellipse cx="168" cy="196" rx="8" ry="12" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />

      {/* Label */}
      <text x="100" y="416" textAnchor="middle" className="text-[10px] fill-current opacity-50" fontFamily="sans-serif">FRONT</text>
    </svg>
  );
}

function BackBody({ active, primaryColor, glowColor }: { active: Set<string>; primaryColor: string; glowColor: string }) {
  const mc = (muscle: string) => active.has(muscle) ? primaryColor : INACTIVE_COLOR;
  const sc = (muscle: string) => active.has(muscle) ? glowColor : INACTIVE_STROKE;
  const isActive = (muscle: string) => active.has(muscle);

  return (
    <svg viewBox="0 0 200 420" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Head */}
      <ellipse cx="100" cy="32" rx="22" ry="28" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />

      {/* Neck */}
      <rect x="90" y="58" width="20" height="16" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />

      {/* Traps */}
      <path d="M78,68 L100,74 L122,68 L130,82 Q115,78 100,80 Q85,78 70,82 Z"
        fill={mc('traps')} stroke={sc('traps')} strokeWidth="1.2"
        filter={isActive('traps') ? 'url(#glow2)' : undefined} opacity={isActive('traps') ? 1 : 0.6} />

      {/* Rear Deltoids */}
      <ellipse cx="58" cy="88" rx="18" ry="14" fill={mc('shoulders')} stroke={sc('shoulders')} strokeWidth="1.2"
        filter={isActive('shoulders') ? 'url(#glow2)' : undefined} opacity={isActive('shoulders') ? 1 : 0.6} />
      <ellipse cx="142" cy="88" rx="18" ry="14" fill={mc('shoulders')} stroke={sc('shoulders')} strokeWidth="1.2"
        filter={isActive('shoulders') ? 'url(#glow2)' : undefined} opacity={isActive('shoulders') ? 1 : 0.6} />

      {/* Upper Back / Lats */}
      <path d="M68,82 Q84,78 100,80 Q116,78 132,82 L132,140 Q116,148 100,146 Q84,148 68,140 Z"
        fill={mc('lats')} stroke={sc('lats')} strokeWidth="1.2"
        filter={isActive('lats') ? 'url(#glow2)' : undefined} opacity={isActive('lats') ? 1 : 0.6} />
      {/* Back detail - spine line */}
      <line x1="100" y1="82" x2="100" y2="196" stroke={sc('lats')} strokeWidth="0.7" opacity="0.4" />

      {/* Triceps */}
      <path d="M42,92 Q36,110 38,134 Q42,138 50,134 Q52,110 48,92 Z"
        fill={mc('triceps')} stroke={sc('triceps')} strokeWidth="1"
        filter={isActive('triceps') ? 'url(#glow2)' : undefined} opacity={isActive('triceps') ? 1 : 0.6} />
      <path d="M158,92 Q164,110 162,134 Q158,138 150,134 Q148,110 152,92 Z"
        fill={mc('triceps')} stroke={sc('triceps')} strokeWidth="1"
        filter={isActive('triceps') ? 'url(#glow2)' : undefined} opacity={isActive('triceps') ? 1 : 0.6} />

      {/* Forearms */}
      <path d="M36,136 Q32,160 30,186 Q34,190 40,186 Q44,160 44,136 Z"
        fill={mc('forearms')} stroke={sc('forearms')} strokeWidth="1"
        filter={isActive('forearms') ? 'url(#glow2)' : undefined} opacity={isActive('forearms') ? 1 : 0.5} />
      <path d="M164,136 Q168,160 170,186 Q166,190 160,186 Q156,160 156,136 Z"
        fill={mc('forearms')} stroke={sc('forearms')} strokeWidth="1"
        filter={isActive('forearms') ? 'url(#glow2)' : undefined} opacity={isActive('forearms') ? 1 : 0.5} />

      {/* Lower Back / Erector Spinae */}
      <path d="M76,142 L124,142 L122,200 Q100,206 78,200 Z"
        fill={mc('lower_back')} stroke={sc('lower_back')} strokeWidth="1.2"
        filter={isActive('lower_back') ? 'url(#glow2)' : undefined} opacity={isActive('lower_back') ? 1 : 0.6} />

      {/* Glutes */}
      <path d="M72,200 L100,206 L100,236 Q88,240 74,234 Q68,220 70,204 Z"
        fill={mc('glutes')} stroke={sc('glutes')} strokeWidth="1.2"
        filter={isActive('glutes') ? 'url(#glow2)' : undefined} opacity={isActive('glutes') ? 1 : 0.7} />
      <path d="M128,200 L100,206 L100,236 Q112,240 126,234 Q132,220 130,204 Z"
        fill={mc('glutes')} stroke={sc('glutes')} strokeWidth="1.2"
        filter={isActive('glutes') ? 'url(#glow2)' : undefined} opacity={isActive('glutes') ? 1 : 0.7} />

      {/* Hamstrings */}
      <path d="M72,240 L92,238 Q94,280 90,316 L78,318 Q70,290 68,258 Z"
        fill={mc('hamstrings')} stroke={sc('hamstrings')} strokeWidth="1.2"
        filter={isActive('hamstrings') ? 'url(#glow2)' : undefined} opacity={isActive('hamstrings') ? 1 : 0.6} />
      <path d="M128,240 L108,238 Q106,280 110,316 L122,318 Q130,290 132,258 Z"
        fill={mc('hamstrings')} stroke={sc('hamstrings')} strokeWidth="1.2"
        filter={isActive('hamstrings') ? 'url(#glow2)' : undefined} opacity={isActive('hamstrings') ? 1 : 0.6} />

      {/* Calves */}
      <path d="M74,322 L90,318 Q92,350 90,384 L78,388 Q72,360 72,340 Z"
        fill={mc('calves')} stroke={sc('calves')} strokeWidth="1.2"
        filter={isActive('calves') ? 'url(#glow2)' : undefined} opacity={isActive('calves') ? 1 : 0.6} />
      <path d="M126,322 L110,318 Q108,350 110,384 L122,388 Q128,360 128,340 Z"
        fill={mc('calves')} stroke={sc('calves')} strokeWidth="1.2"
        filter={isActive('calves') ? 'url(#glow2)' : undefined} opacity={isActive('calves') ? 1 : 0.6} />

      {/* Feet */}
      <ellipse cx="82" cy="398" rx="14" ry="6" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
      <ellipse cx="118" cy="398" rx="14" ry="6" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />

      {/* Hands */}
      <ellipse cx="32" cy="196" rx="8" ry="12" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
      <ellipse cx="168" cy="196" rx="8" ry="12" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />

      {/* Label */}
      <text x="100" y="416" textAnchor="middle" className="text-[10px] fill-current opacity-50" fontFamily="sans-serif">BACK</text>
    </svg>
  );
}

export function MuscleMap({ activeMuscles, className = '' }: MuscleMapProps) {
  const { primary: primaryColor, glow: glowColor } = useThemeMuscleColors();
  const activeSet = useMemo(() => {
    const set = new Set<string>();
    for (const muscle of activeMuscles) {
      const normalized = normalizeMuscleName(muscle);
      normalized.forEach(m => set.add(m));
    }
    return set;
  }, [activeMuscles]);

  const activeList = useMemo(() => {
    return Array.from(activeSet).map(m => {
      const displayName = m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return displayName;
    });
  }, [activeSet]);

  return (
    <div className={`${className}`}>
      <div className="flex gap-2 justify-center">
        <div className="w-1/2 max-w-[160px]">
          <FrontBody active={activeSet} primaryColor={primaryColor} glowColor={glowColor} />
        </div>
        <div className="w-1/2 max-w-[160px]">
          <BackBody active={activeSet} primaryColor={primaryColor} glowColor={glowColor} />
        </div>
      </div>
      {activeList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mt-3">
          {activeList.map(name => (
            <span key={name} className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
