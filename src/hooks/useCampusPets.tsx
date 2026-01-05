import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export function useCampusPets() {
  return useQuery({
    queryKey: ["campus-pets"], // Unique key for caching
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("is_campus_pet", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
