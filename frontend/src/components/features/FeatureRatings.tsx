'use client';

interface FeatureRatingsProps {
  scores: {
    eyebrows: number;
    eyes: number;
    lips: number;
    nose: number;
    skin?: number;
    symmetry?: number;
    overall?: number;
  } | null;
}

function RatingBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 10) * 100;
  const getColor = (s: number) => {
    if (s >= 8) return 'bg-emerald-400';
    if (s >= 6) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-secondary w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-sm font-bold font-number w-8 text-right ${
        score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-amber-400' : 'text-rose-400'
      }`}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export function FeatureRatings({ scores }: FeatureRatingsProps) {
  if (!scores) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
      <h4 className="text-sm font-semibold text-text mb-3">Feature Ratings</h4>
      <RatingBar label="Eyebrows" score={scores.eyebrows} />
      <RatingBar label="Eyes" score={scores.eyes} />
      <RatingBar label="Lips" score={scores.lips} />
      <RatingBar label="Nose" score={scores.nose} />
      {scores.skin != null && <RatingBar label="Skin" score={scores.skin} />}
      {scores.symmetry != null && <RatingBar label="Symmetry" score={scores.symmetry} />}
    </div>
  );
}
