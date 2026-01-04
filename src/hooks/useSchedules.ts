import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Schedule {
  id: string;
  pet_id: string;
  owner_id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  location?: string;
  vet_name?: string;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export function useSchedules(petId: string | undefined, userId: string | undefined) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId || !userId) {
      setLoading(false);
      return;
    }

    fetchSchedules();
  }, [petId, userId]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("schedules")
        .select("*")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("scheduled_date", { ascending: true });

      if (fetchError) throw fetchError;
      setSchedules(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching schedules:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSchedule = async (scheduleData: Omit<Schedule, "id" | "created_at" | "updated_at" | "owner_id">) => {
    try {
      const { data, error } = await supabase
        .from("schedules")
        .insert([
          {
            ...scheduleData,
            owner_id: userId,
          },
        ])
        .select();

      if (error) throw error;
      setSchedules([...schedules, data[0]]);
      return data[0];
    } catch (err: any) {
      console.error("Error adding schedule:", err);
      setError(err.message);
      return null;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<Schedule>) => {
    try {
      const { data, error } = await supabase
        .from("schedules")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      setSchedules(schedules.map((s) => (s.id === id ? data[0] : s)));
      return data[0];
    } catch (err: any) {
      console.error("Error updating schedule:", err);
      setError(err.message);
      return null;
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase.from("schedules").delete().eq("id", id);

      if (error) throw error;
      setSchedules(schedules.filter((s) => s.id !== id));
      return true;
    } catch (err: any) {
      console.error("Error deleting schedule:", err);
      setError(err.message);
      return false;
    }
  };

  const updateStatus = async (id: string, status: "pending" | "completed" | "cancelled") => {
    return updateSchedule(id, { status });
  };

  return {
    schedules,
    loading,
    error,
    addSchedule,
    updateSchedule,
    updateStatus,
    deleteSchedule,
    refetch: fetchSchedules,
  };
}
