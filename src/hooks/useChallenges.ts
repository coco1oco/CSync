import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  theme: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface ChallengeEntry {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user_id: string;
  pet_id: string;
  user: { username: string; avatar_url: string };
  pet: { name: string };
  vote_count: number;
  has_voted: boolean;
}

// --- 1. FETCH ACTIVE CHALLENGE ---
export function useActiveChallenge() {
  return useQuery({
    queryKey: ["active-challenge"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", now)
        .gte("end_date", now)
        .order("end_date", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as Challenge | null;
    },
  });
}

// ✅ NEW: Fetch All Challenges (For Admins)
export function useAdminChallenges() {
  return useQuery({
    queryKey: ["admin-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("start_date", { ascending: true }); // Ordered by schedule

      if (error) throw error;
      return data as Challenge[];
    },
  });
}

// --- 2. FETCH ENTRIES ---
export function useChallengeEntries(
  challengeId: string | undefined,
  userId: string | undefined
) {
  return useQuery({
    queryKey: ["challenge-entries", challengeId, userId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data: entries, error } = await supabase
        .from("challenge_entries")
        .select(
          `
          *,
          user:profiles(username, avatar_url),
          pet:pets(name)
        `
        )
        .eq("challenge_id", challengeId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const entriesWithVotes = await Promise.all(
        entries.map(async (entry) => {
          const { count } = await supabase
            .from("challenge_votes")
            .select("*", { count: "exact", head: true })
            .eq("entry_id", entry.id);

          const { data: myVote } = await supabase
            .from("challenge_votes")
            .select("id")
            .eq("entry_id", entry.id)
            .eq("user_id", userId)
            .maybeSingle();

          return {
            ...entry,
            vote_count: count || 0,
            has_voted: !!myVote,
          } as ChallengeEntry;
        })
      );

      return entriesWithVotes.sort((a, b) => b.vote_count - a.vote_count);
    },
  });
}

// --- 3. MUTATIONS ---
export function useChallengeActions() {
  const queryClient = useQueryClient();

  const createChallenge = useMutation({
    mutationFn: async (newChallenge: {
      title: string;
      theme: string;
      description: string;
      start_date: string;
      end_date: string;
    }) => {
      const { error } = await supabase.from("challenges").insert([
        {
          ...newChallenge,
          is_active: true,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge created successfully!");
      // Invalidate both active (user view) and admin list (admin view)
      queryClient.invalidateQueries({ queryKey: ["active-challenge"] });
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to create challenge");
    },
  });

  const submitEntry = useMutation({
    mutationFn: async ({
      challengeId,
      userId,
      petId,
      imageUrl,
      caption,
    }: any) => {
      const { error } = await supabase.from("challenge_entries").insert({
        challenge_id: challengeId,
        user_id: userId,
        pet_id: petId,
        image_url: imageUrl,
        caption: caption,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success("Entry submitted!");
      queryClient.invalidateQueries({
        queryKey: ["challenge-entries", vars.challengeId],
      });
    },
    onError: () => toast.error("Failed to submit entry"),
  });

  const toggleVote = useMutation({
    mutationFn: async ({
      entryId,
      userId,
      hasVoted,
    }: {
      entryId: string;
      userId: string;
      hasVoted: boolean;
    }) => {
      if (hasVoted) {
        const { error } = await supabase
          .from("challenge_votes")
          .delete()
          .eq("entry_id", entryId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("challenge_votes")
          .insert({ entry_id: entryId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-entries"] });
    },
  });

  return { submitEntry, toggleVote, createChallenge };
}
