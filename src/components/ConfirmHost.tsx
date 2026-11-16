import { Button, Sheet } from '@/components/ui';
import { Corpus, Type } from '@/constants/theme';
import { setConfirmHost, type ConfirmRequest } from '@/services/confirm';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

// The in-app "Are you sure?" sheet used on the web (see services/confirm.ts)
export default function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  useEffect(() => { setConfirmHost(setReq); return () => setConfirmHost(null); }, []);
  if (!req) return null;
  const done = (yes: boolean) => { req.resolve(yes); setReq(null); };
  return (
    <Sheet
      title={req.title}
      onClose={() => done(false)}
      footer={
        <>
          <Button label={req.ok} variant={req.destructive ? 'danger' : 'primary'} onPress={() => done(true)} />
          <Button label="Cancel" variant="secondary" onPress={() => done(false)} />
        </>
      }
    >
      {req.message ? <Text style={{ fontSize: Type.bodyLg, color: Corpus.textMuted, lineHeight: 21 }}>{req.message}</Text> : null}
    </Sheet>
  );
}
