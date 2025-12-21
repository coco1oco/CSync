importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

self.addEventListener('message', (event) => {
  if (!event.origin || event.origin !== self.location.origin) {
    console.warn('Rejected message from untrusted origin:', event.origin);
    return;
  }
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    initializeFirebase(event.data.config);
  }
});

function initializeFirebase(firebaseConfig) {
  try {
    if (!firebaseConfig) {
      throw new Error('Firebase config is required');
    }
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    try {
      const title = payload.notification?.title || 'PawPals';
      const options = {
        body: payload.notification?.body || '',
        icon: '/favicon.ico',
        data: payload.data || {},
      };
      self.registration.showNotification(title, options);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  });
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}
