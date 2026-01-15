// This is the Firebase Cloud Messaging service worker for push notifications
// Place this file in your public/ directory as 'firebase-messaging-sw.js'

importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyACR7SWj9jwsDHBv5823MgiZEcf-_v-CV8",
  authDomain: "pawpal-227be.firebaseapp.com",
  projectId: "pawpal-227be",
  storageBucket: "pawpal-227be.firebasestorage.app",
  messagingSenderId: "406637646338",
  appId: "1:406637646338:web:79f8e60a9cc7572b668d1b",
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage(function (payload) {
  console.log("Received background message ", payload);
  // ✅ FIX: Do NOT call showNotification() here.
  // The browser/OS handles it automatically for you.
});

