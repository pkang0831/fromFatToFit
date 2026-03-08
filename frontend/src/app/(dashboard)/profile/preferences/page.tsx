'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { foodDecisionApi } from '@/lib/api/services';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserPreferences {
  favorite_foods: string[];
  disliked_foods: string[];
  allergies: string[];
  dietary_restrictions: string[];
  avoid_high_sodium: boolean;
  avoid_high_sugar: boolean;
  prefer_high_protein: boolean;
}

const DIETARY_RESTRICTION_KEYS = [
  { id: 'vegetarian', key: 'preferences.vegetarian' },
  { id: 'vegan', key: 'preferences.vegan' },
  { id: 'gluten_free', key: 'preferences.glutenFree' },
  { id: 'dairy_free', key: 'preferences.dairyFree' },
  { id: 'halal', key: 'preferences.halal' },
  { id: 'kosher', key: 'preferences.kosher' },
];

const COMMON_ALLERGIES = [
  'Peanuts', 'Milk', 'Eggs', 'Shellfish', 'Mollusks', 'Fish', 'Wheat', 'Soy', 'Tree Nuts',
];

export default function FoodPreferencesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [preferences, setPreferences] = useState<UserPreferences>({
    favorite_foods: [],
    disliked_foods: [],
    allergies: [],
    dietary_restrictions: [],
    avoid_high_sodium: false,
    avoid_high_sugar: false,
    prefer_high_protein: false,
  });
  
  const [newFavorite, setNewFavorite] = useState('');
  const [newDisliked, setNewDisliked] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const response = await foodDecisionApi.getPreferences();
      setPreferences(response.data);
    } catch (err: any) {
      console.error('Error loading preferences:', err);
      setError(t('preferences.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await foodDecisionApi.updatePreferences(preferences);
      setSuccessMessage(t('preferences.saveSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
      toast.success(t('preferences.saveSuccess'));
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      setError(t('preferences.saveFailed'));
      toast.error(t('preferences.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const addToList = (key: keyof UserPreferences, value: string) => {
    if (!value.trim()) return;
    
    const currentList = preferences[key] as string[];
    if (currentList.includes(value.trim())) return;
    
    setPreferences({
      ...preferences,
      [key]: [...currentList, value.trim()],
    });
    
    // Clear input
    if (key === 'favorite_foods') setNewFavorite('');
    if (key === 'disliked_foods') setNewDisliked('');
    if (key === 'allergies') setNewAllergy('');
  };

  const removeFromList = (key: keyof UserPreferences, value: string) => {
    const currentList = preferences[key] as string[];
    setPreferences({
      ...preferences,
      [key]: currentList.filter(item => item !== value),
    });
  };

  const toggleDietaryRestriction = (restriction: string) => {
    const current = preferences.dietary_restrictions;
    if (current.includes(restriction)) {
      setPreferences({
        ...preferences,
        dietary_restrictions: current.filter(r => r !== restriction),
      });
    } else {
      setPreferences({
        ...preferences,
        dietary_restrictions: [...current, restriction],
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('preferences.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('preferences.subtitle')}</p>
        </div>
        <Button onClick={handleSave} isLoading={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {t('common.save')}
        </Button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Dietary Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.dietaryRestrictions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DIETARY_RESTRICTION_KEYS.map(restriction => (
              <button
                key={restriction.id}
                onClick={() => toggleDietaryRestriction(restriction.id)}
                className={`px-4 py-2 rounded-full border-2 transition ${
                  preferences.dietary_restrictions.includes(restriction.id)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                {t(restriction.key)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.allergies')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addToList('allergies', newAllergy)}
              placeholder={t('preferences.addAllergy')}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={() => addToList('allergies', newAllergy)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGIES.map(allergy => (
              <button
                key={allergy}
                onClick={() => addToList('allergies', allergy)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
              >
                + {allergy}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {preferences.allergies.map(allergy => (
              <div
                key={allergy}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg"
              >
                <span>{allergy}</span>
                <button
                  onClick={() => removeFromList('allergies', allergy)}
                  className="hover:bg-red-200 rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Favorite Foods */}
      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.favoriteFoods')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFavorite}
              onChange={(e) => setNewFavorite(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addToList('favorite_foods', newFavorite)}
              placeholder={t('preferences.addFavorite')}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={() => addToList('favorite_foods', newFavorite)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {preferences.favorite_foods.map(food => (
              <div
                key={food}
                className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg"
              >
                <span>{food}</span>
                <button
                  onClick={() => removeFromList('favorite_foods', food)}
                  className="hover:bg-green-200 rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disliked Foods */}
      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.dislikedFoods')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newDisliked}
              onChange={(e) => setNewDisliked(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addToList('disliked_foods', newDisliked)}
              placeholder={t('preferences.addDisliked')}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={() => addToList('disliked_foods', newDisliked)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {preferences.disliked_foods.map(food => (
              <div
                key={food}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg"
              >
                <span>{food}</span>
                <button
                  onClick={() => removeFromList('disliked_foods', food)}
                  className="hover:bg-gray-200 rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nutritional Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.nutritionalPreferences')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.prefer_high_protein}
              onChange={(e) =>
                setPreferences({ ...preferences, prefer_high_protein: e.target.checked })
              }
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{t('preferences.preferHighProtein')}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('preferences.preferHighProteinDesc')}</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.avoid_high_sodium}
              onChange={(e) =>
                setPreferences({ ...preferences, avoid_high_sodium: e.target.checked })
              }
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{t('preferences.avoidHighSodium')}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('preferences.avoidHighSodiumDesc')}</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.avoid_high_sugar}
              onChange={(e) =>
                setPreferences({ ...preferences, avoid_high_sugar: e.target.checked })
              }
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{t('preferences.avoidHighSugar')}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('preferences.avoidHighSugarDesc')}</div>
            </div>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
