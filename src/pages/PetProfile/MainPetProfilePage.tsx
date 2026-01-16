import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import {
  Plus,
  Dog,
  Cat,
  Bird,
  Rabbit,
  PawPrint,
  Building2,
  Syringe,
  CalendarClock,
  ChevronRight,
  Pill,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Lightbulb,
  Sun,
  Moon,
  Coffee,
  PackagePlus,
  Utensils,
  Footprints,
  Droplets,
  BellRing,
  TrendingDown,
  Clock,
  CalendarDays,
  Check,
  CloudSun,
  Loader2,
  Heart,
  Scale, // Added Scale icon
  Box, // Added Box icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SymptomModal from "./components/SymptomModal";
import { cn } from "@/lib/utils";

// ... (KEEP EXISTING CONSTANTS & SMART_FACTS & HELPER FUNCTIONS) ...

const SMART_FACTS = {
  general: [
    "The world's oldest known pet was a tortoise that lived to be 188 years old.",
    "A dog's nose print is unique, much like a human's fingerprint.",
    "Tail wagging to the right usually indicates happiness; to the left indicates nervousness.",
    "Your dog is as smart as a two-year-old toddler!",
    "Cats have 32 muscles in each ear to help them pinpoint sounds.",
    "A cat's purr can help improve bone density and healing.",
    "Dogs can smell your feelings! They pick up on subtle changes in your scent.",
    "Dogs have three eyelids!",
    "Cats spend about 70% of their lives sleeping.",
    "Petting a dog can release oxytocin, the 'love hormone', in both you and your pet.",
  ],
};

interface RoutineItem {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  dosage_per_use: number;
  low_stock_threshold: number;
  type: "inventory" | "activity";
  times: string[];
  pet_id: string;
  pets?: { name: string; petimage_url: string | null; species: string };
}

const getSpeciesIcon = (
  species?: string,
  size: number = 24,
  className?: string
) => {
  const s = species?.toLowerCase() || "";
  const props = { size, className: className || "text-blue-300/80" };

  switch (s) {
    case "dog":
      return <Dog {...props} />;
    case "cat":
      return <Cat {...props} />;
    case "bird":
      return <Bird {...props} />;
    case "rabbit":
      return <Rabbit {...props} />;
    default:
      return <PawPrint {...props} />;
  }
};

export default function MainPetProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- UI STATE ---
  const [isAddRoutineOpen, setIsAddRoutineOpen] = useState(false);
  const [isSymptomOpen, setIsSymptomOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);

  // --- NEW: FOOD UNIT STATE ---
  const [foodUnitType, setFoodUnitType] = useState<"mass" | "volume">("mass");

  const [newRoutine, setNewRoutine] = useState({
    name: "",
    type: "inventory",
    subType: "pill",
    pet_id: "",
    current_stock_input: "",
    unit: "pills",
    dosage_per_use: 1,
    low_stock_threshold: 5,
    frequency: "daily",
    selected_times: [] as string[],
  });

  // ... (KEEP EXISTING DATA FETCHING HOOKS: useQuery for pets and dashboard) ...
  const { data: pets = [], isLoading: petsLoading } = useQuery({
    queryKey: ["pets", "personal", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_campus_pet", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: dashboard, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-personal", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const [nextVax, activeMeds, nextVisit, meds, logs] = await Promise.all([
        supabase
          .from("vaccinations")
          .select("vaccine_name, next_due_date")
          .eq("owner_id", user.id)
          .neq("status", "completed")
          .gte("next_due_date", todayIso)
          .order("next_due_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("medications")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .gt("current_stock", 0),
        supabase
          .from("schedules")
          .select("*")
          .eq("owner_id", user.id)
          .eq("status", "pending")
          .gte("scheduled_date", todayIso)
          .order("scheduled_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("medications")
          .select("*, pets(name, petimage_url, species)")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("medication_logs")
          .select("id, medication_id, logged_at")
          .gte("logged_at", todayIso),
      ]);

      const routines: RoutineItem[] =
        (meds.data as any[])?.map((m) => ({
          ...m,
          type: m.unit === "mins" ? "activity" : "inventory",
          times: Array.isArray(m.time_of_day)
            ? m.time_of_day
            : [m.time_of_day || "morning"],
        })) || [];

      return {
        nextVaccine: nextVax.data,
        activeMedsCount: activeMeds.count || 0,
        nextVisit: nextVisit.data,
        routines,
        logs: logs.data || [],
      };
    },
    enabled: !!user,
  });

  // ... (KEEP EXISTING COMPUTED VALUES & HELPERS) ...
  const currentPeriod = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }, []);

  const greeting = useMemo(() => {
    if (currentPeriod === "morning")
      return {
        title: "Good Morning!",
        sub: "Ready to start the day?",
        icon: <Sun className="text-yellow-500 w-8 h-8" />,
      };
    if (currentPeriod === "evening")
      return {
        title: "Good Evening",
        sub: "Time to wind down.",
        icon: <Moon className="text-indigo-500 w-8 h-8" />,
      };
    return {
      title: "Welcome Back",
      sub: "Hope your day is going well.",
      icon: <Coffee className="text-amber-600 w-8 h-8" />,
    };
  }, [currentPeriod]);

  const smartFact = useMemo(() => {
    const facts = SMART_FACTS.general;
    return facts[Math.floor(Math.random() * facts.length)];
  }, []);

  const completedInstances = useMemo(() => {
    const set = new Set<string>();
    if (!dashboard?.logs) return set;
    dashboard.logs.forEach((log: any) => {
      const date = new Date(log.logged_at);
      const hour = date.getHours();
      let period = "morning";
      if (hour >= 12 && hour < 18) period = "afternoon";
      if (hour >= 18) period = "evening";
      set.add(`${log.medication_id}-${period}`);
    });
    return set;
  }, [dashboard?.logs]);

  const groupedTasks = useMemo(() => {
    if (!dashboard?.routines)
      return { morning: [], afternoon: [], evening: [] };
    const morning = dashboard.routines.filter((r) =>
      r.times.includes("morning")
    );
    const afternoon = dashboard.routines.filter((r) =>
      r.times.includes("noon")
    );
    const evening = dashboard.routines.filter(
      (r) => r.times.includes("evening") || r.times.includes("bedtime")
    );
    return { morning, afternoon, evening };
  }, [dashboard]);

  // ... (KEEP toggleRoutineCheck, handleLogSymptom) ...
  const toggleRoutineCheck = async (
    routine: RoutineItem,
    period: "morning" | "afternoon" | "evening"
  ) => {
    const uniqueKey = `${routine.id}-${period}`;
    const isChecking = !completedInstances.has(uniqueKey);

    const now = new Date();
    let targetTime = new Date();
    if (period === "morning") targetTime.setHours(9, 0, 0, 0);
    else if (period === "afternoon") targetTime.setHours(14, 0, 0, 0);
    else {
      if (now.getHours() >= 18) targetTime = now;
      else targetTime.setHours(20, 0, 0, 0);
    }

    const logTimestamp = targetTime.toISOString();

    queryClient.setQueryData(["dashboard-personal", user?.id], (old: any) => {
      if (!old) return old;
      const newLogs = isChecking
        ? [
            ...old.logs,
            {
              id: "temp-" + Date.now(),
              medication_id: routine.id,
              logged_at: logTimestamp,
            },
          ]
        : old.logs.filter((l: any) => {
            const h = new Date(l.logged_at).getHours();
            let p = "morning";
            if (h >= 12 && h < 18) p = "afternoon";
            if (h >= 18) p = "evening";
            return l.medication_id !== routine.id || p !== period;
          });
      return { ...old, logs: newLogs };
    });

    try {
      if (isChecking) {
        const payload = {
          medication_id: routine.id,
          pet_id: routine.pet_id,
          dosage_taken:
            routine.type === "activity" ? 0 : routine.dosage_per_use,
          logged_at: logTimestamp,
        };
        await supabase.from("medication_logs").insert(payload);

        if (routine.type === "inventory") {
          const newStock = routine.current_stock - routine.dosage_per_use;
          await supabase
            .from("medications")
            .update({ current_stock: newStock })
            .eq("id", routine.id);
        }
        toast.success(`Completed ${routine.name}`);
      } else {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: logs } = await supabase
          .from("medication_logs")
          .select("id, logged_at")
          .eq("medication_id", routine.id)
          .gte("logged_at", todayStart.toISOString());

        if (logs) {
          const logToDelete = logs.find((l) => {
            const h = new Date(l.logged_at).getHours();
            if (period === "morning") return h < 12;
            if (period === "afternoon") return h >= 12 && h < 18;
            return h >= 18;
          });

          if (logToDelete) {
            await supabase
              .from("medication_logs")
              .delete()
              .eq("id", logToDelete.id);
            if (routine.type === "inventory") {
              const newStock = routine.current_stock + routine.dosage_per_use;
              await supabase
                .from("medications")
                .update({ current_stock: newStock })
                .eq("id", routine.id);
            }
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["dashboard-personal"] });
      queryClient.invalidateQueries({ queryKey: ["routines-timeline"] });
    } catch (err) {
      toast.error("Failed to update");
      queryClient.invalidateQueries({ queryKey: ["dashboard-personal"] });
    }
  };

  const handleLogSymptom = async (
    petId: string,
    symptom: string,
    category: string,
    severity: string
  ) => {
    try {
      await supabase.from("pet_incidents").insert({
        pet_id: petId,
        symptom,
        category,
        severity,
        logged_at: new Date().toISOString(),
      });
      setIsSymptomOpen(false);
      toast.success("Incident logged");
    } catch (err) {
      console.error(err);
      toast.error("Failed to log incident");
    }
  };

  // --- MODIFIED: handleAddRoutine ---
  const handleAddRoutine = async () => {
    if (!user || !newRoutine.pet_id || !newRoutine.name) return;
    setIsSubmitting(true);
    try {
      let finalStock = parseInt(newRoutine.current_stock_input) || 0;
      let finalUnit = newRoutine.unit;

      // Logic: Only convert kg->g if it's Food AND Mass
      if (newRoutine.subType === "food") {
        if (foodUnitType === "mass") {
          finalStock = finalStock * 1000; // kg -> g
          finalUnit = "g";
        } else {
          // Volume/Cans: Use exact number, unit defaults to "cans" or whatever is set
          finalUnit = "cans";
        }
      }

      const payload = {
        owner_id: user.id,
        pet_id: newRoutine.pet_id,
        name: newRoutine.name,
        unit: newRoutine.type === "activity" ? "mins" : finalUnit,
        current_stock: newRoutine.type === "activity" ? 9999 : finalStock,
        dosage_per_use:
          newRoutine.type === "activity"
            ? parseInt(newRoutine.unit) || 30
            : newRoutine.dosage_per_use,
        low_stock_threshold:
          newRoutine.type === "activity" ? 0 : newRoutine.low_stock_threshold,
        frequency: newRoutine.frequency,
        time_of_day: newRoutine.selected_times,
      };

      const { error } = await supabase.from("medications").insert(payload);
      if (error) throw error;

      toast.success("Routine added!");
      setIsAddRoutineOpen(false);
      setNewRoutine({
        ...newRoutine,
        name: "",
        current_stock_input: "",
        selected_times: [],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-personal"] });
    } catch (err) {
      toast.error("Failed to add routine");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- MODIFIED: applyPreset ---
  const applyPreset = (type: string) => {
    const defaultPet = pets.length > 0 ? pets[0].id : "";
    if (type === "food") {
      setFoodUnitType("mass"); // Default to mass
      setNewRoutine((prev) => ({
        ...prev,
        pet_id: prev.pet_id || defaultPet,
        name: "Breakfast",
        type: "inventory",
        subType: "food",
        unit: "g",
        dosage_per_use: 150,
        current_stock_input: "3", // Default 3kg
        selected_times: ["morning"],
      }));
    } else if (type === "walk")
      setNewRoutine((prev) => ({
        ...prev,
        pet_id: prev.pet_id || defaultPet,
        name: "Morning Walk",
        type: "activity",
        subType: "activity",
        unit: "30",
        dosage_per_use: 30,
        current_stock_input: "0",
        selected_times: ["morning"],
      }));
    else if (type === "meds")
      setNewRoutine((prev) => ({
        ...prev,
        pet_id: prev.pet_id || defaultPet,
        name: "Heartgard",
        type: "inventory",
        subType: "pill",
        unit: "pills",
        dosage_per_use: 1,
        current_stock_input: "6",
        selected_times: ["morning"],
      }));
    else if (type === "gel")
      setNewRoutine((prev) => ({
        ...prev,
        pet_id: prev.pet_id || defaultPet,
        name: "Nutri-Gel",
        type: "inventory",
        subType: "liquid",
        unit: "ml",
        dosage_per_use: 5,
        current_stock_input: "120",
        selected_times: ["evening"],
      }));
  };

  // ... (KEEP toggleTime and useEffect) ...
  const toggleTime = (time: string) => {
    setNewRoutine((prev) => {
      const exists = prev.selected_times.includes(time);
      return {
        ...prev,
        selected_times: exists
          ? prev.selected_times.filter((t) => t !== time)
          : [...prev.selected_times, time],
      };
    });
  };

  useEffect(() => {
    if (isAddRoutineOpen || isSymptomOpen)
      document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isAddRoutineOpen, isSymptomOpen]);

  if (petsLoading || statsLoading) return <MainDashboardSkeleton />;

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 relative">
      {/* ... (KEEP HEADER, WELCOME, STATS, SMART FACT sections - no changes) ... */}

      <div className="shrink-0 px-4 pt-4 lg:pt-8 lg:px-8 pb-4 bg-gray-50 z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {greeting.icon}
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-none">
                {greeting.title}
              </h1>
              <p className="text-gray-500 text-sm font-medium mt-1">
                {greeting.sub}
              </p>
            </div>
          </div>
          <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm flex items-center self-start md:self-auto">
            <button
              disabled
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-blue-600 text-white shadow-md cursor-default"
            >
              <PawPrint size={16} /> My Pets
            </button>
            <button
              onClick={() => navigate("/campus-pets")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-all"
            >
              <Building2 size={16} /> Campus Pets
            </button>
          </div>
        </div>

        {pets.length === 0 ? (
          <div className="mt-4 p-8 bg-white border border-dashed border-gray-300 rounded-3xl flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500 shadow-sm relative">
              <Heart size={40} fill="currentColor" className="opacity-20" />
              <Plus size={32} className="absolute text-blue-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">
              Welcome to PawPal!
            </h2>
            <p className="text-gray-500 max-w-sm mb-6 text-sm">
              Start by adding your first furry friend to track their health,
              vaccines, and daily routines.
            </p>
            <Button
              onClick={() => navigate("/PetDashboard/new?mode=personal")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 rounded-full shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              Add Your First Pet
            </Button>
          </div>
        ) : (
          <>
            {dashboard && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-in fade-in slide-in-from-top-2">
                {/* ... (Keep Stats Cards) ... */}
                <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                    <Dog size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                      Total
                    </p>
                    <p className="text-xl font-black text-gray-900">
                      {pets.length}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <Pill size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400">
                      Active Meds
                    </p>
                    <p className="text-xl font-black text-gray-900">
                      {dashboard.activeMedsCount}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                    <Syringe size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                      Next Vaccine
                    </p>
                    {dashboard.nextVaccine ? (
                      <div>
                        <p
                          className="text-sm font-black text-gray-900 truncate"
                          title={dashboard.nextVaccine.vaccine_name}
                        >
                          {dashboard.nextVaccine.vaccine_name}
                        </p>
                        <p className="text-[10px] text-orange-600 font-bold">
                          Due{" "}
                          {formatDistanceToNow(
                            parseISO(dashboard.nextVaccine.next_due_date),
                            { addSuffix: true }
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-gray-400">
                        All Clear
                      </p>
                    )}
                  </div>
                </div>
                <div
                  onClick={() => navigate("/PetDashboard/schedule")}
                  className="col-span-1 bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-300 transition-colors group relative overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <CalendarClock size={16} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Next Visit
                    </span>
                  </div>
                  {dashboard.nextVisit ? (
                    <div className="relative z-10">
                      <p className="text-sm font-black text-gray-900 truncate">
                        {dashboard.nextVisit.title}
                      </p>
                      <p className="text-xs text-blue-600 font-bold mt-1">
                        {format(
                          parseISO(dashboard.nextVisit.scheduled_date),
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="relative z-10">
                      <p className="text-xl font-black text-gray-300">--</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 flex gap-4 items-start shadow-sm">
              <div className="bg-white p-2 rounded-full text-violet-600 shadow-sm shrink-0">
                <Lightbulb size={18} className="fill-violet-100" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase bg-violet-200 text-violet-800 px-2 py-0.5 rounded-md tracking-wide">
                    General Tip
                  </span>
                  <Sparkles size={12} className="text-violet-400" />
                </div>
                <p className="text-sm text-violet-900 font-medium leading-relaxed">
                  "{smartFact}"
                </p>
              </div>
            </div>

            {/* ... (Keep Action Plan) ... */}
            {dashboard && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" /> Today's
                      Focus
                    </h2>
                    <button
                      onClick={() => setShowAllTasks(!showAllTasks)}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      {showAllTasks ? "Show Less" : "Show All"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsSymptomOpen(true)}
                      className="text-red-600 hover:bg-red-50 px-2 py-1 rounded-full flex items-center gap-1 text-xs font-bold transition-colors"
                    >
                      <AlertCircle size={14} /> Incident
                    </button>
                    <Button
                      onClick={() => setIsAddRoutineOpen(true)}
                      size="sm"
                      className="bg-gray-900 text-white rounded-full h-8 px-4 text-xs font-bold gap-1 shadow-md hover:bg-black transition-transform active:scale-95"
                    >
                      <Plus size={14} /> Routine
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/50">
                  {/* ... (Keep Progress Bar) ... */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Daily Progress
                      </p>
                      <h3 className="text-2xl font-black text-gray-900">
                        {completedInstances.size}{" "}
                        <span className="text-gray-300 text-lg">
                          /{" "}
                          {dashboard.routines.reduce(
                            (acc: number, r: any) =>
                              acc +
                              (Array.isArray(r.time_of_day)
                                ? r.time_of_day.length
                                : 1),
                            0
                          )}
                        </span>
                      </h3>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 size={24} />
                    </div>
                  </div>

                  {dashboard.routines.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm">
                        No tasks for today.
                      </p>
                      <Button
                        variant="link"
                        onClick={() => setIsAddRoutineOpen(true)}
                      >
                        Create one now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(showAllTasks || currentPeriod === "morning") &&
                        groupedTasks.morning.length > 0 && (
                          <DashboardTaskGroup
                            period="morning"
                            title="Morning"
                            icon={<Sun size={16} className="text-orange-500" />}
                            tasks={groupedTasks.morning}
                            completedSet={completedInstances}
                            onToggle={(t: any) =>
                              toggleRoutineCheck(t, "morning")
                            }
                          />
                        )}
                      {(showAllTasks || currentPeriod === "afternoon") &&
                        groupedTasks.afternoon.length > 0 && (
                          <DashboardTaskGroup
                            period="afternoon"
                            title="Afternoon"
                            icon={
                              <CloudSun size={16} className="text-blue-500" />
                            }
                            tasks={groupedTasks.afternoon}
                            completedSet={completedInstances}
                            onToggle={(t: any) =>
                              toggleRoutineCheck(t, "afternoon")
                            }
                          />
                        )}
                      {(showAllTasks || currentPeriod === "evening") &&
                        groupedTasks.evening.length > 0 && (
                          <DashboardTaskGroup
                            period="evening"
                            title="Evening"
                            icon={
                              <Moon size={16} className="text-indigo-500" />
                            }
                            tasks={groupedTasks.evening}
                            completedSet={completedInstances}
                            onToggle={(t: any) =>
                              toggleRoutineCheck(t, "evening")
                            }
                          />
                        )}
                      {!showAllTasks && (
                        <div className="pt-4 text-center">
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                            Hiding other times
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ... (Keep Pet Grid) ... */}
      {pets.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 lg:pb-8">
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-lg font-bold text-gray-900">
              Detailed Profiles
            </h2>
            <Button
              onClick={() => navigate(`/PetDashboard/new?mode=personal`)}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-full gap-2 shadow-sm h-9 px-4 text-xs md:text-sm"
            >
              <Plus className="w-4 h-4" /> Add Pet
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pets.map((pet) => (
              <div
                key={pet.id}
                onClick={() => navigate(`/PetDashboard/${pet.id}`)}
                className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
              >
                <div className="aspect-[4/3] rounded-xl bg-gray-100 overflow-hidden relative mb-3">
                  {/* ✅ FIXED: Dynamic Grid Icon */}
                  {pet.petimage_url ? (
                    <img
                      src={pet.petimage_url}
                      alt={pet.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50/50 group-hover:scale-105 transition-transform duration-500">
                      {getSpeciesIcon(pet.species, 48)}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {pet.name}
                  </h3>
                  <div className="p-1.5 bg-gray-50 rounded-full text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routine Modal */}
      {isAddRoutineOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-blue-600 flex items-center gap-2">
                  <PackagePlus className="w-6 h-6" /> Setup Smart Routine
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Activities, meals, and meds.
                </p>
              </div>
              <button
                onClick={() => setIsAddRoutineOpen(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase">
                    Category
                  </Label>
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
                        label: "Activity",
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
                        label: "Gel/Liq",
                        color: "text-blue-500",
                      },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p.id)}
                        className={cn(
                          "flex-1 p-2 rounded-xl border flex flex-col items-center gap-1 transition-all",
                          newRoutine.subType ===
                            (p.id === "walk"
                              ? "activity"
                              : p.id === "meds"
                              ? "pill"
                              : p.id === "gel"
                              ? "liquid"
                              : p.id)
                            ? "border-blue-400 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <p.icon size={18} className={p.color} />
                        <span className="text-[10px] font-bold text-gray-600">
                          {p.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* --- NEW: FOOD UNIT TOGGLE --- */}
                {newRoutine.subType === "food" && (
                  <div className="bg-gray-50 p-1 rounded-xl flex">
                    <button
                      onClick={() => setFoodUnitType("mass")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                        foodUnitType === "mass"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-600"
                      )}
                    >
                      <Scale size={14} /> Bag by Weight
                    </button>
                    <button
                      onClick={() => setFoodUnitType("volume")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                        foodUnitType === "volume"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-600"
                      )}
                    >
                      <Box size={14} /> Cans / Pouches
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase">
                    For
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() =>
                          setNewRoutine({ ...newRoutine, pet_id: pet.id })
                        }
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all shrink-0",
                          newRoutine.pet_id === pet.id
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                            : "border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        <div className="w-6 h-6 rounded-full bg-white overflow-hidden shadow-sm flex items-center justify-center bg-blue-50/50">
                          {pet.petimage_url ? (
                            <img
                              src={pet.petimage_url}
                              alt={pet.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getSpeciesIcon(pet.species, 14)
                          )}
                        </div>
                        <span className="text-xs">{pet.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-400 uppercase">
                      Task Name
                    </Label>
                    <Input
                      placeholder="e.g. Breakfast, Morning Walk"
                      className="bg-gray-50 font-semibold"
                      value={newRoutine.name}
                      onChange={(e) =>
                        setNewRoutine({ ...newRoutine, name: e.target.value })
                      }
                    />
                  </div>
                  {newRoutine.type === "inventory" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-400 uppercase">
                          Unit
                        </Label>
                        {/* If Food & Volume, let user type unit (cans, pouches etc). If Mass, default g */}
                        <Input
                          className="bg-gray-50"
                          value={
                            newRoutine.subType === "food" &&
                            foodUnitType === "mass"
                              ? "g"
                              : newRoutine.unit
                          }
                          disabled={
                            newRoutine.subType === "food" &&
                            foodUnitType === "mass"
                          }
                          onChange={(e) =>
                            setNewRoutine({
                              ...newRoutine,
                              unit: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-400 uppercase">
                          {newRoutine.subType === "food"
                            ? "Serving"
                            : newRoutine.subType === "liquid"
                            ? "Dose (ml)"
                            : "Count"}
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            className="pl-8"
                            value={newRoutine.dosage_per_use}
                            onChange={(e) =>
                              setNewRoutine({
                                ...newRoutine,
                                dosage_per_use: parseInt(e.target.value),
                              })
                            }
                          />
                          <TrendingDown className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-400 uppercase">
                        Duration (mins)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          className="pl-8"
                          value={newRoutine.unit}
                          onChange={(e) =>
                            setNewRoutine({
                              ...newRoutine,
                              unit: e.target.value,
                            })
                          }
                        />
                        <Clock className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6 flex flex-col h-full">
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarClock size={16} className="text-blue-500" />
                    <span className="text-sm font-bold text-blue-900">
                      Schedule
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-blue-800">
                      Frequency
                    </Label>
                    <div className="relative">
                      <select
                        className="w-full text-sm p-2 pl-8 rounded-lg border-blue-200 bg-white text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newRoutine.frequency}
                        onChange={(e) =>
                          setNewRoutine({
                            ...newRoutine,
                            frequency: e.target.value,
                          })
                        }
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="as_needed">As Needed</option>
                      </select>
                      <CalendarDays className="w-4 h-4 text-blue-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-blue-800">
                      Time of Day
                    </Label>
                    <div className="flex gap-2">
                      {["morning", "noon", "evening"].map((time) => (
                        <button
                          key={time}
                          onClick={() => toggleTime(time)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-bold border transition-all",
                            newRoutine.selected_times.includes(time)
                              ? "bg-blue-600 text-white border-blue-600 shadow-md"
                              : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                          )}
                        >
                          {time.charAt(0).toUpperCase() + time.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {newRoutine.type === "inventory" && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PackagePlus size={16} className="text-gray-500" />
                      <span className="text-sm font-bold text-gray-700">
                        Inventory Setup
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">
                          {newRoutine.subType === "food"
                            ? foodUnitType === "mass"
                              ? "Bag Weight (kg)"
                              : "Total Cans/Pouches"
                            : newRoutine.subType === "liquid"
                            ? "Tube/Bottle Size (ml/g)"
                            : "Current Count"}
                        </Label>
                        <Input
                          type="number"
                          className="bg-white"
                          value={newRoutine.current_stock_input}
                          onChange={(e) =>
                            setNewRoutine({
                              ...newRoutine,
                              current_stock_input: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-gray-500">
                            Refill Alert
                          </Label>
                          <span className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                            <BellRing size={10} /> Alert when low
                          </span>
                        </div>
                        <Input
                          type="number"
                          className="bg-white border-orange-200 focus:border-orange-500"
                          value={newRoutine.low_stock_threshold}
                          onChange={(e) =>
                            setNewRoutine({
                              ...newRoutine,
                              low_stock_threshold: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleAddRoutine}
                  disabled={
                    !newRoutine.name || !newRoutine.pet_id || isSubmitting
                  }
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Create Routine"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSymptomOpen && user && (
        <SymptomModal
          pets={pets}
          onSave={handleLogSymptom}
          onClose={() => setIsSymptomOpen(false)}
        />
      )}
    </div>
  );
}

// ... (KEEP DashboardTaskGroup & MainDashboardSkeleton) ...
function DashboardTaskGroup({
  period,
  title,
  icon,
  tasks,
  completedSet,
  onToggle,
}: any) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center gap-2 mb-2 px-2">
        {icon}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task: any) => {
          const isCompleted = completedSet.has(`${task.id}-${period}`);
          return (
            <div
              key={`${task.id}-${period}`}
              onClick={() => onToggle(task)}
              className={cn(
                "flex items-center p-3 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99]",
                isCompleted
                  ? "bg-gray-50 border-gray-100"
                  : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-colors",
                  isCompleted
                    ? "bg-green-500 border-green-500"
                    : "border-gray-200 group-hover:border-blue-400"
                )}
              >
                {isCompleted && (
                  <Check size={12} className="text-white" strokeWidth={3} />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm font-bold transition-colors",
                    isCompleted ? "text-gray-400 line-through" : "text-gray-900"
                  )}
                >
                  {task.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                    {/* ✅ FIXED: Dynamic Task Icon */}
                    {task.pets?.petimage_url ? (
                      <img
                        src={task.pets?.petimage_url}
                        className="w-3 h-3 rounded-full object-cover"
                      />
                    ) : (
                      getSpeciesIcon(task.pets?.species, 12, "text-gray-400")
                    )}{" "}
                    {task.pets?.name}
                  </span>
                </div>
              </div>
              {task.type !== "activity" && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-md",
                    task.current_stock < task.low_stock_threshold
                      ? "bg-red-50 text-red-600"
                      : "bg-gray-50 text-gray-400"
                  )}
                >
                  {task.current_stock} {task.unit} left
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MainDashboardSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}
