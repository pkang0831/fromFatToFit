"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import {
  FoodSuggestion,
  MealItemInput,
  createFoodItem,
  getFoodNutrition,
  logMeal,
  searchFoods,
  FoodPerHundred,
  FoodPerGram
} from "@/lib/api";

interface MealFormProps {
  onLogged: () => Promise<void> | void;
  initialMealName?: string;
  date?: string; // 선택된 날짜 (YYYY-MM-DD 형식)
}

type UnitSystem = "metric" | "us";
type UnitCategory = "mass" | "volume";
const MACRO_KEYS = ["calories", "protein", "carbs", "fat"] as const;
type MacroKey = (typeof MACRO_KEYS)[number];
const MACRO_LABELS: Record<MacroKey, string> = {
  calories: "Calories",
  protein: "Protein (g)",
  carbs: "Carbs (g)",
  fat: "Fat (g)"
};

interface UnitOption {
  value: string;
  label: string;
  system: UnitSystem;
  factor: number; // grams or milliliters per unit
}

const MASS_UNIT_OPTIONS: UnitOption[] = [
  { value: "g", label: "g", system: "metric", factor: 1 },
  { value: "kg", label: "kg", system: "metric", factor: 1000 },
  { value: "mg", label: "mg", system: "metric", factor: 0.001 },
  { value: "oz", label: "oz", system: "us", factor: 28.3495 },
  { value: "lb", label: "lb", system: "us", factor: 453.592 }
];

const VOLUME_UNIT_OPTIONS: UnitOption[] = [
  { value: "ml", label: "mL", system: "metric", factor: 1 },
  { value: "l", label: "L", system: "metric", factor: 1000 },
  { value: "cup", label: "cup", system: "us", factor: 240 },
  { value: "floz", label: "fl oz", system: "us", factor: 29.5735 },
  { value: "tbsp", label: "tbsp", system: "us", factor: 15 },
  { value: "tsp", label: "tsp", system: "us", factor: 5 }
];

const MASS_UNIT_MAP = MASS_UNIT_OPTIONS.reduce<Record<string, UnitOption>>((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

const VOLUME_UNIT_MAP = VOLUME_UNIT_OPTIONS.reduce<Record<string, UnitOption>>((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

const getUnitOptions = (category: UnitCategory, system: UnitSystem): UnitOption[] => {
  const options = category === "mass" ? MASS_UNIT_OPTIONS : VOLUME_UNIT_OPTIONS;
  return options.filter((option) => option.system === system);
};

const getUnitMap = (category: UnitCategory): Record<string, UnitOption> =>
  category === "mass" ? MASS_UNIT_MAP : VOLUME_UNIT_MAP;

const getDefaultUnit = (category: UnitCategory, system: UnitSystem): string => {
  const options = getUnitOptions(category, system);
  return options.length > 0 ? options[0].value : category === "mass" ? "g" : "ml";
};

const formatNumber = (value?: number | null, decimals = 2): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "";
  }
  return (Math.round(value * 10 ** decimals) / 10 ** decimals).toString();
};

const normalizeMacro = (value?: number | null): number | undefined =>
  value === null || value === undefined ? undefined : value;

const sanitizeQuantityInput = (rawValue: string): { display: string; numeric: number } => {
  const cleaned = rawValue.replace(/[^0-9.,]/g, "");
  const normalized = cleaned.replace(",", ".");
  if (normalized === "" || normalized === ".") {
    return { display: "", numeric: NaN };
  }
  const numeric = Number(normalized);
  return { display: normalized, numeric };
};

const calculateMacros = (
  per100: FoodPerHundred | undefined,
  category: UnitCategory,
  unit: string,
  quantity: number,
  perGram?: FoodPerGram | null
) => {
  if (quantity <= 0) {
    return { calories: undefined, protein: undefined, carbs: undefined, fat: undefined };
  }

  if (category === "mass" && perGram) {
    const option = MASS_UNIT_MAP[unit];
    if (option) {
      const grams = option.factor * quantity;
      const multiply = (value?: number | null) =>
        value === undefined || value === null ? undefined : value * grams;
      return {
        calories: multiply(perGram.calories),
        protein: multiply(perGram.protein),
        carbs: multiply(perGram.carbs),
        fat: multiply(perGram.fat)
      };
    }
  }

  if (!per100) {
    return { calories: undefined, protein: undefined, carbs: undefined, fat: undefined };
  }

  const map = getUnitMap(category);
  const option = map[unit];
  if (!option) {
    const scale = per100.amount ? quantity / per100.amount : quantity;
    const multiply = (value?: number | null) => (value === undefined || value === null ? undefined : value * scale);
    return {
      calories: multiply(per100.calories),
      protein: multiply(per100.protein),
      carbs: multiply(per100.carbs),
      fat: multiply(per100.fat)
    };
  }

  const basePerUnit = option.factor / per100.amount;
  const scale = basePerUnit * quantity;

  const multiply = (value?: number | null) => (value === undefined || value === null ? undefined : value * scale);

  return {
    calories: multiply(per100.calories),
    protein: multiply(per100.protein),
    carbs: multiply(per100.carbs),
    fat: multiply(per100.fat)
  };
};

interface MealItemState extends MealItemInput {
  unitCategory: UnitCategory;
  unitSystem: UnitSystem;
  selectedUnit: string;
  quantityValue: number;
  quantityInput: string;
  per100?: FoodPerHundred;
  perGram?: FoodPerGram | null;
  servingSize?: number | null;
  servingSizeUnit?: string | null;
  manualMacros?: Partial<Record<MacroKey, boolean>>;
  manualValues?: Partial<Record<MacroKey, string>>;
}

const emptyItem: MealItemState = {
  name: "",
  brand_name: "",
  quantity: "1 g",
  notes: "",
  calories: undefined,
  protein: undefined,
  carbs: undefined,
  fat: undefined,
  unitCategory: "mass",
  unitSystem: "metric",
  selectedUnit: "g",
  quantityValue: 1,
  quantityInput: "1",
  servingSize: null,
  servingSizeUnit: null,
  perGram: null,
  manualMacros: undefined,
  manualValues: undefined
};

type SaveState = {
  status: "idle" | "saving" | "success" | "error";
  message?: string;
};

export default function MealForm({ onLogged, initialMealName = "Meal 1", date }: MealFormProps) {
  const [mealName, setMealName] = useState(initialMealName);
  const [items, setItems] = useState<MealItemState[]>([{ ...emptyItem }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<number, FoodSuggestion[]>>({});
  const [isSearching, setIsSearching] = useState<Record<number, boolean>>({});
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});
  const searchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const updateItem = (
    index: number,
    updates: Partial<MealItemState>,
    options: { recalc?: boolean; suppressSearch?: boolean } = {}
  ) => {
    setItems((prev) => {
      const next = [...prev];
      let merged = { ...next[index], ...updates };
      if (options.recalc) {
        const quantityValue = merged.quantityValue ?? 0;
        const macros = calculateMacros(
          merged.per100,
          merged.unitCategory,
          merged.selectedUnit,
          quantityValue,
          merged.perGram
        );
        const manual = merged.manualMacros ?? {};
        const applied: Partial<MealItemState> = {};
        MACRO_KEYS.forEach((key) => {
          if (!manual[key] && macros[key] !== undefined) {
            applied[key] = macros[key];
          }
        });
        if (!merged.manualMacros || Object.keys(merged.manualMacros).length === 0) {
          merged.manualValues = undefined;
        }
        const quantityText = quantityValue > 0 ? `${formatNumber(quantityValue)} ${merged.selectedUnit}` : "";
        const existingInput = merged.quantityInput ?? "";
        const quantityInput =
          updates.quantityInput !== undefined
            ? updates.quantityInput
            : quantityValue > 0
              ? formatNumber(quantityValue)
              : existingInput;
        merged = {
          ...merged,
          ...applied,
          quantity: quantityText,
          quantityInput
        };
      }
      next[index] = merged;
      return next;
    });

    setSaveStates((prev) => {
      const current = prev[index];
      if (!current || current.status === "idle") {
        return prev;
      }
      return { ...prev, [index]: { status: "idle" } };
    });

    if (!options.suppressSearch && typeof updates.name === "string") {
      triggerSearch(index, updates.name);
    }
  };

  const handleQuantityValueChange = (index: number, rawValue: string) => {
    const { display, numeric } = sanitizeQuantityInput(rawValue);
    const quantity = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    updateItem(
      index,
      {
        quantityValue: quantity,
        quantityInput: display,
        manualMacros: undefined,
        manualValues: undefined
      },
      { recalc: true }
    );
  };

  const handleUnitChange = (index: number, unit: string) => {
    updateItem(index, { selectedUnit: unit, manualMacros: undefined, manualValues: undefined }, { recalc: true });
  };

  const handleUnitSystemChange = (index: number, system: UnitSystem) => {
    const current = items[index];
    if (!current) return;
    const nextUnit = getDefaultUnit(current.unitCategory, system);
    updateItem(index, { unitSystem: system, selectedUnit: nextUnit, manualMacros: undefined, manualValues: undefined }, { recalc: true });
  };

  const handleMacroInputChange = (index: number, key: MacroKey, rawValue: string) => {
    const current = items[index];
    if (!current) return;
    const { display, numeric } = sanitizeQuantityInput(rawValue);
    const manual = { ...(current.manualMacros ?? {}) };
    const manualValues = { ...(current.manualValues ?? {}) };
    if (display === "") {
      delete manual[key];
      delete manualValues[key];
    } else {
      manual[key] = true;
      manualValues[key] = display;
    }
    const cleanedManual = Object.keys(manual).length > 0 ? manual : undefined;
    const cleanedValues = Object.keys(manualValues).length > 0 ? manualValues : undefined;
    updateItem(
      index,
      {
        [key]: Number.isFinite(numeric) ? numeric : undefined,
        manualMacros: cleanedManual,
        manualValues: cleanedValues
      },
      { suppressSearch: true, recalc: cleanedManual === undefined }
    );
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
    updateItem(index, {
      name: suggestion.name,
      brand_name: suggestion.brand_name ?? "",
      calories: normalizeMacro(suggestion.calories),
      protein: normalizeMacro(suggestion.protein),
      carbs: normalizeMacro(suggestion.carbs),
      fat: normalizeMacro(suggestion.fat),
      quantity: suggestion.serving_description ?? "",
      perGram:
        suggestion.kcal_per_g !== undefined ||
        suggestion.protein_per_g !== undefined ||
        suggestion.carb_per_g !== undefined ||
        suggestion.fat_per_g !== undefined
          ? {
              calories: normalizeMacro(suggestion.kcal_per_g),
              protein: normalizeMacro(suggestion.protein_per_g),
              carbs: normalizeMacro(suggestion.carb_per_g),
              fat: normalizeMacro(suggestion.fat_per_g)
            }
          : null,
      manualMacros: undefined,
      manualValues: undefined
    }, { suppressSearch: true });
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    try {
      console.log("applySuggestion: fetching nutrition for", {
        id: suggestion.id,
        name: suggestion.name,
        provider: suggestion.provider,
        provider_food_id: suggestion.provider_food_id
      });
      const detail = await getFoodNutrition(suggestion.id, suggestion.provider);
      console.log("applySuggestion: received detail", {
        name: detail.name,
        calories: detail.calories
      });
      const unitCategory: UnitCategory = detail.unit_category ?? "mass";
      const unitSystem: UnitSystem = "metric";
      const availableUnits = getUnitMap(unitCategory);
      const per100 = detail.per_100;
      let perGram = detail.per_gram;
      if (
        !perGram &&
        per100 &&
        per100.amount &&
        per100.amount > 0 &&
        detail.unit_category === "mass"
      ) {
        perGram = {
          calories: per100.calories != null ? per100.calories / per100.amount : null,
          protein: per100.protein != null ? per100.protein / per100.amount : null,
          carbs: per100.carbs != null ? per100.carbs / per100.amount : null,
          fat: per100.fat != null ? per100.fat / per100.amount : null
        };
      }
      const preferredUnit = per100?.unit && availableUnits[per100.unit] ? per100.unit : undefined;
      const defaultUnit = preferredUnit ?? getDefaultUnit(unitCategory, unitSystem);
      const initialQuantity = per100?.amount && per100.amount > 0 ? per100.amount : detail.serving_size ?? 1;
      updateItem(
        index,
        {
          name: detail.name ?? suggestion.name,
          brand_name: detail.brand_name ?? suggestion.brand_name ?? "",
          servingSize: detail.serving_size ?? null,
          servingSizeUnit: detail.serving_size_unit ?? null,
          per100,
          perGram: perGram ?? null,
          unitCategory,
          unitSystem,
          selectedUnit: defaultUnit,
          quantityValue: initialQuantity,
          quantityInput: formatNumber(initialQuantity),
          calories: normalizeMacro(detail.calories ?? suggestion.calories),
          protein: normalizeMacro(detail.protein ?? suggestion.protein),
          carbs: normalizeMacro(detail.carbs ?? suggestion.carbs),
          fat: normalizeMacro(detail.fat ?? suggestion.fat),
          manualMacros: undefined,
          manualValues: undefined
        },
        { recalc: Boolean(detail.per_100), suppressSearch: true }
      );
    } catch (err) {
      console.error("Failed to load nutrition detail", err);
    }
  };

  const canSaveItem = (item: MealItemState) =>
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

    const payloadItems = items
      .filter((item) => item.name.trim() && typeof item.calories === "number" && item.calories > 0)
      .map(({ name, brand_name, quantity, notes, calories, protein, carbs, fat }) => ({
        name,
        brand_name,
        quantity,
        notes,
        calories,
        protein,
        carbs,
        fat
      }));

    if (payloadItems.length === 0) {
      setError("Add at least one item with calories before logging the meal.");
      setIsSubmitting(false);
      return;
    }

    try {
      await logMeal(mealName, payloadItems, date);
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
                  onChange={(event) => updateItem(index, { name: event.target.value })}
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
                onChange={(event) => updateItem(index, { brand_name: event.target.value })}
                placeholder="Brand name"
              />
            </div>
            <div>
              <label className="label">Quantity</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  className="input"
                  value={item.quantityInput}
                  onChange={(event) => handleQuantityValueChange(index, event.target.value)}
                />
                <select
                  className="input"
                  value={item.selectedUnit}
                  onChange={(event) => handleUnitChange(index, event.target.value)}
                >
                  {getUnitOptions(item.unitCategory, item.unitSystem).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  marginTop: "8px",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "1px solid #e5e7eb"
                }}
              >
                {(["metric", "us"] as UnitSystem[]).map((system) => (
                  <button
                    key={system}
                    type="button"
                    onClick={() => handleUnitSystemChange(index, system)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      cursor: "pointer",
                      background: item.unitSystem === system ? "#2563eb" : "transparent",
                      color: item.unitSystem === system ? "#fff" : "#6b7280"
                    }}
                  >
                    {system === "metric" ? "Metric" : "US"}
                  </button>
                ))}
              </div>
              {item.per100 && (
                <p className="muted-text" style={{ marginTop: "8px" }}>
                  Per 100{item.per100.unit}: {formatNumber(item.per100.calories)} kcal · {formatNumber(item.per100.protein)} g protein · {formatNumber(item.per100.carbs)} g carbs · {formatNumber(item.per100.fat)} g fat
                </p>
              )}
            </div>
          </div>
          <div className="meal-grid" style={{ marginTop: "12px" }}>
            {MACRO_KEYS.map((key) => (
              <div key={key}>
                <label className="label">{MACRO_LABELS[key]}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  className="input"
                  value={
                    item.manualValues?.[key] !== undefined
                      ? item.manualValues[key] ?? ""
                      : formatNumber(item[key])
                  }
                  onChange={(event) => handleMacroInputChange(index, key, event.target.value)}
                />
              </div>
            ))}
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
