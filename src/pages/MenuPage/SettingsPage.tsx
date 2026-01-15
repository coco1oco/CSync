import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  HelpCircle,
  FileText,
  ChevronRight,
  ArrowLeft,
  MessageSquareWarning,
  LogOut,
  Info,
  Loader2,
  Settings,
} from "lucide-react"; // Removed ShieldAlert
import { useAuth } from "@/context/authContext";

// Import your components...
import { AccountSettings } from "@/components/settings/AccountSettings";
import { PrivacyPolicy } from "@/components/settings/PrivacyPolicy";
import { HelpSupport } from "@/components/settings/HelpSupport";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { ReportProblem } from "@/components/settings/ReportProblem";
import { About } from "@/components/settings/About";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // --- ADMIN LIST REMOVED FROM HERE ---
  const menuItems = [
    { id: "account", label: "Account Center", icon: User },
    { id: "privacy", label: "Privacy & Policy", icon: FileText },
    { id: "help", label: "Help & Support", icon: HelpCircle },
    { id: "report", label: "Report a problem", icon: MessageSquareWarning },
    { id: "about", label: "About", icon: Info },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setShowMobileDetail(true);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/SignIn");
    } catch (error) {
      setIsSigningOut(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountSettings />;
      case "privacy":
        return <PrivacyPolicy />;
      case "help":
        return <HelpSupport />;
      case "report":
        return <ReportProblem />;
      case "about":
        return <About />;
      default:
        return <AccountSettings />;
    }
  };

  return (
    <div className="w-full min-h-full transition-all duration-300">
      <div className="w-full">
        {/* --- Header --- */}
        <div className="mb-6 flex items-center gap-3 md:pl-1">
          <button
            onClick={() => setShowMobileDetail(false)}
            className={`p-2 rounded-full hover:bg-gray-200 text-gray-700 md:hidden ${
              showMobileDetail ? "block" : "hidden"
            }`}
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Settings
              className={`w-8 h-8 text-gray-400 hidden md:block ${
                showMobileDetail ? "hidden" : ""
              }`}
            />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {showMobileDetail
                ? menuItems.find((i) => i.id === activeTab)?.label
                : "Settings"}
            </h1>
          </div>
        </div>

        {/* --- Layout Wrapper --- */}
        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
          {/* --- Sidebar Menu --- */}
          <nav
            className={`w-full md:w-64 shrink-0 md:sticky md:top-6 transition-all ${
              showMobileDetail ? "hidden md:block" : "block"
            }`}
          >
            {/* Mobile Profile Card */}
            <div className="md:hidden mb-4">
              <Link
                to="/ProfilePage"
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform"
              >
                <img
                  src={
                    user?.avatar_url ||
                    "https://ui-avatars.com/api/?name=User&background=random"
                  }
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {user?.first_name} {user?.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">View profile</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="bg-transparent md:space-y-1">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                const isMobileOnly =
                  item.id === "display" || item.id === "report";

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`group w-full flex items-center justify-between p-3.5 md:py-3 md:px-4 rounded-xl md:rounded-lg text-sm font-medium transition-all duration-200 relative
                                    ${isMobileOnly ? "md:hidden" : ""}
                                    ${
                                      isActive
                                        ? "bg-white md:bg-white text-blue-700 shadow-sm md:shadow-sm md:ring-1 md:ring-gray-200"
                                        : "bg-white md:bg-transparent text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 border border-gray-100 md:border-transparent"
                                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-blue-600 rounded-r-full hidden md:block" />
                    )}

                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-md transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-600"
                            : "bg-transparent text-gray-400 group-hover:text-gray-600"
                        }`}
                      >
                        <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span
                        className={`text-base md:text-sm ${
                          isActive ? "font-semibold" : ""
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-gray-300 md:hidden"
                    />
                  </button>
                );
              })}
            </div>

            {/* Mobile Sign Out */}
            <div className="mt-6 pt-6 border-t border-gray-200/60 md:hidden">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                {isSigningOut ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <LogOut size={18} />
                )}
                <span>Log out</span>
              </button>
              <p className="text-xs text-gray-400 mt-4 px-4">PawPal v1.0.0</p>
            </div>
          </nav>

          {/* --- Main Content Area --- */}
          <main
            className={`flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 pb-28 md:pb-8 w-full ${
              showMobileDetail ? "block" : "hidden md:block"
            }`}
          >
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
