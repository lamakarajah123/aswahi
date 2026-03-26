import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';

import { registerSW } from 'virtual:pwa-register';

// Unregister any stale service workers (the @metagptx/web-sdk SW intercepts
// cross-origin requests to localhost:8001 and causes ERR_FAILED errors).
// BUT we want to keep our PWA service worker if it's already there.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  // In dev, we might still want to clean up stale ones
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      if (reg.active?.scriptURL.includes('sw.js')) continue; // Keep our SW
      reg.unregister();
      console.info('[SW] Unregistered stale service worker:', reg.scope);
    }
  });
}

// Load runtime configuration before rendering the app
async function initializeApp() {
  try {
    await loadRuntimeConfig();
  } catch {
    // Silently fall back to env defaults
  }

  // Render the app
  createRoot(document.getElementById('root')!).render(<App />);
}

// Initialize the app
initializeApp();
