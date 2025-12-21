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
  // ✅ UPDATE: Match ALL PetDashboard sub-routes (e.g., /PetDashboard/123)
  const isPetDashboard = location.pathname.startsWith("/PetDashboard");

  // Pages that lock the window scroll and handle their own scrolling
  const isFixedPage = isMessagesPage || isPetDashboard;

  // Pages that use the full width (7xl)
  const isAdminPage =
    location.pathname.startsWith("/Admin") ||
    location.pathname.startsWith("/admin");
  const isWidePage = isFixedPage || isAdminPage;

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
        isFixedPage ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      )}
    >
      <Sidebar userRole={userRole} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <div className="lg:hidden sticky top-0 z-40">
          <Header showProfile={true} />
        </div>

        <main
          className={cn(
            "flex-1 w-full mx-auto transition-all",
            isWidePage ? "max-w-7xl" : "max-w-2xl",
            // If fixed, we remove window padding so the child handles it
            isFixedPage
              ? "h-full flex flex-col overflow-hidden p-0"
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
