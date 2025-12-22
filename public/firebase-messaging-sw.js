// This is the Firebase Cloud Messaging service worker for push notifications
// Place this file in your public/ directory as 'firebase-messaging-sw.js'

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage(function(payload) {
  const { title, ...options } = payload.notification;
  self.registration.showNotification(title, options);
});
