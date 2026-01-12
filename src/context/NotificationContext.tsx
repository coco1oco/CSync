import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { toast } from "sonner";

// ✅ 1. Match the correct DB Schema
type NotificationType =
  | "message"
  | "reaction"
  | "comment"
  | "reply"
  | "mention"
  | "comment_like"
  | "follow"
  | "pet_task"
  | "schedule"
  | "vaccination"
  | "new_post"
  | "system";

export interface Notification {
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
  sender?: { username: string; avatar_url: string | null };
}

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  hasUnreadNotifications: boolean; // ✅ Added this for the Red Dot logic
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loading: boolean;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Calculate Count
  const unreadCount = notifications.filter((n) => n.is_unread).length;
  
  // ✅ Calculate Boolean for Red Dot
  const hasUnreadNotifications = unreadCount > 0;

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        {
          event: "*", 
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Handle INSERT (New Notification)
          if (payload.eventType === "INSERT") {
            // Fetch the full object with sender details
            // ⚠️ NOTE: If you get an error here, check the Foreign Key name below
            const { data } = await supabase
              .from("notifications")
              .select("*, sender:profiles(username, avatar_url)") 
              .eq("id", payload.new.id)
              .single();

            if (data) {
              const newNotif = data as Notification;
              setNotifications((prev) => [newNotif, ...prev]);
              toast.info(newNotif.title, { description: newNotif.body });
            }
          }

          // Handle UPDATE (e.g. Marked as read elsewhere)
          if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id ? { ...n, ...payload.new } : n
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    // ⚠️ NOTE: If 'sender:profiles' fails, try 'sender:profiles!notifications_from_user_id_fkey'
    const { data } = await supabase
      .from("notifications")
      .select("*, sender:profiles(username, avatar_url)")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(80);

    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    // Optimistic Update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_unread: false } : n))
    );

    await supabase
      .from("notifications")
      .update({ is_unread: false, read_at: new Date().toISOString() })
      .eq("id", id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_unread: false })));
    await supabase
      .from("notifications")
      .update({ is_unread: false, read_at: new Date().toISOString() })
      .eq("user_id", user?.id);
  };

  return (
    <NotificationContext.Provider
      value={{ 
        notifications, 
        unreadCount, 
        hasUnreadNotifications, // ✅ Passed to Provider
        markAsRead, 
        markAllAsRead, 
        loading 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  return context;
};