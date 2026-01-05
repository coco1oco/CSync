import { useEffect, useMemo } from "react";
import AppRouter from "./Routes/AppRouter";
import InstallPWA from "./components/InstallPWA";
import {
  requestNotificationPermission,
  setupForegroundNotificationHandler,
} from "./lib/NotificationService";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Providers
import { AuthProvider } from "./context/authContext";
import { ChatProvider } from "./context/ChatContext";
import { NotificationProvider } from "./context/NotificationContext";
import { Toaster } from "sonner";
import { DialogProvider } from "./context/DialogContext";

const queryClient = new QueryClient();
export default function App() {
  useEffect(() => {
    // Delay notification setup to not block app load
    setTimeout(() => {
      requestNotificationPermission()
        .then((token) => {
          if (token) {
            console.log("FCM Token:", token);
          }
        })
        .catch(console.error);
      setupForegroundNotificationHandler();
    }, 1000);
  }, []);

  // ✅ RESTORED: Smart offset logic for mobile devices
  const toastOffset = useMemo(() => {
    if (typeof window === "undefined") return 12;
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--safe-area-inset-top")
      .trim();
    const insetTop = Number.parseFloat(raw) || 0;
    return Math.ceil(insetTop + 12);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DialogProvider>
          <ChatProvider>
            <NotificationProvider>
              <InstallPWA />
              <AppRouter />
              {/* ✅ FIXED: Changed to 'top-center' and added offset */}
              <Toaster position="top-center" richColors offset={toastOffset} />
            </NotificationProvider>
          </ChatProvider>
        </DialogProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
