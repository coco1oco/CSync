import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authContext";
import { supabase } from "@/lib/supabaseClient";

interface ChatContextType {
  unreadCount: number; // Total unread messages across all rooms
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

  const fetchUnreadCount = async () => {
    if (!user) return;

    // 1. Get all my rooms and when I last read them
    const { data: myRooms } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);

    if (!myRooms || myRooms.length === 0) {
      setUnreadCount(0);
      return;
    }

    // 2. Count messages newer than my 'last_read_at' for each room
    let totalUnread = 0;

    // We use Promise.all to fetch counts in parallel (fast)
    await Promise.all(
      myRooms.map(async (room) => {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true }) // 'head: true' means don't download data, just count
          .eq("conversation_id", room.conversation_id)
          .gt("created_at", room.last_read_at || "1970-01-01"); // Newer than last read

        if (count) totalUnread += count;
      })
    );

    setUnreadCount(totalUnread);
  };

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to NEW messages globally to update the badge instantly
    const channel = supabase
      .channel("global-unread-counter")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchUnreadCount(); // Recalculate when ANY message arrives
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
