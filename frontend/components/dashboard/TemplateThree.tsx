"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardData, BodyFatAnalysis, BodyFatProjection, analyzeBodyFat, getBodyFatAnalyses, getBodyFatProjections } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// 이미지 URL 생성 헬퍼
function getImageUrl(imagePath: string): string {
  if (imagePath.startsWith("http")) {
    return imagePath;
  }
  // 정적 파일이 /uploads에 마운트되어 있으므로, /uploads/를 앞에 붙임
  // imagePath는 이미 "body_fat/{filename}" 형식이므로, "/uploads/" + imagePath
  if (imagePath.startsWith("/uploads/")) {
    return `${API_BASE_URL}${imagePath}`;
  }
  return `${API_BASE_URL}/uploads/${imagePath}`;
}

interface TemplateThreeProps {
  data: DashboardData;
  onRefresh: () => Promise<void> | void;
}

// Bell Curve 컴포넌트
function BellCurveChart({ percentile }: { percentile: number }) {
  const width = 600;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // 정규분포 곡선 생성
  const points = useMemo(() => {
    const data: Array<{ x: number; y: number }> = [];
    const mean = 50; // 평균 50%
    const stdDev = 15; // 표준편차 15%

    for (let i = 0; i <= 100; i += 1) {
      const x = i;
      const normalizedX = (x - mean) / stdDev;
      const y = Math.exp(-0.5 * normalizedX * normalizedX) / (stdDev * Math.sqrt(2 * Math.PI));
      data.push({ x, y });
    }

    // 정규화 (0-1 범위로)
    const maxY = Math.max(...data.map(d => d.y));
    return data.map(d => ({
      x: margin.left + (d.x / 100) * innerWidth,
      y: margin.top + innerHeight - (d.y / maxY) * innerHeight,
    }));
  }, [innerWidth, innerHeight, margin]);

  // 곡선 경로 생성
  const path = useMemo(() => {
    if (points.length === 0) return "";
    let pathStr = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathStr += ` L ${points[i].x} ${points[i].y}`;
    }
    return pathStr;
  }, [points]);

  // percentile 위치 계산
  const percentileX = margin.left + (percentile / 100) * innerWidth;

  return (
    <div style={{ padding: "24px", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
      <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "1.25rem", fontWeight: 600 }}>Body Fat Percentile</h3>
      <p style={{ marginBottom: "16px", color: "#666", fontSize: "0.875rem" }}>
        Your body fat percentage is in the <strong>{percentile.toFixed(1)}th percentile</strong> for your age and gender.
      </p>
      <svg width={width} height={height} style={{ display: "block", margin: "0 auto" }}>
        {/* 그리드 라인 */}
        {[0, 25, 50, 75, 100].map((p) => {
          const x = margin.left + (p / 100) * innerWidth;
          return (
            <g key={p}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + innerHeight}
                stroke="#e0e0e0"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
              <text
                x={x}
                y={margin.top + innerHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
              >
                {p}%
              </text>
            </g>
          );
        })}

        {/* Bell curve */}
        <path
          d={path}
          fill="none"
          stroke="#86a361"
          strokeWidth={3}
        />

        {/* Percentile marker */}
        <line
          x1={percentileX}
          y1={margin.top}
          x2={percentileX}
          y2={margin.top + innerHeight}
          stroke="#dc3545"
          strokeWidth={2}
          strokeDasharray="4,4"
        />
        <circle
          cx={percentileX}
          cy={margin.top + innerHeight / 2}
          r={6}
          fill="#dc3545"
        />
        <text
          x={percentileX}
          y={margin.top - 10}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="#dc3545"
        >
          You
        </text>

        {/* Y-axis label */}
        <text
          x={margin.left / 2}
          y={margin.top + innerHeight / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#666"
          transform={`rotate(-90 ${margin.left / 2} ${margin.top + innerHeight / 2})`}
        >
          Distribution
        </text>
      </svg>
    </div>
  );
}

export default function TemplateThree({ data, onRefresh }: TemplateThreeProps) {
  const [analyses, setAnalyses] = useState<BodyFatAnalysis[]>([]);
  const [projections, setProjections] = useState<BodyFatProjection[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<BodyFatAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 분석 기록 불러오기
  const loadAnalyses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBodyFatAnalyses();
      setAnalyses(data);
      if (data.length > 0 && !selectedAnalysis) {
        setSelectedAnalysis(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analyses");
    } finally {
      setIsLoading(false);
    }
  }, [selectedAnalysis]);

  // 초기 로드
  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  // 선택된 분석의 예상 이미지 불러오기
  useEffect(() => {
    if (selectedAnalysis?.id) {
      getBodyFatProjections(selectedAnalysis.id)
        .then(setProjections)
        .catch((err) => {
          console.error("Failed to load projections:", err);
        });
    }
  }, [selectedAnalysis]);

  // 이미지 업로드 및 분석
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 이미지 미리보기
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    setError(null);
    try {
      const analysis = await analyzeBodyFat(file);
      await loadAnalyses();
      setSelectedAnalysis(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setIsUploading(false);
      event.target.value = ""; // Reset input
    }
  }, [loadAnalyses]);

  const currentAnalysis = selectedAnalysis || analyses[0];

  return (
    <div className="template-three" style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>Body Fat Analysis</h1>
        <p style={{ color: "#666", fontSize: "1.1rem" }}>Upload your body photo to analyze body fat percentage</p>
      </header>

      {error && (
        <div style={{ padding: "12px", backgroundColor: "#fee", color: "#c00", borderRadius: "4px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* 이미지 업로드 섹션 */}
      <section style={{ marginBottom: "32px" }}>
        <div style={{ padding: "24px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "2px dashed #ddd" }}>
          <label style={{ display: "block", cursor: "pointer" }}>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleImageUpload}
              disabled={isUploading}
              style={{ display: "none" }}
            />
            <div style={{ textAlign: "center", padding: "32px" }}>
              {isUploading ? (
                <p>Analyzing image...</p>
              ) : (
                <>
                  <p style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "8px" }}>📸 Upload Body Photo</p>
                  <p style={{ color: "#666" }}>Click to select an image (JPG, PNG)</p>
                </>
              )}
            </div>
          </label>
        </div>

        {previewImage && (
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <img
              src={previewImage}
              alt="Preview"
              style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "8px", border: "1px solid #ddd" }}
            />
          </div>
        )}
      </section>

      {/* 현재 분석 결과 */}
      {currentAnalysis && (
        <section style={{ marginBottom: "32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
            <div style={{ padding: "24px", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "1.25rem", fontWeight: 600 }}>Current Analysis</h3>
              {currentAnalysis.image_path && (
                <img
                  src={getImageUrl(currentAnalysis.image_path)}
                  alt="Body analysis"
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "contain",
                    borderRadius: "4px",
                    marginBottom: "16px",
                    border: "1px solid #ddd",
                  }}
                />
              )}
              {currentAnalysis.body_fat_percentage !== null && (
                <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#86a361", marginBottom: "8px" }}>
                  {currentAnalysis.body_fat_percentage.toFixed(1)}%
                </div>
              )}
              <p style={{ color: "#666", margin: 0 }}>Body Fat Percentage</p>
              {currentAnalysis.percentile_rank !== null && (
                <p style={{ marginTop: "16px", color: "#666", fontSize: "0.875rem" }}>
                  Percentile Rank: {currentAnalysis.percentile_rank.toFixed(1)}th
                </p>
              )}
            </div>

            {currentAnalysis.percentile_rank !== null && (
              <BellCurveChart percentile={currentAnalysis.percentile_rank} />
            )}
          </div>
        </section>
      )}

      {/* 체지방률 감소 예상 이미지 */}
      {currentAnalysis && projections.length > 0 && (
        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "16px" }}>Body Fat Reduction Projections</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
            {projections.map((projection) => (
              <div
                key={projection.reduction_percentage}
                style={{
                  padding: "16px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  textAlign: "center",
                }}
              >
                <h4 style={{ marginTop: 0, marginBottom: "8px", fontSize: "1.1rem", fontWeight: 600 }}>
                  -{projection.reduction_percentage}% Body Fat
                </h4>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#86a361", marginBottom: "8px" }}>
                  {projection.projected_body_fat.toFixed(1)}%
                </div>
                <p style={{ color: "#666", fontSize: "0.875rem", margin: 0 }}>
                  Projected Body Fat
                </p>
                {projection.projected_image_path ? (
                  <img
                    src={getImageUrl(projection.projected_image_path)}
                    alt={`Projection -${projection.reduction_percentage}%`}
                    style={{
                      width: "100%",
                      marginTop: "16px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "3/4",
                      marginTop: "16px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                    }}
                  >
                    AI Image Generation Coming Soon
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 분석 기록 목록 */}
      {analyses.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "16px" }}>Analysis History</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                onClick={() => setSelectedAnalysis(analysis)}
                style={{
                  padding: "16px",
                  backgroundColor: selectedAnalysis?.id === analysis.id ? "#f0f7ed" : "white",
                  borderRadius: "8px",
                  border: `2px solid ${selectedAnalysis?.id === analysis.id ? "#86a361" : "#e0e0e0"}`,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "4px" }}>
                    {new Date(analysis.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  {analysis.body_fat_percentage !== null && (
                    <div style={{ color: "#666", fontSize: "0.875rem" }}>
                      Body Fat: {analysis.body_fat_percentage.toFixed(1)}%
                      {analysis.percentile_rank !== null && (
                        <> • Percentile: {analysis.percentile_rank.toFixed(1)}th</>
                      )}
                    </div>
                  )}
                </div>
                {selectedAnalysis?.id === analysis.id && (
                  <span style={{ color: "#86a361", fontWeight: 600 }}>Selected</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
