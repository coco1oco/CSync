import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus,
  Dog,
  PawPrint,
  Building2,
  Syringe,
  CalendarClock,
  ChevronRight,
  Pill,
  AlertCircle,
  CheckCircle2,
  X,
  Flame, // Added for "Streak" or "Hot" status if needed later
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input"; // Ensure you have this or use standard input
import { Label } from "@/components/ui/label"; // Ensure you have this
import type { Medication } from "@/types";

export default function MainPetProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"personal" | "campus">("personal");

  // --- STATS STATE ---
  const [stats, setStats] = useState({
    vaccinesDue: 0,
    dailyNeeds: 0,
    upcomingVisits: 0,
    urgentPets: [] as any[],
  });

  // --- QUICK LOG (MEDS) STATE ---
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [newMed, setNewMed] = useState({
    name: "",
    current_stock: 30,
    dosage_per_use: 1,
    low_stock_threshold: 5,
    unit: "pills",
    pet_id: "",
  });

  const { pets, loading } = usePets(user?.id, activeTab);
  const isAdmin = (user as any)?.role === "admin";

  // 1. FETCH STATS & MEDS
  useEffect(() => {
    if (!user || activeTab !== "personal") return;

    const fetchData = async () => {
      try {
        const todayStr = new Date().toISOString();

        // A. Existing Stats Logic
        const { data: vax } = await supabase
          .from("vaccinations")
          .select("id")
          .eq("owner_id", user.id)
          .neq("status", "completed");

        const { data: tasks } = await supabase
          .from("pet_tasks")
          .select("id, title, pet_id, pets(name, petimage_url)")
          .eq("owner_id", user.id)
          .eq("completed", false)
          .lte("due_date", todayStr);

        const { data: visits } = await supabase
          .from("schedules")
          .select("id")
          .eq("owner_id", user.id)
          .eq("status", "pending");

        // B. Fetch Medications (Inventory)
        // We join 'pets' to display the avatar on the button
        const { data: medsData } = await supabase
          .from("medications")
          .select("*, pets(name, petimage_url)")
          .eq("owner_id", user.id)
          .order("current_stock", { ascending: true }); // Low stock first

        setMedications((medsData as Medication[]) || []);

        // C. Urgent Logic
        const urgentPetIds = new Set(tasks?.map((m: any) => m.pet_id));
        const urgentPetsList = pets.filter((p) => urgentPetIds.has(p.id));

        setStats({
          vaccinesDue: vax?.length || 0,
          dailyNeeds: tasks?.length || 0,
          upcomingVisits: visits?.length || 0,
          urgentPets: urgentPetsList,
        });
      } catch (err) {
        console.error(err);
      }
    };

    if (pets.length > 0) fetchData();
  }, [user, activeTab, pets]);

  // --- HANDLER: Quick Log Logic ---
  const handleQuickLog = async (med: Medication, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to pet profile if wrapped

    // 1. Optimistic Update
    const originalMeds = [...medications];
    const updatedStock = med.current_stock - med.dosage_per_use;

    if (updatedStock < 0) {
      alert("Out of stock! Please restock first.");
      return;
    }

    setMedications((prev) =>
      prev.map((m) =>
        m.id === med.id ? { ...m, current_stock: updatedStock } : m
      )
    );

    try {
      // 2. DB Transactions
      await Promise.all([
        supabase.from("medication_logs").insert({
          medication_id: med.id,
          pet_id: med.pet_id,
          dosage_taken: med.dosage_per_use,
          logged_at: new Date().toISOString(),
        }),
        supabase
          .from("medications")
          .update({ current_stock: updatedStock })
          .eq("id", med.id),
      ]);

      // Optional: Trigger a success toast here
    } catch (err) {
      setMedications(originalMeds); // Revert on error
      console.error("Log failed", err);
    }
  };

  // --- HANDLER: Add New Routine ---
  const handleAddMedication = async () => {
    if (!user || !newMed.pet_id || !newMed.name) return;

    try {
      const { data, error } = await supabase
        .from("medications")
        .insert({
          owner_id: user.id,
          pet_id: newMed.pet_id,
          name: newMed.name,
          current_stock: newMed.current_stock,
          dosage_per_use: newMed.dosage_per_use,
          low_stock_threshold: newMed.low_stock_threshold,
          unit: newMed.unit,
        })
        .select("*, pets(name, petimage_url)")
        .single();

      if (error) throw error;

      if (data) {
        setMedications((prev) => [...prev, data as Medication]);
        setIsAddMedOpen(false);
        setNewMed({ ...newMed, name: "", current_stock: 30 }); // Reset partial
      }
    } catch (err) {
      console.error("Error adding med:", err);
      alert("Failed to add routine item.");
    }
  };

  // --- SKELETON LOADING ---
  if (loading) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-50">
        <div className="shrink-0 px-4 pt-4 lg:pt-8 lg:px-8 pb-4 bg-gray-50 flex flex-col gap-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 relative">
      {/* 1. HEADER SECTION */}
      <div className="shrink-0 px-4 pt-4 lg:pt-8 lg:px-8 pb-4 bg-gray-50 z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Pet Dashboard
            </h1>
            <p className="text-gray-500 text-sm">
              Overview of your furry family.
            </p>
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

        {/* 2. STATS & QUICK LOGS (Personal Only) */}
        {activeTab === "personal" && pets.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
            {/* A. The Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Total Pets */}
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

              {/* Daily Needs */}
              <div
                className={`p-3 md:p-4 rounded-xl border shadow-sm flex items-center gap-3 relative overflow-hidden transition-all ${
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
                  <p
                    className={`text-[10px] font-bold uppercase ${
                      stats.dailyNeeds > 0 ? "text-red-400" : "text-gray-400"
                    }`}
                  >
                    Daily Needs
                  </p>
                  <p
                    className={`text-xl font-black ${
                      stats.dailyNeeds > 0 ? "text-red-900" : "text-gray-900"
                    }`}
                  >
                    {stats.dailyNeeds}
                  </p>
                </div>
              </div>

              {/* Vaccines */}
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

              {/* Visits */}
              <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                  <CalendarClock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Visits
                  </p>
                  <p className="text-xl font-black text-gray-900">
                    {stats.upcomingVisits}
                  </p>
                </div>
              </div>
            </div>

            {/* B. ✨ NEW: Quick Actions Strip (Horizontal Scroll) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Quick Log
                </h2>
                <button
                  onClick={() => {
                    if (pets.length > 0)
                      setNewMed((prev) => ({ ...prev, pet_id: pets[0].id }));
                    setIsAddMedOpen(true);
                  }}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Routine
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide snap-x">
                {medications.length === 0 ? (
                  <div
                    onClick={() => setIsAddMedOpen(true)}
                    className="snap-center shrink-0 w-40 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 cursor-pointer hover:bg-white hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Add Item</span>
                  </div>
                ) : (
                  medications.map((med) => {
                    const isLow = med.current_stock <= med.low_stock_threshold;
                    return (
                      <div
                        key={med.id}
                        onClick={(e) => handleQuickLog(med, e)}
                        className={`relative snap-center shrink-0 w-52 p-3 rounded-xl border shadow-sm transition-all active:scale-95 cursor-pointer flex gap-3 items-center group
                                        ${
                                          isLow
                                            ? "bg-red-50 border-red-200"
                                            : "bg-white border-gray-200 hover:border-blue-300"
                                        }
                                    `}
                      >
                        {/* Pet Avatar Indicator */}
                        <div className="shrink-0 w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-white shadow-sm">
                          {med.pets?.petimage_url ? (
                            <img
                              src={med.pets.petimage_url}
                              alt={med.pets.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                              <Dog size={16} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-gray-900 text-sm truncate">
                              {med.name}
                            </h3>
                            {isLow && (
                              <span className="text-[9px] font-black uppercase text-red-600 bg-red-100 px-1.5 rounded-full">
                                Low
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-gray-500 truncate">
                              {med.current_stock} {med.unit} left
                            </p>
                          </div>
                        </div>

                        {/* Hover Action */}
                        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-blue-600 text-white p-1 rounded-full shadow-md">
                            <CheckCircle2 size={12} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. CONTENT AREA (Existing Pet Cards) */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 lg:pb-8">
        {/* Header for Cards */}
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
              <Plus className="w-4 h-4" />
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
                  {pet.petimage_url ? (
                    <img
                      src={pet.petimage_url}
                      alt={pet.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Dog className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  {activeTab === "personal" &&
                    stats.urgentPets.some((p) => p.id === pet.id) && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-pulse">
                        Needs Care
                      </div>
                    )}
                </div>
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {pet.name}
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{pet.species || "Pet"}</span>
                    </div>
                  </div>
                  <div className="p-1.5 bg-gray-50 rounded-full text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- ADD MEDICATION MODAL --- */}
      {isAddMedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                Add Routine Item
              </h2>
              <button
                onClick={() => setIsAddMedOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Item Name</Label>
                <Input
                  placeholder="e.g., Heartgard, Vitamin C"
                  value={newMed.name}
                  onChange={(e) =>
                    setNewMed({ ...newMed, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Current Stock</Label>
                  <Input
                    type="number"
                    value={newMed.current_stock}
                    onChange={(e) =>
                      setNewMed({
                        ...newMed,
                        current_stock: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    placeholder="pills, ml"
                    value={newMed.unit}
                    onChange={(e) =>
                      setNewMed({ ...newMed, unit: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Dose Size</Label>
                  <Input
                    type="number"
                    value={newMed.dosage_per_use}
                    onChange={(e) =>
                      setNewMed({
                        ...newMed,
                        dosage_per_use: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Alert At</Label>
                  <Input
                    type="number"
                    value={newMed.low_stock_threshold}
                    onChange={(e) =>
                      setNewMed({
                        ...newMed,
                        low_stock_threshold: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>For which pet?</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md text-sm bg-white"
                  value={newMed.pet_id}
                  onChange={(e) =>
                    setNewMed({ ...newMed, pet_id: e.target.value })
                  }
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 font-bold text-md mt-2"
              onClick={handleAddMedication}
              disabled={!newMed.name || !newMed.pet_id}
            >
              Save & Start Tracking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
