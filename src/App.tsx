import { AuthProvider, useAuth } from "@/context/authContext";
import { ChatProvider } from "@/context/ChatContext";
import { DialogProvider } from "@/context/DialogContext";
import { NotificationProvider } from "@/context/NotificationContext";
import AppRouter from "@/Routes/AppRouter";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import logo from "@/assets/images/PawPal.svg";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Don't retry failed requests too many times
      staleTime: 5 * 60 * 1000, // Cache data for 5 minutes by default
    },
  },
});

// 1. The "Splash Screen" Component
function GlobalLoader() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
        <img src={logo} alt="PawPal" className="w-24 h-24 mb-4 relative z-10" />
      </div>
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-gray-400 text-sm mt-4 font-medium tracking-wide">
        Loading your pack...
      </p>
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
