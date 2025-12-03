import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface PetTask {
  id: string;
  pet_id: string;
  owner_id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: "low" | "medium" | "high";
  urgency: "normal" | "urgent" | "immediate";
  completed: boolean;
  requires_immediate_attention: boolean;
  created_at: string;
  updated_at: string;
}

export function useTasks(petId: string | undefined, userId: string | undefined) {
  const [tasks, setTasks] = useState<PetTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId || !userId) {
      setLoading(false);
      return;
    }

    fetchTasks();
  }, [petId, userId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("pet_tasks")
        .select("*")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("due_date", { ascending: true });

      if (fetchError) throw fetchError;
      setTasks(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (taskData: Omit<PetTask, "id" | "created_at" | "updated_at" | "owner_id">) => {
    try {
      const { data, error } = await supabase
        .from("pet_tasks")
        .insert([
          {
            ...taskData,
            owner_id: userId,
          },
        ])
        .select();

      if (error) throw error;
      setTasks([...tasks, data[0]]);
      return data[0];
    } catch (err: any) {
      console.error("Error adding task:", err);
      setError(err.message);
      return null;
    }
  };

  const updateTask = async (id: string, updates: Partial<PetTask>) => {
    try {
      const { data, error } = await supabase
        .from("pet_tasks")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      setTasks(tasks.map((t) => (t.id === id ? data[0] : t)));
      return data[0];
    } catch (err: any) {
      console.error("Error updating task:", err);
      setError(err.message);
      return null;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("pet_tasks").delete().eq("id", id);

      if (error) throw error;
      setTasks(tasks.filter((t) => t.id !== id));
      return true;
    } catch (err: any) {
      console.error("Error deleting task:", err);
      setError(err.message);
      return false;
    }
  };

  const toggleTaskComplete = async (id: string, completed: boolean) => {
    return updateTask(id, { completed });
  };

  // ✅ Set urgency level
  const setUrgency = async (id: string, urgency: "normal" | "urgent" | "immediate") => {
    return updateTask(id, { urgency });
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    setUrgency,
    refetch: fetchTasks,
  };
}
