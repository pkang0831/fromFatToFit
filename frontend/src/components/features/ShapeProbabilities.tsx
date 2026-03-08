'use client';

interface ShapeProbabilitiesProps {
  probabilities: Array<{ shape: string; probability: number }>;
}

export function ShapeProbabilities({ probabilities }: ShapeProbabilitiesProps) {
  const maxProb = Math.max(...probabilities.map((p) => p.probability), 1);

  return (
    <div className="space-y-2.5">
      <h4 className="text-sm font-semibold text-primary mb-3">All Shape Probabilities</h4>
      {probabilities.map((p) => (
        <div key={p.shape} className="flex items-center gap-3">
          <span className="text-sm text-text-secondary w-24 flex-shrink-0">{p.shape}</span>
          <div className="flex-1 h-3 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${(p.probability / maxProb) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold text-text font-number w-10 text-right">
            {p.probability}%
          </span>
        </div>
      ))}
    </div>
  );
}
