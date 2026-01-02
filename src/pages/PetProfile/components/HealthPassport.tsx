import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useVaccinations } from "@/lib/useVaccinations";
import { format, isAfter, isBefore } from "date-fns";
import {
  ShieldCheck,
  AlertTriangle,
  Syringe,
  Activity,
  Calendar,
  Weight,
  FileBadge,
  QrCode,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthPassportProps {
  pet: any;
  userId?: string;
}

export default function HealthPassport({ pet, userId }: HealthPassportProps) {
  const { vaccinations, loading: vaxLoading } = useVaccinations(pet.id, userId);

  // ✅ NEW: Weight State
  const [weight, setWeight] = useState<number | null>(null);

  useEffect(() => {
    const fetchWeight = async () => {
      const { data } = await supabase
        .from("pet_weights")
        .select("weight")
        .eq("pet_id", pet.id)
        .order("date_logged", { ascending: false })
        .limit(1)
        .single();
      if (data) setWeight(data.weight);
    };
    fetchWeight();
  }, [pet.id]);

  const validVax = vaccinations.filter(
    (v) =>
      v.status === "completed" ||
      (v.next_due_date && isAfter(new Date(v.next_due_date), new Date()))
  );
  const overdueVax = vaccinations.filter(
    (v) =>
      v.status === "overdue" ||
      (v.next_due_date && isBefore(new Date(v.next_due_date), new Date()))
  );

  if (vaxLoading) return <PassportSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* --- THE PASSPORT CARD --- */}
      <div className="relative w-full bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-xl print:shadow-none">
        {/* Holographic Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white p-6 relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 opacity-80 mb-1">
                <ShieldCheck size={16} />
                <span className="text-xs font-bold tracking-widest uppercase">
                  Official Health Record
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                {pet.name}
              </h2>
              <p className="text-blue-200 text-sm font-mono mt-0.5">
                ID: {pet.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
              <QrCode className="w-8 h-8 text-white/90" />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>

        {/* Vitals Row */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/50">
          <div className="p-4 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">
              Species
            </span>
            <span className="font-bold text-gray-700 capitalize">
              {pet.species || "Unknown"}
            </span>
          </div>
          <div className="p-4 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">
              Sex
            </span>
            <span className="font-bold text-gray-700 capitalize">
              {pet.sex || "-"}
            </span>
          </div>
          <div className="p-4 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">
              DOB
            </span>
            <span className="font-bold text-gray-700">
              {pet.dob ? format(new Date(pet.dob), "MMM yyyy") : "-"}
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* LEFT: Active Immunizations */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              Valid Immunizations
            </h3>
            {validVax.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400">
                  No active records found.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {validVax.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 bg-green-50/50 border border-green-100 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-green-100 text-green-700 rounded-full">
                        <Syringe size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {v.vaccine_name}
                        </p>
                        <p className="text-[10px] text-green-700 font-medium">
                          Expires:{" "}
                          {format(new Date(v.next_due_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <FileBadge size={16} className="text-green-300" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Alerts & Conditions */}
          <div>
            {overdueVax.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  Action Required
                </h3>
                <div className="bg-red-50 border border-red-100 rounded-xl overflow-hidden">
                  {overdueVax.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 border-b border-red-100 last:border-0 flex justify-between items-center"
                    >
                      <span className="text-sm font-medium text-red-900">
                        {v.vaccine_name}
                      </span>
                      <span className="text-[10px] font-bold bg-red-200 text-red-800 px-2 py-1 rounded-md">
                        EXPIRED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PHYSICAL STATS */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-blue-600" />
                Physical Attributes
              </h3>
              <div className="bg-white border border-gray-100 rounded-xl p-1 shadow-sm grid grid-cols-2 gap-1">
                <div className="p-3 bg-gray-50 rounded-lg flex flex-col justify-between">
                  <Weight className="w-4 h-4 text-gray-400 mb-2" />
                  <div>
                    {/* ✅ UPDATED: Shows real weight */}
                    <span className="text-xl font-black text-gray-900">
                      {weight ?? "--"}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">kg</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                    Weight
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex flex-col justify-between">
                  <Calendar className="w-4 h-4 text-gray-400 mb-2" />
                  <div>
                    <span className="text-xl font-black text-gray-900">
                      {pet.dob
                        ? new Date().getFullYear() -
                          new Date(pet.dob).getFullYear()
                        : "-"}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">yrs</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                    Age
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-400">
          This digital record is generated based on logs in PawPal. Always
          consult your vet for official certifications.
        </p>
      </div>
    </div>
  );
}

function PassportSkeleton() {
  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden border border-gray-100 h-96 animate-pulse">
      <div className="bg-gray-200 h-32 w-full" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 gap-8">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
