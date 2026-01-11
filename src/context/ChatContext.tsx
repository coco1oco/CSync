import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./authContext";

type ChatContextType = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const ChatContext = createContext<ChatContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    if (!user) return;

    // ✅ NEW: Call the optimized SQL function instead of looping in JS
    const { data, error } = await supabase.rpc("get_total_unread_count", {
      target_user_id: user.id,
    });

    if (error) {
      console.error("Error fetching unread count:", error);
    } else {
      setUnreadCount(data || 0);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    refreshUnreadCount();

    // ✅ REALTIME LISTENER (Global)
    // We listen for ANY new message. If it's for a group we are in, we refresh.
    const channel = supabase
      .channel("global-chat-count")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          // If WE sent it, ignore
          if (payload.new.sender_id === user.id) return;

          // ✅ FIX: Simplify the check.
          // Instead of checking the DB every time (which fails for implicit groups),
          // we can just refresh the count. The RPC 'get_total_unread_count' is
          // fast enough to call on every message insertion.

          // However, if you want to be safe, just refresh:
          refreshUnreadCount();

          /* NOTE: If you really want to filter, you would need to know the IDs 
             of the official groups here. But for a student project, simply 
             calling refreshUnreadCount() on ANY new message is acceptable 
             and fixes the "banner not updating" bug immediately.
          */
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <ChatContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </ChatContext.Provider>
  );
};
