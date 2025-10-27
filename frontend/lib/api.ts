export interface Nutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface MealItemInput extends Nutrition {
  name: string;
  brand_name?: string;
  quantity?: string;
  notes?: string;
}

export interface FoodSuggestion {
  id: number;
  provider: string;
  provider_food_id: string;
  name: string;
  brand_name?: string | null;
  serving_description?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  created_by_user_id?: number | null;
}

export interface DashboardData {
  user: {
    id: number;
    email: string;
    daily_calorie_target: number;
  };
  meals: Array<{
    id: number;
    name: string;
    date: string;
    items: Array<{
      id: number;
      name: string;
      quantity?: string | null;
      notes?: string | null;
      food_entries: Array<{
        calories: number;
        protein?: number | null;
        carbs?: number | null;
        fat?: number | null;
      }>;
    }>;
  }>;
  summary: {
    date: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    motivation_message?: string | null;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type RequestInitWithBody = RequestInit & { body?: BodyInit | null };

async function request<T>(path: string, options: RequestInitWithBody = {}): Promise<T> {
  const init: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  };

  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      if (typeof payload.detail === "string") {
        detail = payload.detail;
      }
    } catch (err) {
      // ignore body parsing errors
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>("/dashboard");
}

export async function login(email: string, password: string): Promise<DashboardData> {
  await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return getDashboard();
}

export async function register(email: string, password: string, target: number): Promise<DashboardData> {
  await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, daily_calorie_target: target })
  });
  return getDashboard();
}

export async function logMeal(name: string, items: MealItemInput[]): Promise<void> {
  const payload = {
    name,
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity || null,
      notes: item.notes || null,
      nutrition: {
        calories: item.calories ?? 0,
        protein: item.protein ?? null,
        carbs: item.carbs ?? null,
        fat: item.fat ?? null
      }
    }))
  };

  await request("/meals", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deleteMeal(mealId: number): Promise<void> {
  await request(`/meals/${mealId}`, {
    method: "DELETE"
  });
}

export async function searchFoods(query: string, limit = 10): Promise<FoodSuggestion[]> {
  const params = new URLSearchParams({ query, limit: String(limit) });
  const response = await request<{ query: string; results: FoodSuggestion[] }>(
    `/foods/search?${params.toString()}`
  );
  return response.results;
}

export async function createFoodItem(payload: {
  name: string;
  brand_name?: string | null;
  serving_description?: string | null;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}): Promise<FoodSuggestion> {
  return request<FoodSuggestion>("/foods", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
