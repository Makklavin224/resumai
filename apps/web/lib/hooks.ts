'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api-client';
import type { SessionInfo } from '@resumai/shared';

export function useSession() {
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getCredits();
      setInfo(data);
    } catch (err) {
      console.error('session refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { info, loading, refresh };
}

export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }, []);

  return { copy, copied };
}
