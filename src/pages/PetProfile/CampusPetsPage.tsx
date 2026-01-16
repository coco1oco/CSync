import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useFeedingRound } from "@/hooks/useFeedingRound";
import { differenceInDays, parseISO, addYears, isAfter } from "date-fns";
import {
  Building2,
  PawPrint,
  Search,
  MapPin,
  Utensils,
  CheckCircle2,
  Siren,
  Loader2,
  AlertTriangle,
  Syringe,
  Scissors,
  Activity,
  Plus,
  EyeOff,
  Eye,
  Filter,
  Stethoscope,
  ClipboardList,
  ThumbsUp,
  ArrowLeft,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IncidentPayload {
  petId: string;
  type: "injury" | "aggression" | "skin" | "sighting";
  note: string;
  severity?: string;
}

export default function CampusPetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = (user as any)?.role === "admin";

  // --- DATA FETCHING ---
  const { data: pets = [], isLoading } = useQuery({
    queryKey: ["campus-pets"],
    queryFn: async () => {
      // 1. Fetch Pets
      const { data: petsData, error: petsError } = await supabase
        .from("pets")
        .select("*")
        .eq("is_campus_pet", true)
        .order("name", { ascending: true });

      if (petsError) throw petsError;

      // 2. Fetch Vaccines (FIXED: valid_until -> next_due_date)
      const petIds = petsData.map((p) => p.id);
      const { data: vaxData } = await supabase
        .from("vaccinations")
        .select("pet_id, status, next_due_date") // ✅ Correct column name
        .in("pet_id", petIds)
        .eq("status", "completed");

      return petsData.map((pet) => ({
        ...pet,
        vaccinations: vaxData?.filter((v) => v.pet_id === pet.id) || [],
      }));
    },
  });

  const { mutate: logFeeding, isPending: isFeeding } = useFeedingRound();

  const { mutate: logIncident, isPending: isSubmittingIncident } = useMutation({
    mutationFn: async ({ petId, type, note, severity }: IncidentPayload) => {
      const now = new Date().toISOString();

      // 1. Determine New Status based on Report Type
      let newStatus = undefined;
      if (type === "sighting") newStatus = "healthy";
      if (type === "injury") newStatus = "injured";
      if (type === "skin") newStatus = "sick";
      if (type === "aggression") newStatus = "aggressive";

      // 2. Insert Incident
      const incidentPayload = {
        pet_id: petId,
        category: type,
        symptom: type === "sighting" ? "Sighting Log" : `${type} Report`,
        notes: note,
        severity: severity || "low",
        logged_by: user?.id,
        logged_at: now,
      };

      const { error: logError } = await supabase
        .from("pet_incidents")
        .insert(incidentPayload);
      if (logError) throw logError;

      // 3. Update Pet (Status + Last Seen)
      const { error: updateError } = await supabase
        .from("pets")
        .update({
          last_seen_at: now,
          status: newStatus, // ✅ Now updates to 'injured'/'sick' etc.
        })
        .eq("id", petId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Log recorded & Status updated");
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ["campus-pets"] });
    },
    onError: (err: any) => {
      console.error(err);
      toast.error("Failed to log. Check permissions.");
    },
  });

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLocation, setActiveLocation] = useState("All");
  const [isFeedingMode, setIsFeedingMode] = useState(false);
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(new Set());

  // Modals
  const [incidentModal, setIncidentModal] = useState<string | null>(null);
  const [medicalModal, setMedicalModal] = useState<any | null>(null);

  // 2-Step Reporting State
  const [reportType, setReportType] = useState<
    "injury" | "skin" | "aggression" | null
  >(null);
  const [reportSeverity, setReportSeverity] = useState("medium");
  const [reportNote, setReportNote] = useState("");

  const handleCloseModal = () => {
    setIncidentModal(null);
    setReportType(null);
    setReportSeverity("medium");
    setReportNote("");
  };

  // --- COMPUTED STATUS LOGIC ---
  const petsWithStatus = useMemo(() => {
    const today = new Date();
    return pets.map((pet) => {
      // Default to what's in DB (healthy, injured, sick, etc.)
      let computedStatus = pet.status || "healthy";

      // Override based on Time Logic
      let daysSinceSeen = 0;
      if (pet.last_seen_at) {
        daysSinceSeen = differenceInDays(today, parseISO(pet.last_seen_at));
        if (daysSinceSeen > 7) computedStatus = "missing";
        else if (daysSinceSeen > 3 && computedStatus !== "missing")
          computedStatus = "unseen";
      }

      // Vax Logic (FIXED: Uses next_due_date)
      const hasValidVax = pet.vaccinations?.some(
        (v: any) =>
          v.status === "completed" && isAfter(parseISO(v.next_due_date), today)
      );

      return { ...pet, computedStatus, daysSinceSeen, hasValidVax };
    });
  }, [pets]);

  const filteredPets = useMemo(() => {
    return petsWithStatus.filter((pet) => {
      const matchesSearch =
        pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pet.breed &&
          pet.breed.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLocation =
        activeLocation === "All" || pet.location === activeLocation;
      return matchesSearch && matchesLocation;
    });
  }, [petsWithStatus, searchQuery, activeLocation]);

  const stats = useMemo(() => {
    return {
      total: pets.length,
      missing: petsWithStatus.filter((p) => p.computedStatus === "missing")
        .length,
      unseen: petsWithStatus.filter((p) => p.computedStatus === "unseen")
        .length,
      alerts: petsWithStatus.filter((p) =>
        ["injured", "sick", "aggressive"].includes(p.status)
      ).length,
    };
  }, [petsWithStatus]);

  const handleFinishRound = () => {
    if (selectedPetIds.size === 0) return;
    logFeeding(
      { petIds: Array.from(selectedPetIds) },
      {
        onSuccess: () => {
          setIsFeedingMode(false);
          setSelectedPetIds(new Set());
        },
      }
    );
  };

  if (isLoading) return <CampusDashboardSkeleton />;

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 relative">
      {/* HEADER & FILTERS */}
      <div className="shrink-0 px-4 pt-4 lg:pt-8 lg:px-8 pb-4 bg-gray-50 z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-none">
                Campus Residents
              </h1>
              <p className="text-gray-500 text-sm font-medium mt-1">
                YFA Managed • CvSU Indang
              </p>
            </div>
          </div>

          <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm flex items-center self-start md:self-auto">
            <button
              onClick={() => navigate("/PetDashboard")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-gray-500 hover:text-blue-600 transition-all"
            >
              <PawPrint size={16} /> My Pets
            </button>
            <button
              disabled
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-blue-600 text-white shadow-md cursor-default"
            >
<<<<<<< HEAD
              <Building2 size={16} /> Campus Pets
=======
              <Building2 size={16} /> Campus Resident
>>>>>>> origin/defense
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {stats.total}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">
                Total
              </p>
              <p className="text-sm font-bold text-gray-900">Dogs</p>
            </div>
          </div>
          <div
            className={cn(
              "p-4 rounded-xl border shadow-sm flex items-center gap-3",
              stats.missing > 0
                ? "bg-red-50 border-red-200"
                : "bg-white border-gray-200"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                stats.missing > 0
                  ? "bg-red-200 text-red-700 animate-pulse"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              <EyeOff size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">
                Missing
              </p>
              <p
                className={cn(
                  "text-xl font-black",
                  stats.missing > 0 ? "text-red-600" : "text-gray-900"
                )}
              >
                {stats.missing}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "p-4 rounded-xl border shadow-sm flex items-center gap-3",
              stats.unseen > 0
                ? "bg-yellow-50 border-yellow-200"
                : "bg-white border-gray-200"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">
                Needs Check
              </p>
              <p className="text-xl font-black text-gray-900">{stats.unseen}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">
                Alerts
              </p>
              <p className="text-xl font-black text-gray-900">{stats.alerts}</p>
            </div>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                className="pl-9 h-11 rounded-2xl bg-white border-gray-200 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isAdmin && (
              <div className="flex gap-2 w-full md:w-auto">
                {!isFeedingMode ? (
                  <>
                    <Button
                      onClick={() => navigate("/PetDashboard/new?mode=campus")}
                      className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Pet
                    </Button>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md"
                      onClick={() => setIsFeedingMode(true)}
                    >
                      <Utensils className="w-4 h-4 mr-2" /> Start Feeding
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setIsFeedingMode(false)}
                      className="text-gray-500"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md gap-2"
                      onClick={handleFinishRound}
                      disabled={selectedPetIds.size === 0 || isFeeding}
                    >
                      {isFeeding ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      Log Round ({selectedPetIds.size})
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {["All", "Main Gate", "CVSU Park", "Engineering", "Hostel"].map(
              (loc) => (
                <button
                  key={loc}
                  onClick={() => setActiveLocation(loc)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                    activeLocation === loc
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  )}
                >
                  {loc}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 5. PET GRID */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPets.map((pet) => {
            const isSelected = selectedPetIds.has(pet.id);
            const isMissing = pet.computedStatus === "missing";

            return (
              <div
                key={pet.id}
                onClick={() =>
                  isFeedingMode && isAdmin
                    ? toggleSelection(pet.id, selectedPetIds, setSelectedPetIds)
                    : !isFeedingMode && navigate(`/PetDashboard/${pet.id}`)
                }
                className={cn(
                  "bg-white rounded-2xl p-3 shadow-sm border transition-all duration-300 relative group flex flex-col",
                  isMissing
                    ? "border-red-300 ring-4 ring-red-50"
                    : "border-gray-100",
                  isFeedingMode && isSelected
                    ? "ring-2 ring-green-500 bg-green-50/20"
                    : "hover:shadow-lg hover:-translate-y-1"
                )}
              >
                {/* STATUS BADGE */}
                <div
                  className={cn(
                    "absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm",
                    pet.computedStatus === "healthy"
                      ? "bg-green-100 text-green-700"
                      : pet.computedStatus === "injured"
                      ? "bg-red-100 text-red-700"
                      : pet.computedStatus === "sick"
                      ? "bg-orange-100 text-orange-700"
                      : pet.computedStatus === "aggressive"
                      ? "bg-red-600 text-white"
                      : pet.computedStatus === "missing"
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-yellow-100 text-yellow-800"
                  )}
                >
                  {pet.computedStatus === "missing" && <Siren size={10} />}
                  {pet.computedStatus}
                </div>

                <div className="aspect-[4/3] rounded-xl bg-gray-100 overflow-hidden relative mb-3">
                  <img
                    src={pet.petimage_url || "https://placehold.co/400"}
                    className="w-full h-full object-cover"
                  />
                  {isFeedingMode && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all",
                          isSelected
                            ? "bg-green-500 border-white text-white"
                            : "bg-white/50 border-white text-transparent"
                        )}
                      >
                        <CheckCircle2 size={24} />
                      </div>
                    </div>
                  )}
                </div>

                {/* INFO */}
                <div className="flex gap-2 mb-3">
                  <div
                    className={cn(
                      "flex-1 py-1 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border",
                      pet.spayed_neutered
                        ? "bg-blue-50 border-blue-100 text-blue-700"
                        : "bg-gray-50 border-gray-100 text-gray-400"
                    )}
                  >
                    <Scissors size={12} className="mb-0.5" />
                    {pet.spayed_neutered ? "KAPON" : "INTACT"}
                  </div>
                  <div
                    className={cn(
                      "flex-1 py-1 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border",
                      pet.hasValidVax
                        ? "bg-green-50 border-green-100 text-green-700"
                        : "bg-red-50 border-red-100 text-red-600"
                    )}
                  >
                    <Syringe size={12} className="mb-0.5" />
                    {pet.hasValidVax ? "VAX OK" : "NO VAX"}
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">
                        {pet.name}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin size={10} /> {pet.location || "Roaming"}
                      </p>
                    </div>
                  </div>

                  {/* ADMIN ACTIONS */}
                  {isAdmin && !isFeedingMode && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {/* 1. LOG ACTIVITY (Opens Option Box) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIncidentModal(pet.id);
                        }}
                        className="h-9 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-bold text-xs gap-1.5"
                      >
                        <ClipboardList size={14} /> Log Activity
                      </Button>

                      {/* 2. MEDICAL (Opens Medical Modal) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMedicalModal(pet);
                        }}
                        className="h-9 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-xs gap-1.5"
                      >
                        <Stethoscope size={14} /> Medical
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-STEP ACTIVITY MODAL */}
      <Dialog open={!!incidentModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reportType
                ? `Report ${
                    reportType.charAt(0).toUpperCase() + reportType.slice(1)
                  }`
                : "Log Activity"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* VIEW 1: SELECTION MENU */}
            {!reportType ? (
              <>
                {/* ALL GOOD (Immediate) */}
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col gap-1 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 transition-all border-2"
                  onClick={() =>
                    logIncident({
                      petId: incidentModal!,
                      type: "sighting",
                      note: "Spotted on campus, looks healthy.",
                    })
                  }
                  disabled={isSubmittingIncident}
                >
                  {isSubmittingIncident ? (
                    <Loader2 className="animate-spin w-8 h-8" />
                  ) : (
                    <ThumbsUp size={32} />
                  )}
                  <span className="text-sm font-bold">All Good (Seen)</span>
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400 font-bold">
                      Or Report Issue
                    </span>
                  </div>
                </div>

                {/* ISSUE BUTTONS (Go to View 2) */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all border"
                    onClick={() => setReportType("injury")}
                  >
                    <Activity size={24} className="text-red-500" />
                    <span className="text-xs font-bold">Injury</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all border"
                    onClick={() => setReportType("skin")}
                  >
                    <AlertTriangle size={24} className="text-orange-500" />
                    <span className="text-xs font-bold">Skin</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all border"
                    onClick={() => setReportType("aggression")}
                  >
                    <Siren size={24} className="text-red-600" />
                    <span className="text-xs font-bold">Aggression</span>
                  </Button>
                </div>
              </>
            ) : (
              /* VIEW 2: DETAILS FORM */
              <div className="space-y-4 animate-in slide-in-from-right-4 fade-in">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-500 uppercase">
                      Severity Level
                    </Label>
                  </div>
                  <Select
                    value={reportSeverity}
                    onValueChange={setReportSeverity}
                  >
                    <SelectTrigger className="w-full font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🟢 Low (Minor issue)</SelectItem>
                      <SelectItem value="medium">
                        🟠 Medium (Needs attention)
                      </SelectItem>
                      <SelectItem value="high">
                        🔴 High (Urgent/Emergency)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold text-gray-500 uppercase">
                    Description
                  </Label>
                  <Textarea
                    placeholder="Describe the issue..."
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    className="resize-none h-24 bg-gray-50"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setReportType(null)}
                    className="text-gray-500"
                  >
                    <ArrowLeft size={16} className="mr-2" /> Back
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
                    onClick={() =>
                      logIncident({
                        petId: incidentModal!,
                        type: reportType,
                        severity: reportSeverity,
                        note: reportNote,
                      })
                    }
                    disabled={isSubmittingIncident}
                  >
                    {isSubmittingIncident ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Save size={16} className="mr-2" />
                    )}
                    Submit Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MEDICAL MODAL (Same as before) */}
      {medicalModal && (
        <MedicalUpdateModal
          pet={medicalModal}
          onClose={() => setMedicalModal(null)}
          onSuccess={() => {
            setMedicalModal(null);
            queryClient.invalidateQueries({ queryKey: ["campus-pets"] });
          }}
        />
      )}
    </div>
  );
}

// ... Helpers remain unchanged
function MedicalUpdateModal({ pet, onClose, onSuccess }: any) {
  const { user } = useAuth();
  const [isSpayed, setIsSpayed] = useState(pet.spayed_neutered || false);
  const [loading, setLoading] = useState(false);
  const [vaxName, setVaxName] = useState("");

  const handleSaveStatus = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("pets")
        .update({ spayed_neutered: isSpayed })
        .eq("id", pet.id);
      if (error) throw error;
      toast.success("Updated!");
      onSuccess();
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddVax = async () => {
    if (!vaxName) return;
    setLoading(true);
    try {
      const today = new Date();
      const nextDue = addYears(today, 1);
      const ownerId = pet.owner_id || user?.id;

      const { error } = await supabase.from("vaccinations").insert({
        pet_id: pet.id,
        vaccine_name: vaxName,
        last_date: today.toISOString(),
        next_due_date: nextDue.toISOString(),
        status: "completed",
        owner_id: ownerId,
      });
      if (error) throw error;
      toast.success("Vaccine added!");
      setVaxName("");
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add vaccine");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Medical Quick Update: {pet.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
            <div className="space-y-0.5">
              <Label>Spayed / Neutered</Label>
              <p className="text-xs text-gray-500">Is this dog fixed?</p>
            </div>
            <div className="flex gap-3 items-center">
              <Switch checked={isSpayed} onCheckedChange={setIsSpayed} />
              <Button size="sm" onClick={handleSaveStatus} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <Label>Add Vaccination</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Vaccine Name (e.g. 5-in-1)"
                value={vaxName}
                onChange={(e) => setVaxName(e.target.value)}
              />
              <Button onClick={handleAddVax} disabled={!vaxName || loading}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              * Auto-sets due date to 1 year from now.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function toggleSelection(id: string, current: Set<string>, setFn: any) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setFn(next);
}

function CampusDashboardSkeleton() {
  return (
    <div className="w-full min-h-screen p-8 space-y-8">
      <Skeleton className="h-12 w-64 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
