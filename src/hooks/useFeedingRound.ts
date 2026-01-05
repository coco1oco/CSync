import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/context/authContext";

export function useFeedingRound() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      petIds,
      location,
    }: {
      petIds: string[];
      location?: string;
    }) => {
      const now = new Date().toISOString();

      // 1. Update the Pet's Current Status (Fast Lookup)
      const { error: updateError } = await supabase
        .from("pets")
        .update({
          last_fed_at: now,
          last_seen_at: now,
          location: location || undefined,
          status: "healthy", // If we see them eating, they are likely okay (or at least found)
        })
        .in("id", petIds);

      if (updateError) throw updateError;

      // 2. ✅ NEW: Create History Logs for the Timeline
      // We map each petID to an insert promise
      const incidentLogs = petIds.map((id) => ({
        pet_id: id,
        logged_by: user?.id,
        category: "feeding", // distinct category
        description: `Fed at ${location || "Campus Grounds"}`,
        logged_at: now,
      }));

      const { error: logError } = await supabase
        .from("pet_incidents")
        .insert(incidentLogs);

      if (logError) throw logError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campus-pets"] });
      queryClient.invalidateQueries({ queryKey: ["pet-timeline"] }); // Refresh timeline
      toast.success(`Fed ${variables.petIds.length} dogs! 🦴`);
    },
    onError: (error) => {
      toast.error("Failed to log feeding round: " + error.message);
    },
  });
}
