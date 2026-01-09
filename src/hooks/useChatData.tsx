import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Conversation, Message, UserProfile } from "@/types";

// Extended Message Type to include Sender
export interface MessageWithSender extends Omit<Message, "sender"> {
  sender?: {
    username: string;
    avatar_url: string | null;
    first_name: string | null;
  };
  image_url?: string | null;
}

// --- 1. FETCH ROOMS HOOK ---
export function useChatRooms(user: any) {
  return useQuery({
    queryKey: ["chat-rooms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_members")
        .select("conversation:conversations(id, name, is_group)")
        .eq("user_id", user.id);

      if (error) throw error;

      let rooms = data.map((item: any) => item.conversation) as Conversation[];

      // ✅ PRESERVE VISIBILITY LOGIC
      const filteredRooms = rooms.filter((room) => {
        if (!room || !room.name) return false;

        // 1. General
        if (room.name === "General") return true;

        // 2. Executive Board
        if (room.name === "Executive Board") {
          return ["admin", "president", "vice_president"].includes(
            user.role ?? ""
          );
        }

        // 3. Committee Chat
        if (
          room.is_group &&
          !["General", "Executive Board"].includes(room.name)
        ) {
          if (["admin", "president"].includes(user.role ?? "")) return true;
          const userCommittee = user.committee ?? "";
          return userCommittee !== "" && room.name === userCommittee;
        }

        // 4. DMs
        return !room.is_group;
      });

      // ✅ SORTING
      return filteredRooms.sort((a, b) => {
        if (!a.name || !b.name) return 0;
        if (a.name === "Executive Board") return -1;
        if (b.name === "Executive Board") return 1;
        if (a.name === "General") return -1;
        if (b.name === "General") return 1;
        return a.name.localeCompare(b.name);
      });
    },
  });
}

// --- 2. FETCH MESSAGES HOOK ---
export function useChatMessages(roomId: string | undefined) {
  return useQuery({
    queryKey: ["chat-messages", roomId],
    enabled: !!roomId,
    // Keep data fresh but don't refetch constantly on focus window
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, sender:profiles(username, avatar_url, first_name)")
        .eq("conversation_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

// --- 3. SEND MESSAGE MUTATION ---
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      userId,
      content,
      imageUrl,
    }: {
      roomId: string;
      userId: string;
      content: string;
      imageUrl?: string | null;
    }) => {
      const { error } = await supabase.from("messages").insert([
        {
          conversation_id: roomId,
          sender_id: userId,
          content: content,
          image_url: imageUrl || null,
        },
      ]);
      if (error) throw error;
    },
    // We don't need onSuccess to refetch because Realtime will handle the update!
    // But we can implement Optimistic Updates here if you want it super snappy.
  });
}

// --- 4. MARK READ MUTATION ---
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      userId,
    }: {
      roomId: string;
      userId: string;
    }) => {
      await supabase.rpc("mark_room_as_read", {
        room_id: roomId,
        user_id: userId,
      });
    },
    onSuccess: () => {
      // Ideally trigger a refresh of unread counts
    },
  });
}
