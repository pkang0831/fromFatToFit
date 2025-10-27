import MealForm from "@/components/MealForm";
import { DashboardData } from "@/lib/api";

type MacroTotals = { calories: number; protein: number; carbs: number; fat: number };

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

interface TemplateThreeProps {
  data: DashboardData;
  onRefresh: () => Promise<void> | void;
}

export default function TemplateThree({ data, onRefresh }: TemplateThreeProps) {
  return (
    <div className="template-three">
      <header className="template-three__hero">
        <div>
          <p className="template-three__eyebrow">Hello, {data.user.email}</p>
          <h1>Track. Adjust. Improve.</h1>
          <p>Review your meals at a glance and fine-tune macros effortlessly.</p>
        </div>
        <div className="template-three__hero-stats">
          <div>
            <span>Calories</span>
            <strong>{Math.round(data.summary.total_calories)}</strong>
          </div>
          <div>
            <span>Protein</span>
            <strong>{data.summary.total_protein.toFixed(1)} g</strong>
          </div>
          <div>
            <span>Carbs</span>
            <strong>{data.summary.total_carbs.toFixed(1)} g</strong>
          </div>
          <div>
            <span>Fat</span>
            <strong>{data.summary.total_fat.toFixed(1)} g</strong>
          </div>
        </div>
      </header>

      <section className="template-three__content">
        <aside>
          <h2>Quick entry</h2>
          <MealForm onLogged={onRefresh} />
        </aside>
        <section className="template-three__meals">
          <h2>Today's meals</h2>
          {data.meals.length === 0 ? (
            <p className="template-three__empty">No meals logged yet. Add your first meal to get started.</p>
          ) : (
            <ul>
              {data.meals.map((meal) => (
                <li key={meal.id}>
                  <header>
                    <h3>{meal.name}</h3>
                    <time dateTime={toISODate(meal.date)}>{formatTime(meal.date)}</time>
                  </header>
                  <ul>
                    {meal.items.map((item) => {
                      const totals = item.food_entries.reduce<MacroTotals>(
                        (acc, entry) => ({
                          calories: acc.calories + entry.calories,
                          protein: acc.protein + (entry.protein ?? 0),
                          carbs: acc.carbs + (entry.carbs ?? 0),
                          fat: acc.fat + (entry.fat ?? 0)
                        }),
                        { calories: 0, protein: 0, carbs: 0, fat: 0 }
                      );

                      return (
                        <li key={item.id}>
                          <div>
                            <strong>{item.name}</strong>
                            {item.quantity && <span>{item.quantity}</span>}
                            {item.notes && <span>{item.notes}</span>}
                          </div>
                          <div>
                            <span>{Math.round(totals.calories)} kcal</span>
                            <span>
                              P {totals.protein.toFixed(1)} • C {totals.carbs.toFixed(1)} • F {totals.fat.toFixed(1)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </div>
  );
}
