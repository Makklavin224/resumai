'use client';

import { useCallback, useEffect, useState } from 'react';
import { emitAuthChanged, onAuthChanged } from './auth-events';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  isBlocked?: boolean;
  isSuspicious?: boolean;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body && typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const authApi = {
  me: () => getJson<{ user: AuthUser | null }>('/api/auth/me'),
  login: async (email: string, password: string) => {
    const res = await getJson<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    emitAuthChanged();
    return res;
  },
  register: async (email: string, password: string, displayName?: string) => {
    const res = await getJson<{ user: AuthUser; bonusCredits?: number }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      },
    );
    emitAuthChanged();
    return res;
  },
  logout: async () => {
    const res = await getJson<{ ok: true }>('/api/auth/logout', { method: 'POST' });
    emitAuthChanged();
    return res;
  },
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: u } = await authApi.me();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return onAuthChanged(refresh);
  }, [refresh]);

  return { user, loading, refresh, setUser };
}
