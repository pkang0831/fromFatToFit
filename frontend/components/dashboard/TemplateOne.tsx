"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import MealForm from "@/components/MealForm";
import { DashboardData, deleteMeal } from "@/lib/api";
import DailyTrendChart, { type TrendDatum } from "@/components/dashboard/DailyTrendChart";

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

  const weeks: Array<Array<CalendarDay>> = [];
  let currentWeek: Array<CalendarDay> = [];

  for (let i = 0; i < firstDay; i += 1) {
    currentWeek.push({ day: 0, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(year, month, day);
    currentWeek.push({
      day,
      isToday: day === date.getDate(),
      isoDate: getDateKeyFromDate(cellDate)
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
  const calendar = buildCalendar(summary.date);

  const [isMealFormOpen, setIsMealFormOpen] = useState(false);
  const [deletingMealId, setDeletingMealId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  const mealsByDate = useMemo(
    () =>
      [...data.meals].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [data.meals]
  );

  const totalMealItems = useMemo(
    () => mealsByDate.reduce((acc, meal) => acc + meal.items.length, 0),
    [mealsByDate]
  );

  const calorieTarget = user.daily_calorie_target;
  const calorieProgressRaw =
    calorieTarget > 0 ? (summary.total_calories / calorieTarget) * 100 : 0;
  const calorieProgress = Math.min(100, Math.max(0, calorieProgressRaw));

  const calorieBalance = useMemo(() => {
    if (calorieTarget <= 0) return null;
    return calorieTarget - summary.total_calories;
  }, [calorieTarget, summary.total_calories]);

  const calorieInsight = useMemo(() => {
    const logged = formatNumber(summary.total_calories);

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

  const energyCue = summary.motivation_message ?? "Fuel up with quality foods to keep energy high.";

  const fatLossNote = summary.total_fat > 0 ? "이번 주 페이스를 유지하고 있어요." : "오늘은 아직 감량 데이터가 없어요.";

  const dailyTrendData = useMemo<TrendDatum[]>(() => {
    const totals = new Map<string, { calories: number; fat: number }>();

    data.meals.forEach((meal) => {
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

    const summaryKey = getDateKey(summary.date);
    if (summaryKey) {
      totals.set(summaryKey, {
        calories: summary.total_calories,
        fat: summary.total_fat
      });
    }

    return Array.from(totals.entries())
      .map(([isoDate, totalsForDay]) => ({
        isoDate,
        calories: totalsForDay.calories,
        fat: totalsForDay.fat
      }))
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  }, [data.meals, summary.date, summary.total_calories, summary.total_fat]);

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

  const handleRefresh = useCallback(async () => {
    setActionError(null);
    await onRefresh();
  }, [onRefresh]);

  const handleDeleteMeal = useCallback(
    async (mealId: number) => {
      setActionError(null);
      setDeletingMealId(mealId);
      try {
        await deleteMeal(mealId);
        await onRefresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Unable to remove meal.");
      } finally {
        setDeletingMealId(null);
      }
    },
    [onRefresh]
  );

  const nextMealLabel = `Meal ${mealsByDate.length + 1}`;

  return (
    <div className="template-one">
      <div className="template-one__grid">
        <section className="template-one__card template-one__summary" aria-labelledby="summary-heading">
          <header className="template-one__summary-header">
            <div className="template-one__summary-top">
              <div className="template-one__fat-loss">
                <span className="template-one__fat-loss-label">Today's total fat loss</span>
                <strong className="template-one__fat-loss-value">
                  {formatNumber(summary.total_fat, 1)} g
                </strong>
                <p className="template-one__fat-loss-note">{fatLossNote}</p>
              </div>
              <div className="template-one__summary-heading">
                <div className="template-one__summary-title">
                  <p className="template-one__eyebrow">Daily nutrition summary</p>
                  <h2 id="summary-heading">{calendar.monthLabel}</h2>
                </div>
                <div className="template-one__summary-target">
                  <span className="template-one__badge">Target {formatNumber(calorieTarget)} kcal</span>
                  <p className="template-one__summary-insight">{calorieInsight}</p>
                </div>
              </div>
            </div>
          </header>
          <p className="template-one__motivation">{energyCue}</p>
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
                    {formatNumber(summary.total_calories)}
                    <span> / {formatNumber(calorieTarget)}</span>
                  </dd>
                </div>
                <div>
                  <dt>Protein</dt>
                  <dd>{formatNumber(summary.total_protein, 1)} g</dd>
                </div>
                <div>
                  <dt>Carbs</dt>
                  <dd>{formatNumber(summary.total_carbs, 1)} g</dd>
                </div>
                <div>
                  <dt>Fat</dt>
                  <dd>{formatNumber(summary.total_fat, 1)} g</dd>
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
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                  <span key={day} role="columnheader" className="template-one__calendar-day template-one__calendar-day--label">
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

                    const isInRange = Boolean(
                      activeRange && day.isoDate && day.isoDate >= activeRange.start && day.isoDate <= activeRange.end
                    );
                    const isRangeStart = Boolean(isInRange && activeRange?.start === day.isoDate);
                    const isRangeEnd = Boolean(isInRange && activeRange?.end === day.isoDate);
                    const classNames = [
                      "template-one__calendar-day",
                      day.isToday ? "template-one__calendar-day--active" : "",
                      isInRange ? "template-one__calendar-day--selected" : "",
                      isRangeStart ? "template-one__calendar-day--range-start" : "",
                      isRangeEnd ? "template-one__calendar-day--range-end" : ""
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
                        onPointerDown={(event) => {
                          event.preventDefault();
                          if (day.isoDate) {
                            startRangeSelection(day.isoDate);
                          }
                        }}
                        onPointerEnter={() => {
                          if (day.isoDate && isDraggingRange) {
                            updateRangeSelection(day.isoDate);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (!day.isoDate) {
                            return;
                          }
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedRange(normalizeRange(day.isoDate, day.isoDate));
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            clearRangeSelection();
                          }
                        }}
                        aria-pressed={isInRange}
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
            <h2 id="logged-foods-heading">Today's meals</h2>
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
                await onRefresh();
                setIsMealFormOpen(false);
              }}
              initialMealName={nextMealLabel}
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
