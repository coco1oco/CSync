import React from "react"
import ReactDOM from "react-dom/client"
import AppRouter from "./Routes/AppRouter"
import "./index.css"

import { setupForegroundNotificationHandler } from './lib/NotificationService';

// 1. Register the Firebase messaging service worker (background notifications)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        const sanitizedScope = String(registration.scope).replace(/[\r\n]/g, ' ');
        console.log('Service Worker registered:', sanitizedScope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Setup foreground notification handler
setupForegroundNotificationHandler();

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error('Root element not found');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <>
        <AppRouter />
      </>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
}
