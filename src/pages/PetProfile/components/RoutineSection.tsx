import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useDialog } from "@/context/DialogContext";
import {
  Pill,
  Trash2,
  Edit2,
  PackagePlus,
  X,
  Check,
  Sun,
  Moon,
  LayoutList,
  CalendarDays,
  Footprints,
  Plus,
  Clock,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Medication } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RoutineSectionProps {
  petId: string;
}

// ✅ FIX 1: Update interface to expect an Array for time_of_day
interface ExtendedMedication extends Medication {
  frequency?: "daily" | "weekly" | "monthly" | "as_needed";
  time_of_day?: string[]; // Array of strings
}

export default function RoutineSection({ petId }: RoutineSectionProps) {
  const { confirm, prompt } = useDialog();
  const [meds, setMeds] = useState<ExtendedMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"schedule" | "list">("schedule");
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // We keep form state simple (single selection for this quick edit modal)
  const [formTime, setFormTime] = useState<string>("morning");
  const [formData, setFormData] = useState<Partial<ExtendedMedication>>({
    name: "",
    unit: "pills",
    dosage_per_use: 1,
    current_stock: 30,
    low_stock_threshold: 5,
    frequency: "daily",
  });

  useEffect(() => {
    fetchRoutines();
  }, [petId]);

  const fetchRoutines = async () => {
    try {
      const { data } = await supabase
        .from("medications")
        .select("*")
        .eq("pet_id", petId)
        .order("created_at", { ascending: false });

      // ✅ FIX 2: Normalize time_of_day to always be an Array
      const enhancedData = data?.map((item) => {
        let times = ["morning"];
        if (Array.isArray(item.time_of_day)) {
          times = item.time_of_day; // It's already an array
        } else if (typeof item.time_of_day === "string") {
          times = [item.time_of_day]; // Convert legacy string to array
        }

        return {
          ...item,
          frequency: item.frequency || "daily",
          time_of_day: times,
        };
      });

      setMeds((enhancedData as ExtendedMedication[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleCompleteTask = async (med: ExtendedMedication) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(med.id)) {
      newCompleted.delete(med.id);
      setCompletedTasks(new Set(newCompleted));
      return;
    }
    newCompleted.add(med.id);
    setCompletedTasks(new Set(newCompleted));

    const isActivity = med.unit === "mins" || med.unit === "30";

    if (isActivity) {
      toast.success(`Completed ${med.name}`);
      return;
    }

    const newStock = med.current_stock - med.dosage_per_use;

    setMeds((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, current_stock: newStock } : m))
    );

    if (newStock <= 0) toast.error(`You just used the last of ${med.name}!`);
    else if (newStock <= med.low_stock_threshold)
      toast.warning(`Low Stock: ${med.name} is running low.`);
    else toast.success(`Logged ${med.name}`);

    await supabase
      .from("medications")
      .update({ current_stock: newStock })
      .eq("id", med.id);

    await supabase.from("medication_logs").insert({
      medication_id: med.id,
      pet_id: med.pet_id,
      dosage_taken: med.dosage_per_use,
      logged_at: new Date().toISOString(),
    });
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm("Delete this routine permanently?", {
      title: "Delete Routine",
      variant: "danger",
      confirmText: "Delete",
    });

    if (!isConfirmed) return;

    setMeds((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("medications").delete().eq("id", id);
    toast.success("Routine removed");
  };

  const handleRefill = async (id: string, currentStock: number) => {
    const amountStr = await prompt("How much stock are you adding?", {
      title: "Refill Inventory",
      type: "number",
      placeholder: "e.g. 30",
      confirmText: "Refill",
    });

    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    const newStock = currentStock + amount;
    setMeds((prev) =>
      prev.map((m) => (m.id === id ? { ...m, current_stock: newStock } : m))
    );
    await supabase
      .from("medications")
      .update({ current_stock: newStock })
      .eq("id", id);
    toast.success(`Stock updated to ${newStock}`);
  };

  // --- FORM HANDLING ---

  const openForm = (med?: ExtendedMedication) => {
    if (med) {
      setEditingId(med.id);
      setFormData(med);
      // If editing, grab the first time from the array for the simple select
      setFormTime(med.time_of_day?.[0] || "morning");
    } else {
      setEditingId(null);
      setFormTime("morning");
      setFormData({
        name: "",
        unit: "pills",
        dosage_per_use: 1,
        current_stock: 30,
        low_stock_threshold: 5,
        frequency: "daily",
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Please enter a name");
      return;
    }

    const payload = {
      pet_id: petId,
      name: formData.name || "",
      unit: formData.unit || "pills",
      dosage_per_use: formData.dosage_per_use ?? 1,
      current_stock: formData.current_stock ?? 0,
      low_stock_threshold: formData.low_stock_threshold ?? 0,
      frequency: formData.frequency || "daily",
      time_of_day: [formTime], // ✅ FIX 3: Save as Array to match DB Schema
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("medications")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        setMeds((prev) =>
          prev.map((m) => (m.id === editingId ? { ...m, ...payload } : m))
        );
        toast.success("Routine updated");
      } else {
        const { data, error } = await supabase
          .from("medications")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        // Ensure the new local item has the correct array format
        const newItem = {
          ...data,
          time_of_day: [formTime],
        } as ExtendedMedication;
        setMeds((prev) => [newItem, ...prev]);
        toast.success("Routine added");
      }
      setShowForm(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    }
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  // ✅ FIX 4: Updated Filters using .includes() for Arrays
  const morningTasks = meds.filter(
    (m) => m.time_of_day?.includes("morning") || m.time_of_day?.includes("noon")
  );

  const eveningTasks = meds.filter(
    (m) =>
      m.time_of_day?.includes("evening") || m.time_of_day?.includes("bedtime")
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900 text-lg">Daily Routine</h3>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            Today
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => openForm()}
            size="sm"
            className="h-8 bg-gray-900 text-white hover:bg-gray-800 rounded-lg text-xs font-bold gap-1"
          >
            <Plus size={14} /> Add Routine
          </Button>

          <div className="bg-gray-100 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode("schedule")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "schedule"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <CalendarDays size={14} /> Day
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "list"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <LayoutList size={14} /> List
            </button>
          </div>
        </div>
      </div>

      {/* SCHEDULE VIEW */}
      {viewMode === "schedule" && (
        <div className="space-y-6 relative">
          <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-100 z-0" />

          {/* Morning / Day Section */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-50 border-2 border-orange-100 flex items-center justify-center text-orange-500 shadow-sm">
                <Sun size={20} />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Daytime</h4>
            </div>
            {morningTasks.length === 0 ? (
              <div className="pl-12 text-xs text-gray-400 italic">
                No morning tasks.
              </div>
            ) : (
              <div className="pl-12 space-y-3">
                {morningTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isCompleted={completedTasks.has(task.id)}
                    onToggle={() => handleCompleteTask(task)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Evening / Night Section */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm">
                <Moon size={20} />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Evening</h4>
            </div>
            {eveningTasks.length === 0 ? (
              <div className="pl-12 text-xs text-gray-400 italic">
                No evening tasks.
              </div>
            ) : (
              <div className="pl-12 space-y-3">
                {eveningTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isCompleted={completedTasks.has(task.id)}
                    onToggle={() => handleCompleteTask(task)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIST VIEW (MANAGE) */}
      {viewMode === "list" && (
        <div className="grid gap-4">
          {meds.map((med) => {
            const isActivity = med.unit === "mins" || med.unit === "30";
            const dosesLeft = !isActivity
              ? Math.floor(med.current_stock / med.dosage_per_use)
              : 0;
            const isLow =
              !isActivity && med.current_stock <= med.low_stock_threshold;
            const maxStock = Math.max(
              med.current_stock,
              30 * med.dosage_per_use
            );
            const percent = Math.min((med.current_stock / maxStock) * 100, 100);

            return (
              <div
                key={med.id}
                className={`group relative rounded-3xl p-5 border transition-all duration-300 ${
                  isLow
                    ? "bg-red-50/50 border-red-200"
                    : "bg-white border-gray-100 hover:border-blue-200"
                }`}
              >
                <div className="flex justify-between gap-4">
                  <div className="flex gap-4 w-full">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isLow
                          ? "bg-red-100 text-red-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {isActivity ? (
                        <Footprints size={20} />
                      ) : (
                        <Pill size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-900 truncate">
                          {med.name}
                        </h4>
                        {isLow && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            LOW
                          </span>
                        )}
                      </div>

                      {/* ✅ FIX 5: Display multiple time tags */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {med.time_of_day?.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1"
                          >
                            <Clock size={10} /> {t}
                          </span>
                        ))}
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                          <Repeat size={10} /> {med.frequency}
                        </span>
                      </div>

                      {!isActivity ? (
                        <>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                isLow ? "bg-red-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-500 font-medium">
                            <span>
                              {med.current_stock} {med.unit}
                            </span>
                            <span>~{dosesLeft} doses left</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1 font-medium">
                          Duration: {med.unit} mins
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-col gap-1">
                    {!isActivity && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRefill(med.id, med.current_stock)}
                      >
                        <PackagePlus size={16} className="text-blue-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openForm(med)}
                    >
                      <Edit2 size={16} className="text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(med.id)}
                    >
                      <Trash2
                        size={16}
                        className="text-red-400 hover:text-red-600"
                      />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-[2rem] w-full max-w-sm shadow-2xl relative animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900">
                {editingId ? "Edit Routine" : "New Routine"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowForm(false)}
                className="rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-400 uppercase">
                  Task Name
                </Label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Heartworm Pill"
                  className="font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase">
                    Time of Day
                  </Label>
                  {/* Uses local state 'formTime' to handle the simple select UI */}
                  <Select
                    value={formTime}
                    onValueChange={(v) => setFormTime(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="noon">Noon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="bedtime">Bedtime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase">
                    Frequency
                  </Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v: any) =>
                      setFormData({ ...formData, frequency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="as_needed">As Needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase">
                    Dosage / Duration
                  </Label>
                  <Input
                    type="number"
                    value={formData.dosage_per_use}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dosage_per_use: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase">
                    Unit
                  </Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(v: any) =>
                      setFormData({ ...formData, unit: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pills">Pills</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="mins">Minutes (Activity)</SelectItem>
                      <SelectItem value="scoops">Scoops</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.unit !== "mins" && (
                <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Label className="text-xs font-bold text-gray-400 uppercase">
                    Current Inventory
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Total Stock"
                      value={formData.current_stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          current_stock: Number(e.target.value),
                        })
                      }
                      className="bg-white"
                    />
                    <div className="w-px bg-gray-200 mx-1" />
                    <Input
                      type="number"
                      placeholder="Low Limit"
                      title="Alert me when stock is below..."
                      value={formData.low_stock_threshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          low_stock_threshold: Number(e.target.value),
                        })
                      }
                      className="bg-white w-20 text-center"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleSave}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl mt-2"
              >
                {editingId ? "Save Changes" : "Add Routine"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub Component
function TaskItem({
  task,
  isCompleted,
  onToggle,
}: {
  task: ExtendedMedication;
  isCompleted: boolean;
  onToggle: () => void;
}) {
  const isActivity = task.unit === "mins" || task.unit === "30";
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-2xl border transition-all duration-300",
        isCompleted
          ? "bg-gray-50 border-gray-100 opacity-60"
          : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={isCompleted ? undefined : onToggle}
          disabled={isCompleted}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 text-transparent hover:border-blue-400"
          )}
        >
          <Check size={14} strokeWidth={4} />
        </button>
        <div>
          <h5
            className={cn(
              "font-bold text-sm",
              isCompleted ? "text-gray-400 line-through" : "text-gray-900"
            )}
          >
            {task.name}
          </h5>
          <p className="text-xs text-gray-500">
            {isActivity
              ? `${task.unit} mins duration`
              : `Give ${task.dosage_per_use} ${task.unit}`}
          </p>
        </div>
      </div>
      {!isCompleted && !isActivity && (
        <div className="text-right">
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-md",
              task.current_stock <= task.low_stock_threshold
                ? "bg-red-50 text-red-600"
                : "bg-gray-50 text-gray-400"
            )}
          >
            {task.current_stock} left
          </span>
        </div>
      )}
    </div>
  );
}
