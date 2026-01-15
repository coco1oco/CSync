import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Settings,
  MessageSquareWarning,
  LogOut,
  Loader2,
  Menu as MenuIcon,
  ChevronLeft, // For the back button
  Sun,
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Keep Report Modal as a separate modal if it's a large form
import { ReportProblemModal } from "./ReportProblemModal";

interface MoreMenuProps {
  isCollapsed: boolean;
  justifyClass: string;
  hideTextClass: string;
}

export function MoreMenu({
  isCollapsed,
  justifyClass,
  hideTextClass,
}: Readonly<MoreMenuProps>) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // 1. STATE FOR VIEW SWITCHING ('main' or 'display')
  const [menuView, setMenuView] = useState<"main" | "display">("main");
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Local state for Report Modal only
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Mock Theme State (Replace with your actual context)
  const [isDark, setIsDark] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/SignIn");
    } catch (error) {
      setIsSigningOut(false);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    // Add your actual theme context logic here
  };

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          // Reset to main view when menu closes so it starts fresh next time
          if (!open) {
            setTimeout(() => setMenuView("main"), 200);
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            className={`w-full flex items-center ${justifyClass} p-3 rounded-full hover:bg-gray-100 transition-all outline-none group ${
              isCollapsed ? "justify-center" : "px-4 gap-3"
            }`}
          >
            <MenuIcon
              size={24}
              className="text-gray-600 group-hover:scale-105 transition-transform"
            />
            <div className={`text-left min-w-0 ${hideTextClass}`}>
              <p className="font-medium text-gray-600 group-hover:text-gray-900">
                More
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>

        {/* The Width (w-64) ensures enough space for the toggle. 
           z-index ensures it sits above other content.
        */}
        <DropdownMenuContent
          side="top"
          align="start"
          className="w-64 p-2 rounded-xl shadow-xl border border-gray-200 bg-white z-[70] overflow-hidden"
          sideOffset={10}
        >
          {/* === VIEW 1: MAIN MENU === */}
          {menuView === "main" && (
            <div className="space-y-1 animate-in slide-in-from-left-2 duration-200">
              <DropdownMenuItem asChild>
                <Link
                  to="/settings"
                  className="p-3 cursor-pointer rounded-lg hover:bg-gray-100 focus:bg-gray-100 flex items-center gap-3 group"
                >
                  <Settings size={20} className="text-gray-600" />
                  <span className="font-medium text-gray-700 flex-1">
                    Settings
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsReportModalOpen(true)}
                className="p-3 cursor-pointer rounded-lg hover:bg-gray-100 focus:bg-gray-100 flex items-center gap-3 group"
              >
                <MessageSquareWarning size={20} className="text-gray-600" />
                <span className="font-medium text-gray-700 flex-1">
                  Report a problem
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-gray-100 my-1" />

              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="p-3 cursor-pointer rounded-lg hover:bg-red-50 focus:bg-red-50 flex items-center gap-3 group mt-1"
              >
                {isSigningOut ? (
                  <Loader2 size={20} className="animate-spin text-red-600" />
                ) : (
                  <LogOut size={20} className="text-red-600" />
                )}
                <span className="font-medium text-red-600">Log out</span>
              </DropdownMenuItem>
            </div>
          )}

          {/* === VIEW 2: DISPLAY SETTINGS (Overrides Main Menu) === */}
          {menuView === "display" && (
            <div className="animate-in slide-in-from-right-2 duration-200">
              {/* Header with Back Button */}
              <div className="flex items-center gap-2 p-2 border-b border-gray-100 mb-2">
                <button
                  onClick={() => setMenuView("main")}
                  className="p-1 hover:bg-gray-100 rounded-full text-slate-500 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-semibold text-slate-700 text-sm">
                  Switch appearance
                </span>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Keep Report Modal external as it is likely a pop-up form */}
      <ReportProblemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </>
  );
}
