importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyACR7SWj9jwsDHBv5823MgiZEcf-_v-CV8',
  authDomain: 'pawpal-227be.firebaseapp.com',
  projectId: 'pawpal-227be',
  storageBucket: 'pawpal-227be.firebasestorage.app',
  messagingSenderId: '406637646338',
  appId: '1:406637646338:web:79f8e60a9cc7572b668d1b',
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'PawPals';
  const options = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});
