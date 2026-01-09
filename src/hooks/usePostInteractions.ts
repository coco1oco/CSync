import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { notifyLike } from "@/lib/NotificationService";
import { toast } from "sonner";

// --- 1. GET LIKES (Count + Is Liked) ---
export function usePostLikes(eventId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["post-likes", eventId],
    queryFn: async () => {
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      let isLiked = false;
      if (userId) {
        const { data } = await supabase
          .from("likes")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", userId)
          .maybeSingle();
        isLiked = !!data;
      }

      return { count: count || 0, isLiked };
    },
  });
}

// --- 2. GET COMMENTS (List) ---
export function usePostComments(eventId: string) {
  return useQuery({
    queryKey: ["post-comments", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, user:profiles(id, username, avatar_url)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// --- 3. GET COMMENTS COUNT (For the card badge) ---
export function usePostCommentCount(eventId: string) {
  return useQuery({
    queryKey: ["post-comment-count", eventId],
    queryFn: async () => {
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);
      return count || 0;
    },
  });
}

// --- 4. MUTATION: TOGGLE LIKE ---
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      isLiked,
      eventTitle,
      adminId,
      username,
    }: {
      eventId: string;
      userId: string;
      isLiked: boolean;
      eventTitle: string;
      adminId: string;
      username: string;
    }) => {
      if (isLiked) {
        // Unlike
        await supabase
          .from("likes")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId);
      } else {
        // Like
        const { error } = await supabase
          .from("likes")
          .insert({ event_id: eventId, user_id: userId });
        if (error) throw error;

        // Notify (only if not self-like)
        if (adminId !== userId) {
          await notifyLike(
            { id: eventId, admin_id: adminId, title: eventTitle },
            { id: userId, username: username }
          );
        }
      }
    },
    // Optimistic Update: Immediately update UI before DB responds
    onMutate: async (newLike) => {
      await queryClient.cancelQueries({
        queryKey: ["post-likes", newLike.eventId],
      });
      const previousLikes = queryClient.getQueryData([
        "post-likes",
        newLike.eventId,
      ]);

      queryClient.setQueryData(["post-likes", newLike.eventId], (old: any) => ({
        count: newLike.isLiked ? (old?.count || 1) - 1 : (old?.count || 0) + 1,
        isLiked: !newLike.isLiked,
      }));

      return { previousLikes };
    },
    onError: (err, newLike, context) => {
      queryClient.setQueryData(
        ["post-likes", newLike.eventId],
        context?.previousLikes
      );
      toast.error("Failed to update like");
    },
    onSettled: (_, __, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["post-likes", eventId] });
    },
  });
}
