'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Dumbbell, Plus, TrendingUp, Trash2, Flame, Search, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Modal, ConfirmDialog } from '@/components/ui';
import { workoutApi } from '@/lib/api/services';
import { getTodayString, formatDateLong } from '@/lib/utils/date';
import type { ExerciseLibraryItem, WorkoutLog, WorkoutTrendResponse } from '@/types/api';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';
import { fetchExerciseGif } from '@/lib/api/exercisedb';

const MuscleMap = dynamic(
  () => import('@/components/features/MuscleMap').then(m => m.MuscleMap),
  { loading: () => <div className="h-[200px] bg-surfaceAlt animate-pulse rounded-lg" />, ssr: false }
);

interface SetData {
  set_number: number;
  reps: number;
  weight: number;
}

export default function WorkoutsPage() {
  const { t } = useLanguage();
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [trends, setTrends] = useState<WorkoutTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showQuickSelectModal, setShowQuickSelectModal] = useState(false);
  const [showRecentWorkoutsModal, setShowRecentWorkoutsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'cardio' | 'strength'>('all');
  const [activeLibraryTab, setActiveLibraryTab] = useState<'all' | 'cardio' | 'strength'>('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLog[]>([]);
  const [sets, setSets] = useState<SetData[]>([{ set_number: 1, reps: 0, weight: 0 }]);
  const [duration, setDuration] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [exerciseGifUrl, setExerciseGifUrl] = useState<string | null>(null);
  const [gifLoading, setGifLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [exercisesRes, logsRes, trendsRes] = await Promise.all([
        workoutApi.getExerciseLibrary(),
        workoutApi.getWorkoutLogs(getTodayString()),
        workoutApi.getTrends(30),
      ]);
      setExercises(exercisesRes.data);
      setWorkoutLogs(logsRes.data);
      setTrends(trendsRes.data);
    } catch (error) {
      console.error('Failed to load workout data:', error);
    } finally {
      setLoading(false);
      // Load recent workouts in background (don't block main loading)
      loadRecentWorkouts().catch(err => console.error('Failed to load recent workouts:', err));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadRecentWorkouts = async () => {
    try {
      // 🚀 OPTIMIZED: 1 API call instead of 7 (10x faster)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const logsRes = await workoutApi.getWorkoutLogsRange(startDateStr, endDateStr);
      
      // Get unique exercises (most recent first)
      const recentLogs: WorkoutLog[] = [];
      const uniqueExercises = new Set<string>();
      
      logsRes.data.forEach((log: WorkoutLog) => {
        if (!uniqueExercises.has(log.exercise_name)) {
          uniqueExercises.add(log.exercise_name);
          recentLogs.push(log);
        }
      });
      
      setRecentWorkouts(recentLogs.slice(0, 5)); // Top 5 recent
    } catch (error) {
      console.error('Failed to load recent workouts:', error);
    }
  };

  useEffect(() => {
    if (selectedExercise && showExerciseModal) {
      setGifLoading(true);
      setExerciseGifUrl(null);
      fetchExerciseGif(selectedExercise.name)
        .then(url => setExerciseGifUrl(url))
        .finally(() => setGifLoading(false));
    }
  }, [selectedExercise, showExerciseModal]);

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return <Badge variant="success">{t('workout.beginner')}</Badge>;
      case 'intermediate':
        return <Badge variant="warning">{t('workout.intermediate')}</Badge>;
      case 'advanced':
        return <Badge variant="error">{t('workout.advanced')}</Badge>;
      default:
        return null;
    }
  };

  const handleLogExercise = () => {
    setShowExerciseModal(false);
    setShowLogForm(true);
    setSets([{ set_number: 1, reps: 0, weight: 0 }]);
    setDuration(0);
    setNotes('');
  };

  const addSet = () => {
    setSets([...sets, { set_number: sets.length + 1, reps: 0, weight: 0 }]);
  };

  const updateSet = (index: number, field: keyof SetData, value: number) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const submitWorkout = async () => {
    if (!selectedExercise) return;

    setIsSubmitting(true);
    try {
      await workoutApi.logWorkout({
        date: getTodayString(),
        exercise_id: selectedExercise.id,
        exercise_name: selectedExercise.name,
        sets: sets,
        duration_minutes: duration || undefined,
        notes: notes || undefined,
      });
      
      setShowLogForm(false);
      setSelectedExercise(null);
      await loadData();
      toast.success(t('workout.workoutLogged'));
    } catch (error) {
      console.error('Failed to log workout:', error);
      toast.error(t('workout.failedToLog'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteWorkout = async () => {
    if (!deleteTarget) return;

    try {
      await workoutApi.deleteLog(deleteTarget.id);
      await loadData();
      toast.success(t('workout.workoutDeleted'));
    } catch (error) {
      console.error('Failed to delete workout:', error);
      toast.error(t('workout.failedToDelete'));
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleQuickSelect = () => {
    setSearchQuery('');
    setShowQuickSelectModal(true);
  };

  const handleRecentWorkout = () => {
    setShowRecentWorkoutsModal(true);
  };

  const handleSelectFromQuickModal = (exercise: ExerciseLibraryItem) => {
    setSelectedExercise(exercise);
    setShowQuickSelectModal(false);
    setShowLogForm(true);
    setSets([{ set_number: 1, reps: 0, weight: 0 }]);
    setDuration(0);
    setNotes('');
  };

  const handleSelectRecentWorkout = (log: WorkoutLog) => {
    // Find the exercise from library
    const exercise = exercises.find(ex => ex.id === log.exercise_id || ex.name === log.exercise_name);
    if (exercise) {
      setSelectedExercise(exercise);
      setShowRecentWorkoutsModal(false);
      setShowLogForm(true);
      // Pre-fill with previous data, ensuring types match
      const normalizedSets = log.sets ? log.sets.map(s => ({
        set_number: s.set_number,
        reps: s.reps || 0,
        weight: s.weight || 0
      })) : [{ set_number: 1, reps: 0, weight: 0 }];
      setSets(normalizedSets);
      setDuration(log.duration_minutes || 0);
      setNotes(log.notes || '');
    }
  };

  // 🚀 OPTIMIZED: Memoize expensive filter operations
  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.muscle_groups.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Category filter (for library view)
      const matchesCategory = selectedCategory === 'all' || 
        (ex as any).exercise_type === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [exercises, searchQuery, selectedCategory]);

  // 🚀 OPTIMIZED: Memoize exercise categorization
  const { cardioExercises, strengthExercises } = useMemo(() => ({
    cardioExercises: exercises.filter(ex => (ex as any).exercise_type === 'cardio'),
    strengthExercises: exercises.filter(ex => (ex as any).exercise_type === 'strength' || !(ex as any).exercise_type)
  }), [exercises]);

  const libraryFiltered = useMemo(() => {
    const base = activeLibraryTab === 'cardio' ? cardioExercises
      : activeLibraryTab === 'strength' ? strengthExercises
      : exercises;
    if (!librarySearch.trim()) return base;
    const q = librarySearch.toLowerCase();
    return base.filter(ex =>
      ex.name.toLowerCase().includes(q) ||
      ex.muscle_groups.some(m => m.toLowerCase().includes(q))
    );
  }, [exercises, cardioExercises, strengthExercises, activeLibraryTab, librarySearch]);

  if (loading) return (
    <div className="space-y-6">
      <SkeletonStats count={3} />
      <SkeletonList items={4} />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">{t('workout.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">{formatDateLong(getTodayString())}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRecentWorkout} disabled={recentWorkouts.length === 0}>
            <TrendingUp className="h-5 w-5 mr-2" />
            {t('workout.quickAdd')}
          </Button>
          <Button variant="primary" onClick={handleQuickSelect}>
            <Plus className="h-5 w-5 mr-2" />
            {t('workout.logWorkout')}
          </Button>
        </div>
      </div>

      {/* Weekly Stats */}
      {trends && (
        <div data-tour="workout-stats" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">{t('workout.totalWorkouts')}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">{trends.total_workouts}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">{t('workout.perWeek')}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
                    {trends.average_per_week.toFixed(1)}
                  </p>
                </div>
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">{t('workout.todaysLogs')}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">{workoutLogs.length}</p>
                </div>
                <div className="p-3 bg-accent/30 rounded-lg">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Workouts */}
      <Card>
        <CardHeader>
          <CardTitle>{t('workout.todaysWorkouts')}</CardTitle>
        </CardHeader>
        <CardContent>
          {workoutLogs.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <Dumbbell className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('workout.noWorkoutsToday')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {t('workout.noWorkoutsHint')}
              </p>
              <Button size="lg" onClick={handleQuickSelect}>
                <Plus className="h-5 w-5 mr-2" />
                {t('workout.logFirstWorkout')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {workoutLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg hover:shadow-lg hover:-translate-y-1 transition-all relative"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white mb-2">{log.exercise_name}</h4>
                    <button
                      onClick={() => setDeleteTarget({ id: log.id, name: log.exercise_name })}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                      title={t('workout.deleteWorkout')}
                    >
                      <Trash2 className="h-5 w-5 text-red-500 hover:text-red-700" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">{t('workout.sets')}:</span>
                      <span className="font-medium text-gray-900 dark:text-white dark:text-white ml-1">{log.sets.length}</span>
                    </div>
                    {log.duration_minutes && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">{t('workout.duration')}:</span>
                        <span className="font-medium text-gray-900 dark:text-white dark:text-white ml-1">
                          {log.duration_minutes} {t('workout.min')}
                        </span>
                      </div>
                    )}
                  </div>
                  {log.calories_burned && log.calories_burned > 0 && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <span className="text-lg font-bold text-orange-600">
                        {t('workout.kcalBurned', { calories: Math.round(log.calories_burned) })}
                      </span>
                    </div>
                  )}
                  {log.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-2">{log.notes}</p>
                  )}
                </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise Library with Tabs */}
      <Card id="exercise-library" data-tour="workout-library">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>{t('workout.exerciseLibrary')}</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder={t('workout.searchExercises')}
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-surface text-text text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {librarySearch && (
                <button
                  onClick={() => setLibrarySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-surfaceAlt"
                >
                  <X className="h-3.5 w-3.5 text-text-secondary" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4 border-b-2 border-border">
            <button
              onClick={() => setActiveLibraryTab('all')}
              className={`pb-3 px-6 font-semibold transition-all relative ${
                activeLibraryTab === 'all'
                  ? 'text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t('workout.all')} ({exercises.length})
              {activeLibraryTab === 'all' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveLibraryTab('cardio')}
              className={`pb-3 px-6 font-semibold transition-all relative ${
                activeLibraryTab === 'cardio'
                  ? 'text-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              🏃 {t('workout.cardio')} ({cardioExercises.length})
              {activeLibraryTab === 'cardio' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveLibraryTab('strength')}
              className={`pb-3 px-6 font-semibold transition-all relative ${
                activeLibraryTab === 'strength'
                  ? 'text-orange-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              💪 {t('workout.strength')} ({strengthExercises.length})
              {activeLibraryTab === 'strength' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full" />
              )}
            </button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {libraryFiltered.length === 0 ? (
                <div className="col-span-full text-center py-12 text-text-secondary">
                  No exercises found for &ldquo;{librarySearch}&rdquo;
                </div>
              ) : libraryFiltered.map((exercise) => {
                const isCardio = (exercise as any).exercise_type === 'cardio';
                return (
                  <div
                    key={exercise.id}
                    className={`p-4 border-2 rounded-lg hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer ${
                      isCardio 
                        ? 'border-blue-200 bg-blue-50 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:border-blue-600' 
                        : 'border-orange-200 bg-orange-50 hover:border-orange-400 dark:border-orange-800 dark:bg-orange-950/30 dark:hover:border-orange-600'
                    }`}
                    onClick={() => {
                      setSelectedExercise(exercise);
                      setShowExerciseModal(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white">{exercise.name}</h4>
                      {getDifficultyBadge(exercise.difficulty)}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant={isCardio ? 'info' : 'warning'} 
                        className="text-xs"
                      >
                        {isCardio ? '🏃 ' + t('workout.cardio') : '💪 ' + t('workout.strength')}
                      </Badge>
                      {(exercise as any).met_value && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          MET {(exercise as any).met_value}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {exercise.muscle_groups.slice(0, 3).map((muscle) => (
                        <Badge 
                          key={muscle} 
                          variant="default" 
                          className={`text-xs ${isCardio ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-orange-100 dark:bg-orange-900/40'}`}
                        >
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteWorkout}
        title={t('workout.deleteWorkout')}
        message={t('workout.deleteConfirm', { name: deleteTarget?.name ?? '' })}
      />

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <Modal
          isOpen={showExerciseModal}
          onClose={() => setShowExerciseModal(false)}
          title={selectedExercise.name}
          size="lg"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              {getDifficultyBadge(selectedExercise.difficulty)}
              <Badge variant="info" className="capitalize">
                {selectedExercise.category}
              </Badge>
            </div>

            {/* Exercise GIF + Muscle Map side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Exercise Animation GIF */}
              <div className="rounded-xl overflow-hidden bg-surfaceAlt border border-border flex items-center justify-center min-h-[200px]">
                {gifLoading ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    <span className="text-xs text-text-secondary">Loading animation...</span>
                  </div>
                ) : exerciseGifUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={exerciseGifUrl}
                    alt={`${selectedExercise.name} animation`}
                    className="w-full h-auto max-h-[280px] object-contain"
                  />
                ) : (
                  <div className="text-center py-8 px-4">
                    <Dumbbell className="h-12 w-12 text-text-light mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">No animation available</p>
                  </div>
                )}
              </div>

              {/* Muscle Map */}
              <div className="rounded-xl bg-surfaceAlt border border-border p-3">
                <h4 className="text-xs font-semibold text-text-secondary text-center mb-1 uppercase tracking-wider">
                  {t('workout.targetMuscles')}
                </h4>
                <MuscleMap activeMuscles={selectedExercise.muscle_groups} />
              </div>
            </div>

            {/* Form Instructions */}
            <div className="bg-surfaceAlt rounded-xl p-4 border border-border">
              <h4 className="font-semibold text-text mb-2">{t('workout.formInstructions')}</h4>
              <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
                {selectedExercise.form_instructions}
              </p>
            </div>

            <Button variant="primary" className="w-full" onClick={handleLogExercise}>
              <Plus className="h-5 w-5 mr-2" />
              {t('workout.logThisExercise')}
            </Button>
          </div>
        </Modal>
      )}

      {/* Quick Select Modal (Option 1) */}
      <Modal
        isOpen={showQuickSelectModal}
        onClose={() => {
          setShowQuickSelectModal(false);
          setSelectedCategory('all');
          setSearchQuery('');
        }}
        title={t('workout.selectExercise')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Search Bar */}
          <Input
            type="text"
            placeholder={t('workout.searchExercises')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />

          {/* Category Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('workout.all')} ({exercises.length})
            </button>
            <button
              onClick={() => setSelectedCategory('cardio')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === 'cardio'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/40'
              }`}
            >
              🏃 {t('workout.cardio')} ({cardioExercises.length})
            </button>
            <button
              onClick={() => setSelectedCategory('strength')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === 'strength'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:hover:bg-orange-900/40'
              }`}
            >
              💪 {t('workout.strength')} ({strengthExercises.length})
            </button>
          </div>

          {/* Exercise List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredExercises.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">No results found</p>
            ) : (
              filteredExercises.map((exercise) => {
                const isCardio = (exercise as any).exercise_type === 'cardio';
                return (
                  <button
                    key={exercise.id}
                    onClick={() => handleSelectFromQuickModal(exercise)}
                    className={`w-full text-left p-4 border-2 rounded-lg hover:shadow-md transition ${
                      isCardio 
                        ? 'border-blue-200 bg-blue-50 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:border-blue-600' 
                        : 'border-orange-200 bg-orange-50 hover:border-orange-400 dark:border-orange-800 dark:bg-orange-950/30 dark:hover:border-orange-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white dark:text-white">{exercise.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={isCardio ? 'info' : 'warning'} 
                            className="text-xs"
                          >
                            {isCardio ? '🏃 ' + t('workout.cardio') : '💪 ' + t('workout.strength')}
                          </Badge>
                          {(exercise as any).met_value && (
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                              MET {(exercise as any).met_value}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {exercise.muscle_groups.slice(0, 3).map((muscle) => (
                            <Badge 
                              key={muscle} 
                              variant="default" 
                              className={`text-xs ${isCardio ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-orange-100 dark:bg-orange-900/40'}`}
                            >
                              {muscle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {getDifficultyBadge(exercise.difficulty)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Recent Workouts Modal (Option 2) */}
      <Modal
        isOpen={showRecentWorkoutsModal}
        onClose={() => setShowRecentWorkoutsModal(false)}
        title={t('workout.recentWorkouts')}
        size="lg"
      >
        <div className="space-y-3">
          {recentWorkouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">{t('workout.noRecentWorkouts')}</p>
              <Button
                variant="primary"
                onClick={() => {
                  setShowRecentWorkoutsModal(false);
                  handleQuickSelect();
                }}
                className="mt-4"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t('workout.logNewWorkout')}
              </Button>
            </div>
          ) : (
            recentWorkouts.map((log) => (
              <button
                key={log.id}
                onClick={() => handleSelectRecentWorkout(log)}
                className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:bg-gray-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white dark:text-white mb-2">{log.exercise_name}</h4>
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                      <span>{log.sets.length} {t('workout.sets')}</span>
                      {log.duration_minutes && <span>{log.duration_minutes} {t('workout.min')}</span>}
                      {log.sets[0] && (
                        <span>
                          Last: {log.sets[0].reps} reps × {log.sets[0].weight}kg
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="info">{t('workout.repeat')}</Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Workout Log Form Modal */}
      {selectedExercise && (
        <Modal
          isOpen={showLogForm}
          onClose={() => setShowLogForm(false)}
          title={`${t('workout.logWorkout')}: ${selectedExercise.name}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Exercise Type Badge */}
            <div className="flex items-center gap-2">
              <Badge 
                variant={(selectedExercise as any).exercise_type === 'cardio' ? 'info' : 'warning'}
                className="text-base px-4 py-2"
              >
                {(selectedExercise as any).exercise_type === 'cardio' ? '🏃 ' + t('workout.cardioExercise') : '💪 ' + t('workout.strengthExercise')}
              </Badge>
              {(selectedExercise as any).met_value && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('workout.caloriesBurned')}: MET {(selectedExercise as any).met_value}
                </span>
              )}
            </div>

            {/* Duration (Required for Cardio, Optional for Strength) */}
            {(selectedExercise as any).exercise_type === 'cardio' ? (
              <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  ⏱️ {t('workout.durationRequired')}
                </h4>
                <Input
                  type="number"
                  placeholder={t('workout.durationMinutes')}
                  value={duration || ''}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  className="text-lg"
                />
                {duration > 0 && (selectedExercise as any).met_value && (
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
                    💡 {t('workout.estCalories', { calories: Math.round((selectedExercise as any).met_value * 70 * (duration / 60)) })}
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Sets (for Strength) */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white mb-3">{t('workout.sets')}</h4>
              <div className="space-y-3">
                {sets.map((set, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400 w-12">
                      {t('workout.set')} {set.set_number}
                    </span>
                    <Input
                      type="number"
                      placeholder={t('workout.reps')}
                      value={set.reps || ''}
                      onChange={(e) => updateSet(index, 'reps', parseInt(e.target.value) || 0)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder={t('workout.weightKg')}
                      value={set.weight || ''}
                      onChange={(e) => updateSet(index, 'weight', parseFloat(e.target.value) || 0)}
                      className="flex-1"
                    />
                    {sets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSet(index)}
                        className="text-error"
                      >
                        {t('workout.remove')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addSet} className="mt-3">
                <Plus className="h-4 w-4 mr-1" />
                {t('workout.addSet')}
              </Button>
            </div>

            {/* Duration (optional for strength) */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white mb-2">{t('workout.durationOptional')}</h4>
              <Input
                type="number"
                placeholder={t('workout.minutesOptional')}
                value={duration || ''}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('workout.autoEstimated')}
              </p>
            </div>
            </>
            )}

            {/* Notes */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white mb-2">{t('workout.notesOptional')}</h4>
              <textarea
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder={t('workout.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLogForm(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={submitWorkout}
                isLoading={isSubmitting}
              >
                {t('workout.saveWorkout')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
