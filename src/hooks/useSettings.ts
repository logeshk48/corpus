import { useAuth } from '@/context/AuthContext';
import { subscribeSettings } from '@/services/settings';
import { DEFAULT_SETTINGS, type Settings } from '@/types/settings';
import { useEffect, useState } from 'react';

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeSettings(
      (s) => {
        setSettings(s);
        setLoading(false);
      },
      (e) => {
        console.error('Settings listener error:', e);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user]);

  return { settings, loading };
}
