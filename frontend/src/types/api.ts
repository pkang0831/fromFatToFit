// User types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  gender?: 'male' | 'female';
  ethnicity?: string;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'heavy' | 'athlete';
  calorie_goal?: number;
  premium_status: boolean;
  onboarding_completed: boolean;
  created_at: string;
  consent_terms_at?: string;
  consent_privacy_at?: string;
  consent_sensitive_data_at?: string;
  consent_age_verified_at?: string;
  consent_version?: string;
}

export interface UserRegister {
  email: string;
  password: string;
  full_name?: string;
  ethnicity?: string;
  gender?: 'male' | 'female';
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: string;
  consent_terms: boolean;
  consent_privacy: boolean;
  consent_sensitive_data: boolean;
  consent_age_verification: boolean;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Food types
export interface FoodLogCreate {
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  serving_size?: string;
  source?: 'manual' | 'ai';
  image_url?: string;
}

export interface FoodLog extends FoodLogCreate {
  id: string;
  user_id: string;
  created_at: string;
}

export interface FoodAnalysisRequest {
  image_base64: string;
}

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
}

export interface FoodAnalysisResponse {
  items: FoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  analysis_confidence: 'low' | 'medium' | 'high';
  usage_remaining: number;
}

export interface DailySummaryResponse {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  calorie_goal: number;
  meals: FoodLog[];
}

export interface TrendDataPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: number;
}

export interface TrendResponse {
  data: TrendDataPoint[];
  average_calories: number;
  days: number;
}

export interface RecentFoodItem {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size?: string;
  meal_type: string;
  last_logged: string;
}

export interface RecentFoodsResponse {
  recent_foods: RecentFoodItem[];
}

// Workout types
export interface ExerciseLibraryItem {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  form_instructions: string;
  demo_image_url?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  met_value?: number;
  exercise_type?: 'cardio' | 'strength';
}

export interface WorkoutSet {
  set_number: number;
  reps: number;
  weight?: number;
}

export interface WorkoutLogCreate {
  date: string;
  exercise_id: string;
  exercise_name: string;
  sets: WorkoutSet[];
  duration_minutes?: number;
  notes?: string;
}

export interface WorkoutLog extends WorkoutLogCreate {
  id: string;
  user_id: string;
  created_at: string;
  calories_burned?: number;
}

export interface WorkoutTrendDataPoint {
  date: string;
  workout_count: number;
  total_volume: number;
  duration_minutes: number;
}

export interface WorkoutTrendResponse {
  data: WorkoutTrendDataPoint[];
  total_workouts: number;
  average_per_week: number;
  days: number;
}

// Body analysis types
export interface BodyScanRequest {
  image_base64: string;
  scan_type: 'bodyfat' | 'percentile' | 'transformation' | 'enhancement';
  gender: 'male' | 'female';
  age?: number;
  ethnicity?: string;
  height_cm?: number;
  target_bf?: number;
  target_bf_reduction?: number;
  enhancement_level?: 'subtle' | 'natural' | 'studio';
}

export interface BodyFatEstimateResponse {
  body_fat_percentage: number;
  confidence: 'low' | 'medium' | 'high';
  recommendations: string[];
  scan_id: string;
  usage_remaining: number;
}

export interface PercentileResponse {
  percentile_data: {
    percentile: number;
    rank_text: string;
    comparison_group: string;
    body_fat_percentage: number;
  };
  distribution_data: Record<string, number>;
  scan_id: string;
  usage_remaining: number;
}

export interface ProgressFrame {
  date: string;
  week: number;
  bf_pct: number;
  image_b64: string;
}

export interface TransformationResponse {
  original_image_url: string;
  transformed_image_url: string;
  current_bf?: number;
  target_bf?: number;
  direction?: 'cutting' | 'bulking';
  muscle_gain_estimate?: string;
  estimated_timeline_weeks: number;
  recommendations: string[];
  progress_frames?: ProgressFrame[];
  scan_id: string;
}

export interface EnhancementResponse {
  original_image_url: string;
  enhanced_image_url: string;
  enhancement_level: string;
  scan_id: string;
}

export interface BodyScanHistoryItem {
  id: string;
  scan_type: 'bodyfat' | 'percentile' | 'transformation' | 'enhancement';
  date: string;
  result_summary: string;
  image_url?: string;
}

export interface ScanHistoryPoint {
  date: string;
  bf: number;
}

export interface GapToGoalResponse {
  current_bf: number | null;
  target_bf: number | null;
  goal_image_url: string | null;
  gap: number | null;
  scan_count: number;
  last_scan_date: string | null;
  scan_history: ScanHistoryPoint[];
}

// Payment types
export interface CreateCheckoutSessionRequest {
  price_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutSessionResponse {
  session_id: string;
  checkout_url: string;
}

export interface SubscriptionResponse {
  subscription_id?: string;
  user_id?: string;
  subscription_type: 'free' | 'premium';
  status: 'none' | 'active' | 'cancelled' | 'expired';
  start_date?: string;
  end_date?: string;
  payment_provider?: 'stripe' | 'revenuecat';
  auto_renew?: boolean;
  premium_status: boolean;
}

export interface UsageLimit {
  current_count: number;
  limit: number;
  remaining: number;
  is_premium: boolean;
}

export interface UsageLimitsResponse {
  is_premium: boolean;
  limits: {
    food_scan: UsageLimit;
    body_fat_scan: UsageLimit;
    percentile_scan: UsageLimit;
    form_check: UsageLimit;
    transformation: UsageLimit;
    enhancement: UsageLimit;
  };
}

// Dashboard types
export interface QuickStatsResponse {
  today_calories: number;
  calorie_goal: number;
  calorie_progress: number;
  today_protein: number;
  workouts_this_week: number;
  tdee: number;
  workout_calories: number;
  total_burned: number;
  premium_status: boolean;
}

export interface CalorieBalanceTrendPoint {
  date: string;
  consumed: number;
  burned: number;
  net: number;
  goal: number;
  deficit: number;
}

export interface CalorieBalanceTrendResponse {
  data: CalorieBalanceTrendPoint[];
  summary: {
    avg_consumed: number;
    avg_burned: number;
    avg_deficit: number;
    total_deficit: number;
  };
}

// Weight Tracking types
export interface WeightLogCreate {
  date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  notes?: string;
}

export interface WeightLogUpdate {
  weight_kg?: number;
  body_fat_percentage?: number;
  notes?: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  notes?: string;
  created_at: string;
}

export interface GoalUpdate {
  target_weight_kg?: number;
  target_body_fat_percentage?: number;
}

export interface MovingAveragePoint {
  date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  moving_avg_weight: number;
  moving_avg_body_fat?: number;
}

export interface ProjectionPoint {
  date: string;
  projected_weight: number;
  projected_body_fat?: number;
  is_goal_reached: boolean;
}

export interface GoalProjectionResponse {
  current_weight: number;
  current_body_fat?: number;
  target_weight?: number;
  target_body_fat?: number;
  moving_avg_weight: number;
  moving_avg_body_fat?: number;
  daily_weight_change: number;
  daily_body_fat_change?: number;
  avg_daily_deficit: number;
  target_deficit?: number;
  estimated_days_to_goal?: number;
  estimated_goal_date?: string;
  historical_data: MovingAveragePoint[];
  projection_data: ProjectionPoint[];
  actual_projection_data: ProjectionPoint[];
  on_track: boolean;
  message: string;
}

// SAM Segmentation & Region Transform types
export interface SegmentRequest {
  image_base64: string;
  click_x: number;
  click_y: number;
}

export interface SegmentResponse {
  mask_base64: string;
  body_part_guess: string;
  mask_area_pct: number;
}

export interface RegionTransformRequest {
  image_base64: string;
  mask_base64: string;
  body_part: string;
  goal: string;
  gender?: string;
  intensity?: string;
}

export interface RegionTransformResponse {
  transformed_image_url: string;
  body_part: string;
  goal: string;
  direction: string;
}

// Beauty Analysis types
export interface BeautyAnalyzeRequest {
  image_base64: string;
  gender: string;
  generate_images: boolean;
}

export interface FeatureAnalysis {
  shape: string;
  description: string;
  recommendations: string[];
  size?: string;
  spacing?: string;
  thickness?: string;
  arch?: string;
  fullness?: string;
  symmetry?: string;
  bridge?: string;
  tip?: string;
}

export interface BeautyAnalysis {
  face_shape: string;
  face_shape_description: string;
  forehead_ratio?: string;
  cheekbone_ratio?: string;
  jawline_ratio?: string;
  face_characteristics?: {
    apple_cheeks: string;
    cheekbone: string;
    chin: string;
    temple: string;
    jaw_angle?: string;
  };
  feature_scores?: {
    eyebrows: number;
    eyes: number;
    lips: number;
    nose: number;
    skin: number;
    symmetry: number;
    overall: number;
  };
  eyes_analysis?: FeatureAnalysis;
  brows_analysis?: FeatureAnalysis;
  lips_analysis?: FeatureAnalysis;
  nose_analysis?: FeatureAnalysis;
  skin_tone: string;
  skin_undertone: string;
  personal_color_season: string;
  personal_color_sub: string;
  personal_color_description: string;
  best_colors: string[];
  avoid_colors: string[];
  hairstyle_recommendations: Array<{ style: string; reason: string }>;
  hair_color_recommendations: Array<{ color: string; hex: string; reason: string }>;
  makeup_recommendations: {
    foundation_tone: string;
    lip_colors: string[];
    eye_shadow: string[];
    blush: string;
  };
  skincare_recommendations: string[];
  style_recommendations?: string[];
  styling_suggestions: Array<{ title: string; description: string }>;
}

export interface StyledImage {
  title: string;
  description: string;
  image_url: string | null;
  error?: string;
}

export interface BeautyAnalyzeResponse {
  analysis: BeautyAnalysis;
  styled_images: StyledImage[];
  credits_used: number;
}

// Fashion types
export interface FashionRecommendRequest {
  season: string;
  gender: string;
  height_cm?: number;
  weight_kg?: number;
  body_notes?: string;
  personal_color?: string;
  best_colors?: string;
  avoid_colors?: string;
  face_shape?: string;
  forehead_ratio?: string;
  cheekbone_ratio?: string;
  jawline_ratio?: string;
  chin_type?: string;
  skin_tone?: string;
  skin_undertone?: string;
  image_base64?: string;
  generate_images: boolean;
}

export interface OutfitRecommendation {
  style_name: string;
  top: string;
  bottom: string;
  outerwear: string | null;
  accessories: string[];
  color_palette: string[];
  color_reasoning: string;
  fit_reasoning?: string;
  occasion: string;
  image_url?: string | null;
  image_prompt?: string;
  error?: string;
}

export interface FashionRecommendResponse {
  season: string;
  outfits: OutfitRecommendation[];
  credits_used: number;
}

// Generic API error
export interface APIError {
  detail: string;
}
