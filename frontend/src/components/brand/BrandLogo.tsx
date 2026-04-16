import Image from 'next/image';

import { cn } from '@/lib/utils/cn';

interface BrandLogoProps {
  className?: string;
  labelClassName?: string;
  priority?: boolean;
  showLabel?: boolean;
  size?: number;
}

export function BrandLogo({
  className,
  labelClassName,
  priority = false,
  showLabel = true,
  size = 40,
}: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <span
        className="relative shrink-0 overflow-hidden rounded-[18px] bg-white/95 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/5 dark:ring-white/10"
        style={{ height: size, width: size }}
      >
        <Image
          src="/brand/devenira-logo.png"
          alt="Devenira logo"
          fill
          priority={priority}
          sizes={`${size}px`}
          className="object-cover"
        />
      </span>
      {showLabel && (
        <span
          className={cn(
            'text-base font-semibold tracking-[-0.03em] text-inherit',
            labelClassName,
          )}
        >
          Devenira
        </span>
      )}
    </span>
  );
}
