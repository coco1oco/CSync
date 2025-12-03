import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // adjust path to your Supabase client

interface Pet {
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
  created_at: string;
}

export function usePets(userId: string | undefined) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchPets = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        console.error("Error fetching pets:", fetchError);
      } else {
        setPets(data || []);
      }
      setLoading(false);
    };

    fetchPets();
  }, [userId]);

  // ✅ FIXED: Properly return the inserted pet
  const addPet = async (petData: Omit<Pet, "id" | "created_at" | "owner_id">) => {
    if (!userId) {
      console.error("No user ID available");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("pets")
        .insert([
          {
            owner_id: userId,
            ...petData,
          },
        ])
        .select(); // ✅ Important: select() returns the inserted data

      if (error) {
        console.error("Error adding pet:", error);
        setError(error.message);
        return null;
      }

      console.log("Pet added successfully:", data);
      
      // ✅ Refetch pets list to show new pet immediately
      const { data: updatedPets } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      
      if (updatedPets) {
        setPets(updatedPets);
      }

      return data?.[0] || null;
    } catch (err) {
      console.error("Unexpected error:", err);
      return null;
    }
  };

  const updatePet = async (petId: string, updates: Partial<Pet>) => {
    try {
      const { error } = await supabase
        .from("pets")
        .update(updates)
        .eq("id", petId);

      if (error) {
        console.error("Error updating pet:", error);
        setError(error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Unexpected error:", err);
      return false;
    }
  };

  const deletePet = async (petId: string) => {
    try {
      const { error } = await supabase
        .from("pets")
        .delete()
        .eq("id", petId);

      if (error) {
        console.error("Error deleting pet:", error);
        setError(error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Unexpected error:", err);
      return false;
    }
  };

  return { pets, loading, error, addPet, updatePet, deletePet };
}
