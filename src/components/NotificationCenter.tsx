import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/context/NotificationContext";
import {
  Heart,
  MessageCircle,
  AtSign,
  X,
  UserPlus,
  Bell,
  Loader2,
  Globe,
  ShieldAlert,
  // ✅ New Icons
  CalendarCheck,
  BellRing,
  CheckCircle2,
  Clock,
  XCircle,
  PartyPopper,
} from "lucide-react";

// ✅ Updated Types
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
  // New Types
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

  // --- Click Handler ---
  async function handleClick(n: any) {
    if (n.is_unread) {
      await markAsRead(n.id);
    }

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

  // ✅ Updated Icon Logic
  const getIcon = (type: NotificationType) => {
    const base = "absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 border-2 border-white flex items-center justify-center";
    switch(type) {
      // Social
      case 'reaction': return <div className={`${base} bg-red-500`}><Heart size={10} className="text-white fill-white"/></div>;
      case 'comment': return <div className={`${base} bg-blue-500`}><MessageCircle size={10} className="text-white fill-white"/></div>;
      case 'reply': return <div className={`${base} bg-green-500`}><MessageCircle size={10} className="text-white fill-white"/></div>;
      case 'mention': return <div className={`${base} bg-orange-500`}><AtSign size={10} className="text-white"/></div>;
      case 'comment_like': return <div className={`${base} bg-red-500`}><Heart size={10} className="text-white fill-white"/></div>;
      case 'new_post': return <div className={`${base} bg-purple-500`}><Globe size={10} className="text-white"/></div>;
      case 'system': return <div className={`${base} bg-blue-600`}><ShieldAlert size={10} className="text-white"/></div>;
      
      // ✅ Official Events & Registration
      case 'official_event': return <div className={`${base} bg-purple-600`}><CalendarCheck size={10} className="text-white"/></div>;
      case 'event_reminder': return <div className={`${base} bg-amber-500`}><BellRing size={10} className="text-white"/></div>;
      case 'registration_approved': return <div className={`${base} bg-green-500`}><CheckCircle2 size={10} className="text-white"/></div>;
      case 'registration_waitlist': return <div className={`${base} bg-amber-500`}><Clock size={10} className="text-white"/></div>;
      case 'registration_rejected': 
      case 'registration_removed': return <div className={`${base} bg-red-500`}><XCircle size={10} className="text-white"/></div>;
      case 'event_checkin': return <div className={`${base} bg-teal-500`}><PartyPopper size={10} className="text-white"/></div>;

      default: return <div className={`${base} bg-gray-500`}><Bell size={10} className="text-white"/></div>;
    }
  };

  // ✅ Updated Content Logic
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

    // 1. Grouped Actors Logic
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

    // 2. Single User Social Scenarios
    if (n.type === "reaction") {
      return (
        <>
          <span className="font-bold text-gray-700 mr-1">{username}</span>
          <span className="text-gray-600">liked your post</span>
        </>
      );
    }

    if (n.type === 'new_post') {
      return (
        <>
          <span className="font-bold text-gray-900 mr-1">{username}</span>
          <span className="text-gray-600">posted a new update</span>
        </>
      );
    }

    if (n.type === "comment") {
      return (
        <>
          <span className="font-bold text-gray-700 mr-1">{username}</span>
          <span className="text-gray-600">commented: {n.body}</span>
        </>
      );
    }

    // 3. ✅ Official Events
    if (n.type === 'official_event') {
      return (
        <>
          <span className="font-bold text-purple-700 mr-1">New Event:</span>
          <span className="text-gray-900">{n.body}</span>
        </>
      );
    }

    // 4. ✅ Reminders
    if (n.type === 'event_reminder') {
      return (
        <>
          <span className="font-bold text-amber-600 mr-1">{n.title}</span>
          <span className="text-gray-700">{n.body}</span>
        </>
      );
    }
    
    // 5. System
    if (n.type === 'system') {
      return (
        <>
          <span className="font-bold text-gray-900 mr-1">{n.title}</span>
          <span className="text-gray-600">{n.body}</span>
        </>
      );
    }

// --- Click Handler ---
  // --- Click Handler ---
  // --- Click Handler ---
  async function handleClick(n: any) {
    if (n.is_unread) {
      await markAsRead(n.id);
    }

    // 1. SMART INTERCEPT: Check for Official Event types
    if (
        n.type === 'official_event' || 
        n.type === 'event_reminder' ||
        n.type === 'registration_approved' ||
        n.type === 'registration_waitlist' ||
        n.type === 'registration_rejected' ||
        n.type === 'registration_removed' ||
        n.type === 'event_checkin' ||
        // ✅ SAFETY: Check 'new_post' too, just in case old events were created with this type
        (n.type === 'new_post' && n.title?.includes("Event")) 
    ) {
        let eventId = n.data?.event_id;
        
        // 2. ROBUST EXTRACTION: If ID is missing, hunt for it in the link
        if (!eventId && n.data?.link) {
            // This Regex finds a UUID (8-4-4-4-12 chars) anywhere in the string
            // It ignores slashes, query params, and text around it.
            const uuidMatch = n.data.link.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
            
            if (uuidMatch) {
                eventId = uuidMatch[0];
            }
        }

        // 3. EXECUTE: If we found an ID, force the correct page
        if (eventId) {
            // 'replace: true' ensures the user doesn't get stuck if they hit Back
            navigate(`/official-event/${eventId}`, { replace: true });
            if (variant === "panel") onClose();
            return; // 🛑 STOP HERE. Do not run default behavior.
        }
    }

    // 4. DEFAULT BEHAVIOR (Social Posts, Messages)
    if (n.data?.link) {
      navigate(n.data.link);
      if (variant === "panel") onClose();
    }
  }
    // 7. Default Fallback
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

  // --- Render Logic ---
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
                <h3 className="px-5 py-2 text-[15px] font-bold text-gray-900 mt-2">
                  {label}
                </h3>

                {items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100 ${
                      n.is_unread ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="relative flex-shrink-0 mt-1">
                      <img
                        src={n.sender?.avatar_url || "/default-avatar.png"}
                        className="w-11 h-11 rounded-full object-cover border border-gray-100"
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
                        className="w-11 h-11 rounded-md object-cover border border-gray-200 flex-shrink-0 ml-1"
                        alt="Post"
                      />
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
    <div
      className={`
        fixed top-0 bottom-0 z-[50] 
        w-full sm:w-[397px] 
        bg-white border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        flex flex-col
        transform transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
        left-0 lg:left-[72px]
        ${isOpen ? "translate-x-0" : "-translate-x-[120%] invisible"}
      `}
    >
      <div className="px-6 py-5 flex justify-between items-center bg-white z-10 sticky top-0">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          Notifications
        </h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors active:scale-95 cursor-pointer"
          aria-label="Close notifications"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {NotificationContent}
      </div>
    </div>,
    document.body
  );
}