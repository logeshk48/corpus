import { onShared, takeSharedText } from '@/services/bankSms';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

// Invisible helper: text shared to Corpus (Messages → Share → Corpus) opens the bank-SMS review with it.
export default function ShareCatcher() {
  const router = useRouter();
  useEffect(() => {
    const go = (text: string) => router.push(`/sms-review?text=${encodeURIComponent(text.slice(0, 1500))}` as Href);
    const first = takeSharedText();
    if (first) go(first);
    return onShared(go);
  }, [router]);
  return null;
}
