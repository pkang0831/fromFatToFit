"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useCallback, useMemo, useState } from "react";

export interface TrendDatum {
  isoDate: string;
  calories: number;
  fat: number;
}

interface DailyTrendChartProps {
  data: TrendDatum[];
  extendedData: TrendDatum[];
  formatLabel: (isoDate: string) => string;
}

interface ChartGeometry {
  width: number;
  height: number;
  points: Array<{ x: number; y: number; datum: TrendDatum }>;
  path: string | null;
  yTicks: Array<{ value: number; y: number }>;
  xTicks: Array<{ label: string; x: number; visible: boolean }>;
  xAxisY: number;
  yAxisX: number;
  yExtent: { min: number; max: number };
}

const DEFAULT_DIMENSIONS = {
  width: 640,
  height: 240,
  margin: { top: 32, right: 32, bottom: 52, left: 72 }
};

const MODAL_DIMENSIONS = {
  width: 860,
  height: 360,
  margin: { top: 36, right: 36, bottom: 64, left: 80 }
};

function formatThousands(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const base = value / 1000;
    const formatted = Math.abs(base) >= 10 ? base.toFixed(0) : base.toFixed(1);
    return `${formatted}k`;
  }
  return Math.round(value).toLocaleString();
}

function computeGeometry(
  data: TrendDatum[],
  formatLabel: (isoDate: string) => string,
  dimensions = DEFAULT_DIMENSIONS
): ChartGeometry {
  const { width, height, margin } = dimensions;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  if (data.length === 0 || innerWidth <= 0 || innerHeight <= 0) {
    return {
      width,
      height,
      points: [],
      path: null,
      yTicks: [],
      xTicks: [],
      xAxisY: height - margin.bottom,
      yAxisX: margin.left,
      yExtent: { min: 0, max: 1 }
    };
  }

  const calorieValues = data.map((datum) => datum.calories);
  let yMin = Math.min(...calorieValues);
  let yMax = Math.max(...calorieValues);
  const range = yMax - yMin;
  const padding = range === 0 ? Math.max(80, yMax * 0.15 || 80) : Math.max(range * 0.2, 80);

  yMin = Math.max(0, yMin - padding);
  yMax += padding;

  if (yMax === yMin) {
    yMax = yMin + 1;
  }

  const points = data.map((datum, index) => {
    const x =
      data.length === 1
        ? margin.left + innerWidth / 2
        : margin.left + (index / (data.length - 1)) * innerWidth;
    const y = margin.top + (1 - (datum.calories - yMin) / (yMax - yMin)) * innerHeight;
    return { x, y, datum };
  });

  const path = points.length
    ? points
        .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
        .join(" ")
    : null;

  const tickCount = 4;
  const yTicks: ChartGeometry["yTicks"] = [];
  for (let i = 0; i <= tickCount; i += 1) {
    const value = yMin + ((yMax - yMin) * i) / tickCount;
    const y = margin.top + (1 - (value - yMin) / (yMax - yMin)) * innerHeight;
    yTicks.push({ value, y });
  }

  const tickEvery = Math.max(1, Math.ceil(data.length / 5));
  const xTicks: ChartGeometry["xTicks"] = data.map((datum, index) => ({
    label: formatLabel(datum.isoDate),
    x: points[index].x,
    visible: index % tickEvery === 0 || index === data.length - 1
  }));

  return {
    width,
    height,
    points,
    path,
    yTicks,
    xTicks,
    xAxisY: margin.top + innerHeight,
    yAxisX: margin.left,
    yExtent: { min: yMin, max: yMax }
  };
}

function Tooltip({ datum, label, style }: { datum: TrendDatum; label: string; style: CSSProperties }) {
  return (
    <div className="trend-chart__tooltip" style={style} role="presentation">
      <p className="trend-chart__tooltip-date">{label}</p>
      <strong>{datum.calories.toLocaleString()} kcal</strong>
      <span>Total fat: {datum.fat.toLocaleString(undefined, { maximumFractionDigits: 1 })} g</span>
    </div>
  );
}

interface ChartCanvasProps {
  geometry: ChartGeometry;
  hoverIndex: number | null;
  onHoverIndexChange: (index: number | null) => void;
  onClick?: () => void;
  ariaLabel: string;
  interactive?: boolean;
}

function ChartCanvas({
  geometry,
  hoverIndex,
  onHoverIndexChange,
  onClick,
  ariaLabel,
  interactive = true
}: ChartCanvasProps) {
  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!geometry.points.length) {
        return;
      }
      const bounds = event.currentTarget.getBoundingClientRect();
      const relativeX = ((event.clientX - bounds.left) / bounds.width) * geometry.width;
      let closestIndex = 0;
      let smallestDistance = Number.POSITIVE_INFINITY;
      geometry.points.forEach((point, index) => {
        const distance = Math.abs(point.x - relativeX);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          closestIndex = index;
        }
      });
      onHoverIndexChange(closestIndex);
    },
    [geometry.points, geometry.width, onHoverIndexChange]
  );

  const handlePointerLeave = useCallback(() => {
    onHoverIndexChange(null);
  }, [onHoverIndexChange]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const hoverPoint = hoverIndex != null ? geometry.points[hoverIndex] : undefined;
  const hoverLabel = hoverPoint ? geometry.xTicks[hoverIndex]?.label ?? "" : "";

  return (
    <div
      className={`trend-chart__canvas${interactive && onClick ? " trend-chart__canvas--interactive" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        preserveAspectRatio="none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        role="img"
        aria-hidden={false}
      >
        <title>{ariaLabel}</title>
        <desc>Daily calorie totals displayed as a line chart.</desc>
        <g className="trend-chart__grid">
          <line x1={geometry.yAxisX} y1={geometry.xAxisY} x2={geometry.width - 24} y2={geometry.xAxisY} className="trend-chart__axis" />
          <line x1={geometry.yAxisX} y1={24} x2={geometry.yAxisX} y2={geometry.xAxisY} className="trend-chart__axis" />
          {geometry.yTicks.map((tick, index) => (
            <g key={`y-${index}`}>
              <line
                x1={geometry.yAxisX}
                y1={tick.y}
                x2={geometry.width - 24}
                y2={tick.y}
                className="trend-chart__grid-line"
                aria-hidden="true"
              />
              <text x={geometry.yAxisX - 12} y={tick.y} textAnchor="end" alignmentBaseline="middle" className="trend-chart__axis-label">
                {formatThousands(tick.value)}
              </text>
            </g>
          ))}
          {geometry.xTicks.map((tick, index) => (
            <text
              key={`x-${index}`}
              x={tick.x}
              y={geometry.xAxisY + 28}
              textAnchor="middle"
              className={`trend-chart__axis-label trend-chart__axis-label--x${tick.visible ? "" : " trend-chart__axis-label--muted"}`}
            >
              {tick.label}
            </text>
          ))}
        </g>
        {geometry.path && (
          <path d={geometry.path} fill="none" stroke="#86a361" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {geometry.points.map((point, index) => (
          <circle
            key={point.datum.isoDate}
            cx={point.x}
            cy={point.y}
            r={hoverIndex === index ? 8 : 6}
            className="trend-chart__point"
          />
        ))}
      </svg>
      {hoverPoint && (
        <Tooltip
          datum={hoverPoint.datum}
          label={hoverLabel}
          style={{
            left: `${(hoverPoint.x / geometry.width) * 100}%`,
            top: `${(hoverPoint.y / geometry.height) * 100}%`
          }}
        />
      )}
      {onClick && <span className="trend-chart__hint">Click to enlarge</span>}
    </div>
  );
}

export default function DailyTrendChart({ data, extendedData, formatLabel }: DailyTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [modalHoverIndex, setModalHoverIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const geometry = useMemo(() => computeGeometry(data, formatLabel, DEFAULT_DIMENSIONS), [data, formatLabel]);
  const modalGeometry = useMemo(
    () => computeGeometry(extendedData, formatLabel, MODAL_DIMENSIONS),
    [extendedData, formatLabel]
  );

  const openModal = useCallback(() => {
    if (!geometry.points.length) {
      return;
    }
    setIsModalOpen(true);
  }, [geometry.points.length]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalHoverIndex(null);
  }, []);

  if (!geometry.points.length) {
    return <div className="trend-chart__empty">No calorie data available for the selected dates.</div>;
  }

  return (
    <div className="trend-chart">
      <ChartCanvas
        geometry={geometry}
        hoverIndex={hoverIndex}
        onHoverIndexChange={setHoverIndex}
        onClick={openModal}
        ariaLabel="Daily calorie trend chart showing the last selected days."
      />

      {isModalOpen && (
        <div className="trend-chart__modal" role="dialog" aria-modal="true" aria-label="Expanded daily calorie trend">
          <div className="trend-chart__modal-content">
            <header className="trend-chart__modal-header">
              <div>
                <h3>Daily calories • Last 14 days</h3>
                <p>Hover to inspect calories and total fat for each day.</p>
              </div>
              <button type="button" className="trend-chart__modal-close" onClick={closeModal}>
                Close
              </button>
            </header>
            {modalGeometry.points.length ? (
              <ChartCanvas
                geometry={modalGeometry}
                hoverIndex={modalHoverIndex}
                onHoverIndexChange={setModalHoverIndex}
                ariaLabel="Daily calorie trend for the last fourteen days"
                interactive={false}
              />
            ) : (
              <div className="trend-chart__empty trend-chart__empty--modal">
                Not enough entries to display the last fourteen days.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
