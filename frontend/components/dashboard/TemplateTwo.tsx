"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardData, WorkoutLog, WorkoutLogInput, Exercise, createWorkout, deleteWorkout, getWorkouts, searchExercises, calculateExerciseCalories } from "@/lib/api";

interface TemplateTwoProps {
  data: DashboardData;
  onRefresh: () => Promise<void> | void;
}

// 달력 관련 타입 및 함수
interface CalendarDay {
  day: number;
  isToday: boolean;
  isoDate?: string;
}

function getDateKeyFromDate(date: Date): string {
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD 형식
}

function normalizeDateString(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    return dateMatch[0];
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return getDateKeyFromDate(date);
}

function buildCalendar(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return { monthLabel: "This Month", weeks: [] as Array<Array<CalendarDay>> };
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const monthLabel = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayKey = getDateKeyFromDate(today);

  const weeks: Array<Array<CalendarDay>> = [];
  let currentWeek: Array<CalendarDay> = [];

  for (let i = 0; i < firstDay; i += 1) {
    currentWeek.push({ day: 0, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(year, month, day);
    const cellDateKey = getDateKeyFromDate(cellDate);
    currentWeek.push({
      day,
      isToday: cellDateKey === todayKey,
      isoDate: cellDateKey
    });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ day: 0, isToday: false });
    }
    weeks.push(currentWeek);
  }

  return { monthLabel, weeks };
}

export default function TemplateTwo({ data, onRefresh }: TemplateTwoProps) {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return getDateKeyFromDate(today);
  });

  // 운동 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 폼 상태
  const [formData, setFormData] = useState<WorkoutLogInput>({
    date: selectedDate,
    activity_type: "",
    duration_minutes: null,
    calories_burned: null,
    distance_km: null,
    notes: null,
  });
  const [calculatedCalories, setCalculatedCalories] = useState<number | null>(null);

  // selectedDate 변경 시 폼 날짜 업데이트
  useEffect(() => {
    setFormData((prev) => ({ ...prev, date: selectedDate }));
  }, [selectedDate]);

  // 운동 로그 불러오기
  const loadWorkouts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWorkouts();
      setWorkouts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workouts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  // 운동 검색
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const results = await searchExercises(query, 10);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Error searching exercises:", err);
      setSuggestions([]);
    }
  }, []);

  // 운동 선택
  const handleSelectExercise = useCallback((exercise: Exercise) => {
    setSelectedExercise(exercise);
    setFormData((prev) => ({
      ...prev,
      activity_type: exercise.full_name,
    }));
    setSearchQuery(exercise.full_name);
    setShowSuggestions(false);
    setCalculatedCalories(null);
  }, []);

  // 칼로리 자동 계산
  const handleCalculateCalories = useCallback(async () => {
    if (!selectedExercise || !formData.duration_minutes || formData.duration_minutes <= 0) {
      setCalculatedCalories(null);
      return;
    }

    try {
      const userWeight = data.user.weight_kg || 70;
      const result = await calculateExerciseCalories(
        selectedExercise.exercise_name,
        formData.duration_minutes,
        userWeight,
        selectedExercise.category
      );
      setCalculatedCalories(result.calories_burned);
      setFormData((prev) => ({
        ...prev,
        calories_burned: result.calories_burned,
      }));
    } catch (err) {
      console.error("Error calculating calories:", err);
      setCalculatedCalories(null);
    }
  }, [selectedExercise, formData.duration_minutes, data.user.weight_kg]);

  // 시간 입력 시 칼로리 자동 계산
  useEffect(() => {
    if (selectedExercise && formData.duration_minutes && formData.duration_minutes > 0) {
      handleCalculateCalories();
    } else {
      setCalculatedCalories(null);
    }
  }, [selectedExercise, formData.duration_minutes, handleCalculateCalories]);

  // 외부 클릭 시 제안 목록 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 운동 로그 추가
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!formData.activity_type) {
        setError("Activity type is required");
        return;
      }

      setError(null);
      setIsLoading(true);
      try {
        await createWorkout(formData);
        await loadWorkouts();
        // 폼 초기화 (날짜는 유지)
        setFormData({
          date: selectedDate,
          activity_type: "",
          duration_minutes: null,
          calories_burned: null,
          distance_km: null,
          notes: null,
        });
        setSelectedExercise(null);
        setSearchQuery("");
        setCalculatedCalories(null);
        setIsFormOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create workout");
      } finally {
        setIsLoading(false);
      }
    },
    [formData, loadWorkouts, selectedDate]
  );

  // 운동 로그 삭제
  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("Delete this workout?")) return;

      setDeletingId(id);
      setError(null);
      try {
        await deleteWorkout(id);
        await loadWorkouts();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete workout");
      } finally {
        setDeletingId(null);
      }
    },
    [loadWorkouts]
  );

  // 달력 빌드
  const calendar = useMemo(() => buildCalendar(selectedDate), [selectedDate]);

  // 날짜 클릭 핸들러
  const handleDateClick = useCallback((date: string) => {
    const normalized = normalizeDateString(date);
    if (normalized) {
      setSelectedDate(normalized);
      setIsFormOpen(true);
      // 폼에 날짜 설정
      setFormData((prev) => ({ ...prev, date: normalized }));
    }
  }, []);

  // 선택된 날짜의 운동만 필터링
  const filteredWorkouts = useMemo(() => {
    return workouts.filter((workout) => {
      const workoutDate = normalizeDateString(workout.date);
      return workoutDate === normalizeDateString(selectedDate);
    });
  }, [workouts, selectedDate]);

  // 날짜별로 그룹화 (전체)
  const workoutsByDate = workouts.reduce(
    (acc, workout) => {
      const date = workout.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(workout);
      return acc;
    },
    {} as Record<string, WorkoutLog[]>
  );

  const sortedDates = Object.keys(workoutsByDate).sort((a, b) => b.localeCompare(a));

  // 선택된 날짜의 총 칼로리
  const selectedDateCalories = useMemo(() => {
    return filteredWorkouts.reduce((sum, workout) => sum + (workout.calories_burned || 0), 0);
  }, [filteredWorkouts]);

  // 날짜별 칼로리 소모 데이터 (그래프용)
  const caloriesByDate = useMemo(() => {
    const totals = new Map<string, number>();
    
    workouts.forEach((workout) => {
      const date = workout.date;
      const calories = workout.calories_burned || 0;
      const existing = totals.get(date) || 0;
      totals.set(date, existing + calories);
    });

    return Array.from(totals.entries())
      .map(([date, calories]) => ({ date, calories }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [workouts]);

  // 그래프 컴포넌트
  const CaloriesChart = () => {
    if (caloriesByDate.length === 0) {
      return (
        <div style={{ padding: "24px", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e0e0e0", textAlign: "center", color: "#666" }}>
          <h3 style={{ marginTop: 0, marginBottom: "8px", fontSize: "1.25rem", fontWeight: 600 }}>
            Calories Burned by Date
          </h3>
          <p style={{ margin: 0 }}>No workout data to display. Start logging workouts to see your progress!</p>
        </div>
      );
    }

    const width = 800;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxCalories = Math.max(...caloriesByDate.map((d) => d.calories), 100);
    const minCalories = 0;

    // X축 스케일 (날짜)
    const dateRange = caloriesByDate.length;
    const xScale = (index: number) => {
      if (dateRange <= 1) return margin.left + innerWidth / 2;
      return margin.left + (index / (dateRange - 1)) * innerWidth;
    };

    // Y축 스케일 (칼로리)
    const yScale = (calories: number) => {
      const range = maxCalories - minCalories;
      if (range === 0) return margin.top + innerHeight;
      return margin.top + innerHeight - ((calories - minCalories) / range) * innerHeight;
    };

    // 라인 차트 경로 생성
    const linePath = caloriesByDate
      .map((item, index) => {
        const x = xScale(index);
        const y = yScale(item.calories);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    return (
      <div style={{ padding: "24px", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
        <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "1.25rem", fontWeight: 600 }}>
          Calories Burned by Date
        </h3>
        <svg width={width} height={height} style={{ display: "block", margin: "0 auto" }}>
          {/* Y축 그리드 라인 */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y = margin.top + (percent / 100) * innerHeight;
            const calories = minCalories + (percent / 100) * (maxCalories - minCalories);
            return (
              <g key={percent}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + innerWidth}
                  y2={y}
                  stroke="#e0e0e0"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#666"
                >
                  {Math.round(calories)}
                </text>
              </g>
            );
          })}

          {/* 라인 차트 */}
          <path
            d={linePath}
            fill="none"
            stroke="#86a361"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 데이터 포인트 (점) */}
          {caloriesByDate.map((item, index) => {
            const x = xScale(index);
            const y = yScale(item.calories);

            return (
              <g key={item.date}>
                <circle
                  cx={x}
                  cy={y}
                  r={5}
                  fill="#86a361"
                  stroke="white"
                  strokeWidth={2}
                />
                {/* 호버 시 툴팁 */}
                <title>{`${item.date}: ${Math.round(item.calories)} kcal`}</title>
              </g>
            );
          })}

          {/* X축 라벨 */}
          {caloriesByDate.map((item, index) => {
            const x = xScale(index);
            const date = new Date(item.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

            return (
              <text
                key={item.date}
                x={x}
                y={margin.top + innerHeight + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#666"
              >
                {dateStr}
              </text>
            );
          })}

          {/* Y축 라벨 */}
          <text
            x={margin.left / 2}
            y={margin.top + innerHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#666"
            transform={`rotate(-90 ${margin.left / 2} ${margin.top + innerHeight / 2})`}
          >
            Calories (kcal)
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="template-two" style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>Activity Log</h1>
        <p style={{ color: "#666", fontSize: "1.1rem" }}>Track your workouts and activities</p>
      </header>

      {error && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fee",
            color: "#c00",
            borderRadius: "4px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* 운동 추가 폼 */}
      <section style={{ marginBottom: "32px" }}>
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          style={{
            padding: "12px 24px",
            backgroundColor: "#86a361",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: "16px",
          }}
        >
          {isFormOpen ? "Cancel" : "+ Add Workout"}
        </button>

        {isFormOpen && (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "24px",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              marginBottom: "24px",
            }}
          >
            {/* 운동 검색 */}
            <div style={{ marginBottom: "16px", position: "relative" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                Activity Type *
              </label>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Search for exercise (e.g., Running, Yoga, Strength Training)"
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontSize: "1rem",
                }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    marginTop: "4px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {suggestions.map((exercise, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectExercise(exercise)}
                      style={{
                        padding: "12px",
                        cursor: "pointer",
                        borderBottom: idx < suggestions.length - 1 ? "1px solid #eee" : "none",
                        backgroundColor: selectedExercise?.full_name === exercise.full_name ? "#f0f7ed" : "white",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f0f7ed";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          selectedExercise?.full_name === exercise.full_name ? "#f0f7ed" : "white";
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>{exercise.full_name}</div>
                      <div style={{ fontSize: "0.875rem", color: "#666" }}>
                        {exercise.category} • MET: {exercise.met}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <label>
                Duration (minutes) *
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.duration_minutes || ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : null;
                    setFormData((prev) => ({ ...prev, duration_minutes: value }));
                  }}
                  required
                  placeholder="30"
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginTop: "4px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                />
              </label>
              <label>
                Calories Burned
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={calculatedCalories !== null ? calculatedCalories.toFixed(1) : formData.calories_burned || ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : null;
                    setFormData((prev) => ({ ...prev, calories_burned: value }));
                    setCalculatedCalories(null); // 수동 입력 시 자동 계산 값 초기화
                  }}
                  placeholder={calculatedCalories !== null ? "Auto-calculated" : "Auto or manual"}
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginTop: "4px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    backgroundColor: calculatedCalories !== null ? "#f0f7ed" : "white",
                  }}
                />
                {calculatedCalories !== null && (
                  <div style={{ fontSize: "0.75rem", color: "#86a361", marginTop: "4px" }}>
                    ✓ Auto-calculated based on your weight ({data.user.weight_kg || 70} kg)
                  </div>
                )}
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <label>
                Distance (km)
                <input
                  type="number"
                  name="distance_km"
                  min="0"
                  step="0.1"
                  value={formData.distance_km || ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : null;
                    setFormData((prev) => ({ ...prev, distance_km: value }));
                  }}
                  placeholder="5.0"
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginTop: "4px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                />
              </label>
              <div></div>
            </div>

            <label style={{ display: "block", marginBottom: "16px" }}>
              Notes
              <textarea
                name="notes"
                rows={3}
                value={formData.notes || ""}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, notes: e.target.value || null }));
                }}
                placeholder="Additional notes about your workout..."
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: "12px 24px",
                backgroundColor: isLoading ? "#ccc" : "#86a361",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: "1rem",
                fontWeight: 600,
              }}
            >
              {isLoading ? "Saving..." : "Save Workout"}
            </button>
          </form>
        )}
      </section>

      {/* 칼로리 소모 그래프 */}
      <section style={{ marginBottom: "32px" }}>
        <CaloriesChart />
      </section>

      {/* 달력 */}
      <section style={{ marginBottom: "32px" }}>
        <div
          style={{
            padding: "24px",
            backgroundColor: "#f0f7ed",
            borderRadius: "12px",
            border: "none",
          }}
        >
          <header style={{ marginBottom: "20px" }}>
            <h3
              style={{
                marginTop: 0,
                marginBottom: 0,
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "#2d5016",
              }}
            >
              {calendar.monthLabel}
            </h3>
            {selectedDate && (
              <p style={{ margin: "12px 0 0", fontSize: "0.875rem", color: "#666" }}>
                Selected: {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })} • {selectedDateCalories.toFixed(0)} kcal burned
              </p>
            )}
          </header>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "6px",
            }}
            role="grid"
            aria-label="Monthly overview"
          >
            {/* 요일 헤더 */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div
                key={`day-label-${index}`}
                style={{
                  padding: "12px 8px",
                  textAlign: "center",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#666",
                }}
              >
                {day}
              </div>
            ))}
            {/* 달력 날짜 */}
            {calendar.weeks.map((week, weekIndex) =>
              week.map((day, dayIndex) => {
                if (day.day === 0) {
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      style={{
                        padding: "8px",
                        aspectRatio: "1",
                      }}
                    />
                  );
                }

                const normalizedDayDate = day.isoDate ? normalizeDateString(day.isoDate) : null;
                const normalizedSelected = normalizeDateString(selectedDate);
                const isSelected = normalizedDayDate === normalizedSelected;
                const dayCalories = workoutsByDate[day.isoDate || ""]?.reduce(
                  (sum, w) => sum + (w.calories_burned || 0),
                  0
                ) || 0;

                return (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    type="button"
                    onClick={() => {
                      if (day.isoDate) {
                        handleDateClick(day.isoDate);
                      }
                    }}
                    style={{
                      padding: "12px 8px",
                      aspectRatio: "1",
                      border: "none",
                      borderRadius: "8px",
                      backgroundColor: isSelected
                        ? "#86a361"
                        : "white",
                      color: isSelected ? "white" : "#666",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: isSelected ? 600 : 400,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      transition: "all 0.2s",
                      boxShadow: isSelected ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "#e8f4e0";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.transform = "scale(1)";
                      }
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>{day.day}</span>
                    {dayCalories > 0 && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          opacity: isSelected ? 0.9 : 0.7,
                          fontWeight: 500,
                        }}
                      >
                        {Math.round(dayCalories)} kcal
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 선택된 날짜의 운동 로그 */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "16px" }}>
          {new Date(selectedDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })} - Workouts
        </h2>
        {filteredWorkouts.length === 0 ? (
          <p style={{ color: "#666", padding: "24px", textAlign: "center" }}>
            No workouts logged for this date. Click the date on the calendar above to add a workout!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredWorkouts.map((workout) => (
              <div
                key={workout.id}
                style={{
                  padding: "16px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "#333",
                      marginBottom: "8px",
                    }}
                  >
                    {workout.activity_type}
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      flexWrap: "wrap",
                      fontSize: "0.875rem",
                      color: "#666",
                    }}
                  >
                    {workout.duration_minutes && <span>⏱ {workout.duration_minutes} min</span>}
                    {workout.calories_burned && (
                      <span>🔥 {workout.calories_burned.toFixed(0)} kcal</span>
                    )}
                    {workout.distance_km && <span>📏 {workout.distance_km.toFixed(2)} km</span>}
                  </div>
                  {workout.notes && (
                    <p style={{ margin: "8px 0 0", fontSize: "0.875rem", color: "#666" }}>
                      {workout.notes}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(workout.id)}
                  disabled={deletingId === workout.id}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: deletingId === workout.id ? "#ccc" : "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: deletingId === workout.id ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  {deletingId === workout.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 전체 운동 로그 목록 */}
      <section>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "16px" }}>All Workout History</h2>
        {isLoading && workouts.length === 0 ? (
          <p>Loading workouts...</p>
        ) : sortedDates.length === 0 ? (
          <p style={{ color: "#666", padding: "24px", textAlign: "center" }}>
            No workouts logged yet. Add your first workout above!
          </p>
        ) : (
          sortedDates.map((date) => (
            <div key={date} style={{ marginBottom: "32px" }}>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "12px",
                  color: "#333",
                }}
              >
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {workoutsByDate[date].map((workout) => (
                  <div
                    key={workout.id}
                    style={{
                      padding: "16px",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          fontWeight: 600,
                          color: "#333",
                          marginBottom: "8px",
                        }}
                      >
                        {workout.activity_type}
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          flexWrap: "wrap",
                          fontSize: "0.875rem",
                          color: "#666",
                        }}
                      >
                        {workout.duration_minutes && <span>⏱ {workout.duration_minutes} min</span>}
                        {workout.calories_burned && (
                          <span>🔥 {workout.calories_burned.toFixed(0)} kcal</span>
                        )}
                        {workout.distance_km && <span>📏 {workout.distance_km.toFixed(2)} km</span>}
                      </div>
                      {workout.notes && (
                        <p style={{ margin: "8px 0 0", fontSize: "0.875rem", color: "#666" }}>
                          {workout.notes}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(workout.id)}
                      disabled={deletingId === workout.id}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: deletingId === workout.id ? "#ccc" : "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: deletingId === workout.id ? "not-allowed" : "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      {deletingId === workout.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
