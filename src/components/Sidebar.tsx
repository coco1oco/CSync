import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, MessageCircle, Bell, PawPrint, User, Users } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/ChatContext";
import logo from "@/assets/images/Pawpal.svg";
import type { UserRole } from "@/types";
import { NotificationCenter } from "./NotificationCenter";
import { MoreMenu } from "./MoreMenu"; // <--- Import the new component

interface SidebarProps {
  userRole: UserRole | null;
}

export function Sidebar({ userRole }: Readonly<SidebarProps>) {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useChat();
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Notification counts
  const adminNotificationCount = userRole === "admin" ? 3 : 0;
  const isMessagesPage = location.pathname.startsWith("/messages");
  const isCollapsed = isNotificationPanelOpen || isMessagesPage;

  const handleNotificationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMessagesPage) {
      setIsNotificationPanelOpen(true);
    } else {
      setIsNotificationPanelOpen(!isNotificationPanelOpen);
    }
  };

  const sidebarWidthClass = isCollapsed ? "w-[72px]" : "w-64";
  const hideTextClass = isCollapsed ? "hidden" : "block";
  const justifyClass = isCollapsed ? "justify-center" : "justify-start";
  const pxClass = isCollapsed ? "px-2" : "px-4";

  // Navigation Data
  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    ...(userRole === "admin"
      ? [
          { path: "/admin/team", icon: Users, label: "Manage Team" },
          {
            path: "/notifications",
            icon: Bell,
            label: "Notifications",
            count: adminNotificationCount,
            isButton: true,
          },
        ]
      : [
          {
            path: "/notifications",
            icon: Bell,
            label: "Notifications",
            isButton: true,
          },
        ]),
    { path: "/PetDashboard", icon: PawPrint, label: "Pet Dashboard" },
    { path: "/ProfilePage", icon: User, label: "Profile" },
  ];

  return (
    <>
      <aside 
        className={`hidden lg:flex flex-col h-screen fixed left-0 top-0 border-r border-gray-200 bg-white z-[60] transition-all duration-300 ease-in-out ${sidebarWidthClass}`}
      >
        {/* Logo Section */}
        <div className={`h-16 flex items-center ${justifyClass} ${isCollapsed ? '' : 'px-6 gap-3'}`}>
          <img src={logo} alt="PawPal" className="h-8 w-8 transition-transform hover:scale-105" />
          <span className={`font-bold text-xl text-blue-950 transition-opacity duration-200 ${hideTextClass}`}>
            PawPal
          </span>
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 space-y-2 py-4 ${pxClass}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isNotifActive = item.label === "Notifications" && isNotificationPanelOpen;
            const active = isActive(item.path) || isNotifActive || (item.label === "Messages" && isMessagesPage);

            const buttonClasses = `
              w-full flex items-center ${justifyClass} py-3 rounded-full transition-all font-medium relative group
              ${active ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
              ${isCollapsed ? 'px-0' : 'px-4 gap-3'}
            `;

            const content = (
              <>
                <div className="relative flex items-center justify-center">
                  {item.label === "Profile" && user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt="Profile"
                      className="w-6 h-6 rounded-full object-cover border border-gray-200 transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <Icon
                      size={24}
                      strokeWidth={active ? 2.5 : 2}
                      className="transition-transform group-hover:scale-105"
                    />
                  )}

                  {item.label === "Messages" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border-2 border-white shadow-sm">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}

                  {/* Notification Badge */}
                  {item.label === "Notifications" && (item.count || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full border-2 border-white shadow-sm"></span>
                  )}
                </div>
                <span className={`whitespace-nowrap transition-opacity duration-200 ${hideTextClass}`}>
                  {item.label}
                </span>
                {isCollapsed && (
                    <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                )}
              </>
            );

            // Render as Button or Link
            if (item.isButton) {
              return <button key={item.path} onClick={handleNotificationClick} className={buttonClasses}>{content}</button>;
            }
            return <Link key={item.path} to={item.path} className={buttonClasses}>{content}</Link>;
          })}
        </nav>

        {/* --- FOOTER SECTION --- */}
        <div className={`border-t border-gray-100 p-3 space-y-2`}>
          {/* Use the new MoreMenu Component */}
          <MoreMenu
            isCollapsed={isCollapsed}
            justifyClass={justifyClass}
            hideTextClass={hideTextClass}
          />

          {/* AFFILIATION */}
          <div
            className={`pt-2 flex items-center opacity-60 hover:opacity-100 transition-opacity ${justifyClass} ${
              isCollapsed ? "justify-center" : "gap-3 px-2"
            }`}
          >
            <img
              src="/Paws2.jpg"
              alt="PAWS Logo"
              className="w-8 h-8 grayscale flex-shrink-0"
            />
            <div className={hideTextClass}>
              <p className="text-[10px] uppercase font-bold text-gray-400">
                Affiliated with
              </p>
              <p className="text-xs font-bold text-gray-700">
                PAWS Philippines
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* RENDER NOTIFICATION PANEL */}
      <NotificationCenter
        variant="panel"
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
      />
    </>
  );
}
