import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA support and keep it up to date automatically
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        const checkForUpdate = () => {
          registration.update().catch(() => {/* offline or transient - ignore */});
        };

        // Check right away, then frequently while the app is open
        checkForUpdate();
        setInterval(checkForUpdate, 60 * 1000);

        // Check whenever the user returns to the tab / reopens the app
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        });
        window.addEventListener('focus', checkForUpdate);
        window.addEventListener('online', checkForUpdate);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}


createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
