import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Bone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/images/PawPal.svg";

// Type Definition
type PublicPet = {
  id: string;
  name: string;
  species: string;
  breed: string;
  color: string;
  sex: string;
  petimage_url: string | null;
  owner: {
    first_name: string;
    last_name: string;
    email: string;
    contact_number?: string;
  };
  vaccinations: { vaccine_name: string; status: string }[];
};

export default function PublicPetProfile() {
  const { petId } = useParams<{ petId: string }>();
  const [pet, setPet] = useState<PublicPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchPublicPet();
  }, [petId]);

  const fetchPublicPet = async () => {
    try {
      const { data, error } = await supabase
        .from("pets")
        .select(
          `
          id, name, species, breed, color, sex, petimage_url,
          owner:profiles(first_name, last_name, email, contact_number),
          vaccinations(vaccine_name, status)
        `
        )
        .eq("id", petId)
        .single();

      if (error) throw error;
      setPet(data as any);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <Bone className="text-gray-400 w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-blue-950">Pet Not Found</h2>
        <p className="text-gray-500 mt-2 max-w-xs">
          This profile may be private or the link is incorrect.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans">
      {/* Brand Header */}
      <div className="mb-6 animate-in slide-in-from-top-4 duration-700">
        <img
          src={logo}
          alt="PawPal"
          className="h-12 w-auto opacity-80 grayscale hover:grayscale-0 transition-all"
        />
      </div>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 overflow-hidden relative border border-white">
        {/* Urgent Banner */}
        <div className="bg-amber-400/10 p-4 text-center border-b border-amber-100">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">
            <AlertTriangle size={12} className="fill-amber-700" />
            Lost & Found ID
          </div>
        </div>

        {/* Pet Image Section */}
        <div className="relative mx-auto mt-6 w-40 h-40">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse" />
          <div className="w-full h-full rounded-full border-[6px] border-white shadow-lg overflow-hidden relative z-10 bg-gray-100">
            {pet.petimage_url ? (
              <img
                src={pet.petimage_url}
                className="w-full h-full object-cover"
                alt={pet.name}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-300">
                <Bone size={40} />
              </div>
            )}
          </div>
          {/* Verified Badge */}
          <div className="absolute bottom-1 right-1 z-20 bg-blue-600 text-white p-2 rounded-full border-4 border-white shadow-sm">
            <ShieldCheck size={16} />
          </div>
        </div>

        <div className="p-8 pt-6 text-center space-y-8">
          {/* Identity */}
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-blue-950 tracking-tight">
              {pet.name}
            </h1>
            <div className="inline-flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-gray-50 rounded-lg text-xs font-bold text-gray-500 border border-gray-100 uppercase tracking-wide">
                {pet.breed}
              </span>
              <span className="px-3 py-1 bg-gray-50 rounded-lg text-xs font-bold text-gray-500 border border-gray-100 uppercase tracking-wide">
                {pet.color}
              </span>
              <span className="px-3 py-1 bg-gray-50 rounded-lg text-xs font-bold text-gray-500 border border-gray-100 uppercase tracking-wide">
                {pet.sex}
              </span>
            </div>
          </div>

          {/* Owner Card */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Owned by {pet.owner.first_name}
            </p>

            <div className="space-y-3">
              {/* ✅ Call Button (Primary Action) */}
              {pet.owner.contact_number ? (
                <Button
                  asChild
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                >
                  <a href={`tel:${pet.owner.contact_number}`}>
                    <Phone className="mr-2 h-5 w-5" />
                    Call Owner
                  </a>
                </Button>
              ) : (
                <div className="p-3 bg-gray-100 rounded-xl text-xs text-gray-500 font-medium">
                  No phone number provided.
                </div>
              )}

              {/* Email Button (Secondary) */}
              <Button
                asChild
                variant="outline"
                className="w-full h-14 rounded-2xl border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white font-bold transition-all"
              >
                <a href={`mailto:${pet.owner.email}`}>
                  <Mail className="mr-2 h-5 w-5" />
                  Send Email
                </a>
              </Button>
            </div>
          </div>

          {/* Medical Badge */}
          {pet.vaccinations.some((v) =>
            v.vaccine_name.toLowerCase().includes("rabies")
          ) && (
            <div className="inline-flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
              <ShieldCheck size={12} />
              RABIES VACCINATED
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-medium">
            Powered by YFA PawPal • Digital Pet Identity
          </p>
        </div>
      </div>
    </div>
  );
}
