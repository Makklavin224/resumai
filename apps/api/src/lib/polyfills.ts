// Safety net: unpdf (pdfjs-dist) uses Promise.try which wasn't exposed by
// default on every 22.x build. Keep this tiny polyfill so older runtimes
// don't crash even if the base image slips back.
type PromiseTryCtor = PromiseConstructor & {
  try?: <T>(fn: () => T | PromiseLike<T>, ...args: unknown[]) => Promise<T>;
};

const p = Promise as PromiseTryCtor;
if (typeof p.try !== 'function') {
  p.try = function tryShim<T>(fn: () => T | PromiseLike<T>): Promise<T> {
    return new Promise<T>((resolve) => resolve(fn()));
  };
}
