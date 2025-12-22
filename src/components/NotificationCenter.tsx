import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "@/context/authContext";

// All supported notification types (matches DB CHECK constraint)
type NotificationType =
  | "message"
  | "reaction"
  | "comment"
  | "pet_task"
  | "schedule"
  | "vaccination";

// Shape of a notification row coming from Supabase
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

  // All notifications loaded from the DB
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Which tab is active: "all" or "unread"
  const [filter, setFilter] = useState<FilterTab>("all");
  // Loading state for initial fetch
  const [loading, setLoading] = useState(true);
  // Number of unread notifications (for the Unread tab badge)
  const [unreadCount, setUnreadCount] = useState(0);

  // On mount / when user changes: fetch notifications + subscribe to realtime
  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();
    const cleanup = subscribeToNotifications();
    return cleanup;
  }, [user?.id]);

  // Load latest notifications for this user
  async function fetchNotifications() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50); // UI only needs the latest 50

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

  // Subscribe to realtime changes for this user's notifications
  function subscribeToNotifications() {
    if (!user?.id) return () => {};

    const subscription = supabase
      .channel(`notifications:user_id=eq.${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT and UPDATE
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // New notification: add to top of list
            const n = payload.new as Notification;
            setNotifications((prev) => [n, ...prev]);
            if (n.is_unread) setUnreadCount((c) => c + 1);
          } else if (payload.eventType === "UPDATE") {
            // Updated notification: replace in list
            const n = payload.new as Notification;
            const old = payload.old as Notification;
            setNotifications((prev) =>
              prev.map((x) => (x.id === n.id ? n : x))
            );
            // Adjust unread count if it switched from unread → read
            if (old.is_unread && !n.is_unread) {
              setUnreadCount((c) => Math.max(0, c - 1));
            }
          }
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }

  // Apply "All" vs "Unread" filter
  const filtered =
    filter === "unread"
      ? notifications.filter((n) => n.is_unread)
      : notifications;

  // Group notifications by date label (Today, Yesterday, etc.)
  const grouped = groupByDate(filtered);

  // Mark a single notification as read in the DB
  async function markAsRead(id: string) {
    try {
      await supabase
        .from("notifications")
        .update({ is_unread: false, read_at: new Date().toISOString() })
        .eq("id", id);
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  }

  // When the user clicks a notification:
  // - mark it as read if needed
  // - navigate to the link stored in data.link (e.g. /event/:id)
  function handleClick(n: Notification) {
    if (n.is_unread) markAsRead(n.id);
    const link = n.data?.link;
    if (link) navigate(link);
  }

  return (
    <div className="w-[360px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        <button
          className="text-gray-500 hover:text-gray-700 text-xl"
          aria-label="Options"
        >
          ⋯
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 px-4 py-2 border-b border-gray-200">
        <button
          onClick={() => setFilter("all")}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
            filter === "all"
              ? "text-teal-600 border-teal-600"
              : "text-gray-600 border-transparent hover:text-gray-900"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`pb-2 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
            filter === "unread"
              ? "text-teal-600 border-teal-600"
              : "text-gray-600 border-transparent hover:text-gray-900"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-teal-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </div>
        ) : (
          Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {dateLabel}
              </div>
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left border-l-4 transition-colors ${
                    n.is_unread
                      ? "bg-teal-50 border-teal-600 hover:bg-teal-100"
                      : "bg-white border-transparent hover:bg-gray-50"
                  }`}
                >
                  {/* Avatar / Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold">
                    🐾
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {n.title}
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {n.action_text && (
                        <span className="font-medium text-gray-900">
                          {n.action_text}{" "}
                        </span>
                      )}
                      {n.body}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {n.is_unread && (
                    <span className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-teal-600" />
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Group notifications by date label (Today, Yesterday, or date)
function groupByDate(notifs: Notification[]): Record<string, Notification[]> {
  const grouped: Record<string, Notification[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const n of notifs) {
    const d = new Date(n.created_at);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else
      label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(n);
  }
  return grouped;
}

// Format created_at into short relative time ("5m", "2h", "1d", etc.)
function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return "now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  return d.toLocaleDateString();
}
