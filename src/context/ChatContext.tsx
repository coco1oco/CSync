import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authContext";
import { supabase } from "@/lib/supabaseClient";

interface ChatContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ OPTIMIZED: Fetches total count in ONE request using the SQL function
  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_total_unread_count", {
        current_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching unread count:", error);
        return;
      }

      setUnreadCount(data || 0);
    } catch (err) {
      console.error("Unexpected error in chat context:", err);
    }
  };

  // ✅ REALTIME LISTENER
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUnreadCount();

    // Subscribe to ANY new message insertion in the database
    // This ensures that if someone messages a group you are in, the badge updates immediately.
    const channel = supabase
      .channel("global-unread-counter")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // When a message comes in, re-run the count function
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <ChatContext.Provider
      value={{ unreadCount, refreshUnreadCount: fetchUnreadCount }}
    >
      {children}
    </ChatContext.Provider>
  );
};
