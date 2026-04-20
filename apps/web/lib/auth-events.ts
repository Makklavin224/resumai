/** Lightweight pub/sub so login/register/logout can nudge useAuth without
 * pulling in a full state lib. Fired from authApi wrappers (or anywhere
 * auth state changes); listened to inside useAuth. */

const EVENT = 'resumai:auth-changed';

export function emitAuthChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENT));
}

export function onAuthChanged(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
