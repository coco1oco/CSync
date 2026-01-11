import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { OutreachEvent } from "@/types";

// ✅ FIX: Use Omit to strictly override the 'admin' property
export interface FeedEvent extends Omit<OutreachEvent, "admin"> {
  current_attendees: number;
  is_registered: boolean;
  registration_status?: string;
  // Override admin with the partial shape returned by the query
  admin?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export function useFeedEvents(
  userId: string | undefined,
  filterMode: "all" | "mine",
  isAdmin: boolean
) {
  return useQuery({
    queryKey: ["feed-events", userId, filterMode],
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      // 1. Base Query
      let query = supabase
        .from("outreach_events")
        .select("*, admin:profiles(id, username, avatar_url)")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });

      // 2. Apply "My Posts" Filter
      if (isAdmin && filterMode === "mine") {
        query = query.eq("admin_id", userId);
      }

      const { data: eventsData, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      // 3. Enhance Data (Parallel Fetching)
      const eventsWithDetails = await Promise.all(
        (eventsData as any[]).map(async (event) => {
          // A. Get "Going" Count
          const { count } = await supabase
            .from("event_registrations")
            .select("id", { count: "exact", head: true })
            .eq("event_id", event.id)
            .in("status", ["approved", "checked_in"]);

          // B. Get User Status
          const { data: myReg } = await supabase
            .from("event_registrations")
            .select("status")
            .eq("event_id", event.id)
            .eq("user_id", userId)
            .maybeSingle();

          return {
            ...event,
            current_attendees: count || 0,
            is_registered: !!myReg,
            registration_status: myReg?.status,
          } as FeedEvent;
        })
      );

      return eventsWithDetails;
    },
  });
}

// Separate Hook for Mutations
export function useEventMutations() {
  const queryClient = useQueryClient();

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("outreach_events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, isHidden }: { id: string; isHidden: boolean }) => {
      const { error } = await supabase
        .from("outreach_events")
        .update({ is_hidden: !isHidden })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-events"] });
    },
  });

  return { deleteEvent, toggleVisibility };
}
