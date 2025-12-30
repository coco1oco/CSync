import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { Heart, MessageCircle, AtSign, X, UserPlus, Bell } from "lucide-react";

// --- Types ---
type NotificationType =
  | "message" | "reaction" | "comment" | "reply" | "mention" | "comment_like"
  | "follow" | "pet_task" | "schedule" | "vaccination";

interface Notification {
  id: string;
  from_user_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  action_text: string | null;
  data: Record<string, any> | null;
  is_unread: boolean;
  created_at: string;
  read_at: string | null;
  sender?: { username: string; avatar_url: string | null; };
}

interface NotificationCenterProps {
  variant?: "page" | "panel";
  isOpen?: boolean;
  onClose?: () => void;
}

export function NotificationCenter({ 
  variant = "page", 
  isOpen = false, 
  onClose = () => {} 
}: NotificationCenterProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch Logic ---
  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();
    
    const channel = supabase
      .channel(`notifications:user_id=eq.${user.id}`)
      .on("postgres_changes", 
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const { data } = await supabase.from("notifications")
            .select("*, sender:from_user_id(username, avatar_url)")
            .eq("id", payload.new.id).single();
          if (data) setNotifications(prev => [data as any, ...prev]);
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  async function fetchNotifications() {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select(`*, sender:from_user_id(username, avatar_url)`)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(80); // Limit set to 80
    setNotifications((data || []) as any);
    setLoading(false);
  }

  // --- 🔥 UPDATED: Click Handler (Fixes Read Status) ---
  async function handleClick(n: Notification) {
    // 1. Optimistically update UI (So it turns white instantly)
    setNotifications(prev => 
      prev.map(item => item.id === n.id ? { ...item, is_unread: false } : item)
    );

    // 2. Update Database (So it stays read forever)
    if (n.is_unread) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_unread: false, read_at: new Date().toISOString() })
        .eq("id", n.id);

      if (error) console.error("Error marking as read:", error);
    }

    // 3. Navigate
    if (n.data?.link) {
      navigate(n.data.link);
      if (variant === "panel") onClose(); 
    }
  }

  // --- Date Grouping Helper ---
  function getGroupLabel(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (notifDate.getTime() === today.getTime()) return "Today";
    if (notifDate.getTime() === yesterday.getTime()) return "Yesterday";
    
    const diffTime = Math.abs(today.getTime() - notifDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return "This week";
    if (diffDays <= 30) return "This month";
    return "Earlier";
  }

  // --- Icon Helper ---
  const getIcon = (type: NotificationType) => {
    const base = "absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 border-2 border-white flex items-center justify-center";
    switch(type) {
      case 'reaction': return <div className={`${base} bg-red-500`}><Heart size={10} className="text-white fill-white"/></div>;
      case 'comment': return <div className={`${base} bg-blue-500`}><MessageCircle size={10} className="text-white fill-white"/></div>;
      case 'mention': return <div className={`${base} bg-orange-500`}><AtSign size={10} className="text-white"/></div>;
      default: return <div className={`${base} bg-gray-500`}><Bell size={10} className="text-white"/></div>;
    }
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

  // --- Smart Content Renderer (Handles Bolding) ---
  const renderNotificationContent = (n: Notification) => {
    const actors = n.data?.actors; // This list comes from our SQL function

    // CASE 1: It is a Grouped Notification (Has 'actors' array)
    if (Array.isArray(actors) && actors.length > 0) {
      const count = actors.length;
      
      let suffix = "acted";
      if (n.type === 'reaction') suffix = "liked your post";
      else if (n.type === 'comment') suffix = "commented on your post";
      else if (n.type === 'comment_like') suffix = "liked your comment";

      if (count === 1) {
        return (
          <>
            <span className="font-bold text-gray-900">{actors[0]}</span>
            <span className="text-gray-600"> {suffix}</span>
          </>
        );
      }
      if (count === 2) {
        return (
          <>
            <span className="font-bold text-gray-900">{actors[0]}</span>
            <span className="text-gray-600"> and </span>
            <span className="font-bold text-gray-900">{actors[1]}</span>
            <span className="text-gray-600"> {suffix}</span>
          </>
        );
      }
      const othersCount = count - 2;
      return (
        <>
          <span className="font-bold text-gray-900">{actors[0]}</span>
          <span className="text-gray-600">, </span>
          <span className="font-bold text-gray-900">{actors[1]}</span>
          <span className="text-gray-600"> and </span>
          <span className="font-bold text-gray-900">{othersCount} {othersCount === 1 ? "other" : "others"}</span>
          <span className="text-gray-600"> {suffix}</span>
        </>
      );
    }

    // CASE 2: Single Notification
    const username = n.sender?.username || "Someone";
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

  const groupedNotifications = notifications.reduce((acc, n) => {
    const label = getGroupLabel(n.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const groupOrder = ["Today", "Yesterday", "This week", "This month", "Earlier"];

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
                      className={`flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100 ${n.is_unread ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="relative flex-shrink-0 mt-1">
                        <img 
                          src={n.sender?.avatar_url || "/default-avatar.png"} 
                          className="w-11 h-11 rounded-full object-cover border border-gray-100" 
                          alt="User"
                        />
                        {getIcon(n.type)}
                      </div>

                      <div className="flex-1 min-w-0 text-sm leading-snug">
                        {renderNotificationContent(n)}
                        
                        <span className="text-gray-400 text-xs ml-1.5 whitespace-nowrap">{getRelativeTime(n.created_at)}</span>
                        
                        {n.type === 'follow' && (
                          <div className="mt-2">
                            <button className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                              Follow Back
                            </button>
                          </div>
                        )}
                      </div>

                      {n.data?.post_image && (
                        <img src={n.data.post_image} className="w-11 h-11 rounded-md object-cover border border-gray-200 flex-shrink-0 ml-1" alt="Post" />
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

  if (variant === "page") return <div className="w-full bg-white min-h-[50vh]">{NotificationContent}</div>;

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
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h2>
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

function Loader2({ className, size }: { className?: string; size?: number }) {
    return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;
}