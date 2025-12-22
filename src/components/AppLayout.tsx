import { Outlet, Navigate, useLocation } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/context/authContext";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const userRole = (user as any)?.role || "member";

  // 🔍 ROUTE DETECTION
  const isMessagesPage = location.pathname === "/messages";

  // Detect any PetDashboard route (Dashboard, Add Pet, Edit Pet, etc.)
  const isPetDashboard = location.pathname.startsWith("/PetDashboard");

  // Detect Admin pages
  const isAdminPage =
    location.pathname.startsWith("/Admin") ||
    location.pathname.startsWith("/admin");

  // --- LAYOUT CONFIGURATION ---

  // 1. Fixed Page: Locks window scroll (used for Chat/Messages only)
  const isFixedPage = isMessagesPage;

  // 2. Wide Page: Uses full width (max-w-full) instead of constrained width
  const isWidePage = isFixedPage || isAdminPage || isPetDashboard;

  // 3. Edge-to-Edge: Removes AppLayout padding so the child page can control it
  const isEdgeToEdge = isPetDashboard;

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );

  if (!user) return <Navigate to="/SignIn" replace />;

  const isProfileIncomplete = !user.first_name || !user.last_name;
  const isOnEditPage = location.pathname === "/ProfilePage/Edit";

  if (isProfileIncomplete && !isOnEditPage) {
    return <Navigate to="/ProfilePage/Edit" replace />;
  }

  return (
    <div
      className={cn(
        "bg-gray-50 flex flex-col lg:flex-row",
        // Only lock overflow if it's strictly a fixed page (like Messages)
        isFixedPage ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      )}
    >
      <Sidebar userRole={userRole} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Mobile Header (Sticky) - HIDDEN ON MESSAGES PAGE */}
        {!isFixedPage && (
          <div className="lg:hidden sticky top-0 z-40">
            <Header showProfile={true} />
          </div>
        )}

        <main
          className={cn(
            "flex-1 w-full mx-auto transition-all",
            // Allow full width for Dashboard/Admin to utilize the whole right side
            isWidePage ? "max-w-full" : "max-w-2xl",

            // Layout Logic
            isFixedPage
              ? "h-full flex flex-col overflow-hidden p-0"
              : isEdgeToEdge
              ? "p-0" // Remove padding for Dashboard
              : "px-0 pb-24 lg:pb-8 lg:px-8 lg:pt-8"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <div className="lg:hidden z-50">
        <BottomNavigation userRole={userRole} />
      </div>
    </div>
  );
}
