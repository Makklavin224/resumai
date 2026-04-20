'use client';

import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * VK ID + Telegram OAuth buttons. The OAuth flows themselves are
 * wired to /api/auth/{vk,telegram}/* on the server; the buttons link
 * to those endpoints. If the provider env vars aren't set yet the
 * server returns 501 and we show a friendly toast here.
 */
export function SocialButtons({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  async function start(provider: 'vk' | 'telegram') {
    try {
      const res = await fetch(`/api/auth/${provider}/start?mode=${mode}`, {
        credentials: 'include',
      });
      if (res.status === 501) {
        toast.info(
          provider === 'vk'
            ? 'Вход через VK ID скоро включим — пока используйте email'
            : 'Вход через Telegram скоро включим — пока используйте email',
        );
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    } catch {
      toast.error('Не получилось открыть вход. Попробуйте ещё раз.');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button type="button" variant="outline" onClick={() => start('vk')}>
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          focusable="false"
        >
          <path d="M12.6 17.8h1c.4 0 .5-.3.5-.5v-.9c0-.4.3-.5.7-.3.5.3 1 .8 1.5 1.2.5.4 1 .6 1.7.5h1.7c.5 0 .8-.2.6-.8-.4-1-2-2.5-2.4-3-.4-.4-.3-.6 0-1 .7-.9 1.9-2.4 2-3.2 0-.4-.3-.6-.7-.6h-1.7c-.5 0-.7.2-.9.6-.3.9-1 2-1.8 2.9-.3.2-.4.2-.5-.2V9c0-.4-.3-.6-.6-.6h-2.6c-.3 0-.5.2-.5.4 0 .3.5.3.6.9v2.6c0 .5-.1.6-.4.3-.9-.8-1.8-2.4-2.4-3.9-.2-.4-.3-.5-.9-.5H5.9c-.5 0-.6.2-.5.7 1 2.7 4 8.4 7.2 8.9z" />
        </svg>
        VK ID
      </Button>
      <Button type="button" variant="outline" onClick={() => start('telegram')}>
        <Send className="size-4" />
        Telegram
      </Button>
    </div>
  );
}
