import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/authContext";
import { ChatProvider } from "@/context/ChatContext";
import { DialogProvider } from "@/context/DialogContext";
import { NotificationProvider } from "@/context/NotificationContext";
import InstallPWA from "./components/InstallPWA";
import AppRouter from "@/Routes/AppRouter";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import logo from "@/assets/images/PawPal.svg";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// 1. ✨ ENHANCED: The "Splash Screen" Component
function GlobalLoader() {
  const [message, setMessage] = useState("Loading your pack...");

  // Cycle through cute messages while loading
  useEffect(() => {
    const messages = [
      "Loading your pack...",
      "Fetching the treats...",
      "Waking up the kittens...",
      "Chasing tails...",
      "Finding the squeaky toy...",
      "Preparing the park...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setMessage(messages[i]);
    }, 1800); // Change text every 1.8 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-white to-blue-50/50 z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="relative mb-8">
        {/* Pulsing outer rings for depth */}
        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-10 delay-100 duration-1000"></div>
        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20 duration-1000"></div>

        {/* Logo Container with gentle bounce */}
        <div className="relative z-10 bg-white p-6 rounded-3xl shadow-xl shadow-blue-100/50 animate-bounce [animation-duration:3s]">
          <img
            src={logo}
            alt="PawPal"
            className="w-20 h-20 object-contain drop-shadow-sm"
          />
        </div>
      </div>

      {/* Text Only (Spinner Removed) */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-gray-400 text-sm font-medium tracking-wide animate-pulse min-h-[20px] text-center">
          {message}
        </p>
      </div>
    </div>
  );
}

// 2. The Content Wrapper (Wait for Auth)
function AppContent() {
  const { loading } = useAuth();

  // 🛑 BLOCK THE APP until we know if user is logged in
  if (loading) {
    return <GlobalLoader />;
  }

  // 🚀 RENDER THE APP
  return (
    <NotificationProvider>
      <ChatProvider>
        <DialogProvider>
          <InstallPWA />
          <AppRouter />
          <Toaster position="top-center" richColors closeButton />
        </DialogProvider>
      </ChatProvider>
    </NotificationProvider>
  );
}

// 3. The Root App
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
