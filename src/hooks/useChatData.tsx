import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Conversation, Message } from "@/types";

// Extended Message Type
export type MessageWithSender = Omit<Message, "sender"> & {
  sender?: {
    username: string;
    avatar_url: string | null;
    first_name: string | null;
  };
  image_url?: string | null;
};

// Extended Conversation to include Unread Status
export type ChatRoom = Conversation & {
  hasUnread: boolean;
  lastMessageAt?: string;
};

// --- 1. FETCH ROOMS HOOK ---
export function useChatRooms(user: any) {
  return useQuery({
    queryKey: ["chat-rooms", user?.id],
    enabled: !!user,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // 1. Get Fresh User Profile (for Role/Committee check)
      const { data: freshProfile, error: profileError } = await supabase
        .from("profiles")
        .select("role, committee")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const userRole = freshProfile?.role || "user";
      const userCommittee = freshProfile?.committee || "";

      // 2. Get User's "Last Read" Timestamps & Memberships
      const { data: membershipData, error: memError } = await supabase
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      if (memError) throw memError;

      const lastReadMap = new Map<string, string>();
      const myMemberIds = new Set<string>();

      membershipData?.forEach((m: any) => {
        myMemberIds.add(m.conversation_id);
        if (m.last_read_at) lastReadMap.set(m.conversation_id, m.last_read_at);
      });

      // 3. Get All Official Groups
      const { data: officialGroups, error: groupError } = await supabase
        .from("conversations")
        .select("id, name, is_group")
        .eq("is_group", true);

      if (groupError) throw groupError;

      // 4. Determine "Visible" Official Groups
      const visibleOfficialGroups = (officialGroups || []).filter(
        (room: any) => {
          if (room.name === "General") return true;
          if (room.name === "Executive Board")
            return ["admin", "president", "vice_president"].includes(userRole);
          if (["admin", "president"].includes(userRole)) return true;
          if (userCommittee && room.name === userCommittee) return true;
          return false;
        }
      );

      // 5. Collect IDs
      const visibleGroupIds = visibleOfficialGroups.map((r: any) => r.id);
      const allTargetIds = Array.from(
        new Set([...visibleGroupIds, ...Array.from(myMemberIds)])
      );

      if (allTargetIds.length === 0) return [];

      // 6. Fetch Messages efficiently
      const { data: detailedRooms, error: detailsError } = await supabase
        .from("conversations")
        .select(
          `
          id, name, is_group,
          messages(created_at, sender_id)
        `
        )
        .in("id", allTargetIds)
        .order("created_at", { foreignTable: "messages", ascending: false })
        .limit(1, { foreignTable: "messages" });

      if (detailsError) throw detailsError;

      // 7. Process & Calculate Unread
      const processedRooms: ChatRoom[] = [];

      detailedRooms?.forEach((room: any) => {
        if (room.is_group) {
          const isOfficialVisible = visibleGroupIds.includes(room.id);
          if (!isOfficialVisible) return;
        }

        const lastMsg = room.messages?.[0];
        const lastMsgAt = lastMsg?.created_at;
        const lastSenderId = lastMsg?.sender_id;
        const lastReadAt = lastReadMap.get(room.id);

        let hasUnread = false;

        if (lastMsgAt) {
          const isMyMessage = lastSenderId === user.id;

          if (!isMyMessage) {
            if (!lastReadAt) {
              hasUnread = true;
            } else if (new Date(lastMsgAt) > new Date(lastReadAt)) {
              hasUnread = true;
            }
          }
        }

        processedRooms.push({
          id: room.id,
          name: room.name,
          is_group: room.is_group,
          hasUnread,
          lastMessageAt: lastMsgAt,
        });
      });

      // 8. Sort
      return processedRooms.sort((a, b) => {
        if (a.name === "Executive Board") return -1;
        if (b.name === "Executive Board") return 1;
        if (a.name === "General") return -1;
        if (b.name === "General") return 1;
        if (a.is_group && !b.is_group) return -1;
        if (!a.is_group && b.is_group) return 1;
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
          content,
          image_url: imageUrl || null,
        },
      ]);
      if (error) throw error;
    },
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
      // ✅ FIX: Reverted to 'update' to avoid RLS error.
      // We only update if a record already exists.
      const { error } = await supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", roomId)
        .eq("user_id", userId);

      if (error) {
        console.warn(
          "Failed to mark read (likely permission issue):",
          error.message
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}
