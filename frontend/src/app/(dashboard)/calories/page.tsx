'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, TrendingUp, Utensils, Clock, Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { FoodLogForm } from '@/components/features/FoodLogForm';
import { MealCard } from '@/components/features/MealCard';
import { foodApi } from '@/lib/api/services';
import { getTodayString, formatDateLong, formatLocalDateKR } from '@/lib/utils/date';
import { useLanguage } from '@/contexts/LanguageContext';
import dynamic from 'next/dynamic';
import type { DailySummaryResponse, TrendResponse, RecentFoodItem } from '@/types/api';

const CalorieTrendChart = dynamic(() => import('@/components/features/CalorieTrendChart'), {
  loading: () => <div className="h-[300px] bg-surfaceAlt animate-pulse rounded-lg" />,
  ssr: false,
});

export default function CaloriesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [dailyData, setDailyData] = useState<DailySummaryResponse | null>(null);
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentFoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<7 | 30>(7);
  const [quickLogging, setQuickLogging] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dailyResponse, trendResponse, recentResponse] = await Promise.all([
        foodApi.getDailyFood(selectedDate),
        foodApi.getTrends(selectedDays),
        foodApi.getRecentFoods(7, 8),
      ]);
      setDailyData(dailyResponse.data);
      setTrendData(trendResponse.data);
      setRecentFoods(recentResponse.data.recent_foods);
    } catch (error) {
      console.error('Failed to load calorie data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedDays]);

  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const today = new Date(getTodayString());
    const nextDate = new Date(date.toISOString().split('T')[0]);
    
    // Don't allow going beyond today
    if (nextDate <= today) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const handleToday = () => {
    setSelectedDate(getTodayString());
  };

  const isToday = selectedDate === getTodayString();
  const canGoForward = selectedDate < getTodayString();

  const handleFoodLogged = () => {
    loadData();
  };

  const handleQuickLog = async (food: RecentFoodItem) => {
    try {
      setQuickLogging(food.food_name);
      await foodApi.logFood({
        date: selectedDate,
        food_name: food.food_name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        serving_size: food.serving_size || '1 serving',
        meal_type: food.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      });
      await loadData();
    } catch (error) {
      console.error('Failed to quick log food:', error);
      alert(t('calories.failedToLog'));
    } finally {
      setQuickLogging(null);
    }
  };

  const calorieProgress = dailyData && dailyData.calorie_goal > 0
    ? Math.min((dailyData.total_calories / dailyData.calorie_goal) * 100, 100)
    : 0;

  // Group meals by type
  const mealsByType = dailyData?.meals.reduce((acc, meal) => {
    if (!acc[meal.meal_type]) {
      acc[meal.meal_type] = [];
    }
    acc[meal.meal_type].push(meal);
    return acc;
  }, {} as Record<string, typeof dailyData.meals>) || {};

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">{t('calories.title')}</h1>
          <p className="text-text-secondary mt-1">{formatDateLong(selectedDate)}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push('/food-camera')}
        >
          <Camera className="h-5 w-5 mr-2" />
          {t('calories.scanFood')}
        </Button>
      </div>

      {/* Date Navigation */}
      <Card variant="outlined">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousDay}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{t('calories.prevDay')}</span>
              </Button>

              <div className="flex items-center gap-2 mx-2">
                <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                <p className="text-sm sm:text-lg font-bold text-text whitespace-nowrap">
                  {formatLocalDateKR(selectedDate)}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextDay}
                disabled={!canGoForward}
                className="flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">{t('calories.nextDay')}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {!isToday && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="text-xs text-primary"
                >
                  {t('calories.goToday')}
                </Button>
              )}
                <input
                type="date"
                value={selectedDate}
                max={getTodayString()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 border border-border rounded-xl text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      {loading ? (
        <Card className="animate-pulse">
          <CardContent className="p-6 h-32" />
        </Card>
      ) : dailyData ? (
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div>
                <p className="text-sm text-text-secondary mb-1">{t('food.calories')}</p>
                <p className="text-3xl font-bold text-text">
                  {Math.round(dailyData.total_calories)}
                </p>
                <p className="text-sm text-text-light">/ {dailyData.calorie_goal}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">{t('food.protein')}</p>
                <p className="text-3xl font-bold text-text">{Math.round(dailyData.total_protein)}g</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">{t('food.carbs')}</p>
                <p className="text-3xl font-bold text-text">{Math.round(dailyData.total_carbs)}g</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">{t('food.fat')}</p>
                <p className="text-3xl font-bold text-text">{Math.round(dailyData.total_fat)}g</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">{t('calories.progress')}</p>
                <p className="text-3xl font-bold text-text">{Math.round(calorieProgress)}%</p>
                <div className="mt-2 h-2 bg-border-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${calorieProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Food Log Form */}
      <FoodLogForm onSuccess={handleFoodLogged} initialDate={selectedDate} />

      {/* Quick Log - Recent Foods */}
      {recentFoods.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('calories.quickLog')}
              </CardTitle>
              <Badge variant="info" className="text-xs">
                {recentFoods.length} {t('calories.recentItems')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary mb-4">
              {t('calories.quickLogHint')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentFoods.map((food, idx) => (
                <button
                  key={`${food.food_name}-${idx}`}
                  onClick={() => handleQuickLog(food)}
                  disabled={quickLogging === food.food_name}
                  className="p-4 border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-text line-clamp-2">
                      {food.food_name}
                    </h4>
                    {quickLogging === food.food_name ? (
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <Plus className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-text-secondary">
                    <div className="flex justify-between">
                      <span>{t('food.calories')}:</span>
                      <span className="font-medium text-primary">
                        {Math.round(food.calories)} {t('calories.kcal')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>P: {Math.round(food.protein)}g</span>
                      <span>C: {Math.round(food.carbs)}g</span>
                      <span>F: {Math.round(food.fat)}g</span>
                    </div>
                  </div>
                  <Badge variant="default" className="mt-2 text-xs">
                    {t(`food.${food.meal_type}`)}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meals for Selected Date */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-4">
          {isToday ? t('calories.todaysMeals') : t('calories.mealsForDate', { date: formatLocalDateKR(selectedDate, { month: 'long', day: 'numeric' }) })}
        </h2>
        {dailyData && dailyData.meals.length > 0 ? (
          <div className="space-y-6">
            {mealOrder.map((mealType) => {
              const meals = mealsByType[mealType];
              if (!meals || meals.length === 0) return null;

              return (
                <div key={mealType}>
                  <h3 className="text-lg font-semibold text-text mb-3">
                    {t(`food.${mealType}`)}
                  </h3>
                  <div className="space-y-3">
                    {meals.map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onDelete={handleFoodLogged}
                        onUpdate={handleFoodLogged}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <Utensils className="h-20 w-20 text-text-light mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text mb-2">
                {t('calories.noMealsToday')}
              </h3>
              <p className="text-text-secondary mb-6">
                {t('calories.noMealsHint')}
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={() => router.push('/food-camera')}>
                  <Camera className="h-5 w-5 mr-2" />
                  {t('calories.logWithPhoto')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trend Chart */}
      {trendData && trendData.data.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                {t('calories.calorieTrends')}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={selectedDays === 7 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDays(7)}
                >
                  {t('dashboard.days7')}
                </Button>
                <Button
                  variant={selectedDays === 30 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDays(30)}
                >
                  {t('dashboard.days30')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CalorieTrendChart data={trendData.data} averageCalories={trendData.average_calories} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
