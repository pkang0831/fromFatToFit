import MealForm from "@/components/MealForm";
import { DashboardData } from "@/lib/api";

interface TemplateTwoProps {
  data: DashboardData;
  onRefresh: () => Promise<void> | void;
}

export default function TemplateTwo({ data, onRefresh }: TemplateTwoProps) {
  const totals = data.summary;

  return (
    <div className="container">
      <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <header className="card">
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Welcome back, {data.user.email}</h1>
              <p className="text-muted">Stay consistent—log meals as you go today.</p>
            </div>
            <span className="badge">Target {data.user.daily_calorie_target} kcal</span>
          </div>
          <div className="success-banner" style={{ marginTop: "16px" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{totals.motivation_message}</p>
            <p className="text-small" style={{ marginTop: "8px" }}>
              Today's intake: {totals.total_calories.toFixed(0)} kcal • Protein {totals.total_protein.toFixed(1)} g • Carbs {totals.total_carbs.toFixed(1)} g • Fat {totals.total_fat.toFixed(1)} g
            </p>
          </div>
        </header>

        <MealForm onLogged={onRefresh} />

        <section>
          <h2 className="section-title">Today's meals</h2>
          {data.meals.length === 0 ? (
            <div className="subtle-card">No meals logged yet. Start by adding one above!</div>
          ) : (
            data.meals.map((meal) => (
              <article key={meal.id} className="card">
                <h3 style={{ marginTop: 0, fontSize: "1.25rem", fontWeight: 600 }}>{meal.name}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {meal.items.map((item) => (
                    <li key={item.id} className="meal-item">
                      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px" }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600 }}>{item.name}</p>
                          {item.quantity && (
                            <p className="text-small" style={{ margin: "4px 0 0" }}>{item.quantity}</p>
                          )}
                          {item.notes && (
                            <p className="text-small" style={{ margin: "4px 0 0" }}>{item.notes}</p>
                          )}
                        </div>
                        {item.food_entries.map((entry, idx) => (
                          <div key={idx} className="text-small" style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>{entry.calories.toFixed(0)} kcal</p>
                            <p style={{ margin: "4px 0 0" }}>
                              P {entry.protein?.toFixed(1) ?? 0} g • C {entry.carbs?.toFixed(1) ?? 0} g • F {entry.fat?.toFixed(1) ?? 0} g
                            </p>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </section>
      </section>
    </div>
  );
}
