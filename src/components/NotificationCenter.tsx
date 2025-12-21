import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";

type NotificationType =
  | "message" | "reaction" | "comment" | "pet_task" | "schedule" | "vaccination";

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
}

type FilterTab = "all" | "unread";

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Refetch whenever location changes (returning from post detail)
  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications().catch((err) => console.error('Error in fetchNotifications:', err));
  }, [location.pathname, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const cleanup = subscribeToNotifications();
    
    // ✅ Refetch when page becomes visible again (more reliable than focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications().catch((err) => console.error('Error in fetchNotifications:', err));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanup();
    };
  }, [user?.id]);

  async function fetchNotifications() {
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error('User ID is required');
      }
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      const list = (data || []) as Notification[];
      setNotifications(list);
      setUnreadCount(list.filter((n) => n.is_unread).length);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToNotifications() {
    if (!user?.id) return () => {};
    const subscription = supabase
      .channel(`notifications:user_id=eq.${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const n = payload.new as Notification;
            setNotifications((prev) => [n, ...prev]);
            if (n.is_unread) setUnreadCount((c) => c + 1);
          } else if (payload.eventType === "UPDATE") {
            const n = payload.new as Notification;
            const old = payload.old as Notification;
            setNotifications((prev) => prev.map((x) => (x.id === n.id ? n : x)));
            if (old.is_unread && !n.is_unread) setUnreadCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    
    console.log("🔵 Marking all as read for user:", user?.id);
    
    // Optimistic update
    const updated = notifications.map((n) => ({ 
      ...n, 
      is_unread: false, 
      read_at: new Date().toISOString() 
    }));
    setNotifications(updated);
    setUnreadCount(0);
    
    // Update database
    try {
      const { data, error, count } = await supabase
        .from("notifications")
        .update({ is_unread: false, read_at: new Date().toISOString() })
        .eq("user_id", user?.id)
        .eq("is_unread", true)
        .select();
      
      if (error) {
        console.error("❌ Mark all read error:", error);
        throw error;
      }
      console.log("✅ Marked as read, updated rows:", data?.length);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      // Revert on error
      fetchNotifications();
    }
  }

  const filtered = useMemo(() => filter === "unread" ? notifications.filter((n) => n.is_unread) : notifications, [filter, notifications]);
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  async function markAsRead(id: string) {
    const wasUnread = notifications.some((n) => n.id === id && n.is_unread);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_unread: false, read_at: new Date().toISOString() } : n))
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

    try {
      const { error } = await supabase.from("notifications").update({ is_unread: false, read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to mark as read:", err);
      fetchNotifications();
    }
  }

  function handleClick(n: Notification) {
    const link = n.data?.link;
    
    // ✅ Navigate FIRST (immediately, one click - no state updates to block it)
    if (link) {
      navigate(link);
    }
    
    // ✅ Update DB only in background (NO local state update to avoid re-render)
    if (n.is_unread) {
      supabase.from("notifications")
        .update({ is_unread: false, read_at: new Date().toISOString() })
        .eq("id", n.id)
        .then(({ error }) => {
          if (error) console.error("Failed to mark as read:", error);
        });
    }
  }

  return (
    <div className="w-screen sm:w-[360px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        <div className="flex gap-2 items-center">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-md">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <button onClick={() => setFilter("all")} className={`pb-2 text-sm font-medium border-b-2 ${filter === "all" ? "text-teal-600 border-teal-600" : "text-gray-600 border-transparent"}`}>All</button>
        <button onClick={() => setFilter("unread")} className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${filter === "unread" ? "text-teal-600 border-teal-600" : "text-gray-600 border-transparent"}`}>
          Unread
          {unreadCount > 0 && <span className="px-2 py-0.5 text-xs font-bold text-white bg-teal-600 rounded-full">{unreadCount}</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm">Loading...</div> : 
         filtered.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No notifications</div> : 
         Object.entries(grouped).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 z-10 border-y border-gray-100">{dateLabel}</div>
            {items.map((n) => (
              <button key={n.id} onClick={() => handleClick(n)} className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 transition-colors ${n.is_unread ? "bg-teal-50/60" : "bg-white"}`}>
                {/* Multiple avatars stacked vertically for 2+ users */}
                {n.data?.avatars && n.data.avatars.length > 1 ? (
                  <div className="flex-shrink-0 relative w-10 h-10">
                    {/* Second avatar (top-left/back) */}
                    <img 
                      src={n.data.avatars[1]} 
                      alt="User avatar" 
                      className="absolute top-0 left-0 w-7 h-7 rounded-full object-cover border-2 border-white"
                    />
                    {/* First/latest avatar (bottom-right/front) */}
                    <img 
                      src={n.data.avatars[0]} 
                      alt="User avatar" 
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full object-cover border-2 border-white z-10"
                    />
                  </div>
                ) : n.data?.avatars?.[0] ? (
                  <img 
                    src={n.data.avatars[0]} 
                    alt="User avatar" 
                    className="flex-shrink-0 w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                ) : n.data?.latest_avatar ? (
                  <img 
                    src={n.data.latest_avatar} 
                    alt="User avatar" 
                    className="flex-shrink-0 w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-lg border border-teal-200">
                    {getIconForType(n.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {/* ✅ POST TITLE is now Small & Gray at top */}
                  {n.title && n.title !== "New like" && n.title !== "New comment" && (
                    <p className="text-xs font-bold text-gray-400 uppercase mb-0.5 tracking-wide line-clamp-1">
                      {n.title}
                    </p>
                  )}
                  {/* ✅ USERNAMES are Bold */}
                  <div className="text-sm text-gray-800">
                    <NotificationText actors={n.data?.actors} type={n.type} fallbackBody={n.body} />
                  </div>
                  {n.type === 'comment' && n.data?.last_comment_preview && (
                    <p className="text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-200 line-clamp-1 italic">"{n.data.last_comment_preview}"</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5 font-medium">{formatRelativeTime(n.created_at)}</p>
                </div>
                {n.is_unread && <span className="mt-2 w-2.5 h-2.5 rounded-full bg-teal-500" />}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ✅ HELPER: Format usernames Instagram-style
function NotificationText({ actors, type, fallbackBody }: { actors?: string[], type: string, fallbackBody: string }) {
  if (!actors || actors.length === 0) return <span className="text-gray-600">{fallbackBody}</span>;
  const action = type === 'reaction' ? 'liked your post' : 'commented on your post';
  
  if (actors.length === 1) {
    return <span><span className="font-bold text-black">{actors[0]}</span> {action}</span>;
  }
  if (actors.length === 2) {
    return <span><span className="font-bold text-black">{actors[0]}</span> and <span className="font-bold text-black">{actors[1]}</span> {action}</span>;
  }
  // Show first 2 names, then "and X others"
  const othersCount = actors.length - 2;
  return <span><span className="font-bold text-black">{actors[0]}</span>, <span className="font-bold text-black">{actors[1]}</span> and <span className="font-bold text-black">{othersCount} {othersCount === 1 ? 'other' : 'others'}</span> {action}</span>;
}

function getIconForType(type: NotificationType) {
  switch (type) { case "reaction": return "❤️"; case "comment": return "💬"; default: return "🔔"; }
}

function groupByDate(notifs: Notification[]) {
  const grouped: Record<string, Notification[]> = {};
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  for (const n of notifs) {
    const d = new Date(n.created_at);
    let label = d.toDateString() === today.toDateString() ? "Today" : d.toDateString() === yesterday.toDateString() ? "Yesterday" : d.toLocaleDateString();
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(n);
  }
  return grouped;
}

function formatRelativeTime(dateStr: string) {
  const diffSec = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return new Date(dateStr).toLocaleDateString();
}