import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { X, Dog, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EventRegistrationModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EventRegistrationModal({
  eventId,
  eventTitle,
  onClose,
  onSuccess,
}: EventRegistrationModalProps) {
  const { user } = useAuth();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  // Fetch User's Pets
  useEffect(() => {
    const fetchPets = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("pets")
        .select("id, name, species, petimage_url")
        .eq("owner_id", user.id);

      if (data) setPets(data);
      setLoading(false);
    };
    fetchPets();
  }, [user]);

  const handleRegister = async () => {
    if (!selectedPetId || !user) return;
    setRegistering(true);

    try {
      const { error } = await supabase.from("event_registrations").insert({
        event_id: eventId,
        user_id: user.id,
        pet_id: selectedPetId,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505")
          throw new Error("This pet is already registered!");
        throw error;
      }

      toast.success(`Registered for ${eventTitle}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to register");
    } finally {
      setRegistering(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Register for Event</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Select a pet to bring to{" "}
            <span className="font-semibold text-blue-600">{eventTitle}</span>:
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : pets.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-500">
                You haven't added any pets yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPetId === pet.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-100 hover:border-blue-200 bg-white"
                  }`}
                >
                  <div className="w-12 h-12 mx-auto bg-gray-200 rounded-full mb-2 overflow-hidden">
                    {pet.petimage_url ? (
                      <img
                        src={pet.petimage_url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Dog className="w-6 h-6 m-3 text-gray-400" />
                    )}
                  </div>
                  <p className="text-center font-bold text-sm text-gray-900 truncate">
                    {pet.name}
                  </p>
                  <p className="text-center text-xs text-gray-500">
                    {pet.species}
                  </p>

                  {selectedPetId === pet.id && (
                    <div className="absolute top-2 right-2 text-blue-600">
                      <CheckCircle2 size={16} className="fill-blue-100" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleRegister}
            disabled={!selectedPetId || registering}
            className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
          >
            {registering ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              "Confirm Registration"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
