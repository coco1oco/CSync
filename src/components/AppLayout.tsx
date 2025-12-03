import { Outlet, Navigate, useLocation } from "react-router-dom"; // Added useLocation
import { BottomNavigation } from "./BottomNavigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/context/authContext";
import { motion, AnimatePresence } from "framer-motion"; // <--- IMPORT THIS

export default function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation(); // <--- Need this to track page changes

  // Default role fallback
  const userRole = (user as any)?.role || "member";

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/SignIn" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userRole={userRole} />

      <div className="lg:hidden">
        <Header showProfile={true} />
      </div>

      <main className="lg:ml-64 min-h-screen pb-24 lg:pb-8 px-4 pt-4 lg:px-8 lg:pt-8 max-w-5xl mx-auto">
        {/* 🚀 THE ANIMATION MAGIC */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname} // This tells Framer "The page changed!"
            initial={{ opacity: 0, y: 5 }} // Start slightly lower and transparent
            animate={{ opacity: 1, y: 0 }} // Fade in and slide up
            exit={{ opacity: 0, y: -5 }} // Fade out and slide up slightly
            transition={{ duration: 0.2 }} // Fast (200ms) so it feels snappy
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="lg:hidden">
        <BottomNavigation userRole={userRole} />
      </div>
    </div>
  );
}
