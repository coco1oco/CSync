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

    // 1. Get all conversations you are explicitly part of
    const { data: myConvs } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);

    if (!myConvs || myConvs.length === 0) {
      setUnreadCount(0);
      return;
    }

    // 2. Count unread messages in those conversations
    let totalUnread = 0;

    for (const conv of myConvs) {
      // Build query: Count messages in this room...
      let query = supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.conversation_id)
        .neq("sender_id", user.id); // ...that YOU didn't send

      // ...and are newer than your last read time (if it exists)
      if (conv.last_read_at) {
        query = query.gt("created_at", conv.last_read_at);
      }

      const { count } = await query;
      totalUnread += count || 0;
    }

    setUnreadCount(totalUnread);
  };

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    refreshUnreadCount();

    // ✅ REALTIME FIX: Recalculate instead of incrementing to avoid ghost numbers
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
          // If WE sent it, ignore.
          if (payload.new.sender_id === user.id) return;

          // Only refresh if this message belongs to a conversation we are in
          const { data: isMember } = await supabase
            .from("conversation_members")
            .select("conversation_id")
            .eq("conversation_id", payload.new.conversation_id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (isMember) {
            refreshUnreadCount();
          }
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
