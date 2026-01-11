import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export function useAdminStats(userId: string | undefined, isAdmin: boolean) {
  return useQuery({
    queryKey: ["admin-stats", userId],
    enabled: !!userId && isAdmin,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const [postsCount, myCount, usersCount] = await Promise.all([
        supabase
          .from("outreach_events")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("outreach_events")
          .select("id", { count: "exact", head: true })
          .eq("admin_id", userId),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      return {
        totalPosts: postsCount.count || 0,
        myPosts: myCount.count || 0,
        totalMembers: usersCount.count || 0,
      };
    },
  });
}
