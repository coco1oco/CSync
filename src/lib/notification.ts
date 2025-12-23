import { messaging } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';

// Request permission and get FCM token
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY', // Replace with your VAPID key from Firebase Console
      });
      return token;
    }
    return null;
  } catch (err) {
    console.error('Unable to get permission to notify.', err);
    return null;
  }
}

// Listen for foreground messages
export function listenForMessages(callback: (payload: any) => void) {
  onMessage(messaging, callback);
}
