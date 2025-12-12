import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string | null;
  breed: string | null;
  color: string | null;
  dob: string | null;
  sex: string | null;
  microchip_id: string | null;
  location: string | null;
  petimage_url: string | null;
  is_campus_pet: boolean; // ✅ Using your specific column name
  created_at: string;
}

// ✅ Updated to accept 'mode'
export function usePets(
  userId: string | undefined,
  mode: "personal" | "campus" = "personal"
) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If personal mode, we need a user ID. If campus mode, we don't strictly need it.
    if (mode === "personal" && !userId) {
      setLoading(false);
      return;
    }

    const fetchPets = async () => {
      setLoading(true);
      let query = supabase
        .from("pets")
        .select("*")
        .order("created_at", { ascending: false });

      // 🔍 FILTERING LOGIC
      if (mode === "personal") {
        query = query.eq("owner_id", userId).eq("is_campus_pet", false);
      } else {
        query = query.eq("is_campus_pet", true); // Campus Pets
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        console.error("Error fetching pets:", fetchError);
      } else {
        setPets((data as Pet[]) || []);
      }
      setLoading(false);
    };

    fetchPets();
  }, [userId, mode]);

  // ✅ ADD PET
  const addPet = async (
    petData: Omit<Pet, "id" | "created_at" | "owner_id" | "is_campus_pet"> & {
      is_campus_pet?: boolean;
    }
  ) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from("pets")
        .insert([
          {
            owner_id: userId,
            is_campus_pet: mode === "campus" ? true : false, // ✅ Auto-flag
            ...petData,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setPets((prevPets) => [data[0] as Pet, ...prevPets]);
      }
      return data?.[0] || null;
    } catch (err: any) {
      console.error("Error adding pet:", err);
      setError(err.message);
      return null;
    }
  };

  // ... (keep updatePet and deletePet as is) ...
  const updatePet = async (petId: string, updates: Partial<Pet>) => {
    /* Copy your existing updatePet code here */
    try {
      const { error } = await supabase
        .from("pets")
        .update(updates)
        .eq("id", petId);
      if (error) throw error;
      setPets((prev) =>
        prev.map((p) => (p.id === petId ? { ...p, ...updates } : p))
      );
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  const deletePet = async (petId: string) => {
    /* Copy your existing deletePet code here */
    try {
      const { error } = await supabase.from("pets").delete().eq("id", petId);
      if (error) throw error;
      setPets((prev) => prev.filter((p) => p.id !== petId));
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  return { pets, loading, error, addPet, updatePet, deletePet };
}
