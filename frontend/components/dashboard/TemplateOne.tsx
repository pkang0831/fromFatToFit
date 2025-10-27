import MealForm from "@/components/MealForm";
import { DashboardData } from "@/lib/api";

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

function buildCalendar(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return { monthLabel: "This Month", weeks: [] as Array<Array<{ day: number; isToday: boolean }>> };
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const monthLabel = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: Array<Array<{ day: number; isToday: boolean }>> = [];
  let currentWeek: Array<{ day: number; isToday: boolean }> = [];

  for (let i = 0; i < firstDay; i += 1) {
    currentWeek.push({ day: 0, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    currentWeek.push({ day, isToday: day === date.getDate() });
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

function getRecentMealItems(data: DashboardData) {
  const items = data.meals.flatMap((meal) =>
    meal.items.map((item) => {
      const aggregate = item.food_entries.reduce<MacroTotals>(
        (acc, entry) => ({
          calories: acc.calories + entry.calories,
          protein: acc.protein + (entry.protein ?? 0),
          carbs: acc.carbs + (entry.carbs ?? 0),
          fat: acc.fat + (entry.fat ?? 0)
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      return {
        id: item.id,
        name: item.name,
        mealName: meal.name,
        calories: aggregate.calories,
        protein: aggregate.protein,
        carbs: aggregate.carbs,
        fat: aggregate.fat
      };
    })
  );

  return items.sort((a, b) => b.calories - a.calories).slice(0, 5);
}

function generateSparkline(values: number[]) {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
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
  const recentItems = getRecentMealItems(data);

  const calorieTarget = user.daily_calorie_target;
  const calorieProgressRaw =
    calorieTarget > 0 ? (summary.total_calories / calorieTarget) * 100 : 0;
  const calorieProgress = Math.min(100, Math.max(0, calorieProgressRaw));

  const sparklineValues = [
    Math.max(40, calorieProgress - 8),
    Math.max(45, calorieProgress - 4),
    calorieProgress,
    Math.min(100, calorieProgress + 3),
    Math.max(35, calorieProgress - 10)
  ];

  return (
    <div className="template-one">
      <div className="template-one__grid">
        <section className="template-one__card template-one__summary" aria-labelledby="summary-heading">
          <header className="template-one__card-header">
            <div>
              <p className="template-one__eyebrow">Daily nutrition summary</p>
              <h2 id="summary-heading">{calendar.monthLabel}</h2>
            </div>
            <span className="template-one__badge">Target {formatNumber(calorieTarget)} kcal</span>
          </header>

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
              <p className="template-one__motivation">{summary.motivation_message ?? "Keep it going—consistency wins."}</p>
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

          <div className="template-one__table">
            <header>
              <h3>Logged foods</h3>
              <button className="template-one__refresh" type="button" onClick={onRefresh}>
                Refresh
              </button>
            </header>
            {recentItems.length === 0 ? (
              <p className="template-one__empty">No foods logged yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th scope="col">Food</th>
                    <th scope="col">Meal</th>
                    <th scope="col">Calories</th>
                    <th scope="col">Carbs</th>
                    <th scope="col">Protein</th>
                    <th scope="col">Fat</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item) => (
                    <tr key={item.id}>
                      <th scope="row">{item.name}</th>
                      <td>{item.mealName}</td>
                      <td>{formatNumber(item.calories)}</td>
                      <td>{formatNumber(item.carbs, 1)} g</td>
                      <td>{formatNumber(item.protein, 1)} g</td>
                      <td>{formatNumber(item.fat, 1)} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="template-one__card template-one__progress" aria-labelledby="progress-heading">
          <header className="template-one__card-header">
            <p className="template-one__eyebrow">Progress</p>
            <h2 id="progress-heading">Daily trend</h2>
          </header>

          <div className="template-one__sparkline">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                points={generateSparkline(sparklineValues)}
                fill="none"
                stroke="#86a361"
                strokeWidth={4}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <ul className="template-one__progress-list">
            <li>
              <span className="template-one__progress-label">Calories</span>
              <strong>{Math.round(calorieProgress)}%</strong>
              <span className="template-one__progress-meta">of daily goal</span>
            </li>
            <li>
              <span className="template-one__progress-label">Meals logged</span>
              <strong>{data.meals.length}</strong>
              <span className="template-one__progress-meta">today</span>
            </li>
            <li>
              <span className="template-one__progress-label">Foods</span>
              <strong>{recentItems.length}</strong>
              <span className="template-one__progress-meta">top entries</span>
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
                  {week.map((day, dayIndex) => (
                    <span
                      key={`${index}-${dayIndex}`}
                      role="gridcell"
                      className={`template-one__calendar-day${
                        day.day === 0 ? " template-one__calendar-day--empty" : ""
                      }${day.isToday ? " template-one__calendar-day--active" : ""}`}
                    >
                      {day.day !== 0 ? day.day : ""}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="template-one__card template-one__form" aria-labelledby="log-meal-heading">
        <header className="template-one__card-header">
          <p className="template-one__eyebrow">Log meal</p>
          <h2 id="log-meal-heading">Add new entry</h2>
        </header>
        <MealForm onLogged={onRefresh} />
      </section>

      <section className="template-one__card template-one__meals" aria-labelledby="meals-heading">
        <header className="template-one__card-header">
          <p className="template-one__eyebrow">Today</p>
          <h2 id="meals-heading">Meal timeline</h2>
        </header>

        {data.meals.length === 0 ? (
          <p className="template-one__empty">No meals logged yet. Start by adding one above.</p>
        ) : (
          <ol className="template-one__timeline">
            {data.meals.map((meal) => (
              <li key={meal.id}>
                <div className="template-one__timeline-point" />
                <div className="template-one__timeline-card">
                  <header>
                    <h3>{meal.name}</h3>
                    <time dateTime={toISODate(meal.date)}>{formatTime(meal.date)}</time>
                  </header>
                  <ul>
                    {meal.items.map((item) => (
                      <li key={item.id}>
                        <div>
                          <p>{item.name}</p>
                          {item.quantity && <span>{item.quantity}</span>}
                          {item.notes && <span>{item.notes}</span>}
                        </div>
                        {item.food_entries.map((entry, idx) => (
                          <aside key={idx}>
                            <strong>{Math.round(entry.calories)} kcal</strong>
                            <span>
                              P {entry.protein?.toFixed(1) ?? 0} • C {entry.carbs?.toFixed(1) ?? 0} • F {entry.fat?.toFixed(1) ?? 0}
                            </span>
                          </aside>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
