"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import MealForm from "@/components/MealForm";
import { DashboardData, deleteMeal, updateCalorieTarget, updateUserProfile, getDashboard, getRecentMeals } from "@/lib/api";
import DailyTrendChart, { type TrendDatum } from "@/components/dashboard/DailyTrendChart";
import FatLossProjectionChart from "@/components/dashboard/FatLossProjectionChart";

// BMR 계산 함수 (Mifflin-St Jeor 공식)
function calculateBMR(
  heightCm: number | null | undefined,
  weightKg: number | null | undefined,
  age: number | null | undefined,
  gender: string | null | undefined
): number | null {
  if (!heightCm || !weightKg || !age || !gender) {
    return null;
  }

  // BMR 계산
  if (gender.toLowerCase() === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (gender.toLowerCase() === "female") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  return null;
}

// Activity factor 가져오기
function getActivityFactor(activityLevel: string | null | undefined): number {
  const factors: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    heavy: 1.725,
    athlete: 1.9,
  };
  return factors[activityLevel || "sedentary"] || 1.2;
}

// TDEE 계산 함수
function calculateTDEE(
  heightCm: number | null | undefined,
  weightKg: number | null | undefined,
  age: number | null | undefined,
  gender: string | null | undefined,
  activityLevel: string | null | undefined
): number | null {
  const bmr = calculateBMR(heightCm, weightKg, age, gender);
  if (bmr === null) {
    return null;
  }
  const activityFactor = getActivityFactor(activityLevel);
  return bmr * activityFactor;
}

// BMI 계산 함수
function calculateBMI(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined
): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

// BMI 카테고리 가져오기
function getBMICategory(bmi: number | null): string {
  if (bmi === null) {
    return "Unknown";
  }
  if (bmi < 18.5) {
    return "Underweight";
  } else if (bmi < 25) {
    return "Normal Weight";
  } else if (bmi < 30) {
    return "Overweight";
  } else {
    return "Obese";
  }
}

interface TemplateOneProps {
  data: DashboardData;
  onRefresh: () => Promise<void> | void;
}

function formatNumber(value: number, fractionDigits = 0) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits
  });
}

function getMacroPercentages(data: DashboardData["summary"]) {
  const proteinCalories = data.total_protein * 4;
  const carbCalories = data.total_carbs * 4;
  const fatCalories = data.total_fat * 9;
  const total = proteinCalories + carbCalories + fatCalories || 1;

  return {
    protein: (proteinCalories / total) * 100,
    carbs: (carbCalories / total) * 100,
    fat: (fatCalories / total) * 100
  };
}

type CalendarDay = { day: number; isToday: boolean; isoDate?: string };

type DateRange = { start: string; end: string };

function getDateKeyFromDate(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function getDateKey(value: string) {
  // YYYY-MM-DD 형식이면 직접 반환 (타임존 문제 방지)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  // 다른 형식이면 Date 객체로 파싱
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return getDateKeyFromDate(date);
}

function normalizeRange(start: string, end: string): DateRange {
  if (start <= end) {
    return { start, end };
  }
  return { start: end, end: start };
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

  // 실제 오늘 날짜와 비교하기 위해 오늘 날짜를 가져옴
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

type MacroTotals = { calories: number; protein: number; carbs: number; fat: number };

function getItemTotals(item: DashboardData["meals"][number]["items"][number]): MacroTotals {
  return item.food_entries.reduce<MacroTotals>(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + (entry.protein ?? 0),
      carbs: acc.carbs + (entry.carbs ?? 0),
      fat: acc.fat + (entry.fat ?? 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function getMealTotals(meal: DashboardData["meals"][number]): MacroTotals {
  return meal.items.reduce<MacroTotals>(
    (acc, item) => {
      const totals = getItemTotals(item);
      return {
        calories: acc.calories + totals.calories,
        protein: acc.protein + totals.protein,
        carbs: acc.carbs + totals.carbs,
        fat: acc.fat + totals.fat
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function toISODate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

export default function TemplateOne({ data, onRefresh }: TemplateOneProps) {
  const { summary, user } = data;
  const macroPercentages = getMacroPercentages(summary);
  
  // 선택된 날짜 state (기본값: 오늘 날짜, YYYY-MM-DD 형식으로 정규화)
  const normalizeDateString = useCallback((dateStr: string): string => {
    // 이미 YYYY-MM-DD 형식이면 그대로 반환
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // 그렇지 않으면 정규화 (타임존 문제를 피하기 위해 날짜 문자열 직접 파싱)
    const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      return dateMatch[0]; // YYYY-MM-DD 형식 반환
    }
    // 파싱 실패 시 getDateKey 사용 (fallback)
    const normalized = getDateKey(dateStr);
    return normalized || dateStr;
  }, []);
  
  const [selectedDate, setSelectedDate] = useState<string>(() => normalizeDateString(summary.date));
  const [selectedDateData, setSelectedDateData] = useState<DashboardData | null>(null);
  const [isLoadingDateData, setIsLoadingDateData] = useState(false);
  const [recentMeals, setRecentMeals] = useState<DashboardData["meals"]>([]);
  
  // 최근 meals 데이터 가져오기
  useEffect(() => {
    getRecentMeals(30)
      .then(setRecentMeals)
      .catch((err) => {
        console.error("Failed to fetch recent meals:", err);
      });
  }, [data.meals]); // data.meals가 변경될 때마다 최신 데이터 가져오기
  
  // 선택된 날짜의 데이터 사용 (없으면 기본 data 사용)
  const displayData = selectedDateData || data;
  const displaySummary = selectedDateData?.summary || summary;
  const displayMeals = selectedDateData?.meals || data.meals;
  
  // 캘린더는 선택된 날짜를 기준으로 생성
  const calendar = buildCalendar(selectedDate);

  const [isMealFormOpen, setIsMealFormOpen] = useState(false);
  const [deletingMealId, setDeletingMealId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState<string>("");
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [weightInput, setWeightInput] = useState<string>("");
  const [ageInput, setAgeInput] = useState<string>("");
  const [activityLevelInput, setActivityLevelInput] = useState<string>("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  const mealsByDate = useMemo(
    () =>
      [...displayMeals].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [displayMeals]
  );

  const totalMealItems = useMemo(
    () => mealsByDate.reduce((acc, meal) => acc + meal.items.length, 0),
    [mealsByDate]
  );

  const calorieTarget = user.daily_calorie_target;
  const calorieProgressRaw =
    calorieTarget > 0 ? (displaySummary.total_calories / calorieTarget) * 100 : 0;
  const calorieProgress = Math.min(100, Math.max(0, calorieProgressRaw));

  // BMR, TDEE, BMI 계산
  const bmr = useMemo(() => {
    return calculateBMR(user.height_cm, user.weight_kg, user.age, user.gender);
  }, [user.height_cm, user.weight_kg, user.age, user.gender]);

  const tdee = useMemo(() => {
    return calculateTDEE(user.height_cm, user.weight_kg, user.age, user.gender, user.activity_level);
  }, [user.height_cm, user.weight_kg, user.age, user.gender, user.activity_level]);

  const bmi = useMemo(() => {
    return calculateBMI(user.weight_kg, user.height_cm);
  }, [user.weight_kg, user.height_cm]);

  const bmiCategory = useMemo(() => {
    return getBMICategory(bmi);
  }, [bmi]);

  const calorieBalance = useMemo(() => {
    if (calorieTarget <= 0) return null;
    return calorieTarget - displaySummary.total_calories;
  }, [calorieTarget, displaySummary.total_calories]);

  const calorieInsight = useMemo(() => {
    const logged = formatNumber(displaySummary.total_calories);

    if (calorieBalance == null) {
      return `You've logged ${logged} kcal today.`;
    }

    if (calorieBalance > 0) {
      const deficit = formatNumber(calorieBalance);
      return `You are ${deficit} kcal under your goal with ${logged} kcal logged.`;
    }

    if (calorieBalance < 0) {
      const surplus = formatNumber(Math.abs(calorieBalance));
      return `You've exceeded the target by ${surplus} kcal today.`;
    }

    return `You matched the ${formatNumber(calorieTarget)} kcal target.`;
  }, [calorieBalance, calorieTarget, summary.total_calories]);

  const energyCue = displaySummary.motivation_message ?? "Fuel up with quality foods to keep energy high.";

  const fatLossNote = displaySummary.total_fat > 0 ? "이번 주 페이스를 유지하고 있어요." : "오늘은 아직 감량 데이터가 없어요.";

  const dailyTrendData = useMemo<TrendDatum[]>(() => {
    const totals = new Map<string, { calories: number; fat: number }>();

    // 오늘 날짜를 명시적으로 가져오기 (YYYY-MM-DD 형식)
    const today = new Date();
    const todayKey = getDateKeyFromDate(today);
    
    // summary.date의 날짜 키 가져오기 (YYYY-MM-DD 형식으로 정규화)
    let summaryKey: string | null = null;
    if (typeof summary.date === 'string') {
      // YYYY-MM-DD 형식이면 직접 사용 (타임존 문제 방지)
      if (/^\d{4}-\d{2}-\d{2}$/.test(summary.date)) {
        summaryKey = summary.date;
      } else {
        // 다른 형식이면 정규화
        const normalized = getDateKey(summary.date);
        summaryKey = normalized || summary.date;
      }
    } else {
      // Date 객체나 다른 타입이면 문자열로 변환 후 정규화
      const normalized = getDateKey(String(summary.date));
      summaryKey = normalized || String(summary.date);
    }
    
    // 두 날짜를 정규화하여 비교 (YYYY-MM-DD 형식으로 통일)
    const normalizedTodayKey = todayKey;
    const normalizedSummaryKey = summaryKey;
    
    // recentMeals가 있으면 사용하고, 없으면 data.meals 사용
    const mealsToUse = recentMeals.length > 0 ? recentMeals : data.meals;

    // 각 날짜별로 meals에서 계산된 값 저장
    mealsToUse.forEach((meal) => {
      const key = getDateKey(meal.date);
      if (!key) return;
      const totalsForMeal = getMealTotals(meal);
      const existing = totals.get(key);
      if (existing) {
        existing.calories += totalsForMeal.calories;
        existing.fat += totalsForMeal.fat;
      } else {
        totals.set(key, {
          calories: totalsForMeal.calories,
          fat: totalsForMeal.fat
        });
      }
    });
    
    // 오늘 날짜는 summary 값으로 확실히 덮어쓰기 (항상 최신 데이터)
    // summary.date가 오늘 날짜인 경우에만 적용
    const isTodaySummary = normalizedTodayKey && normalizedSummaryKey && normalizedTodayKey === normalizedSummaryKey;
    if (isTodaySummary && todayKey) {
      totals.set(todayKey, {
        calories: summary.total_calories,
        fat: summary.total_fat
      });
    }
    
    // 오늘 날짜가 totals에 없으면 summary 값으로 추가 (meal이 없어도 summary 값 표시)
    if (todayKey && !totals.has(todayKey)) {
      if (isTodaySummary) {
        totals.set(todayKey, {
          calories: summary.total_calories,
          fat: summary.total_fat
        });
      } else {
        // summary.date가 오늘 날짜가 아니면 0으로 추가
        totals.set(todayKey, {
          calories: 0,
          fat: 0
        });
      }
    }

    return Array.from(totals.entries())
      .map(([isoDate, totalsForDay]) => ({
        isoDate,
        calories: totalsForDay.calories,
        fat: totalsForDay.fat
      }))
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  }, [recentMeals, data.meals, summary.date, summary.total_calories, summary.total_fat]);

  const extendedTrendData = useMemo<TrendDatum[]>(() => {
    const slice = dailyTrendData.slice(-14);
    return slice.length > 0 ? slice : dailyTrendData;
  }, [dailyTrendData]);

  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [pendingRange, setPendingRange] = useState<DateRange | null>(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const dragRangeAnchorRef = useRef<string | null>(null);
  const pendingRangeRef = useRef<DateRange | null>(null);

  const chartDateFormatter = useMemo(
    () => new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }),
    []
  );

  const formatChartLabel = useCallback(
    (isoDate: string) => {
      const [yearString, monthString, dayString] = isoDate.split("-");
      const year = Number.parseInt(yearString ?? "", 10);
      const month = Number.parseInt(monthString ?? "", 10);
      const day = Number.parseInt(dayString ?? "", 10);
      if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        return isoDate;
      }
      const labelDate = new Date(year, month - 1, day);
      return chartDateFormatter.format(labelDate).replace(" ", "-");
    },
    [chartDateFormatter]
  );

  const activeRange = pendingRange ?? selectedRange;

  const trendDataForDisplay = useMemo(() => {
    if (activeRange) {
      return dailyTrendData.filter(
        (datum) => datum.isoDate >= activeRange.start && datum.isoDate <= activeRange.end
      );
    }
    const fallback = dailyTrendData.slice(-4);
    if (fallback.length > 0) {
      return fallback;
    }
    return dailyTrendData;
  }, [activeRange, dailyTrendData]);

  const startRangeSelection = useCallback((isoDate: string) => {
    dragRangeAnchorRef.current = isoDate;
    const range = normalizeRange(isoDate, isoDate);
    pendingRangeRef.current = range;
    setPendingRange(range);
    setIsDraggingRange(true);
  }, []);

  const updateRangeSelection = useCallback((isoDate: string) => {
    if (!dragRangeAnchorRef.current) {
      return;
    }
    const range = normalizeRange(dragRangeAnchorRef.current, isoDate);
    pendingRangeRef.current = range;
    setPendingRange(range);
  }, []);

  const finalizeRangeSelection = useCallback(() => {
    const range = pendingRangeRef.current;
    if (range) {
      setSelectedRange(range);
    }
    pendingRangeRef.current = null;
    setPendingRange(null);
    dragRangeAnchorRef.current = null;
    setIsDraggingRange(false);
  }, []);

  const clearRangeSelection = useCallback(() => {
    setSelectedRange(null);
    setPendingRange(null);
    pendingRangeRef.current = null;
    dragRangeAnchorRef.current = null;
    setIsDraggingRange(false);
  }, []);

  useEffect(() => {
    if (!isDraggingRange) {
      return undefined;
    }

    const handlePointerEnd = () => {
      finalizeRangeSelection();
    };

    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [finalizeRangeSelection, isDraggingRange]);

  const toggleMealForm = useCallback(() => {
    setIsMealFormOpen((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => {
          formContainerRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        });
      }
      return next;
    });
  }, []);

  const refreshRecentMeals = useCallback(async () => {
    try {
      const meals = await getRecentMeals(30);
      setRecentMeals(meals);
    } catch (err) {
      console.error("Failed to refresh recent meals:", err);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setActionError(null);
    await onRefresh();
    await refreshRecentMeals();
  }, [onRefresh, refreshRecentMeals]);

  const handleDeleteMeal = useCallback(
    async (mealId: number) => {
      setActionError(null);
      setDeletingMealId(mealId);
      try {
        await deleteMeal(mealId);
        await onRefresh();
        await refreshRecentMeals();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Unable to remove meal.");
      } finally {
        setDeletingMealId(null);
      }
    },
    [onRefresh, refreshRecentMeals]
  );

  const nextMealLabel = `Meal ${mealsByDate.length + 1}`;

  const handleStartEditTarget = useCallback(() => {
    setTargetInput(formatNumber(calorieTarget));
    setIsEditingTarget(true);
  }, [calorieTarget]);

  const handleCancelEditTarget = useCallback(() => {
    setIsEditingTarget(false);
    setTargetInput("");
  }, []);

  const handleSaveTarget = useCallback(async () => {
    const targetValue = Number.parseInt(targetInput.replace(/,/g, ""), 10);
    if (Number.isNaN(targetValue) || targetValue < 1000 || targetValue > 10000) {
      setActionError("Calorie target must be between 1,000 and 10,000");
      return;
    }

    setIsUpdatingTarget(true);
    setActionError(null);
    try {
      await updateCalorieTarget(targetValue);
      await onRefresh();
      setIsEditingTarget(false);
      setTargetInput("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update calorie target");
    } finally {
      setIsUpdatingTarget(false);
    }
  }, [targetInput, onRefresh]);

  const handleTargetKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        handleSaveTarget();
      } else if (event.key === "Escape") {
        handleCancelEditTarget();
      }
    },
    [handleSaveTarget, handleCancelEditTarget]
  );

  const handleStartEditProfile = useCallback(() => {
    setWeightInput(user.weight_kg?.toString() || "");
    setAgeInput(user.age?.toString() || "");
    setActivityLevelInput(user.activity_level || "sedentary");
    setIsEditingProfile(true);
  }, [user.weight_kg, user.age, user.activity_level]);

  const handleCancelEditProfile = useCallback(() => {
    setIsEditingProfile(false);
    setWeightInput("");
    setAgeInput("");
    setActivityLevelInput("");
  }, []);

  const handleSaveProfile = useCallback(async () => {
    const weightValue = weightInput ? Number.parseFloat(weightInput) : undefined;
    const ageValue = ageInput ? Number.parseInt(ageInput, 10) : undefined;
    const activityLevelValue = activityLevelInput || undefined;

    if (weightValue !== undefined && (weightValue < 20 || weightValue > 500)) {
      setActionError("Weight must be between 20 and 500 kg");
      return;
    }

    if (ageValue !== undefined && (ageValue < 1 || ageValue > 150)) {
      setActionError("Age must be between 1 and 150");
      return;
    }

    setIsUpdatingProfile(true);
    setActionError(null);
    try {
      await updateUserProfile({
        weight_kg: weightValue,
        age: ageValue,
        activity_level: activityLevelValue,
      });
      await onRefresh();
      setIsEditingProfile(false);
      setWeightInput("");
      setAgeInput("");
      setActivityLevelInput("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [weightInput, ageInput, activityLevelInput, onRefresh]);

  // 날짜 선택 핸들러
  const handleDateClick = useCallback(async (isoDate: string) => {
    if (!isoDate) {
      return;
    }
    
    // 날짜를 YYYY-MM-DD 형식으로 정규화
    const normalizedDate = normalizeDateString(isoDate);
    const normalizedSelectedDate = normalizeDateString(selectedDate);
    const normalizedSummaryDate = normalizeDateString(summary.date);
    
    if (normalizedDate === normalizedSelectedDate) {
      return; // 같은 날짜면 무시
    }
    
    setSelectedDate(normalizedDate);
    
    // 오늘 날짜면 기본 data 사용 (날짜 문자열 직접 비교)
    if (normalizedDate === normalizedSummaryDate) {
      setSelectedDateData(null);
      return;
    }
    
    setIsLoadingDateData(true);
    setActionError(null);
    
    try {
      const dateData = await getDashboard(normalizedDate);
      setSelectedDateData(dateData);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to load date data");
      // 에러 발생 시 선택된 날짜를 원래대로 되돌림
      setSelectedDate(normalizedSummaryDate);
      setSelectedDateData(null);
    } finally {
      setIsLoadingDateData(false);
    }
  }, [selectedDate, summary.date, normalizeDateString]);

  // 날짜 포맷팅 함수
  const formatSelectedDate = useCallback((isoDate: string): string => {
    // isoDate는 YYYY-MM-DD 형식이므로 직접 파싱
    const dateMatch = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      return `${isoDate}'s meals`;
    }
    
    const [, yearStr, monthStr, dayStr] = dateMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    
    // 오늘 날짜와 비교 (타임존 문제 방지를 위해 문자열 비교)
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    
    if (year === todayYear && month === todayMonth && day === todayDay) {
      return "Today's meals";
    }
    
    return `${year}-${monthStr}-${dayStr}'s meals`;
  }, []);

  return (
    <div className="template-one">
      {/* 30일 지방 감량 예측 차트 - 상단 (전체 너비) */}
      {summary.total_fat > 0 && (
        <section className="template-one__card" style={{ marginBottom: "24px" }}>
          <FatLossProjectionChart dailyFatLossG={summary.total_fat} />
        </section>
      )}

      <div className="template-one__grid">
        <section className="template-one__card template-one__summary" aria-labelledby="summary-heading">
          <header className="template-one__summary-header">
            <div className="template-one__summary-top">
              <div className="template-one__fat-loss">
                <span className="template-one__fat-loss-label">Today's total fat loss</span>
                <strong className="template-one__fat-loss-value">
                  {formatNumber(displaySummary.total_fat, 1)} g
                </strong>
                <p className="template-one__fat-loss-note">{fatLossNote}</p>
              </div>
              <div className="template-one__summary-heading">
                <div className="template-one__summary-title">
                  <p className="template-one__eyebrow">Daily nutrition summary</p>
                  <h2 id="summary-heading">{calendar.monthLabel}</h2>
                </div>
                <div className="template-one__summary-target">
                  {isEditingTarget ? (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        value={targetInput}
                        onChange={(e) => setTargetInput(e.target.value)}
                        onKeyDown={handleTargetKeyDown}
                        disabled={isUpdatingTarget}
                        style={{
                          padding: "4px 8px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          width: "100px"
                        }}
                        autoFocus
                      />
                      <span style={{ fontSize: "0.875rem" }}>kcal</span>
                      <button
                        type="button"
                        onClick={handleSaveTarget}
                        disabled={isUpdatingTarget}
                        style={{
                          padding: "4px 12px",
                          backgroundColor: "#86a361",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: isUpdatingTarget ? "not-allowed" : "pointer",
                          fontSize: "0.875rem"
                        }}
                      >
                        {isUpdatingTarget ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditTarget}
                        disabled={isUpdatingTarget}
                        style={{
                          padding: "4px 12px",
                          backgroundColor: "#ccc",
                          color: "black",
                          border: "none",
                          borderRadius: "4px",
                          cursor: isUpdatingTarget ? "not-allowed" : "pointer",
                          fontSize: "0.875rem"
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span
                      className="template-one__badge"
                      onClick={handleStartEditTarget}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      title="Click to edit"
                    >
                      Target {formatNumber(calorieTarget)} kcal
                    </span>
                  )}
                  <p className="template-one__summary-insight">{calorieInsight}</p>
                </div>
              </div>
            </div>
          </header>
          <p className="template-one__motivation">{energyCue}</p>
          
          {/* 프로필 정보 및 TDEE 섹션 */}
          <div style={{ 
            padding: "16px", 
            backgroundColor: "#f9f9f9", 
            borderRadius: "8px", 
            marginBottom: "16px",
            border: "1px solid #e0e0e0"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#333" }}>Profile & TDEE</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#666", marginBottom: "4px" }}>
                  Weight (kg)
                </label>
                {isEditingProfile ? (
                  <input
                    type="number"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    disabled={isUpdatingProfile}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      fontSize: "0.875rem"
                    }}
                    placeholder="70"
                    min={20}
                    max={500}
                    step="0.1"
                  />
                ) : (
                  <div
                    onClick={handleStartEditProfile}
                    style={{
                      padding: "6px 8px",
                      backgroundColor: "white",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      minHeight: "28px"
                    }}
                  >
                    {user.weight_kg ? `${formatNumber(user.weight_kg, 1)} kg` : "Click to set"}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#666", marginBottom: "4px" }}>
                  Age
                </label>
                {isEditingProfile ? (
                  <input
                    type="number"
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    disabled={isUpdatingProfile}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      fontSize: "0.875rem"
                    }}
                    placeholder="30"
                    min={1}
                    max={150}
                  />
                ) : (
                  <div
                    onClick={handleStartEditProfile}
                    style={{
                      padding: "6px 8px",
                      backgroundColor: "white",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      minHeight: "28px"
                    }}
                  >
                    {user.age ? `${user.age} years` : "Click to set"}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "#666", marginBottom: "4px" }}>
                Activity Level
              </label>
              {isEditingProfile ? (
                <select
                  value={activityLevelInput}
                  onChange={(e) => setActivityLevelInput(e.target.value)}
                  disabled={isUpdatingProfile}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "0.875rem"
                  }}
                >
                  <option value="sedentary">Sedentary (Little to no exercise)</option>
                  <option value="light">Light Exercise (1-3 days/week)</option>
                  <option value="moderate">Moderate Exercise (3-5 days/week)</option>
                  <option value="heavy">Heavy Exercise (6-7 days/week)</option>
                  <option value="athlete">Athlete (Very heavy exercise, physical job)</option>
                </select>
              ) : (
                <div
                  onClick={handleStartEditProfile}
                  style={{
                    padding: "6px 8px",
                    backgroundColor: "white",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    minHeight: "28px"
                  }}
                >
                  {user.activity_level 
                    ? user.activity_level.charAt(0).toUpperCase() + user.activity_level.slice(1)
                    : "Click to set"}
                </div>
              )}
            </div>
            {isEditingProfile && (
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isUpdatingProfile}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#86a361",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isUpdatingProfile ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                    flex: 1
                  }}
                >
                  {isUpdatingProfile ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditProfile}
                  disabled={isUpdatingProfile}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#ccc",
                    color: "black",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isUpdatingProfile ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                    flex: 1
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            {bmr !== null && (
              <div style={{ 
                marginTop: "12px", 
                padding: "12px", 
                backgroundColor: "#fff9e6", 
                borderRadius: "4px",
                border: "1px solid #ffd54f"
              }}>
                <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "8px", fontWeight: 600 }}>BMR (Basal Metabolic Rate)</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f57c00", marginBottom: "12px" }}>
                  {formatNumber(bmr, 0)} kcal/day
                </div>
                {tdee !== null && (
                  <>
                    <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "8px", fontWeight: 600 }}>TDEE (Total Daily Energy Expenditure)</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#2e7d32" }}>
                      {formatNumber(tdee, 0)} kcal/day
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "8px" }}>
                      Based on {user.activity_level ? user.activity_level.charAt(0).toUpperCase() + user.activity_level.slice(1) : "Sedentary"} activity level
                    </div>
                  </>
                )}
              </div>
            )}
            {bmi !== null && (
              <div style={{ 
                marginTop: "12px", 
                padding: "12px", 
                backgroundColor: "#e3f2fd", 
                borderRadius: "4px",
                border: "1px solid #90caf9"
              }}>
                <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "8px", fontWeight: 600 }}>BMI Score</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1565c0", marginBottom: "4px" }}>
                  {formatNumber(bmi, 1)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>
                  {bmiCategory}
                </div>
              </div>
            )}
            {(bmr === null || tdee === null) && (user.height_cm || user.weight_kg || user.age || user.gender) && (
              <div style={{ 
                marginTop: "12px", 
                padding: "8px", 
                backgroundColor: "#fff3cd", 
                borderRadius: "4px",
                border: "1px solid #ffc107",
                fontSize: "0.75rem",
                color: "#856404"
              }}>
                Complete your profile (height, weight, age, gender) to calculate BMR and TDEE
              </div>
            )}
          </div>

          <div className="template-one__summary-content">
            <div className="template-one__pie">
              <div
                className="template-one__pie-chart"
                style={{
                  background: `conic-gradient(#86a361 0 ${macroPercentages.protein}%, #b1d182 ${macroPercentages.protein}% ${
                    macroPercentages.protein + macroPercentages.carbs
                  }%, #d9c0a7 ${macroPercentages.protein + macroPercentages.carbs}% 100%)`
                }}
              >
                <div className="template-one__pie-inner">
                  <span className="template-one__pie-value">{Math.round(calorieProgress)}%</span>
                  <span className="template-one__pie-label">of goal</span>
                </div>
              </div>
              <ul className="template-one__legend" aria-label="Macronutrient distribution">
                <li>
                  <span className="template-one__dot template-one__dot--protein" />
                  Protein {Math.round(macroPercentages.protein)}%
                </li>
                <li>
                  <span className="template-one__dot template-one__dot--carbs" />
                  Carbs {Math.round(macroPercentages.carbs)}%
                </li>
                <li>
                  <span className="template-one__dot template-one__dot--fat" />
                  Fat {Math.round(macroPercentages.fat)}%
                </li>
              </ul>
            </div>

            <div className="template-one__totals">
              
              <dl className="template-one__metrics">
                <div>
                  <dt>Calories</dt>
                  <dd>
                    {formatNumber(displaySummary.total_calories)}
                    <span> / {formatNumber(calorieTarget)}</span>
                  </dd>
                </div>
                <div>
                  <dt>Protein</dt>
                  <dd>{formatNumber(displaySummary.total_protein, 1)} g</dd>
                </div>
                <div>
                  <dt>Carbs</dt>
                  <dd>{formatNumber(displaySummary.total_carbs, 1)} g</dd>
                </div>
                <div>
                  <dt>Fat</dt>
                  <dd>{formatNumber(displaySummary.total_fat, 1)} g</dd>
                </div>
              </dl>
            </div>
          </div>

        </section>

        <section className="template-one__card template-one__progress" aria-labelledby="progress-heading">
          <header className="template-one__card-header">
            <p className="template-one__eyebrow">Progress</p>
            <h2 id="progress-heading">Daily trend</h2>
          </header>

          <div className="template-one__sparkline">
            <DailyTrendChart
              data={trendDataForDisplay}
              extendedData={extendedTrendData}
              formatLabel={formatChartLabel}
            />
          </div>
          <ul className="template-one__progress-list">
            <li>
              <span className="template-one__progress-label">Calories</span>
              <strong>{Math.round(calorieProgress)}%</strong>
              <span className="template-one__progress-meta">of daily goal</span>
            </li>
            <li>
              <span className="template-one__progress-label">Meals logged</span>
              <strong>{mealsByDate.length}</strong>
              <span className="template-one__progress-meta">today</span>
            </li>
            <li>
              <span className="template-one__progress-label">Foods logged</span>
              <strong>{totalMealItems}</strong>
              <span className="template-one__progress-meta">across meals</span>
            </li>
          </ul>

          <div className="template-one__calendar">
            <header>
              <h3>{calendar.monthLabel}</h3>
            </header>
            <div className="template-one__calendar-grid" role="grid" aria-label="Monthly overview">
              <div className="template-one__calendar-week" role="row">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <span key={`day-label-${index}`} role="columnheader" className="template-one__calendar-day template-one__calendar-day--label">
                    {day}
                  </span>
                ))}
              </div>
              {calendar.weeks.map((week, index) => (
                <div className="template-one__calendar-week" role="row" key={index}>
                  {week.map((day, dayIndex) => {
                    if (day.day === 0) {
                      return (
                        <span
                          key={`${index}-${dayIndex}`}
                          role="gridcell"
                          className="template-one__calendar-day template-one__calendar-day--empty"
                          aria-hidden="true"
                        />
                      );
                    }

                    // 날짜 비교를 정규화된 형식으로 수행
                    const normalizedDayDate = day.isoDate ? normalizeDateString(day.isoDate) : null;
                    const normalizedSelected = normalizeDateString(selectedDate);
                    const isSelected = normalizedDayDate === normalizedSelected;
                    
                    // 오늘 날짜는 항상 노란색으로 표시하고, 선택된 날짜는 초록색으로 표시
                    // 오늘 날짜가 선택된 경우에는 노란색을 유지
                    const classNames = [
                      "template-one__calendar-day",
                      day.isToday ? "template-one__calendar-day--active" : "",
                      isSelected && !day.isToday ? "template-one__calendar-day--selected" : ""
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        key={`${index}-${dayIndex}`}
                        type="button"
                        role="gridcell"
                        className={classNames}
                        data-date={day.isoDate}
                        onClick={() => {
                          if (day.isoDate) {
                            handleDateClick(day.isoDate);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (!day.isoDate) {
                            return;
                          }
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleDateClick(day.isoDate);
                          }
                        }}
                        aria-pressed={isSelected}
                      >
                        {day.day}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="template-one__card template-one__foods" aria-labelledby="logged-foods-heading">
        <header className="template-one__card-header template-one__foods-header">
          <div>
            <p className="template-one__eyebrow">Logged foods</p>
            <h2 id="logged-foods-heading">
              {isLoadingDateData ? "Loading..." : formatSelectedDate(selectedDate)}
            </h2>
          </div>
          <div className="template-one__actions">
            <button type="button" className="template-one__action-button" onClick={toggleMealForm}>
              {isMealFormOpen ? "Close form" : "Add meal"}
            </button>
            <button
              type="button"
              className="template-one__action-button template-one__action-button--refresh"
              onClick={handleRefresh}
            >
              Refresh
            </button>
          </div>
        </header>
        {actionError && <p className="template-one__error">{actionError}</p>}

        {mealsByDate.length === 0 ? (
          <p className="template-one__empty">No meals logged yet. Start by adding one.</p>
        ) : (
          <div className="template-one__meal-grid">
            {mealsByDate.map((meal, index) => {
              const totals = getMealTotals(meal);
              const mealName = meal.name.trim();
              return (
                <article key={meal.id} className="template-one__meal-card">
                  <header className="template-one__meal-card-header">
                    <div className="template-one__meal-heading">
                      <h3>{`Meal ${index + 1}`}</h3>
                      {mealName && <span className="template-one__meal-subtitle">{mealName}</span>}
                    </div>
                    <div className="template-one__meal-meta">
                      <time dateTime={toISODate(meal.date)}>{formatTime(meal.date)}</time>
                      <button
                        type="button"
                        className="template-one__meal-remove"
                        onClick={() => handleDeleteMeal(meal.id)}
                        disabled={deletingMealId === meal.id}
                      >
                        {deletingMealId === meal.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </header>
                  <p className="template-one__meal-macros">
                    <span>{formatNumber(totals.calories)} kcal</span>
                    <span>
                      P {formatNumber(totals.protein, 1)} • C {formatNumber(totals.carbs, 1)} • F {formatNumber(totals.fat, 1)}
                    </span>
                  </p>
                  {meal.items.length === 0 ? (
                    <p className="template-one__empty template-one__meal-empty">No foods logged yet.</p>
                  ) : (
                    <ul className="template-one__meal-items">
                      {meal.items.map((item) => {
                        const itemTotals = getItemTotals(item);
                        return (
                          <li key={item.id}>
                            <div className="template-one__meal-item-details">
                              <p>{item.name}</p>
                              <div className="template-one__meal-item-meta">
                                {item.quantity && <span>{item.quantity}</span>}
                                {item.notes && <span>{item.notes}</span>}
                              </div>
                            </div>
                            <div className="template-one__meal-item-macros">
                              <strong>{formatNumber(itemTotals.calories)} kcal</strong>
                              <span>
                                P {formatNumber(itemTotals.protein, 1)} • C {formatNumber(itemTotals.carbs, 1)} • F {formatNumber(itemTotals.fat, 1)}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div ref={formContainerRef} className="template-one__meal-form">
          {isMealFormOpen && (
            <MealForm
              onLogged={async () => {
                // 선택된 날짜의 데이터를 다시 가져오기
                if (selectedDate !== summary.date) {
                  try {
                    const dateData = await getDashboard(selectedDate);
                    setSelectedDateData(dateData);
                  } catch (err) {
                    // 에러 무시하고 기본 새로고침만 수행
                  }
                }
                await onRefresh();
                await refreshRecentMeals();
                setIsMealFormOpen(false);
              }}
              initialMealName={nextMealLabel}
              date={selectedDate}
            />
          )}
        </div>
      </section>

      <section className="template-one__card template-one__timeline-section" aria-labelledby="meals-heading">
        <header className="template-one__card-header">
          <p className="template-one__eyebrow">Today</p>
          <h2 id="meals-heading">Meal timeline</h2>
        </header>

        {mealsByDate.length === 0 ? (
          <p className="template-one__empty">No meals logged yet. Start by adding one above.</p>
        ) : (
          <ol className="template-one__timeline">
            {mealsByDate.map((meal, index) => {
              const mealName = meal.name.trim();
              return (
                <li key={meal.id}>
                  <div className="template-one__timeline-point" />
                  <div className="template-one__timeline-card">
                    <header>
                      <h3>{`Meal ${index + 1}`}</h3>
                      <div className="template-one__timeline-meta">
                        <time dateTime={toISODate(meal.date)}>{formatTime(meal.date)}</time>
                        {mealName && <span>{mealName}</span>}
                      </div>
                    </header>
                    <ul>
                      {meal.items.map((item) => {
                        const itemTotals = getItemTotals(item);
                        return (
                          <li key={item.id}>
                            <div>
                              <p>{item.name}</p>
                              <div className="template-one__timeline-item-meta">
                                {item.quantity && <span>{item.quantity}</span>}
                                {item.notes && <span>{item.notes}</span>}
                              </div>
                            </div>
                            <aside>
                              <strong>{formatNumber(itemTotals.calories)} kcal</strong>
                              <span>
                                P {formatNumber(itemTotals.protein, 1)} • C {formatNumber(itemTotals.carbs, 1)} • F {formatNumber(itemTotals.fat, 1)}
                              </span>
                            </aside>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
