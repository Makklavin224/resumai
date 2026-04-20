'use client';

import type { ApiError, GenerateResult, PaymentCreateResult, SessionInfo } from '@resumai/shared';

export class ApiClientError extends Error {
  code: ApiError['code'];
  details?: unknown;
  status: number;
  constructor(payload: ApiError, status: number) {
    super(payload.error);
    this.code = payload.code;
    this.details = payload.details;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let payload: ApiError;
    try {
      payload = (await res.json()) as ApiError;
    } catch {
      payload = { error: res.statusText, code: 'INTERNAL' };
    }
    throw new ApiClientError(payload, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  getCredits: () => request<SessionInfo>('/api/credits'),
  generateForm: (form: FormData) =>
    request<GenerateResult>('/api/generate', { method: 'POST', body: form }),
  createPayment: (packageId: string) =>
    request<PaymentCreateResult>('/api/payments/create', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    }),
};
