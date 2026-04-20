import { NextResponse } from 'next/server';

/**
 * Server-side proxy for the Telegram login widget script. Some Russian
 * residential networks intermittently throttle fetches to telegram.org
 * which leaves our auth button silently hanging. Serving the same file
 * from our own domain makes the button reliably appear.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://telegram.org/js/telegram-widget.js?22', {
      headers: { 'User-Agent': 'Mozilla/5.0 ResumAI-widget-proxy' },
      cache: 'no-store',
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('// upstream unavailable', {
      status: 502,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
    });
  }
}
