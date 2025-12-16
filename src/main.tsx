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
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <>
      <AppRouter />
    </>
  </React.StrictMode>
)
