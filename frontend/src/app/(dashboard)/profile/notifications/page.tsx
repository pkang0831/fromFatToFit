'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Bell, Mail, Smartphone, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { notificationApi } from '@/lib/api/services';
import { useLanguage } from '@/contexts/LanguageContext';

interface Preferences {
  email_weekly_summary: boolean;
  email_inactivity_reminder: boolean;
  email_credit_low: boolean;
  push_meal_reminder: boolean;
  push_workout_reminder: boolean;
  push_weekly_body_scan: boolean;
  push_daily_summary: boolean;
  meal_reminder_time: string;
  workout_reminder_days: string[];
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function NotificationSettingsPage() {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);

    notificationApi.getPreferences()
      .then(res => setPrefs(res.data))
      .catch(() => { toast.error(t('notifications.loadFailed')); })
      .finally(() => setLoading(false));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setPushEnabled(!!sub);
        });
      });
    }
  }, []);

  const togglePush = async () => {
    if (!pushSupported) return;

    try {
      const reg = await navigator.serviceWorker.ready;

      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await notificationApi.unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined,
        });
        await notificationApi.subscribePush(sub.toJSON());
        setPushEnabled(true);
      }
    } catch (err) {
      console.error('Push toggle error:', err);
      toast.error(t('notifications.pushToggleFailed'));
    }
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await notificationApi.updatePreferences(prefs);
      setPrefs(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success(t('notifications.saveSuccess'));
    } catch (err) {
      console.error('Save error:', err);
      toast.error(t('notifications.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Preferences) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const toggleDay = (day: string) => {
    if (!prefs) return;
    const days = prefs.workout_reminder_days.includes(day)
      ? prefs.workout_reminder_days.filter(d => d !== day)
      : [...prefs.workout_reminder_days, day];
    setPrefs({ ...prefs, workout_reminder_days: days });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('notifications.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('notifications.subtitle')}</p>
      </div>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t('notifications.pushNotifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('notifications.enablePush')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {pushSupported ? t('notifications.pushSupported') : t('notifications.pushNotSupported')}
              </p>
            </div>
            <button
              onClick={togglePush}
              disabled={!pushSupported}
              className={`relative w-12 h-7 rounded-full transition-colors ${pushEnabled ? 'bg-primary' : 'bg-border'} ${!pushSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <ToggleRow label="Weekly Body Scan Reminder" desc="Get reminded when your weekly scan is ready" checked={prefs.push_weekly_body_scan} onChange={() => toggle('push_weekly_body_scan')} />
          <ToggleRow label={t('notifications.mealReminder')} desc={t('notifications.mealReminderDesc')} checked={prefs.push_meal_reminder} onChange={() => toggle('push_meal_reminder')} />
          <ToggleRow label={t('notifications.workoutReminder')} desc={t('notifications.workoutReminderDesc')} checked={prefs.push_workout_reminder} onChange={() => toggle('push_workout_reminder')} />
          <ToggleRow label={t('notifications.dailySummary')} desc={t('notifications.dailySummaryDesc')} checked={prefs.push_daily_summary} onChange={() => toggle('push_daily_summary')} />

          {prefs.push_meal_reminder && (
            <div className="pl-4 border-l-2 border-primary/20">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">{t('notifications.reminderTime')}</label>
              <input
                type="time"
                value={prefs.meal_reminder_time}
                onChange={e => setPrefs({ ...prefs, meal_reminder_time: e.target.value })}
                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
          )}

          {prefs.push_workout_reminder && (
            <div className="pl-4 border-l-2 border-primary/20">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">{t('notifications.workoutDays')}</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      prefs.workout_reminder_days.includes(day)
                        ? 'bg-primary text-white'
                        : 'bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-primary/30'
                    }`}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('notifications.emailNotifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow label={t('notifications.weeklySummary')} desc={t('notifications.weeklySummaryDesc')} checked={prefs.email_weekly_summary} onChange={() => toggle('email_weekly_summary')} />
          <ToggleRow label={t('notifications.inactivityReminder')} desc={t('notifications.inactivityReminderDesc')} checked={prefs.email_inactivity_reminder} onChange={() => toggle('email_inactivity_reminder')} />
          <ToggleRow label={t('notifications.lowCredit')} desc={t('notifications.lowCreditDesc')} checked={prefs.email_credit_low} onChange={() => toggle('email_credit_low')} />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={handleSave} isLoading={saving}>
          <Save className="h-5 w-5 mr-2" />
          {saved ? t('notifications.saved') : t('notifications.savePreferences')}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{desc}</p>
      </div>
      <button onClick={onChange} className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${checked ? 'bg-primary' : 'bg-border'}`}>
        <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
