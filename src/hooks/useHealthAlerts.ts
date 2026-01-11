import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { isPast, isBefore, addDays } from "date-fns";

export type HealthAlert = {
  id: string;
  vaccine_name: string;
  next_due_date: string;
  pet_id: string;
  pets: { name: string; petimage_url: string | null };
};

export function useHealthAlerts(userId: string | undefined) {
  return useQuery({
    queryKey: ["health-alerts", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await supabase
        .from("vaccinations")
        .select(
          `id, vaccine_name, next_due_date, pet_id, pets (name, petimage_url)`
        )
        .eq("owner_id", userId)
        .neq("status", "completed")
        .order("next_due_date", { ascending: true });

      const rawAlerts = (data as any[]) || [];
      const cutoff = addDays(new Date(), 30);

      return rawAlerts.filter(
        (a) =>
          isPast(new Date(a.next_due_date)) ||
          isBefore(new Date(a.next_due_date), cutoff)
      ) as HealthAlert[];
    },
  });
}
