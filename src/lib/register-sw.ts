/**
 * Single place where the offline worker is registered.
 *
 * It refuses to register in development, inside an iframe (Lovable preview),
 * on Lovable preview hostnames, or when the address carries ?sw=off — and it
 * cleans up any worker left behind in those contexts.
 */

const SW_URL = '/sw.js';

function isPreviewHost(host: string): boolean {
  return (
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host === 'lovableproject.com' ||
    host.endsWith('.lovableproject.com') ||
    host === 'lovableproject-dev.com' ||
    host.endsWith('.lovableproject-dev.com') ||
    host === 'beta.lovable.dev' ||
    host.endsWith('.beta.lovable.dev')
  );
}

function shouldRegister(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (isPreviewHost(window.location.hostname)) return false;
  if (new URLSearchParams(window.location.search).get('sw') === 'off') return false;
  return true;
}

async function unregisterExisting(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
          return url.endsWith(SW_URL) || url.endsWith('/service-worker.js');
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  if (!shouldRegister()) {
    void unregisterExisting();
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: '/' })
      .then((registration) => {
        const checkForUpdate = () => {
          registration.update().catch(() => {
            /* offline or transient */
          });
        };

        checkForUpdate();
        setInterval(checkForUpdate, 60 * 1000);

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        });
        window.addEventListener('focus', checkForUpdate);
        window.addEventListener('online', checkForUpdate);
      })
      .catch(() => {
        /* installation not possible in this browser */
      });
  });
}
