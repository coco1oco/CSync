import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

// --- HOOK: ADMIN EVENTS ---
export function useAdminEvents() {
  return useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data: eventData, error } = await supabase
        .from("outreach_events")
        .select(
          "id, title, event_date, location, max_attendees, event_type, is_hidden"
        )
        .in("event_type", ["official", "pet", "member", "campus"])
        .order("event_date", { ascending: false });

      if (error) throw error;

      // Parallel fetch for counts (avoid N+1 in UI)
      const eventsWithCounts = await Promise.all(
        (eventData || []).map(async (ev) => {
          const { count: regCount } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", ev.id);

          const { count: checkInCount } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", ev.id)
            .eq("status", "checked_in");

          return {
            ...ev,
            registered_count: regCount || 0,
            checked_in_count: checkInCount || 0,
            is_hidden: ev.is_hidden || false,
          };
        })
      );
      return eventsWithCounts;
    },
  });
}

// --- HOOK: TEAM MEMBERS ---
export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .is("deleted_at", null)
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// --- HOOK: ADMIN MUTATIONS ---
export function useAdminMutations() {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });

  const toggleEventHide = useMutation({
    mutationFn: async ({ id, isHidden }: { id: string; isHidden: boolean }) => {
      const { error } = await supabase
        .from("outreach_events")
        .update({ is_hidden: !isHidden })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });

  return { updateProfile, toggleEventHide };
}
