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
  kcal_per_g?: number | null;
  protein_per_g?: number | null;
  carb_per_g?: number | null;
  fat_per_g?: number | null;
  created_by_user_id?: number | null;
}

export interface MicronutrientEntry {
  amount: number;
  unit?: string | null;
  label: string;
}

export interface FoodPerHundred {
  unit: string;
  amount: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface FoodPerGram {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface FoodNutritionDetail {
  id?: number;
  provider: string;
  provider_food_id?: string;
  name: string;
  brand_name?: string | null;
  serving_description?: string | null;
  serving_size?: number | null;
  serving_size_unit?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  kcal_per_g?: number | null;
  protein_per_g?: number | null;
  carb_per_g?: number | null;
  fat_per_g?: number | null;
  micronutrients: Record<string, MicronutrientEntry>;
  per_100: FoodPerHundred;
  unit_category: "mass" | "volume";
  per_gram?: FoodPerGram | null;
}

export interface DashboardData {
  user: {
    id: number;
    email: string;
    daily_calorie_target: number;
    height_cm?: number | null;
    weight_kg?: number | null;
    age?: number | null;
    gender?: string | null;
    activity_level?: string | null;
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
  // localStorage에서 토큰 가져오기
  const token = typeof window !== "undefined" ? localStorage.getItem("session_token") : null;
  
  const init: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export async function getDashboard(date?: string): Promise<DashboardData> {
  const url = date ? `/dashboard?date=${encodeURIComponent(date)}` : "/dashboard";
  return request<DashboardData>(url);
}

export async function getRecentMeals(days: number = 30): Promise<DashboardData["meals"]> {
  const url = `/meals/recent?days=${days}`;
  return request<DashboardData["meals"]>(url);
}

export async function login(email: string, password: string): Promise<DashboardData> {
  const response = await request<{ token: string; user: any }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  // 토큰을 localStorage에 저장
  if (typeof window !== "undefined" && response.token) {
    localStorage.setItem("session_token", response.token);
  }
  return getDashboard();
}

export interface RegisterData {
  email: string;
  password: string;
  daily_calorie_target: number;
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  gender?: "male" | "female";
  activity_level?: "sedentary" | "light" | "moderate" | "heavy" | "athlete";
}

export async function register(data: RegisterData): Promise<DashboardData> {
  const response = await request<{ token: string; user: any }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
  // 토큰을 localStorage에 저장
  if (typeof window !== "undefined" && response.token) {
    localStorage.setItem("session_token", response.token);
  }
  return getDashboard();
}

export async function logout(): Promise<void> {
  await request("/auth/logout", {
    method: "POST"
  });
  // localStorage에서 토큰 제거
  if (typeof window !== "undefined") {
    localStorage.removeItem("session_token");
  }
}

export async function updateCalorieTarget(target: number): Promise<{ id: number; email: string; daily_calorie_target: number }> {
  return request<{ id: number; email: string; daily_calorie_target: number }>("/auth/calorie-target", {
    method: "PATCH",
    body: JSON.stringify({ daily_calorie_target: target })
  });
}

export interface UserProfile {
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  gender?: "male" | "female";
  activity_level?: "sedentary" | "light" | "moderate" | "heavy" | "athlete";
}

export async function updateUserProfile(profile: UserProfile): Promise<DashboardData> {
  await request("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(profile)
  });
  return getDashboard();
}

export async function logMeal(name: string, items: MealItemInput[], date?: string): Promise<void> {
  const payload: any = {
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
  
  if (date) {
    payload.date = date;
  }

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

export async function getFoodNutrition(foodId: number, provider?: string): Promise<FoodNutritionDetail> {
  const url = provider 
    ? `/foods/${foodId}/nutrition?provider=${encodeURIComponent(provider)}`
    : `/foods/${foodId}/nutrition`;
  return request<FoodNutritionDetail>(url);
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

// ============================================================================
// Workout Log API (Template 2)
// ============================================================================

export interface WorkoutLog {
  id: number;
  date: string;
  activity_type: string;
  duration_minutes: number | null;
  calories_burned: number | null;
  distance_km: number | null;
  notes: string | null;
  created_at: string;
}

export interface WorkoutLogInput {
  date?: string;
  activity_type: string;
  duration_minutes?: number | null;
  calories_burned?: number | null;
  distance_km?: number | null;
  notes?: string | null;
}

export async function createWorkout(workout: WorkoutLogInput): Promise<WorkoutLog> {
  return request<WorkoutLog>("/workouts", {
    method: "POST",
    body: JSON.stringify(workout)
  });
}

export async function getWorkouts(date?: string): Promise<WorkoutLog[]> {
  const url = date ? `/workouts?date=${encodeURIComponent(date)}` : "/workouts";
  return request<WorkoutLog[]>(url);
}

export async function deleteWorkout(workoutId: number): Promise<void> {
  await request(`/workouts/${workoutId}`, {
    method: "DELETE"
  });
}

// ============================================================================
// Body Fat Analysis API (Template 3)
// ============================================================================

export interface BodyFatAnalysis {
  id: number;
  date: string;
  image_path: string;
  body_fat_percentage: number | null;
  percentile_rank: number | null;
  created_at: string;
}

export interface BodyFatProjection {
  reduction_percentage: number;
  projected_body_fat: number;
  projected_image_path: string | null;
}

export async function analyzeBodyFat(file: File, date?: string): Promise<BodyFatAnalysis> {
  const formData = new FormData();
  formData.append("file", file);
  if (date) {
    formData.append("date", date);
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("session_token") : null;
  const response = await fetch(`${API_BASE_URL}/body-fat/analyze`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: formData,
  });

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

  return response.json();
}

export async function getBodyFatAnalyses(): Promise<BodyFatAnalysis[]> {
  return request<BodyFatAnalysis[]>("/body-fat/analyses");
}

export async function getBodyFatProjections(analysisId: number): Promise<BodyFatProjection[]> {
  return request<BodyFatProjection[]>(`/body-fat/projections/${analysisId}`);
}

// ============================================================================
// Exercise API (Template 2)
// ============================================================================

export interface Exercise {
  category: string;
  exercise_name: string;
  full_name: string;
  met: number;
  kcal_per_hour_60kg: number;
  kcal_per_hour_70kg: number;
  kcal_per_hour_80kg: number;
  kcal_slope: number;
  kcal_intercept: number;
}

export async function searchExercises(query: string, limit: number = 20): Promise<Exercise[]> {
  const params = new URLSearchParams({ query, limit: String(limit) });
  return request<Exercise[]>(`/exercises/search?${params.toString()}`);
}

export async function calculateExerciseCalories(
  exerciseName: string,
  durationMinutes: number,
  weightKg?: number,
  category?: string
): Promise<{ calories_burned: number }> {
  const params = new URLSearchParams({
    exercise_name: exerciseName,
    duration_minutes: String(durationMinutes),
  });
  if (weightKg) params.append("weight_kg", String(weightKg));
  if (category) params.append("category", category);
  return request<{ calories_burned: number }>(`/exercises/calculate-calories?${params.toString()}`);
}

export async function getExerciseCategories(): Promise<string[]> {
  return request<string[]>("/exercises/categories");
}
