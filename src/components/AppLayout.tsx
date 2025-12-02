import { Outlet } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/context/authContext";

export default function AppLayout() {
  const { user } = useAuth();

  // Default role fallback
  const userRole = (user as any)?.role || "member";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* === DESKTOP: Sidebar (Hidden on Mobile) === */}
      <Sidebar userRole={userRole} />

      {/* === MOBILE: Header (Hidden on Desktop) === */}
      <div className="lg:hidden">
        <Header showProfile={true} />
      </div>

      {/* === MAIN CONTENT AREA === */}
      {/* lg:ml-64 -> Pushes content right to make room for Sidebar on desktop 
          pb-24 -> Adds bottom padding so content isn't hidden behind Mobile Nav
      */}
      <main className="lg:ml-64 min-h-screen pb-24 lg:pb-8 px-4 pt-4 lg:px-8 lg:pt-8 max-w-5xl mx-auto">
        <Outlet />
      </main>

      {/* === MOBILE: Bottom Nav (Hidden on Desktop) === */}
      <div className="lg:hidden">
        <BottomNavigation userRole={userRole} />
      </div>
    </div>
  );
}
