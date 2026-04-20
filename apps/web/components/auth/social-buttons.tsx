'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TgConfig = { mode: 'widget'; botId: string; botUsername: string; authUrl: string };

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (
          options: { bot_id: string; request_access?: string; lang?: string },
          callback: (user: Record<string, string | number> | null) => void,
        ) => void;
      };
    };
  }
}

/**
 * VK ID + Telegram auth buttons. Both are rendered as our own styled
 * Buttons (identical width). Telegram auth is triggered via
 * `window.Telegram.Login.auth()` after the official widget script is
 * loaded, then we redirect the browser to our /callback with the signed
 * query params for verification.
 */
export function SocialButtons({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const [tgConfig, setTgConfig] = useState<TgConfig | null>(null);
  const [tgReady, setTgReady] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/telegram/start', { credentials: 'include' });
        if (res.status === 501) {
          setTgError('Telegram скоро включим — пока используйте email');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const cfg = (await res.json()) as TgConfig;
        if (cancelled) return;
        setTgConfig(cfg);

        // Load the widget script once — we only need its JS API.
        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-resumai-tg-widget]',
        );
        if (existing) {
          setTgReady(true);
          return;
        }
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://telegram.org/js/telegram-widget.js?22';
        s.dataset.resumaiTgWidget = '1';
        s.onload = () => !cancelled && setTgReady(true);
        s.onerror = () => !cancelled && setTgError('Не получилось загрузить Telegram');
        document.body.appendChild(s);
      } catch {
        if (!cancelled) setTgError('Не получилось подключить Telegram');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openTelegram() {
    if (!tgConfig) return;
    if (!window.Telegram?.Login) {
      toast.error('Telegram ещё не загрузился, попробуйте через секунду');
      return;
    }
    window.Telegram.Login.auth(
      { bot_id: tgConfig.botId, request_access: 'write', lang: 'ru' },
      (user) => {
        if (!user) {
          toast.info('Вход через Telegram отменён');
          return;
        }
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(user)) {
          qs.set(k, String(v));
        }
        window.location.assign(`${tgConfig.authUrl}?${qs.toString()}`);
      },
    );
  }

  async function startVk() {
    try {
      const res = await fetch(`/api/auth/vk/start?mode=${mode}`, { credentials: 'include' });
      if (res.status === 501) {
        toast.info('Вход через VK ID скоро включим — пока используйте email');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    } catch {
      toast.error('Не получилось открыть VK ID. Попробуйте ещё раз.');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" onClick={startVk} className="w-full">
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
          <path d="M12.6 17.8h1c.4 0 .5-.3.5-.5v-.9c0-.4.3-.5.7-.3.5.3 1 .8 1.5 1.2.5.4 1 .6 1.7.5h1.7c.5 0 .8-.2.6-.8-.4-1-2-2.5-2.4-3-.4-.4-.3-.6 0-1 .7-.9 1.9-2.4 2-3.2 0-.4-.3-.6-.7-.6h-1.7c-.5 0-.7.2-.9.6-.3.9-1 2-1.8 2.9-.3.2-.4.2-.5-.2V9c0-.4-.3-.6-.6-.6h-2.6c-.3 0-.5.2-.5.4 0 .3.5.3.6.9v2.6c0 .5-.1.6-.4.3-.9-.8-1.8-2.4-2.4-3.9-.2-.4-.3-.5-.9-.5H5.9c-.5 0-.6.2-.5.7 1 2.7 4 8.4 7.2 8.9z" />
        </svg>
        Войти через VK ID
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={openTelegram}
        disabled={!tgReady || !tgConfig}
        className="w-full"
      >
        <Send className="size-4" />
        {tgError
          ? 'Telegram недоступен'
          : tgReady
            ? 'Войти через Telegram'
            : 'Загружаем Telegram…'}
      </Button>
    </div>
  );
}
