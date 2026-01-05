import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useDialog } from "@/context/DialogContext";
import { useAuth } from "@/context/authContext"; // <--- Import Auth for Sync
import {
  Sun,
  Moon,
  CloudSun,
  Check,
  MoreHorizontal,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import UpsertRoutineModal from "@/components/routines/UpsertRoutineModal";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RoutineSectionProps {
  petId: string;
  petName?: string;
}

export default function RoutineSection({
  petId,
  petName,
}: RoutineSectionProps) {
  const { user } = useAuth(); // <--- Get current user for cache key
  const queryClient = useQueryClient();
  const { confirm } = useDialog();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<any>(null);

  // 1. Fetch Data
  const { data, isLoading } = useQuery({
    queryKey: ["routines-timeline", petId],
    queryFn: async () => {
      const todayIso = new Date().toISOString().split("T")[0];

      const [medsRes, logsRes] = await Promise.all([
        supabase
          .from("medications")
          .select("*")
          .eq("pet_id", petId)
          .order("created_at", { ascending: true }),
        supabase
          .from("medication_logs")
          .select("*")
          .eq("pet_id", petId)
          .gte("logged_at", `${todayIso}T00:00:00`),
      ]);

      return {
        meds: medsRes.data || [],
        logs: logsRes.data || [],
      };
    },
  });

  // 2. Compute "Period-Specific" Completion
  // We create a Set of "medicationID-period" strings (e.g. "123-morning")
  const completedMap = useMemo(() => {
    const set = new Set<string>();
    if (!data?.logs) return set;

    data.logs.forEach((log) => {
      const h = new Date(log.logged_at).getHours();
      let period = "morning";
      if (h >= 12 && h < 18) period = "afternoon";
      if (h >= 18) period = "evening";

      set.add(`${log.medication_id}-${period}`);
    });
    return set;
  }, [data?.logs]);

  // 3. Stats
  const stats = useMemo(() => {
    if (!data?.meds) return { total: 0, completed: 0, progress: 0 };

    // Count total required instances (e.g. if a med is morning+evening, it counts as 2)
    let totalTasks = 0;
    let completedCount = 0;

    data.meds.forEach((m) => {
      const times = Array.isArray(m.time_of_day)
        ? m.time_of_day
        : [m.time_of_day || "morning"];
      totalTasks += times.length;
      times.forEach((t: string) => {
        if (completedMap.has(`${m.id}-${t}`)) completedCount++;
      });
    });

    return {
      total: totalTasks,
      completed: completedCount,
      progress: totalTasks === 0 ? 0 : (completedCount / totalTasks) * 100,
    };
  }, [data?.meds, completedMap]);

  // 4. Toggle Handler (Now Period Aware)
  const toggleCompletion = async (routine: any, period: string) => {
    const isCompleted = completedMap.has(`${routine.id}-${period}`);

    // Backdate Logic (Fixes the Evening bug)
    const now = new Date();
    let targetTime = new Date();
    if (period === "morning") targetTime.setHours(9, 0, 0, 0);
    else if (period === "afternoon") targetTime.setHours(14, 0, 0, 0);
    else {
      if (now.getHours() >= 18) targetTime = now;
      else targetTime.setHours(20, 0, 0, 0);
    }

    try {
      if (!isCompleted) {
        // Check
        await supabase.from("medication_logs").insert({
          pet_id: petId,
          medication_id: routine.id,
          dosage_taken: routine.dosage_per_use,
          logged_at: targetTime.toISOString(),
        });
        if (routine.unit !== "mins") {
          await supabase
            .from("medications")
            .update({
              current_stock: routine.current_stock - routine.dosage_per_use,
            })
            .eq("id", routine.id);
        }
        toast.success("Completed!");
      } else {
        // Uncheck (Find log for this period)
        const logToDelete = data?.logs.find((l) => {
          const h = new Date(l.logged_at).getHours();
          let p = "morning";
          if (h >= 12 && h < 18) p = "afternoon";
          if (h >= 18) p = "evening";
          return l.medication_id === routine.id && p === period;
        });

        if (logToDelete) {
          await supabase
            .from("medication_logs")
            .delete()
            .eq("id", logToDelete.id);
          if (routine.unit !== "mins") {
            await supabase
              .from("medications")
              .update({
                current_stock: routine.current_stock + routine.dosage_per_use,
              })
              .eq("id", routine.id);
          }
        }
      }

      // REFRESH BOTH LISTS (Vice Versa Sync)
      queryClient.invalidateQueries({ queryKey: ["routines-timeline", petId] });
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ["dashboard-personal", user.id],
        });
      }
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm("Delete this routine permanently?")) {
      await supabase.from("medications").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["routines-timeline", petId] });
      if (user?.id)
        queryClient.invalidateQueries({
          queryKey: ["dashboard-personal", user.id],
        });
      toast.success("Routine deleted");
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full rounded-3xl" />;

  const routines = data?.meds || [];
  // Correctly filter by checking the Array
  const morning = routines.filter((r: any) =>
    (Array.isArray(r.time_of_day) ? r.time_of_day : [r.time_of_day]).includes(
      "morning"
    )
  );
  const afternoon = routines.filter((r: any) =>
    (Array.isArray(r.time_of_day) ? r.time_of_day : [r.time_of_day]).includes(
      "noon"
    )
  );
  const evening = routines.filter((r: any) => {
    const times = Array.isArray(r.time_of_day)
      ? r.time_of_day
      : [r.time_of_day];
    return times.includes("evening") || times.includes("bedtime");
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={20} /> Daily Rhythm
            </h3>
            <p className="text-gray-400 text-sm mt-1 font-medium">
              {stats.completed}/{stats.total} tasks completed today
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedRoutine(null);
              setIsModalOpen(true);
            }}
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md rounded-full px-4"
          >
            <Plus size={16} className="mr-1" /> Add
          </Button>
        </div>
        <div className="mt-6 bg-white/10 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-1000 ease-out"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Timeline View */}
      <div className="space-y-8 pl-2">
        {morning.length > 0 && (
          <TimelineGroup
            title="Morning"
            period="morning"
            icon={<Sun className="text-orange-500" />}
            tasks={morning}
            completedMap={completedMap}
            onToggle={toggleCompletion}
            onEdit={(r) => {
              setSelectedRoutine(r);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        )}
        {afternoon.length > 0 && (
          <TimelineGroup
            title="Afternoon"
            period="afternoon"
            icon={<CloudSun className="text-blue-500" />}
            tasks={afternoon}
            completedMap={completedMap}
            onToggle={toggleCompletion}
            onEdit={(r) => {
              setSelectedRoutine(r);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        )}
        {evening.length > 0 && (
          <TimelineGroup
            title="Evening"
            period="evening"
            icon={<Moon className="text-indigo-500" />}
            tasks={evening}
            completedMap={completedMap}
            onToggle={toggleCompletion}
            onEdit={(r) => {
              setSelectedRoutine(r);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        )}
        {routines.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">No routines set up yet.</p>
            <Button variant="link" onClick={() => setIsModalOpen(true)}>
              Create your first routine
            </Button>
          </div>
        )}
      </div>

      <UpsertRoutineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        petId={petId}
        petName={petName}
        initialData={selectedRoutine}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["routines-timeline", petId],
          });
          if (user?.id)
            queryClient.invalidateQueries({
              queryKey: ["dashboard-personal", user.id],
            });
        }}
      />
    </div>
  );
}

// Fixed Timeline Group to handle Period-Specific Checks
interface TimelineGroupProps {
  title: string;
  period: string;
  icon: React.ReactNode;
  tasks: any[];
  completedMap: Set<string>;
  onToggle: (task: any, period: string) => void;
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
}

function TimelineGroup({
  title,
  period,
  icon,
  tasks,
  completedMap,
  onToggle,
  onEdit,
  onDelete,
}: TimelineGroupProps) {
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent -z-10" />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center z-10">
          {icon}
        </div>
        <h4 className="font-bold text-gray-400 uppercase tracking-wider text-xs">
          {title}
        </h4>
      </div>
      <div className="pl-14 space-y-3">
        {tasks.map((task: any) => {
          // Check completion specifically for THIS period
          const isCompleted = completedMap.has(`${task.id}-${period}`);

          return (
            <div
              key={`${task.id}-${period}`}
              className={cn(
                "group flex items-center justify-between p-4 bg-white rounded-2xl border transition-all duration-300 hover:shadow-md",
                isCompleted
                  ? "border-green-100 bg-green-50/30"
                  : "border-gray-100"
              )}
            >
              <div
                className="flex items-center gap-4 cursor-pointer flex-1"
                onClick={() => onToggle(task, period)}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                    isCompleted
                      ? "bg-green-500 border-green-500 scale-110"
                      : "border-gray-300 group-hover:border-blue-400"
                  )}
                >
                  {isCompleted && (
                    <Check size={14} className="text-white" strokeWidth={4} />
                  )}
                </div>
                <div>
                  <h5
                    className={cn(
                      "font-bold text-sm transition-all",
                      isCompleted
                        ? "text-gray-400 line-through"
                        : "text-gray-900"
                    )}
                  >
                    {task.name}
                  </h5>
                  <div className="flex gap-2 text-xs text-gray-500">
                    {task.unit === "mins" ? (
                      <span>{task.dosage_per_use} mins</span>
                    ) : (
                      <span>
                        {task.dosage_per_use} {task.unit} • {task.current_stock}{" "}
                        left
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-300 hover:text-gray-600"
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit2 size={14} className="mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(task.id)}
                    className="text-red-600"
                  >
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}
