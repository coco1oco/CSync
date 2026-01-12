import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { OutreachEvent } from "@/types";

export interface Attendee {
  id: string;
  user_id: string;
  status: "approved" | "waitlist" | "checked_in" | "pending" | "rejected";
  user: {
    first_name: string;
    last_name: string;
    username: string;
    avatar_url: string | null;
  };
  pet?: {
    name: string;
  };
}

export function useEventDetails(
  eventId: string | undefined,
  userId: string | undefined

  
) {
  console.log("---------------- DEBUGGING ----------------");
  console.log("1. App thinks Supabase URL is:", import.meta.env.VITE_SUPABASE_URL);
  console.log("2. Event ID being requested:", eventId);
  console.log("-------------------------------------------");
  return useQuery({
    queryKey: ["event-details", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      // 1. Fetch Event Data
      const { data: event, error: eventError } = await supabase
        .from("outreach_events")
        .select(`*, profiles:admin_id (username, avatar_url)`)
        .eq("id", eventId)
        .single();

  if (eventError) {
    console.error("🛑 EVENT FETCH ERROR:", eventError);
    // If the error is "PGRST116", it means the ID doesn't exist.
    // If the error is "401", it means RLS is blocking you.
    throw eventError;
  }
      // 2. Fetch Attendees (Joined with profiles)
     // Inside hooks/useEventDetails.ts -> queryFn

// Inside useEventDetails.ts
// Inside useEventDetails.ts (or ManageEventsPage.tsx)

const { data: attendeesData, error: attendeeError } = await supabase
  .from("event_registrations")
  .select(`
    id, 
    status, 
    user_id,
    user:profiles!event_registrations_user_id_fkey(first_name, last_name, username, avatar_url)
  `)
  .eq("event_id", eventId);

if (attendeeError) {
  console.error("🛑 ATTENDEE FETCH ERROR:", attendeeError);
  throw attendeeError;
}

      const attendees = (attendeesData as any[]) || [];

      // 3. Derived State
      const myRegistration = attendees.find((a) => a.user_id === userId);
      const isRegistered =
        !!myRegistration && myRegistration.status !== "rejected";
      const approvedCount = attendees.filter((a) =>
        ["approved", "checked_in"].includes(a.status)
      ).length;
      const waitlistCount = attendees.filter(
        (a) => a.status === "waitlist"
      ).length;

      return {
        event: event as OutreachEvent,
        attendees: attendees as Attendee[],
        myRegistration,
        isRegistered,
        approvedCount,
        waitlistCount,
      };
    },
  });
}

// Mutation for registering/unregistering
export function useEventRegistration() {
  const queryClient = useQueryClient();

  const register = useMutation({
    mutationFn: async ({
      eventId,
      userId,
      status,
    }: {
      eventId: string;
      userId: string;
      status: string;
    }) => {
      const { error } = await supabase.from("event_registrations").insert({
        event_id: eventId,
        user_id: userId,
        status: status,
      });
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-details", eventId] });
      queryClient.invalidateQueries({ queryKey: ["feed-events"] }); // Update feed too
    },
  });

  const unregister = useMutation({
    mutationFn: async ({
      eventId,
      userId,
    }: {
      eventId: string;
      userId: string;
    }) => {
      // Use your RPC or direct delete depending on your DB logic
      // Assuming direct delete for simplicity based on your snippets,
      // but ideally use the 'leave_event' RPC if you have waitlist logic
      const { error } = await supabase.rpc("leave_event", {
        p_event_id: eventId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-details", eventId] });
      queryClient.invalidateQueries({ queryKey: ["feed-events"] });
    },
  });

  return { register, unregister };
}
