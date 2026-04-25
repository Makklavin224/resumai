'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

const YANDEX_METRIKA_ID = 108686366;

declare global {
  interface Window {
    ym?: ((id: number, action: string, params?: Record<string, unknown> | string) => void) & {
      a?: unknown[];
      l?: number;
    };
  }
}

function MetrikaPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ym) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    window.ym(YANDEX_METRIKA_ID, 'hit', {
      url: window.location.origin + url,
      referer: document.referrer,
    } as unknown as Record<string, unknown>);
  }, [pathname, searchParams]);

  return null;
}

export function YandexMetrika() {
  return (
    <>
      <Script id="yandex-metrika-init" strategy="afterInteractive">
        {`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}', 'ym');
          ym(${YANDEX_METRIKA_ID}, 'init', {
            ssr:true,
            webvisor:true,
            clickmap:true,
            ecommerce:"dataLayer",
            accurateTrackBounce:true,
            trackLinks:true,
            defer:true
          });
        `}
      </Script>
      <Suspense fallback={null}>
        <MetrikaPageviews />
      </Suspense>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
