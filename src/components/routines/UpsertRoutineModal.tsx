import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Utensils,
  Footprints,
  Pill,
  Droplets,
  CalendarDays,
  Clock,
  TrendingDown,
  PackagePlus,
  Weight,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UpsertRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  petId: string;
  petName?: string;
  initialData?: any; // If provided, we are in "Edit Mode"
  onSuccess: () => void;
}

export default function UpsertRoutineModal({
  isOpen,
  onClose,
  petId,
  petName,
  initialData,
  onSuccess,
}: UpsertRoutineModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [routine, setRoutine] = useState({
    name: "",
    type: "inventory", // 'inventory' | 'activity'
    subType: "pill", // 'pill' | 'food' | 'liquid' | 'activity' | 'custom'
    unit: "pills",
    dosage_per_use: 1,
    current_stock_input: "30", // We keep this as string to handle empty states gracefully
    low_stock_threshold: 5,
    frequency: "daily",
    selected_times: ["morning"] as string[],

    // New: Specific for food logic
    foodMode: "weight" as "weight" | "count", // 'weight' (kg->g) or 'count' (cans/pouches)
  });

  // Initialize Data (Edit Mode vs Add Mode)
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // EDIT MODE: Infer logic from existing data
        const isFood = initialData.unit === "g";
        const isActivity = initialData.unit === "mins";

        let stockVal = initialData.current_stock?.toString() || "0";

        // If it's food in grams, convert back to KG for display if it's a large amount
        if (isFood && initialData.current_stock >= 1000) {
          stockVal = (initialData.current_stock / 1000).toString(); // 5000g -> 5kg
        }

        setRoutine({
          name: initialData.name,
          type: isActivity ? "activity" : "inventory",
          subType: isActivity ? "activity" : isFood ? "food" : "custom",
          unit: initialData.unit,
          dosage_per_use: initialData.dosage_per_use,
          current_stock_input: stockVal,
          low_stock_threshold: initialData.low_stock_threshold || 0,
          frequency: initialData.frequency || "daily",
          selected_times: Array.isArray(initialData.time_of_day)
            ? initialData.time_of_day
            : [initialData.time_of_day || "morning"],
          foodMode: isFood ? "weight" : "count",
        });
      } else {
        // ADD MODE: Reset
        setRoutine({
          name: "",
          type: "inventory",
          subType: "pill",
          unit: "pills",
          dosage_per_use: 1,
          current_stock_input: "30",
          low_stock_threshold: 5,
          frequency: "daily",
          selected_times: ["morning"],
          foodMode: "count",
        });
      }
    }
  }, [initialData, isOpen]);

  // Presets Logic (The "Smart" Wizard)
  const applyPreset = (preset: string) => {
    if (preset === "food") {
      setRoutine((prev) => ({
        ...prev,
        name: "Breakfast",
        type: "inventory",
        subType: "food",
        unit: "g",
        dosage_per_use: 150,
        current_stock_input: "3", // 3kg
        selected_times: ["morning"],
        foodMode: "weight",
      }));
    } else if (preset === "walk") {
      setRoutine((prev) => ({
        ...prev,
        name: "Morning Walk",
        type: "activity",
        subType: "activity",
        unit: "mins",
        dosage_per_use: 30,
        current_stock_input: "0",
        selected_times: ["morning"],
      }));
    } else if (preset === "meds") {
      setRoutine((prev) => ({
        ...prev,
        name: "Heartgard",
        type: "inventory",
        subType: "pill",
        unit: "pills",
        dosage_per_use: 1,
        current_stock_input: "6",
        selected_times: ["morning"],
        foodMode: "count",
      }));
    } else if (preset === "gel") {
      setRoutine((prev) => ({
        ...prev,
        name: "Nutri-Gel",
        type: "inventory",
        subType: "liquid",
        unit: "ml",
        dosage_per_use: 5,
        current_stock_input: "120",
        selected_times: ["evening"],
        foodMode: "count",
      }));
    }
  };

  const handleSubmit = async () => {
    if (!routine.name) return toast.error("Please enter a routine name");
    setIsSubmitting(true);

    try {
      let finalStock = parseFloat(routine.current_stock_input) || 0;
      let finalUnit = routine.unit;

      // Smart Logic: Convert KG to Grams for storage
      if (routine.subType === "food" && routine.foodMode === "weight") {
        finalStock = finalStock * 1000; // User enters 3 (kg) -> We save 3000 (g)
        finalUnit = "g";
      }

      // Smart Logic: Activity always uses 'mins'
      if (routine.type === "activity") {
        finalUnit = "mins";
        finalStock = 9999; // Infinite stock for activities
      }

      const payload = {
        pet_id: petId,
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        name: routine.name,
        unit: finalUnit,
        current_stock: finalStock,
        dosage_per_use: routine.dosage_per_use,
        low_stock_threshold:
          routine.type === "activity" ? 0 : routine.low_stock_threshold,
        frequency: routine.frequency,
        time_of_day: routine.selected_times,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from("medications")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
        toast.success("Routine updated successfully!");
      } else {
        const { error } = await supabase.from("medications").insert(payload);
        if (error) throw error;
        toast.success("New routine added!");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save routine");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTime = (time: string) => {
    setRoutine((prev) => {
      const exists = prev.selected_times.includes(time);
      return {
        ...prev,
        selected_times: exists
          ? prev.selected_times.filter((t) => t !== time)
          : [...prev.selected_times, time],
      };
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-3xl p-0 overflow-hidden bg-gray-50/95 backdrop-blur-xl border-none shadow-2xl">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-2">
              {initialData ? (
                <>
                  <Clock className="w-6 h-6 text-blue-500" /> Edit Routine
                </>
              ) : (
                <>
                  <PackagePlus className="w-6 h-6 text-blue-500" /> Setup Smart
                  Routine
                </>
              )}
            </DialogTitle>
            <p className="text-gray-500 text-sm font-medium">
              Configure daily habits for {petName || "your pet"}.
            </p>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* PRESETS (Only show on Create) */}
          {!initialData && (
            <div className="flex gap-2">
              {[
                {
                  id: "food",
                  icon: Utensils,
                  label: "Food",
                  color: "text-orange-500",
                },
                {
                  id: "walk",
                  icon: Footprints,
                  label: "Walk",
                  color: "text-green-500",
                },
                {
                  id: "meds",
                  icon: Pill,
                  label: "Pills",
                  color: "text-purple-500",
                },
                {
                  id: "gel",
                  icon: Droplets,
                  label: "Care",
                  color: "text-blue-500",
                },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={cn(
                    "flex-1 p-3 rounded-2xl border bg-white flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95",
                    routine.subType === p.id
                      ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/50"
                      : "border-gray-100 shadow-sm"
                  )}
                >
                  <p.icon size={20} className={p.color} />
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* MAIN INPUTS */}
          <div className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-400 uppercase">
                Routine Name
              </Label>
              <Input
                value={routine.name}
                onChange={(e) =>
                  setRoutine({ ...routine, name: e.target.value })
                }
                className="font-bold text-lg bg-gray-50 border-gray-200 focus:bg-white transition-all"
                placeholder="e.g. Morning Walk"
              />
            </div>

            {/* FOOD MODE TOGGLE */}
            {routine.subType === "food" && (
              <div className="bg-orange-50 p-1 rounded-lg flex">
                <button
                  onClick={() =>
                    setRoutine((r) => ({ ...r, foodMode: "weight", unit: "g" }))
                  }
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all",
                    routine.foodMode === "weight"
                      ? "bg-white shadow text-orange-600"
                      : "text-gray-400 hover:text-orange-400"
                  )}
                >
                  <Weight size={14} /> Bag by Weight (kg)
                </button>
                <button
                  onClick={() =>
                    setRoutine((r) => ({
                      ...r,
                      foodMode: "count",
                      unit: "cans",
                    }))
                  }
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all",
                    routine.foodMode === "count"
                      ? "bg-white shadow text-orange-600"
                      : "text-gray-400 hover:text-orange-400"
                  )}
                >
                  <Box size={14} /> Cans / Pouches
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-400 uppercase">
                  Schedule
                </Label>
                <div className="relative">
                  <select
                    className="w-full h-10 pl-9 rounded-md border border-gray-200 bg-gray-50 text-sm font-medium"
                    value={routine.frequency}
                    onChange={(e) =>
                      setRoutine({ ...routine, frequency: e.target.value })
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                  <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Dynamic Type Toggle (Hidden if Activity preset used to keep it simple, or user can switch) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-400 uppercase">
                  Type
                </Label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() =>
                      setRoutine({
                        ...routine,
                        type: "inventory",
                        subType: "custom",
                      })
                    }
                    className={cn(
                      "flex-1 text-xs font-bold py-1.5 rounded-md transition-all",
                      routine.type === "inventory"
                        ? "bg-white shadow text-gray-900"
                        : "text-gray-400"
                    )}
                  >
                    Item
                  </button>
                  <button
                    onClick={() =>
                      setRoutine({
                        ...routine,
                        type: "activity",
                        subType: "activity",
                      })
                    }
                    className={cn(
                      "flex-1 text-xs font-bold py-1.5 rounded-md transition-all",
                      routine.type === "activity"
                        ? "bg-white shadow text-gray-900"
                        : "text-gray-400"
                    )}
                  >
                    Activity
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase">
                Time of Day
              </Label>
              <div className="flex gap-2">
                {["morning", "noon", "evening"].map((time) => (
                  <button
                    key={time}
                    onClick={() => toggleTime(time)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all",
                      routine.selected_times.includes(time)
                        ? "bg-gray-900 text-white border-gray-900 shadow-lg"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    {time.charAt(0).toUpperCase() + time.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DYNAMIC DETAILS SECTION */}

          {/* 1. ACTIVITY MODE */}
          {routine.type === "activity" && (
            <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100 space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <Clock size={16} />
                <span className="text-xs font-black uppercase tracking-wide">
                  Activity Details
                </span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-green-600 uppercase">
                  Duration (Minutes)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    className="pl-9 bg-white border-green-200 focus:border-green-500"
                    value={routine.dosage_per_use}
                    onChange={(e) =>
                      setRoutine({
                        ...routine,
                        dosage_per_use: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <Clock className="w-4 h-4 text-green-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* 2. INVENTORY MODE */}
          {routine.type === "inventory" && (
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-center gap-2 text-blue-700">
                <TrendingDown size={16} />
                <span className="text-xs font-black uppercase tracking-wide">
                  Tracking & Inventory
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* LEFT: DOSAGE */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-400 uppercase">
                    {routine.subType === "food"
                      ? "Serving Size"
                      : "Usage per time"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      className="bg-white border-blue-200"
                      value={routine.dosage_per_use}
                      onChange={(e) =>
                        setRoutine({
                          ...routine,
                          dosage_per_use: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    {routine.subType !== "food" && (
                      <Input
                        className="w-16 bg-white border-blue-200 text-center px-1"
                        value={routine.unit}
                        onChange={(e) =>
                          setRoutine({ ...routine, unit: e.target.value })
                        }
                        placeholder="Unit"
                      />
                    )}
                    {routine.subType === "food" && (
                      <div className="flex items-center px-3 bg-blue-100 rounded-md text-blue-600 text-xs font-bold">
                        {routine.unit}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT: STOCK */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-400 uppercase">
                    {routine.subType === "food" && routine.foodMode === "weight"
                      ? "Bag Weight (KG)"
                      : "Current Stock"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      className="pl-9 bg-white border-blue-200"
                      value={routine.current_stock_input}
                      onChange={(e) =>
                        setRoutine({
                          ...routine,
                          current_stock_input: e.target.value,
                        })
                      }
                    />
                    {routine.subType === "food" &&
                    routine.foodMode === "weight" ? (
                      <Weight className="w-4 h-4 text-blue-400 absolute left-3 top-3 pointer-events-none" />
                    ) : (
                      <Box className="w-4 h-4 text-blue-400 absolute left-3 top-3 pointer-events-none" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-2 bg-gray-50/95 backdrop-blur">
          <Button
            onClick={handleSubmit}
            disabled={!routine.name || isSubmitting}
            className="w-full h-12 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-md shadow-xl transition-all hover:scale-[1.02] active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : initialData ? (
              "Save Changes"
            ) : (
              "Create Routine"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
