import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Pet } from "@/types";
import { toast } from "sonner";

export function usePets(
  userId: string | undefined,
  mode: "personal" | "campus" = "personal"
) {
  const queryClient = useQueryClient();

  // 1. QUERY: Fetch Pets (Cached!)
  const {
    data: pets = [],
    isLoading: loading,
    error,
  } = useQuery({
    // Unique key: If mode changes, it re-fetches automatically
    queryKey: ["pets", userId, mode],
    enabled: mode === "campus" || !!userId, // Don't fetch personal if no user
    queryFn: async () => {
      let query = supabase
        .from("pets")
        .select("*")
        .order("created_at", { ascending: false });

      if (mode === "personal") {
        query = query.eq("owner_id", userId).eq("is_campus_pet", false);
      } else {
        query = query.eq("is_campus_pet", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Pet[];
    },
    // Keep data fresh for 5 minutes (User switches tabs instantly)
    staleTime: 1000 * 60 * 5,
  });

  // 2. MUTATION: Add Pet
  const addPetMutation = useMutation({
    mutationFn: async (
      petData: Omit<Pet, "id" | "created_at" | "owner_id" | "is_campus_pet"> & {
        is_campus_pet?: boolean;
      }
    ) => {
      if (!userId) throw new Error("No user ID");

      const { data, error } = await supabase
        .from("pets")
        .insert([
          {
            owner_id: userId,
            is_campus_pet: mode === "campus",
            ...petData,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh the list immediately
      queryClient.invalidateQueries({ queryKey: ["pets", userId, mode] });
      toast.success("Pet added successfully!");
    },
    onError: (err: any) => {
      toast.error("Failed to add pet: " + err.message);
    },
  });

  // 3. MUTATION: Delete Pet
  const deletePetMutation = useMutation({
    mutationFn: async (petId: string) => {
      const { error } = await supabase.from("pets").delete().eq("id", petId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets", userId, mode] });
      toast.success("Pet deleted");
    },
  });

  return {
    pets,
    loading,
    error: error ? (error as Error).message : null,
    addPet: addPetMutation.mutateAsync,
    deletePet: deletePetMutation.mutateAsync,
    // You can add updatePet similarly if needed
  };
}
