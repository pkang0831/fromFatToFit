"use client";

import { FormEvent, useState } from "react";

import { MealItemInput, logMeal } from "@/lib/api";

const emptyItem: MealItemInput = {
  name: "",
  quantity: "",
  notes: "",
  calories: 0,
  protein: undefined,
  carbs: undefined,
  fat: undefined
};

export default function MealForm({ onLogged }: { onLogged: () => Promise<void> | void }) {
  const [mealName, setMealName] = useState("Breakfast");
  const [items, setItems] = useState<MealItemInput[]>([{ ...emptyItem }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateItem = (index: number, field: keyof MealItemInput, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      if (field === "calories" || field === "protein" || field === "carbs" || field === "fat") {
        next[index] = { ...next[index], [field]: value ? Number(value) : undefined };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = items.filter((item) => item.name && item.calories > 0);
    if (payload.length === 0) {
      setError("Add at least one item with calories before logging the meal.");
      setIsSubmitting(false);
      return;
    }

    try {
      await logMeal(mealName, payload);
      setItems([{ ...emptyItem }]);
      await onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: "24px" }}>
      <h2 className="section-title">Log a meal</h2>
      <div style={{ marginBottom: "16px" }}>
        <label className="label" htmlFor="meal-name">
          Meal name
        </label>
        <input
          id="meal-name"
          className="input"
          value={mealName}
          onChange={(event) => setMealName(event.target.value)}
          placeholder="Lunch"
        />
      </div>

      {items.map((item, index) => (
        <div key={index} className="meal-item">
          <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div>
              <label className="label">Item</label>
              <input
                className="input"
                value={item.name}
                onChange={(event) => updateItem(index, "name", event.target.value)}
                placeholder="Greek yogurt"
              />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                className="input"
                value={item.quantity ?? ""}
                onChange={(event) => updateItem(index, "quantity", event.target.value)}
                placeholder="1 cup"
              />
            </div>
          </div>
          <div className="meal-grid" style={{ marginTop: "12px" }}>
            {[{ key: "calories", label: "Calories" }, { key: "protein", label: "Protein (g)" }, { key: "carbs", label: "Carbs (g)" }, { key: "fat", label: "Fat (g)" }].map(
              ({ key, label }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="input"
                    value={item[key as keyof MealItemInput] ?? ""}
                    onChange={(event) => updateItem(index, key as keyof MealItemInput, event.target.value)}
                  />
                </div>
              )
            )}
          </div>
          {items.length > 1 && (
            <button type="button" className="button-secondary" style={{ marginTop: "12px" }} onClick={() => removeItem(index)}>
              Remove item
            </button>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
        <button type="button" className="button-secondary" onClick={addItem}>
          Add another item
        </button>
        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? "Logging..." : "Log meal"}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
