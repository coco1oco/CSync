import { Outlet, Navigate, useLocation } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/context/authContext";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const userRole = (user as any)?.role || "member";

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );

  if (!user) return <Navigate to="/SignIn" replace />;

  // 🛡️ SECURITY CHECK: FORCE PROFILE COMPLETION
  // If user is missing their name, AND they are not already on the Edit page,
  // force them to go there.
  const isProfileIncomplete = !user.first_name || !user.last_name;
  const isOnEditPage = location.pathname === "/ProfilePage/Edit";

  if (isProfileIncomplete && !isOnEditPage) {
    return <Navigate to="/ProfilePage/Edit" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* SIDEBAR (Desktop) */}
      <Sidebar userRole={userRole} />

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* HEADER (Mobile) */}
        <div className="lg:hidden sticky top-0 z-40">
          <Header showProfile={true} />
        </div>

        {/* MAIN SCROLLABLE AREA */}
        <main className="flex-1 px-0 pb-24 lg:pb-8 lg:px-8 lg:pt-8 w-full max-w-2xl mx-auto">
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

      {/* BOTTOM NAV (Mobile) */}
      <div className="lg:hidden">
        <BottomNavigation userRole={userRole} />
      </div>
    </div>
  );
}
