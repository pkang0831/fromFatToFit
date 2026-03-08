import api from './client';
import type {
  UserRegister,
  UserLogin,
  TokenResponse,
  User,
  FoodLogCreate,
  FoodLog,
  FoodAnalysisRequest,
  FoodAnalysisResponse,
  BeautyAnalyzeRequest,
  BeautyAnalyzeResponse,
  FashionRecommendRequest,
  FashionRecommendResponse,
  DailySummaryResponse,
  TrendResponse,
  RecentFoodsResponse,
  ExerciseLibraryItem,
  WorkoutLogCreate,
  WorkoutLog,
  WorkoutTrendResponse,
  BodyScanRequest,
  BodyFatEstimateResponse,
  PercentileResponse,
  TransformationResponse,
  EnhancementResponse,
  BodyScanHistoryItem,
  SegmentRequest,
  SegmentResponse,
  RegionTransformRequest,
  RegionTransformResponse,
  CreateCheckoutSessionRequest,
  CheckoutSessionResponse,
  SubscriptionResponse,
  UsageLimitsResponse,
  QuickStatsResponse,
  CalorieBalanceTrendResponse,
  WeightLogCreate,
  WeightLogUpdate,
  WeightLog,
  GoalUpdate,
  GoalProjectionResponse,
} from '@/types/api';

// Guest API (no auth required)
export const guestApi = {
  bodyScan: (data: { image_base64: string; gender: string; age: number }) =>
    api.post<{ body_fat_percentage: number; confidence: string; category: string; insight: string }>('/guest/body-scan', data),
};

// Auth API
export const authApi = {
  register: (data: UserRegister) =>
    api.post<TokenResponse>('/auth/register', data),

  login: (data: UserLogin) =>
    api.post<TokenResponse>('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  getProfile: () =>
    api.get<User>('/auth/me'),

  updateProfile: (data: Partial<User>) =>
    api.put<User>('/auth/profile', data),

  resetPassword: (email: string) =>
    api.post('/auth/reset-password', { email }),
};

// Food API
export const foodApi = {
  logFood: (data: FoodLogCreate) =>
    api.post<FoodLog>('/food/log', data),

  updateLog: (logId: string, data: FoodLogCreate) =>
    api.put<FoodLog>(`/food/log/${logId}`, data),

  analyzePhoto: (data: FoodAnalysisRequest) =>
    api.post<FoodAnalysisResponse>('/food/analyze-photo', data),

  getDailyFood: (date: string) =>
    api.get<DailySummaryResponse>(`/food/daily/${date}`),

  getTrends: (days: number = 7) =>
    api.get<TrendResponse>('/food/trends', { params: { days } }),

  getRecentFoods: (days: number = 7, limit: number = 10) =>
    api.get<RecentFoodsResponse>('/food/recent', { params: { days, limit } }),

  deleteLog: (logId: string) =>
    api.delete(`/food/log/${logId}`),

  logNatural: (text: string, mealType: string, date?: string) =>
    api.post('/food/log-natural', { text, meal_type: mealType, date }),
};

// Workout API
export const workoutApi = {
  getExerciseLibrary: (category?: string) =>
    api.get<ExerciseLibraryItem[]>('/workout/exercises/library', {
      params: category ? { category } : undefined,
    }),

  logWorkout: (data: WorkoutLogCreate) =>
    api.post<WorkoutLog>('/workout/log', data),

  getWorkoutLogs: (date: string) =>
    api.get<WorkoutLog[]>(`/workout/logs/${date}`),

  // Bulk API: Get logs for date range (10x faster than individual calls)
  getWorkoutLogsRange: (startDate: string, endDate: string) =>
    api.get<WorkoutLog[]>('/workout/logs-range', {
      params: { start_date: startDate, end_date: endDate },
    }),

  getTrends: (days: number = 30) =>
    api.get<WorkoutTrendResponse>('/workout/trends', { params: { days } }),

  analyzeForm: (videoBase64: string, exerciseName: string) =>
    api.post('/workout/analyze-form', {
      video_base64: videoBase64,
      exercise_name: exerciseName,
    }),

  deleteLog: (logId: string) =>
    api.delete(`/workout/log/${logId}`),
};

// Body API
export const bodyApi = {
  estimateBodyFat: (data: BodyScanRequest) =>
    api.post<BodyFatEstimateResponse>('/body/estimate-bodyfat', data),

  calculatePercentile: (data: BodyScanRequest) =>
    api.post<PercentileResponse>('/body/percentile', data),

  generateTransformation: (data: BodyScanRequest) =>
    api.post<TransformationResponse>('/body/transformation', data),

  generateEnhancement: (data: BodyScanRequest) =>
    api.post<EnhancementResponse>('/body/enhancement', data),

  getScanHistory: () =>
    api.get<BodyScanHistoryItem[]>('/body/scans/history'),

  segmentBodyPart: (data: SegmentRequest) =>
    api.post<SegmentResponse>('/body/segment', data),

  transformRegion: (data: RegionTransformRequest) =>
    api.post<RegionTransformResponse>('/body/transform-region', data),

  getGapToGoal: () =>
    api.get<import('@/types/api').GapToGoalResponse>('/body/gap-to-goal'),

  saveGoal: (data: { goal_image_url: string; target_bf: number }) =>
    api.patch('/body/save-goal', data),
};

// Payment API
export const paymentApi = {
  createCheckoutSession: (data: CreateCheckoutSessionRequest) =>
    api.post<CheckoutSessionResponse>('/payments/create-checkout-session', data),

  verifyPurchase: (receiptToken: string, platform: 'ios' | 'android') =>
    api.post('/payments/verify-purchase', { receipt_token: receiptToken, platform }),

  getSubscriptionStatus: () =>
    api.get<SubscriptionResponse>('/payments/subscription'),

  getUsageLimits: () =>
    api.get<UsageLimitsResponse>('/payments/usage-limits'),

  getCreditBalance: () =>
    api.get('/payments/credits'),

  buyCreditPack: (data: { pack_size: number; success_url: string; cancel_url: string }) =>
    api.post<CheckoutSessionResponse>('/payments/buy-credits', data),
};

// Dashboard API
export const dashboardApi = {
  getDashboard: () =>
    api.get('/dashboard'),

  getQuickStats: () =>
    api.get<QuickStatsResponse>('/dashboard/quick-stats'),

  getCalorieBalanceTrend: (days: number = 7) =>
    api.get<CalorieBalanceTrendResponse>('/dashboard/calorie-balance-trend', {
      params: { days }
    }),
};

// Food Database API
export const foodDatabaseApi = {
  searchFoods: (query: string, limit: number = 10, category?: string) =>
    api.get('/food-database/search', { 
      params: { q: query, limit, category } 
    }),

  getFoodDetails: (foodId: string) =>
    api.get(`/food-database/${foodId}`),

  getCategories: () =>
    api.get('/food-database/categories'),

  calculateNutrition: (foodId: string, amountGrams: number) =>
    api.post('/food-database/calculate', { 
      food_id: foodId, 
      amount_grams: amountGrams 
    }),

  getDatabaseStats: () =>
    api.get('/food-database/stats/overview'),

  lookupBarcode: (barcode: string) =>
    api.get(`/food-database/barcode/${barcode}`),

  searchExternal: (query: string, limit?: number) =>
    api.get('/food-database/search-external', { params: { q: query, limit: limit || 10 } }),
};

// Food Decision API (AI-powered food decisions and recommendations)
export const foodDecisionApi = {
  shouldIEat: (imageBase64: string) =>
    api.post('/food-decision/should-i-eat', {
      image_base64: imageBase64,
    }),

  recommendFoods: (mealType: string, justAteFoodId?: string) =>
    api.post('/food-decision/recommend', {
      meal_type: mealType,
      just_ate_food_id: justAteFoodId,
    }),

  getPreferences: () =>
    api.get('/food-decision/preferences'),

  updatePreferences: <T extends object>(preferences: T) =>
    api.put('/food-decision/preferences', preferences),
};

// Notification API
export const notificationApi = {
  getPreferences: () =>
    api.get('/notifications/preferences'),

  updatePreferences: <T extends object>(data: T) =>
    api.put('/notifications/preferences', data),

  subscribePush: (subscription: PushSubscriptionJSON) =>
    api.post('/notifications/push/subscribe', subscription),

  unsubscribePush: (endpoint: string) =>
    api.post('/notifications/push/unsubscribe', { endpoint }),
};

// Weight Tracking API
export const weightApi = {
  createLog: (data: WeightLogCreate) =>
    api.post<WeightLog>('/weight/log', data),

  getLogs: (days: number = 30) =>
    api.get<WeightLog[]>('/weight/logs', { params: { days } }),

  updateLog: (logId: string, data: WeightLogUpdate) =>
    api.patch<WeightLog>(`/weight/log/${logId}`, data),

  deleteLog: (logId: string) =>
    api.delete(`/weight/log/${logId}`),

  updateGoals: (goals: GoalUpdate) =>
    api.patch('/weight/goals', goals),

  getProjection: (daysHistory: number = 30, targetDeficit?: number) =>
    api.get<GoalProjectionResponse>('/weight/projection', {
      params: { 
        days_history: daysHistory,
        ...(targetDeficit !== undefined && { target_deficit: targetDeficit }),
        _t: Date.now(),
      },
    }),
};

// Chat API (AI Coach)
export const chatApi = {
  sendMessage: (message: string) =>
    api.post<{ answer: string; sources: string[]; messages_today: number; daily_limit: number }>('/chat/message', { message }),

  getHistory: (limit: number = 50) =>
    api.get<{ id: string; role: string; content: string; sources: string[]; created_at: string }[]>('/chat/history', {
      params: { limit },
    }),

  clearHistory: () =>
    api.delete('/chat/history'),

  getStatus: () =>
    api.get<{ messages_today: number; daily_limit: number; remaining: number }>('/chat/status'),
};

// Progress Photos API
export const progressPhotoApi = {
  upload: (imageBase64: string, notes?: string, weightKg?: number, bodyFatPct?: number) =>
    api.post('/progress-photos', { image_base64: imageBase64, notes, weight_kg: weightKg, body_fat_pct: bodyFatPct }),
  getAll: () => api.get('/progress-photos'),
  getOne: (id: string) => api.get(`/progress-photos/${id}`),
  delete: (id: string) => api.delete(`/progress-photos/${id}`),
  compare: (id1: string, id2: string) => api.get(`/progress-photos/compare/${id1}/${id2}`),
};

// Streak API
export const streakApi = {
  getStreak: () => api.get('/streaks'),
  checkIn: () => api.post('/streaks/check-in'),
};

// Fasting API
export const fastingApi = {
  getPresets: () => api.get('/fasting/presets'),
  getCurrent: () => api.get('/fasting/current'),
  startFast: (protocol: string, targetHours?: number) =>
    api.post('/fasting/start', { protocol, target_hours: targetHours }),
  endFast: (notes?: string) => api.post('/fasting/end', { notes }),
  getHistory: (days?: number) => api.get('/fasting/history', { params: { days: days || 30 } }),
};

// Beauty API
export const beautyApi = {
  analyze: (data: BeautyAnalyzeRequest) =>
    api.post<BeautyAnalyzeResponse>('/beauty/analyze', data),
};

// Fashion API
export const fashionApi = {
  recommend: (data: FashionRecommendRequest) =>
    api.post<FashionRecommendResponse>('/fashion/recommend', data),
};
