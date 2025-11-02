"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { FoodSuggestion, MealItemInput, createFoodItem, getFoodNutrition, logMeal, searchFoods } from "@/lib/api";

interface MealFormProps {
  onLogged: () => Promise<void> | void;
  initialMealName?: string;
}

const emptyItem: MealItemInput = {
  name: "",
  brand_name: "",
  quantity: "",
  notes: "",
  calories: undefined,
  protein: undefined,
  carbs: undefined,
  fat: undefined
};

type SaveState = {
  status: "idle" | "saving" | "success" | "error";
  message?: string;
};

export default function MealForm({ onLogged, initialMealName = "Meal 1" }: MealFormProps) {
  const [mealName, setMealName] = useState(initialMealName);
  const [items, setItems] = useState<MealItemInput[]>([{ ...emptyItem }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<number, FoodSuggestion[]>>({});
  const [isSearching, setIsSearching] = useState<Record<number, boolean>>({});
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});
  const searchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const updateItem = (index: number, field: keyof MealItemInput, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      if (field === "calories") {
        next[index] = { ...next[index], calories: value ? Number(value) : undefined };
      } else if (field === "protein" || field === "carbs" || field === "fat") {
        next[index] = { ...next[index], [field]: value ? Number(value) : undefined };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });

    setSaveStates((prev) => {
      const current = prev[index];
      if (!current || current.status === "idle") {
        return prev;
      }
      return { ...prev, [index]: { status: "idle" } };
    });

    if (field === "name") {
      triggerSearch(index, value);
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
    setSaveStates((prev) => ({ ...prev, [items.length]: { status: "idle" } }));
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);

      setSuggestions((prevSuggestions) => {
        const updated: Record<number, FoodSuggestion[]> = {};
        next.forEach((_, newIdx) => {
          const oldIdx = newIdx >= index ? newIdx + 1 : newIdx;
          if (prevSuggestions[oldIdx]) {
            updated[newIdx] = prevSuggestions[oldIdx];
          }
        });
        return updated;
      });

      setIsSearching((prevSearching) => {
        const updated: Record<number, boolean> = {};
        next.forEach((_, newIdx) => {
          const oldIdx = newIdx >= index ? newIdx + 1 : newIdx;
          if (prevSearching[oldIdx]) {
            updated[newIdx] = prevSearching[oldIdx];
          }
        });
        return updated;
      });

      setSaveStates((prevStates) => {
        const updated: Record<number, SaveState> = {};
        next.forEach((_, newIdx) => {
          const oldIdx = newIdx >= index ? newIdx + 1 : newIdx;
          if (prevStates[oldIdx]) {
            updated[newIdx] = prevStates[oldIdx];
          }
        });
        return updated;
      });

      const timerKeys = Object.keys(searchTimers.current)
        .map((key) => Number(key))
        .sort((a, b) => a - b);
      for (const key of timerKeys) {
        const timer = searchTimers.current[key];
        if (!timer) continue;
        if (key === index) {
          clearTimeout(timer);
          delete searchTimers.current[key];
        } else if (key > index) {
          searchTimers.current[key - 1] = timer;
          delete searchTimers.current[key];
        }
      }

      return next;
    });
  };

  const triggerSearch = (index: number, term: string) => {
    if (searchTimers.current[index]) {
      clearTimeout(searchTimers.current[index]);
    }

    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      setIsSearching((prev) => ({ ...prev, [index]: false }));
      return;
    }

    setIsSearching((prev) => ({ ...prev, [index]: true }));
    searchTimers.current[index] = setTimeout(async () => {
      try {
        const results = await searchFoods(trimmed);
        setSuggestions((prev) => ({ ...prev, [index]: results }));
      } catch (err) {
        setSuggestions((prev) => ({ ...prev, [index]: [] }));
        console.error("Food search failed", err);
      } finally {
        setIsSearching((prev) => ({ ...prev, [index]: false }));
        delete searchTimers.current[index];
      }
    }, 600);
  };

  useEffect(() => {
    setMealName(initialMealName);
  }, [initialMealName]);

  useEffect(() => {
    return () => {
      Object.values(searchTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const applySuggestion = async (index: number, suggestion: FoodSuggestion) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        name: suggestion.name,
        brand_name: suggestion.brand_name ?? "",
        quantity: next[index].quantity || suggestion.serving_description || "",
        calories: suggestion.calories ?? 0,
        protein: suggestion.protein ?? undefined,
        carbs: suggestion.carbs ?? undefined,
        fat: suggestion.fat ?? undefined
      };
      return next;
    });
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    try {
      const detail = await getFoodNutrition(suggestion.id);
      setItems((prev) => {
        const next = [...prev];
        const current = next[index];
        if (!current) return prev;
        next[index] = {
          ...current,
          name: detail.name ?? current.name,
          brand_name: detail.brand_name ?? current.brand_name,
          quantity: current.quantity || detail.serving_description || current.quantity,
          calories: detail.calories ?? current.calories,
          protein: detail.protein ?? current.protein,
          carbs: detail.carbs ?? current.carbs,
          fat: detail.fat ?? current.fat
        };
        return next;
      });
    } catch (err) {
      console.error("Failed to load nutrition detail", err);
    }
  };

  const canSaveItem = (item: MealItemInput) =>
    item.name.trim().length >= 2 && typeof item.calories === "number" && item.calories > 0;

  const saveCustomFood = async (index: number) => {
    const item = items[index];
    if (!canSaveItem(item)) {
      setSaveStates((prev) => ({
        ...prev,
        [index]: {
          status: "error",
          message: "Provide a name and calories before saving."
        }
      }));
      return;
    }

    setSaveStates((prev) => ({ ...prev, [index]: { status: "saving" } }));
    try {
      const saved = await createFoodItem({
        name: item.name.trim(),
        brand_name: item.brand_name?.trim() ? item.brand_name.trim() : null,
        serving_description: item.quantity?.trim() ? item.quantity.trim() : null,
        calories: item.calories ?? 0,
        protein: item.protein ?? null,
        carbs: item.carbs ?? null,
        fat: item.fat ?? null
      });

      setSaveStates((prev) => ({
        ...prev,
        [index]: { status: "success", message: "Saved to your food library." }
      }));

      setSuggestions((prev) => {
        const existing = prev[index] ?? [];
        const deduped = existing.filter(
          (suggestion) =>
            !(
              suggestion.provider === saved.provider &&
              suggestion.provider_food_id === saved.provider_food_id
            )
        );
        return { ...prev, [index]: [saved, ...deduped] };
      });
    } catch (err) {
      setSaveStates((prev) => ({
        ...prev,
        [index]: {
          status: "error",
          message: err instanceof Error ? err.message : "Unable to save food item."
        }
      }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = items.filter(
      (item) => item.name.trim() && typeof item.calories === "number" && item.calories > 0
    );
    if (payload.length === 0) {
      setError("Add at least one item with calories before logging the meal.");
      setIsSubmitting(false);
      return;
    }

    try {
      await logMeal(mealName, payload);
      setItems([{ ...emptyItem }]);
      setSuggestions({});
      setIsSearching({});
      setSaveStates({});
      await onLogged();
      setMealName(initialMealName);
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
              <div className="autocomplete">
                <input
                  className="input"
                  value={item.name}
                  onChange={(event) => updateItem(index, "name", event.target.value)}
                  placeholder="Greek yogurt"
                />
                {isSearching[index] && <div className="autocomplete-status">Searching...</div>}
                {suggestions[index] && suggestions[index].length > 0 && (
                  <ul className="autocomplete-list">
                    {suggestions[index].map((suggestion) => (
                      <li key={`${suggestion.provider}-${suggestion.provider_food_id}`}>
                        <button
                          type="button"
                          className="autocomplete-item"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => void applySuggestion(index, suggestion)}
                        >
                          <span className="autocomplete-item-name">{suggestion.name}</span>
                          {suggestion.brand_name && (
                            <span className="autocomplete-item-brand">{suggestion.brand_name}</span>
                          )}
                          <span className="autocomplete-item-details">
                            {suggestion.serving_description || "1 serving"}
                            {typeof suggestion.calories === "number" && ` • ${Math.round(suggestion.calories)} kcal`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <label className="label">Brand (optional)</label>
              <input
                className="input"
                value={item.brand_name ?? ""}
                onChange={(event) => updateItem(index, "brand_name", event.target.value)}
                placeholder="Brand name"
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
                    step="0.01"
                    className="input"
                    value={item[key as keyof MealItemInput] ?? ""}
                    onChange={(event) => updateItem(index, key as keyof MealItemInput, event.target.value)}
                  />
                </div>
              )
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
            <button
              type="button"
              className="button-secondary"
              onClick={() => saveCustomFood(index)}
              disabled={saveStates[index]?.status === "saving"}
            >
              {saveStates[index]?.status === "saving" ? "Saving..." : "Save to my foods"}
            </button>
            {items.length > 1 && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => removeItem(index)}
              >
                Remove item
              </button>
            )}
          </div>
          {saveStates[index] && saveStates[index]?.status !== "idle" && (
            <p
              className={
                saveStates[index]?.status === "success" ? "success-text" : "error-text"
              }
              style={{ marginTop: "8px" }}
            >
              {saveStates[index]?.message}
            </p>
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
