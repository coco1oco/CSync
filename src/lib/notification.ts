import { messaging } from "../lib/firebase";
import { getToken, onMessage } from "firebase/messaging";

// Request permission and get FCM token
export async function requestNotificationPermission() {
  // ✅ FIX: Check if Notification API exists before accessing it
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey:
          "BHKduEnqHT5hRFJOU8Yz3xG6YBTTfZfNZJilPwj3_7Vif3UVlE5PyWrDui78q1SRE3SwM8BZXFE0R6loBwJuy2o", // Replace with your VAPID key
      });
      return token;
    }
    return null;
  } catch (err) {
    console.error("Unable to get permission to notify.", err);
    return null;
  }
}

// Listen for foreground messages
export function listenForMessages(callback: (payload: any) => void) {
  // ✅ FIX: Ensure messaging is supported/initialized before listening
  try {
    onMessage(messaging, callback);
  } catch (err) {
    console.log("Messaging not supported in this environment");
  }
}
