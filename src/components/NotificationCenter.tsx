import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/context/NotificationContext";
import { requestNotificationPermission } from "@/lib/NotificationService";
import {
  Heart,
  MessageCircle,
  AtSign,
  X,
  Bell,
  BellOff,
  Loader2,
  Globe,
  ShieldAlert,
  CalendarCheck,
  BellRing,
  CheckCircle2,
  Clock,
  XCircle,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NotificationType =
  | "message"
  | "reaction"
  | "comment"
  | "reply"
  | "mention"
  | "comment_like"
  | "pet_task"
  | "schedule"
  | "vaccination"
  | "new_post"
  | "system"
  | "official_event"
  | "event_reminder"
  | "registration_approved"
  | "registration_waitlist"
  | "registration_rejected"
  | "registration_removed"
  | "event_checkin";

interface NotificationCenterProps {
  variant?: "page" | "panel";
  isOpen?: boolean;
  onClose?: () => void;
}

export function NotificationCenter({
  variant = "page",
  isOpen = false,
  onClose = () => {},
}: NotificationCenterProps) {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead } = useNotifications();

  // ✅ FIX 1: Safe Initialization for iOS
  // If 'Notification' doesn't exist, default to "default" (or "denied") to prevent crash
  const [permission, setPermission] = useState(
    "Notification" in window ? Notification.permission : "default"
  );

  // ✅ FIX 2: Safe Handler
  const handleEnableNotifications = async () => {
    // Guard clause: stop if browser doesn't support it
    if (!("Notification" in window)) return;

    const token = await requestNotificationPermission();

    // Now safe to access global Notification object
    setPermission(Notification.permission);

    if (token) {
      console.log("Push Token:", token);
    } else if (Notification.permission === "granted") {
      console.error(
        "Permission granted, but failed to get Token. Check config."
      );
    }
  };

  // --- Click Handler ---
  async function handleClick(n: any) {
    if (n.is_unread) {
      await markAsRead(n.id);
    }

    // 1. SMART INTERCEPT: Check for Official Event types
    if (
      n.type === "official_event" ||
      n.type === "event_reminder" ||
      n.type === "registration_approved" ||
      n.type === "registration_waitlist" ||
      n.type === "registration_rejected" ||
      n.type === "registration_removed" ||
      n.type === "event_checkin" ||
      (n.type === "new_post" && n.title?.includes("Event"))
    ) {
      let eventId = n.data?.event_id;

      if (!eventId && n.data?.link) {
        const uuidMatch = n.data.link.match(
          /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
        );
        if (uuidMatch) eventId = uuidMatch[0];
      }

      if (eventId) {
        navigate(`/official-event/${eventId}`, { replace: true });
        if (variant === "panel") onClose();
        return;
      }
    }

    // Default Behavior
    if (n.data?.link) {
      navigate(n.data.link);
      if (variant === "panel") onClose();
    }
  }

  // --- Grouping Logic ---
  function getGroupLabel(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const notifDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (notifDate.getTime() === today.getTime()) return "Today";
    if (notifDate.getTime() === yesterday.getTime()) return "Yesterday";

    const diffTime = Math.abs(today.getTime() - notifDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return "This week";
    if (diffDays <= 30) return "This month";
    return "Earlier";
  }

  // --- Icon Logic ---
  const getIcon = (type: NotificationType) => {
    const base =
      "absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 border-2 border-white flex items-center justify-center";
    switch (type) {
      case "reaction":
        return (
          <div className={`${base} bg-red-500`}>
            <Heart size={10} className="text-white fill-white" />
          </div>
        );
      case "comment":
        return (
          <div className={`${base} bg-blue-500`}>
            <MessageCircle size={10} className="text-white fill-white" />
          </div>
        );
      case "reply":
        return (
          <div className={`${base} bg-green-500`}>
            <MessageCircle size={10} className="text-white fill-white" />
          </div>
        );
      case "mention":
        return (
          <div className={`${base} bg-orange-500`}>
            <AtSign size={10} className="text-white" />
          </div>
        );
      case "comment_like":
        return (
          <div className={`${base} bg-red-500`}>
            <Heart size={10} className="text-white fill-white" />
          </div>
        );
      case "new_post":
        return (
          <div className={`${base} bg-purple-500`}>
            <Globe size={10} className="text-white" />
          </div>
        );
      case "system":
        return (
          <div className={`${base} bg-blue-600`}>
            <ShieldAlert size={10} className="text-white" />
          </div>
        );
      case "official_event":
        return (
          <div className={`${base} bg-purple-600`}>
            <CalendarCheck size={10} className="text-white" />
          </div>
        );
      case "event_reminder":
        return (
          <div className={`${base} bg-amber-500`}>
            <BellRing size={10} className="text-white" />
          </div>
        );
      case "registration_approved":
        return (
          <div className={`${base} bg-green-500`}>
            <CheckCircle2 size={10} className="text-white" />
          </div>
        );
      case "registration_waitlist":
        return (
          <div className={`${base} bg-amber-500`}>
            <Clock size={10} className="text-white" />
          </div>
        );
      case "registration_rejected":
      case "registration_removed":
        return (
          <div className={`${base} bg-red-500`}>
            <XCircle size={10} className="text-white" />
          </div>
        );
      case "event_checkin":
        return (
          <div className={`${base} bg-teal-500`}>
            <PartyPopper size={10} className="text-white" />
          </div>
        );
      default:
        return (
          <div className={`${base} bg-gray-500`}>
            <Bell size={10} className="text-white" />
          </div>
        );
    }
  };

  // --- Content Logic ---
  const renderNotificationContent = (n: any) => {
    const actors = n.data?.actors;
    const username = n.sender?.username || "System";

    const getSuffix = (type: string) => {
      if (type === "reaction") return "liked your post";
      if (type === "comment") return "commented on your post";
      if (type === "mention") return "mentioned you";
      if (type === "reply") return "replied to your comment";
      if (type === "comment_like") return "liked your comment";
      return "acted on your post";
    };

    if (Array.isArray(actors) && actors.length > 1) {
      const count = actors.length;
      const suffix = getSuffix(n.type);
      if (count === 2) {
        return (
          <>
            <span className="font-bold text-gray-700">{actors[0]}</span>
            <span className="text-gray-600"> and </span>
            <span className="font-bold text-gray-700">{actors[1]}</span>
            <span className="text-gray-600"> {suffix}</span>
          </>
        );
      }
      return (
        <>
          <span className="font-bold text-gray-700">{actors[0]}</span>
          <span className="text-gray-600">, </span>
          <span className="font-bold text-gray-700">{actors[1]}</span>
          <span className="text-gray-600"> and {count - 2} others </span>
          <span className="text-gray-600"> {suffix}</span>
        </>
      );
    }

    if (n.type === "reaction")
      return (
        <>
          <span className="font-bold text-gray-700 mr-1">{username}</span>
          <span className="text-gray-600">liked your post</span>
        </>
      );
    if (n.type === "new_post")
      return (
        <>
          <span className="font-bold text-gray-900 mr-1">{username}</span>
          <span className="text-gray-600">posted a new update</span>
        </>
      );
    if (n.type === "comment")
      return (
        <>
          <span className="font-bold text-gray-700 mr-1">{username}</span>
          <span className="text-gray-600">commented: {n.body}</span>
        </>
      );
    if (n.type === "official_event")
      return (
        <>
          <span className="font-bold text-purple-700 mr-1">New Event:</span>
          <span className="text-gray-900">{n.body}</span>
        </>
      );
    if (n.type === "event_reminder")
      return (
        <>
          <span className="font-bold text-amber-600 mr-1">{n.title}</span>
          <span className="text-gray-700">{n.body}</span>
        </>
      );
    if (n.type === "system")
      return (
        <>
          <span className="font-bold text-gray-900 mr-1">{n.title}</span>
          <span className="text-gray-600">{n.body}</span>
        </>
      );

    const cleanBody = n.body.startsWith(username)
      ? n.body.replace(username, "").trim()
      : n.body;
    return (
      <>
        <span className="font-bold text-gray-900 mr-1">{username}</span>
        <span className="text-gray-600">{cleanBody}</span>
      </>
    );
  };

  function getRelativeTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  }

  const groupedNotifications = notifications.reduce((acc, n) => {
    const label = getGroupLabel(n.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {} as Record<string, any[]>);

  const groupOrder = [
    "Today",
    "Yesterday",
    "This week",
    "This month",
    "Earlier",
  ];

  const NotificationContent = (
    <div className="flex flex-col pb-24">
      {/* iOS PERMISSION BUTTON */}
      {/* Only show if we can actually use notifications (permission is 'default' AND it exists) */}
      {"Notification" in window && permission === "default" && (
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start gap-3 text-blue-700">
            <div className="p-2 bg-blue-100 rounded-full mt-0.5">
              <BellOff size={16} />
            </div>
            <div>
              <p className="text-xs font-bold">Enable Push Notifications</p>
              <p className="text-[10px] text-blue-600 opacity-90 leading-tight mt-0.5">
                Don't miss out on likes, comments, and task reminders.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleEnableNotifications}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 shrink-0 shadow-sm shadow-blue-200"
          >
            Enable
          </Button>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-gray-300" size={24} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
          <Bell className="text-gray-300" size={32} />
          <p className="text-sm font-medium">No notifications yet</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {groupOrder.map((label) => {
            const items = groupedNotifications[label];
            if (!items || items.length === 0) return null;

            return (
              <div key={label}>
                <h3 className="px-5 py-2 text-[13px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50 mt-0 sticky top-0 backdrop-blur-sm z-10 border-y border-gray-100">
                  {label}
                </h3>

                {items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100 border-b border-gray-50 last:border-0 ${
                      n.is_unread ? "bg-blue-50/20" : ""
                    }`}
                  >
                    <div className="relative flex-shrink-0 mt-1">
                      <img
                        src={n.sender?.avatar_url || "/default-avatar.png"}
                        className="w-10 h-10 rounded-full object-cover border border-gray-100"
                        alt="User"
                      />
                      {getIcon(n.type as NotificationType)}
                    </div>

                    <div className="flex-1 min-w-0 text-sm leading-snug">
                      {renderNotificationContent(n)}
                      <span className="text-gray-400 text-xs ml-1.5 whitespace-nowrap">
                        {getRelativeTime(n.created_at)}
                      </span>
                    </div>

                    {n.data?.post_image && (
                      <img
                        src={n.data.post_image}
                        className="w-10 h-10 rounded-md object-cover border border-gray-200 flex-shrink-0 ml-1"
                        alt="Post"
                      />
                    )}
                    {n.is_unread && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2 self-center" />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (variant === "page")
    return (
      <div className="w-full bg-white min-h-[50vh]">{NotificationContent}</div>
    );

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[40] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`
        fixed top-0 bottom-0 z-[50] 
        w-full sm:w-[400px] 
        bg-white border-r border-gray-200 shadow-2xl
        flex flex-col
        transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
        left-0 lg:left-[72px] 
        ${isOpen ? "translate-x-0" : "-translate-x-[120%]"}
      `}
      >
        <div className="px-5 py-4 flex justify-between items-center bg-white z-20 border-b border-gray-100 sticky top-0">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Notifications
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors active:scale-95 cursor-pointer"
            aria-label="Close notifications"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {NotificationContent}
        </div>
      </div>
    </>,
    document.body
  );
}
