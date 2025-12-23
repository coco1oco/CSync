import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { X, Loader2, MapPin, Calendar, CheckCircle2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FailedImageIcon from "@/assets/FailedImage.svg";

interface EventRegistrationModalProps {
  eventId: string;
  eventTitle: string;
  eventLocation?: string;
  eventDate?: string;
  eventType?: string; // ✅ NEW PROP
  onClose: () => void;
  onSuccess: () => void;
}

interface Pet {
  id: string;
  name: string;
  petimage_url: string | null;
  species: string;
}

export function EventRegistrationModal({
  eventId,
  eventTitle,
  eventLocation,
  eventDate,
  eventType,
  onClose,
  onSuccess,
}: EventRegistrationModalProps) {
  const { user } = useAuth();

  // State
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPets, setFetchingPets] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  // ✅ CHECK: Is this explicitly a pet event?
  const isPetEvent = eventType === "pet";

  // 1. Fetch Pets (Only if it's a pet event)
  useEffect(() => {
    const fetchPets = async () => {
      if (!user) return;

      // Optimization: Don't fetch pets for general assemblies
      if (!isPetEvent) {
        setFetchingPets(false);
        return;
      }

      const { data, error } = await supabase
        .from("pets")
        .select("id, name, petimage_url, species")
        .eq("owner_id", user.id);

      if (!error && data) {
        setPets(data);
      }
      setFetchingPets(false);
    };
    fetchPets();
  }, [user, isPetEvent]);

  // 2. Handle Registration
  const handleRegister = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("You are already registered!");
        onSuccess();
        onClose();
        return;
      }

      const { error } = await supabase.from("event_registrations").insert({
        event_id: eventId,
        user_id: user.id,
        pet_id: selectedPetId, // Will be null for non-pet events
        status: "approved",
      });

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to register");
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {isSuccess && (
          <div className="absolute inset-0 bg-green-500 z-10 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg text-green-600">
              <CheckCircle2 size={32} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black mb-1">You're In!</h2>
            <p className="font-medium opacity-90">See you there!</p>
          </div>
        )}

        <div
          className={`h-32 relative p-6 flex flex-col justify-end text-white ${
            isPetEvent
              ? "bg-gradient-to-br from-orange-500 to-red-500"
              : "bg-gradient-to-br from-blue-600 to-purple-600"
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
          <h2 className="font-bold text-xl leading-tight mb-1">{eventTitle}</h2>
          <div className="flex items-center gap-3 text-xs font-medium opacity-90">
            {eventDate && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {eventDate}
              </span>
            )}
            {eventLocation && (
              <span className="flex items-center gap-1 truncate max-w-[150px]">
                <MapPin size={12} /> {eventLocation}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* ✅ CONDITIONAL UI BASED ON EVENT TYPE */}
          {isPetEvent ? (
            <>
              <p className="text-sm font-bold text-gray-500 uppercase mb-4">
                Who is attending?
              </p>
              {fetchingPets ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-gray-300" />
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedPetId(null)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      selectedPetId === null
                        ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                        : "border-gray-100 hover:border-orange-200"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      <User size={20} />
                    </div>
                    <div className="text-left">
                      <p
                        className={`font-bold text-sm ${
                          selectedPetId === null
                            ? "text-orange-700"
                            : "text-gray-900"
                        }`}
                      >
                        Just Me
                      </p>
                      <p className="text-xs text-gray-500">No pets this time</p>
                    </div>
                    {selectedPetId === null && (
                      <CheckCircle2 className="ml-auto text-orange-600 w-5 h-5" />
                    )}
                  </button>

                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      onClick={() => setSelectedPetId(pet.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        selectedPetId === pet.id
                          ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                          : "border-gray-100 hover:border-orange-200"
                      }`}
                    >
                      <img
                        src={pet.petimage_url || FailedImageIcon}
                        className="w-10 h-10 rounded-full bg-gray-200 object-cover"
                      />
                      <div className="text-left">
                        <p
                          className={`font-bold text-sm ${
                            selectedPetId === pet.id
                              ? "text-orange-700"
                              : "text-gray-900"
                          }`}
                        >
                          Me & {pet.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {pet.species}
                        </p>
                      </div>
                      {selectedPetId === pet.id && (
                        <CheckCircle2 className="ml-auto text-orange-600 w-5 h-5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            // 🚫 NON-PET EVENT UI (Simpler)
            <div className="text-center py-2 space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400 border border-gray-100">
                <User size={40} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  Confirm Registration
                </p>
                <p className="text-sm text-gray-500 px-4">
                  You are registering as{" "}
                  <span className="font-bold text-black">
                    {user?.first_name} {user?.last_name}
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Button
              onClick={handleRegister}
              disabled={loading}
              className={`w-full h-12 text-base font-bold text-white rounded-xl shadow-lg transition-all ${
                isPetEvent
                  ? "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                  : "bg-black hover:bg-gray-800 shadow-gray-200"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Complete Registration"
              )}
            </Button>
            <p className="text-[10px] text-center text-gray-400 mt-3">
              By registering, you agree to the event rules.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
