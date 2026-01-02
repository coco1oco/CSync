import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { supabase } from "@/lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Dog,
  PawPrint,
  Building2,
  Syringe,
  CalendarClock,
  ChevronRight,
  Pill,
  CheckCircle2,
  X,
  Sparkles,
  Lightbulb,
  Sun,
  Moon,
  Coffee,
  Loader2,
  AlertCircle,
  PackagePlus,
  BellRing,
  TrendingDown,
  Utensils,
  Footprints,
  Check,
  Clock,
  CalendarDays,
  Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Medication } from "@/types";
import SymptomModal from "./components/SymptomModal";

const SMART_FACTS = {
  health: [
    "Vaccines simulate a disease to train your pet's immune system without making them sick!",
    "Regular vet visits can detect dental disease, which affects 80% of dogs by age 3.",
    "Heartworm prevention is cheaper than the cure! Treatment can take months.",
  ],
  nutrition: [
    "Dogs have a sense of time! They rely on their circadian rhythm to know when it's dinner time.",
    "Obesity is the #1 preventable disease in dogs. Measuring food cups is key!",
    "Hydration check! specific water needs vary, but a fresh bowl is always a must.",
    "Cats can't taste sweetness.",
  ],
  morning: [
    "Morning walks help regulate your dog's sleep cycle for the whole day.",
    "Stretching? Dogs do the 'play bow' to stretch their spine after a long nap.",
  ],
  evening: [
    "Dogs dream just like humans! If they twitch, they might be chasing squirrels.",
    "A calm evening routine helps pets settle down for a better night's sleep.",
  ],
  general: [
    "The world's oldest known pet was a tortoise that lived to be 188 years old.",
    "A dog's nose print is unique, much like a human's fingerprint.",
    "Tail wagging to the right usually indicates happiness; to the left indicates nervousness.",
    "Your dog is as smart as a two-year-old toddler!",
    "Cats have 32 muscles in each ear to help them pinpoint sounds.",
    "A cat's purr can help improve bone density and healing.",
    "Dogs can smell your feelings! They pick up on subtle changes in your scent.",
    "Dogs have three eyelids!",
    "A cat's purr can help improve bone density and healing.",
    "Cats spend about 70% of their lives sleeping.",
    "Petting a dog can release oxytocin, the 'love hormone', in both you and your pet.",
  ],
};

interface RoutineItem extends Medication {
  type: "inventory" | "activity";
  times: string[];
  completedToday: boolean;
}

export default function MainPetProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"personal" | "campus">("personal");
  const [stats, setStats] = useState({
    vaccinesDue: 0,
    dailyNeeds: 0,
    urgentPets: [] as any[],
  });
  const [nextVisit, setNextVisit] = useState<any>(null);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [isAddRoutineOpen, setIsAddRoutineOpen] = useState(false);
  const [isSymptomOpen, setIsSymptomOpen] = useState(false);

  // Wizard State
  const [newRoutine, setNewRoutine] = useState({
    name: "",
    type: "inventory", // inventory, activity
    subType: "pill", // pill, liquid, food
    pet_id: "",

    // Inventory
    current_stock_input: "",
    unit: "pills",
    dosage_per_use: 1,
    low_stock_threshold: 5,

    // Schedule
    frequency: "daily",
    selected_times: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { pets, loading: petsLoading } = usePets(user?.id, activeTab);
  const [dataLoading, setDataLoading] = useState(true);
  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    if (isAddRoutineOpen || isSymptomOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isAddRoutineOpen, isSymptomOpen]);

  useEffect(() => {
    if (!user || activeTab !== "personal") {
      if (!petsLoading) setDataLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayIso = todayStart.toISOString();

        const { data: vax } = await supabase
          .from("vaccinations")
          .select("id")
          .eq("owner_id", user.id)
          .neq("status", "completed");
        const { data: tasks } = await supabase
          .from("pet_tasks")
          .select("id")
          .eq("owner_id", user.id)
          .eq("completed", false);
        const { data: visits } = await supabase
          .from("schedules")
          .select("*")
          .eq("owner_id", user.id)
          .eq("status", "pending")
          .order("scheduled_date", { ascending: true })
          .limit(1);

        const { data: medsData } = await supabase
          .from("medications")
          .select("*, pets(name, petimage_url)")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        const { data: todayLogs } = await supabase
          .from("medication_logs")
          .select("medication_id")
          .gte("logged_at", todayIso);

        const completedIds = new Set(todayLogs?.map((l) => l.medication_id));

        // ✅ FIX: Use REAL time_of_day array from DB
        const mappedRoutines =
          (medsData as any[])?.map((m) => ({
            ...m,
            type: m.unit === "mins" ? "activity" : "inventory",
            // Check if it's an array, otherwise wrap it
            times: Array.isArray(m.time_of_day)
              ? m.time_of_day
              : [m.time_of_day || "morning"],
            completedToday: completedIds.has(m.id),
          })) || [];

        setRoutines(mappedRoutines);
        setStats({
          vaccinesDue: vax?.length || 0,
          dailyNeeds: tasks?.length || 0,
          urgentPets: [],
        });
        if (visits && visits.length > 0) setNextVisit(visits[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setTimeout(() => setDataLoading(false), 300);
      }
    };

    if (!petsLoading) {
      fetchData();
    }
  }, [user, activeTab, petsLoading]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (stats.vaccinesDue > 0)
      return {
        title: "Action Required",
        sub: "You have overdue health items!",
        icon: <Syringe className="text-orange-500" />,
      };
    if (hour < 12)
      return {
        title: "Good Morning!",
        sub: "Ready to start the day?",
        icon: <Sun className="text-yellow-500" />,
      };
    if (hour > 17)
      return {
        title: "Good Evening",
        sub: "Time to wind down.",
        icon: <Moon className="text-indigo-500" />,
      };
    return {
      title: "Welcome Back",
      sub: "All clear for now.",
      icon: <Coffee className="text-amber-600" />,
    };
  }, [stats]);

  const smartFact = useMemo(() => {
    const category = "general";
    const facts = SMART_FACTS[category];
    return {
      text: facts[Math.floor(Math.random() * facts.length)],
      category: "General",
    };
  }, []);

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
    }
  };

  const toggleRoutineCheck = async (routine: RoutineItem) => {
    const isChecking = !routine.completedToday;
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routine.id ? { ...r, completedToday: isChecking } : r
      )
    );

    if (routine.type === "activity") {
      if (isChecking) {
        await supabase.from("medication_logs").insert({
          medication_id: routine.id,
          pet_id: routine.pet_id,
          dosage_taken: 0,
          logged_at: new Date().toISOString(),
        });
        toast.success(`Completed ${routine.name}`);
      } else {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        await supabase
          .from("medication_logs")
          .delete()
          .eq("medication_id", routine.id)
          .gte("logged_at", todayStart.toISOString());
        toast.info("Unchecked activity");
      }
      return;
    }

    const newStock = isChecking
      ? routine.current_stock - routine.dosage_per_use
      : routine.current_stock + routine.dosage_per_use;

    if (newStock < 0) {
      toast.error("Not enough stock!");
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === routine.id ? { ...r, completedToday: false } : r
        )
      );
      return;
    }

    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routine.id ? { ...r, current_stock: newStock } : r
      )
    );

    try {
      if (isChecking) {
        await supabase
          .from("medications")
          .update({ current_stock: newStock })
          .eq("id", routine.id);

        await supabase.from("medication_logs").insert({
          medication_id: routine.id,
          pet_id: routine.pet_id,
          dosage_taken: routine.dosage_per_use,
          logged_at: new Date().toISOString(),
        });

        if (newStock <= routine.low_stock_threshold)
          toast.warning(`Low Stock: Only ${newStock} ${routine.unit} left!`);
        else toast.success(`Logged ${routine.name}`);
      } else {
        await supabase
          .from("medications")
          .update({ current_stock: newStock })
          .eq("id", routine.id);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        await supabase
          .from("medication_logs")
          .delete()
          .eq("medication_id", routine.id)
          .gte("logged_at", todayStart.toISOString());
      }
    } catch (error) {
      console.error("Failed to update routine", error);
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === routine.id
            ? {
                ...r,
                completedToday: !isChecking,
                current_stock: routine.current_stock,
              }
            : r
        )
      );
    }
  };

  const handleAddRoutine = async () => {
    if (!user || !newRoutine.pet_id || !newRoutine.name) return;
    setIsSubmitting(true);

    try {
      let finalStock = parseInt(newRoutine.current_stock_input) || 0;
      let finalUnit = newRoutine.unit;

      if (newRoutine.subType === "food") {
        finalStock = finalStock * 1000;
        finalUnit = "g";
      }

      // ✅ FIX: Send array of times to DB
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
        time_of_day: newRoutine.selected_times, // This sends the array
      };

      const { data, error } = await supabase
        .from("medications")
        .insert(payload)
        .select("*, pets(name, petimage_url)")
        .single();

      if (error) throw error;

      if (data) {
        setRoutines((prev) => [
          {
            ...data,
            type: newRoutine.type as any,
            // Ensure times is array in local state
            times: Array.isArray(data.time_of_day)
              ? data.time_of_day
              : [data.time_of_day || "morning"],
            completedToday: false,
          },
          ...prev,
        ]);
        setIsAddRoutineOpen(false);
        setNewRoutine({
          ...newRoutine,
          name: "",
          current_stock_input: "",
          selected_times: [],
        });
      }
      toast.success("Routine added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add routine");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ FIX: Multi-select Toggle
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

  const applyPreset = (type: "food" | "walk" | "meds" | "gel") => {
    if (type === "food")
      setNewRoutine((prev) => ({
        ...prev,
        name: "Breakfast",
        type: "inventory",
        subType: "food",
        unit: "g",
        dosage_per_use: 150,
        current_stock_input: "3",
        selected_times: ["morning"],
        frequency: "daily",
      }));
    if (type === "walk")
      setNewRoutine((prev) => ({
        ...prev,
        name: "Morning Walk",
        type: "activity",
        subType: "activity",
        unit: "30",
        dosage_per_use: 30,
        current_stock_input: "0",
        selected_times: ["morning"],
        frequency: "daily",
      }));
    if (type === "meds")
      setNewRoutine((prev) => ({
        ...prev,
        name: "Heartgard",
        type: "inventory",
        subType: "pill",
        unit: "pills",
        dosage_per_use: 1,
        current_stock_input: "6",
        selected_times: ["morning"],
        frequency: "monthly",
      }));
    if (type === "gel")
      setNewRoutine((prev) => ({
        ...prev,
        name: "Nutri-Gel",
        type: "inventory",
        subType: "liquid",
        unit: "ml",
        dosage_per_use: 5,
        current_stock_input: "120",
        selected_times: ["evening"],
        frequency: "daily",
      }));
  };

  if (petsLoading || dataLoading) {
    return <MainDashboardSkeleton />;
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 relative">
      {/* 1. HEADER */}
      <div className="shrink-0 px-4 pt-4 lg:pt-8 lg:px-8 pb-4 bg-gray-50 z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {activeTab === "personal" ? (
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
            ) : (
              <div>
                <h1 className="text-2xl font-black text-gray-900">
                  Campus Dogs
                </h1>
                <p className="text-gray-500 text-sm">
                  Monitoring university residents.
                </p>
              </div>
            )}
          </div>
          <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm flex items-center self-start md:self-auto">
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === "personal"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <PawPrint size={16} /> My Pets
            </button>
            <button
              onClick={() => setActiveTab("campus")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === "campus"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Building2 size={16} /> Campus Dogs
            </button>
          </div>
        </div>

        {/* 2. DASHBOARD WIDGETS */}
        {activeTab === "personal" && pets.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
              <div
                className={`p-3 md:p-4 rounded-xl border shadow-sm flex items-center gap-3 ${
                  stats.dailyNeeds > 0
                    ? "bg-red-50 border-red-100"
                    : "bg-white border-gray-200"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    stats.dailyNeeds > 0
                      ? "bg-red-100 text-red-600"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  <Pill size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    Daily Needs
                  </p>
                  <p className="text-xl font-black text-gray-900">
                    {stats.dailyNeeds}
                  </p>
                </div>
              </div>
              <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                  <Syringe size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Vaccines
                  </p>
                  <p className="text-xl font-black text-gray-900">
                    {stats.vaccinesDue}
                  </p>
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
                {nextVisit ? (
                  <div className="relative z-10">
                    <p className="text-sm font-black text-gray-900 truncate">
                      {nextVisit.title}
                    </p>
                    <p className="text-xs text-blue-600 font-bold mt-1">
                      {formatDistanceToNow(new Date(nextVisit.scheduled_date), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <p className="text-xl font-black text-gray-300">--</p>
                  </div>
                )}
              </div>
            </div>

            {/* SMART FACT WIDGET */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 flex gap-4 items-start shadow-sm">
              <div className="bg-white p-2 rounded-full text-violet-600 shadow-sm shrink-0">
                <Lightbulb size={18} className="fill-violet-100" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase bg-violet-200 text-violet-800 px-2 py-0.5 rounded-md tracking-wide">
                    {smartFact.category} Tip
                  </span>
                  <Sparkles size={12} className="text-violet-400" />
                </div>
                <p className="text-sm text-violet-900 font-medium leading-relaxed">
                  "{smartFact.text}"
                </p>
              </div>
            </div>

            {/* ACTION PLAN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Today's
                  Action Plan
                </h2>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setIsSymptomOpen(true)}
                    className="text-xs text-red-600 font-bold hover:bg-red-50 px-2 py-1 rounded-full transition-colors flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" /> Log Incident
                  </button>
                  <div className="w-px h-3 bg-gray-300"></div>
                  <button
                    onClick={() => {
                      if (pets.length > 0)
                        setNewRoutine((prev) => ({
                          ...prev,
                          pet_id: pets[0].id,
                        }));
                      setIsAddRoutineOpen(true);
                    }}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Routine
                  </button>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide snap-x">
                {routines.length === 0 && (
                  <div
                    onClick={() => setIsAddRoutineOpen(true)}
                    className="snap-center shrink-0 w-64 p-4 rounded-xl border-2 border-dashed border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-white hover:border-blue-300 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600">
                      <Plus size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-600 group-hover:text-blue-700">
                        Set up your day
                      </p>
                      <p className="text-xs text-gray-400">
                        Add walks, meals, meds...
                      </p>
                    </div>
                  </div>
                )}
                {routines.map((routine) => {
                  const petInfo = (routine as any).pets;

                  return (
                    <div
                      key={routine.id}
                      onClick={() => toggleRoutineCheck(routine)}
                      className={`relative snap-center shrink-0 w-64 p-3 rounded-2xl border shadow-sm transition-all cursor-pointer flex items-center gap-3 group ${
                        routine.completedToday
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-white border-gray-200 hover:border-blue-400 hover:shadow-md"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          routine.completedToday
                            ? "bg-green-500 text-white"
                            : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                        }`}
                      >
                        <Check size={20} strokeWidth={3} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-bold text-sm truncate ${
                            routine.completedToday
                              ? "text-gray-500 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          {routine.name}
                        </h3>

                        {/* ✅ FIX: Display Multiple Time Badges */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {routine.times.map((t) => (
                            <span
                              key={t}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                t === "morning"
                                  ? "bg-orange-100 text-orange-700"
                                  : t === "noon"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-indigo-100 text-indigo-700"
                              }`}
                            >
                              {t}
                            </span>
                          ))}

                          {routine.type === "inventory" && (
                            <span className="text-xs text-gray-400 flex items-center">
                              {routine.current_stock} {routine.unit} left
                            </span>
                          )}
                        </div>
                      </div>

                      {petInfo && (
                        <div className="shrink-0">
                          <img
                            src={
                              petInfo.petimage_url || "https://placehold.co/100"
                            }
                            alt={petInfo.name}
                            className="w-7 h-7 rounded-full object-cover border border-gray-100 shadow-sm"
                            title={`For ${petInfo.name}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 lg:pb-8">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 className="text-lg font-bold text-gray-900">
            {activeTab === "personal"
              ? "Detailed Profiles"
              : "Campus Residents"}
          </h2>
          {(activeTab === "personal" || isAdmin) && (
            <Button
              onClick={() => navigate(`/PetDashboard/new?mode=${activeTab}`)}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-full gap-2 shadow-sm h-9 px-4 text-xs md:text-sm"
            >
              <Plus className="w-4 h-4" />{" "}
              {activeTab === "personal" ? "Add Pet" : "Add Dog"}
            </Button>
          )}
        </div>
        {pets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-center shadow-sm">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Dog className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {activeTab === "personal"
                ? "No pets found"
                : "No campus dogs yet"}
            </h3>
            <p className="text-gray-500 text-sm max-w-xs mb-6">
              {activeTab === "personal"
                ? "Start by creating a profile."
                : "The organization hasn't listed any dogs yet."}
            </p>
            {(activeTab === "personal" || isAdmin) && (
              <Button
                onClick={() => navigate(`/PetDashboard/new?mode=${activeTab}`)}
                className="rounded-full bg-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" /> Add First
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pets.map((pet) => (
              <div
                key={pet.id}
                onClick={() => navigate(`/PetDashboard/${pet.id}`)}
                className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
              >
                <div className="aspect-[4/3] rounded-xl bg-gray-100 overflow-hidden relative mb-3">
                  <img
                    src={pet.petimage_url || "https://placehold.co/400"}
                    alt={pet.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
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
        )}
      </div>

      {/* WIZARD MODAL */}
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
                {/* PRESETS */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase">
                    Category
                  </Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => applyPreset("food")}
                      className={`flex-1 p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        newRoutine.subType === "food"
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Utensils size={18} className="text-orange-500" />{" "}
                      <span className="text-[10px] font-bold text-gray-600">
                        Food
                      </span>
                    </button>
                    <button
                      onClick={() => applyPreset("walk")}
                      className={`flex-1 p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        newRoutine.subType === "activity"
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Footprints size={18} className="text-green-500" />{" "}
                      <span className="text-[10px] font-bold text-gray-600">
                        Activity
                      </span>
                    </button>
                    <button
                      onClick={() => applyPreset("meds")}
                      className={`flex-1 p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        newRoutine.subType === "pill"
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Pill size={18} className="text-purple-500" />{" "}
                      <span className="text-[10px] font-bold text-gray-600">
                        Pills
                      </span>
                    </button>
                    <button
                      onClick={() => applyPreset("gel")}
                      className={`flex-1 p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        newRoutine.subType === "liquid"
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Droplets size={18} className="text-blue-500" />{" "}
                      <span className="text-[10px] font-bold text-gray-600">
                        Gel/Liq
                      </span>
                    </button>
                  </div>
                </div>

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
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all shrink-0 ${
                          newRoutine.pet_id === pet.id
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                            : "border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-white overflow-hidden shadow-sm">
                          <img
                            src={pet.petimage_url || "https://placehold.co/100"}
                            alt={pet.name}
                            className="w-full h-full object-cover"
                          />
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
                        <Input
                          className="bg-gray-50"
                          value={newRoutine.unit}
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
                            ? "Serving (g)"
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
                      {["morning", "noon", "evening"].map((time) => {
                        const isSelected =
                          newRoutine.selected_times.includes(time);
                        return (
                          <button
                            key={time}
                            onClick={() => toggleTime(time)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                            }`}
                          >
                            {time.charAt(0).toUpperCase() + time.slice(1)}
                          </button>
                        );
                      })}
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
                            ? "Bag Weight (kg)"
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

// -----------------------------------------------------
// ⚡️ MAIN DASHBOARD SKELETON
// -----------------------------------------------------
function MainDashboardSkeleton() {
  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      <div className="px-8 pt-8 pb-4 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-10 w-48 rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-xl bg-white" />
          <Skeleton className="h-32 rounded-xl bg-white" />
          <Skeleton className="h-32 rounded-xl bg-white" />
          <Skeleton className="h-32 rounded-xl bg-white" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl bg-indigo-50/50 border border-indigo-100" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            <Skeleton className="h-20 w-64 rounded-2xl shrink-0 bg-white" />
            <Skeleton className="h-20 w-64 rounded-2xl shrink-0 bg-white" />
            <Skeleton className="h-20 w-64 rounded-2xl shrink-0 bg-white" />
          </div>
        </div>
      </div>
      <div className="flex-1 px-8 pb-8">
        <div className="flex justify-between mb-4 mt-2">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-64 rounded-2xl bg-white" />
          <Skeleton className="h-64 rounded-2xl bg-white" />
          <Skeleton className="h-64 rounded-2xl bg-white" />
          <Skeleton className="h-64 rounded-2xl bg-white" />
        </div>
      </div>
    </div>
  );
}
