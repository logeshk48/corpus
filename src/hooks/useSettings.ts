import { useAuth } from '@/context/AuthContext';
import { subscribeSettings } from '@/services/settings';
import { DEFAULT_SETTINGS, type Settings } from '@/types/settings';
import { useEffect, useState } from 'react';

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  // Whose settings are currently loaded. Deriving `loading` from this (instead of
  // a flag set inside the effect) closes a gap: on the first render after sign-in
  // the effect hasn't run yet, and a plain flag would say "loaded" with empty
  // defaults — which made AuthGate wrongly send set-up users to onboarding.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoadedFor(null);
      return;
    }
    const uid = user.uid;
    const unsubscribe = subscribeSettings(
      (s) => {
        setSettings(s);
        setLoadedFor(uid);
      },
      (e) => {
        console.error('Settings listener error:', e);
        setLoadedFor(uid);
      }
    );
    return unsubscribe;
  }, [user]);

  const loading = !!user && loadedFor !== user.uid;
  return { settings: loading ? DEFAULT_SETTINGS : settings, loading };
}
