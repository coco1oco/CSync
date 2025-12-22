import AppRouter from "./Routes/AppRouter"
import InstallPWA from "./components/InstallPWA";
import { useEffect } from "react";
import { requestNotificationPermission, setupForegroundNotificationHandler } from "./lib/NotificationService";


export default function App() {
  useEffect(() => {
    // Delay notification setup to not block app load
    setTimeout(() => {
      requestNotificationPermission().then(token => {
        if (token) {
          console.log("FCM Token:", token);
        }
      }).catch(console.error);
      setupForegroundNotificationHandler();
    }, 1000);
  }, []);

  return (
    <>
      <InstallPWA />
      <AppRouter />
    </>
  );
}
