"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { type CSSProperties, type PointerEvent } from "react";

interface ProjectionDatum {
  day: number;
  date: string;
  cumulativeFatLossKg: number;
}

interface FatLossProjectionChartProps {
  dailyFatLossG: number; // 오늘의 지방 감량 (g)
}

interface ChartGeometry {
  width: number;
  height: number;
  points: Array<{ x: number; y: number; datum: ProjectionDatum }>;
  path: string | null;
  yTicks: Array<{ value: number; y: number }>;
  xTicks: Array<{ label: string; x: number; visible: boolean }>;
  xAxisY: number;
  yAxisX: number;
  yExtent: { min: number; max: number };
}

const DIMENSIONS = {
  width: 640,
  height: 240,
  margin: { top: 32, right: 32, bottom: 52, left: 72 }
};

function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

function computeGeometry(data: ProjectionDatum[]): ChartGeometry {
  const { width, height, margin } = DIMENSIONS;
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

  const values = data.map((datum) => datum.cumulativeFatLossKg);
  let yMin = Math.min(...values);
  let yMax = Math.max(...values);
  const range = yMax - yMin;
  const padding = range === 0 ? Math.max(0.1, yMax * 0.15 || 0.1) : Math.max(range * 0.2, 0.1);

  yMin = Math.max(0, yMin - padding);
  yMax += padding;

  if (yMax === yMin) {
    yMax = yMin + 0.1;
  }

  const points = data.map((datum, index) => {
    const x =
      data.length === 1
        ? margin.left + innerWidth / 2
        : margin.left + (index / (data.length - 1)) * innerWidth;
    const y = margin.top + (1 - (datum.cumulativeFatLossKg - yMin) / (yMax - yMin)) * innerHeight;
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

  const tickEvery = 4; // 4일 간격으로 표시
  const xTicks: ChartGeometry["xTicks"] = data.map((datum, index) => ({
    label: datum.day === 0 ? "Today" : `Day ${datum.day}`,
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

function Tooltip({ datum, style }: { datum: ProjectionDatum; style: CSSProperties }) {
  return (
    <div className="trend-chart__tooltip" style={style} role="presentation">
      <p className="trend-chart__tooltip-date">{datum.day === 0 ? "Today" : `Day ${datum.day}`}</p>
      <strong>{formatNumber(datum.cumulativeFatLossKg, 2)} kg</strong>
      <span>Projected fat loss</span>
    </div>
  );
}

export default function FatLossProjectionChart({ dailyFatLossG }: FatLossProjectionChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 30일간의 예상 지방 감량 데이터 생성 (곡선 형태)
  const projectionData = useMemo<ProjectionDatum[]>(() => {
    const data: ProjectionDatum[] = [];
    const today = new Date();
    
    // 총 30일 후 목표 지방 감량 (kg)
    const totalTargetKg = (dailyFatLossG * 30) / 1000;
    
    for (let day = 0; day <= 30; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      
      // 지수 감쇠 곡선을 사용하여 현실적인 체중 감량 곡선 생성
      // 초기에는 빠르게 감량하고, 점점 느려지는 패턴
      // decay 값이 클수록 초기 감량이 빠름
      const decay = 2.5; // 감쇠 계수 (조정 가능)
      const progress = day / 30;
      
      // 지수 감쇠 곡선: 초기 빠른 감량, 후기 느린 감량
      // 정규화하여 30일 후 정확히 목표 값에 도달하도록 함
      const curveFactor = (1 - Math.exp(-decay * progress)) / (1 - Math.exp(-decay));
      const cumulativeFatLossKg = totalTargetKg * curveFactor;
      
      data.push({
        day,
        date: date.toISOString().split("T")[0],
        cumulativeFatLossKg
      });
    }
    
    return data;
  }, [dailyFatLossG]);

  const geometry = useMemo(() => computeGeometry(projectionData), [projectionData]);

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
      setHoverIndex(closestIndex);
    },
    [geometry.points, geometry.width]
  );

  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const totalFatLossKg = useMemo(() => {
    return (dailyFatLossG * 30) / 1000;
  }, [dailyFatLossG]);

  if (dailyFatLossG <= 0) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
        No fat loss projection available. Maintain a calorie deficit to see your projected fat loss.
      </div>
    );
  }

  const hoverPoint = hoverIndex != null ? geometry.points[hoverIndex] : undefined;

  return (
    <div className="trend-chart">
      <div style={{ marginBottom: "16px", padding: "0 8px" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#333", marginBottom: "4px" }}>
          30-Day Fat Loss Projection
        </h3>
        <p style={{ fontSize: "0.75rem", color: "#666", margin: 0 }}>
          If you maintain today's pace ({formatNumber(dailyFatLossG, 1)} g/day), you could lose{" "}
          <strong style={{ color: "#2e7d32" }}>{formatNumber(totalFatLossKg, 2)} kg</strong> in 30 days.
        </p>
      </div>
      <div
        className="trend-chart__canvas"
        role="img"
        aria-label="30-day fat loss projection chart"
      >
        <svg
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          preserveAspectRatio="none"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          role="img"
          aria-hidden={false}
        >
          <title>30-day fat loss projection</title>
          <desc>Projected cumulative fat loss over 30 days if current daily fat loss is maintained.</desc>
          <g className="trend-chart__grid">
            <line
              x1={geometry.yAxisX}
              y1={geometry.xAxisY}
              x2={geometry.width - 24}
              y2={geometry.xAxisY}
              className="trend-chart__axis"
            />
            <line
              x1={geometry.yAxisX}
              y1={24}
              x2={geometry.yAxisX}
              y2={geometry.xAxisY}
              className="trend-chart__axis"
            />
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
                <text
                  x={geometry.yAxisX - 12}
                  y={tick.y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="trend-chart__axis-label"
                >
                  {formatNumber(tick.value, 2)} kg
                </text>
              </g>
            ))}
            {geometry.xTicks
              .filter((tick) => tick.visible)
              .map((tick, index) => (
                <text
                  key={`x-${index}`}
                  x={tick.x}
                  y={geometry.xAxisY + 28}
                  textAnchor="middle"
                  className="trend-chart__axis-label trend-chart__axis-label--x"
                >
                  {tick.label}
                </text>
              ))}
          </g>
          {geometry.path && (
            <path
              d={geometry.path}
              fill="none"
              stroke="#2e7d32"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {geometry.points.map((point, index) => (
            <circle
              key={point.datum.date}
              cx={point.x}
              cy={point.y}
              r={hoverIndex === index ? 8 : 6}
              className="trend-chart__point"
              fill="#2e7d32"
            />
          ))}
        </svg>
        {hoverPoint && (
          <Tooltip
            datum={hoverPoint.datum}
            style={{
              left: `${(hoverPoint.x / geometry.width) * 100}%`,
              top: `${(hoverPoint.y / geometry.height) * 100}%`
            }}
          />
        )}
      </div>
    </div>
  );
}

