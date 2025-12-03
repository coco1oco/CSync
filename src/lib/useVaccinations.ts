import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Vaccination {
  id: string;
  pet_id: string;
  owner_id: string;
  vaccine_name: string;
  last_date: string;
  next_due_date: string;
  vet_name?: string;
  notes?: string;
  status: "pending" | "completed" | "overdue";
  created_at: string;
  updated_at: string;
}

export function useVaccinations(petId: string | undefined, userId: string | undefined) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId || !userId) {
      setLoading(false);
      return;
    }

    fetchVaccinations();
  }, [petId, userId]);

  const fetchVaccinations = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("vaccinations")
        .select("*")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("next_due_date", { ascending: true });

      if (fetchError) throw fetchError;

      const vaccinesWithStatus = (data || []).map((vac) => {
        const dueDate = new Date(vac.next_due_date);
        const today = new Date();
        let status = vac.status;

        if (vac.status !== "completed" && dueDate < today) {
          status = "overdue";
        }

        return { ...vac, status };
      });

      setVaccinations(vaccinesWithStatus);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching vaccinations:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addVaccination = async (
    vaccinationData: Omit<Vaccination, "id" | "created_at" | "updated_at" | "owner_id" | "status">
  ) => {
    try {
      const { data, error } = await supabase
        .from("vaccinations")
        .insert([
          {
            ...vaccinationData,
            owner_id: userId,
            status: "pending",
          },
        ])
        .select();

      if (error) throw error;
      setVaccinations([...vaccinations, data[0]]);
      return data[0];
    } catch (err: any) {
      console.error("Error adding vaccination:", err);
      setError(err.message);
      return null;
    }
  };

  const updateVaccination = async (id: string, updates: Partial<Vaccination>) => {
    try {
      const { data, error } = await supabase
        .from("vaccinations")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      setVaccinations(vaccinations.map((v) => (v.id === id ? data[0] : v)));
      return data[0];
    } catch (err: any) {
      console.error("Error updating vaccination:", err);
      setError(err.message);
      return null;
    }
  };

  const deleteVaccination = async (id: string) => {
    try {
      const { error } = await supabase.from("vaccinations").delete().eq("id", id);

      if (error) throw error;
      setVaccinations(vaccinations.filter((v) => v.id !== id));
      return true;
    } catch (err: any) {
      console.error("Error deleting vaccination:", err);
      setError(err.message);
      return false;
    }
  };

  const markCompleted = async (id: string) => {
    return updateVaccination(id, { status: "completed" });
  };

  return {
    vaccinations,
    loading,
    error,
    addVaccination,
    updateVaccination,
    markCompleted,
    deleteVaccination,
    refetch: fetchVaccinations,
  };
}
