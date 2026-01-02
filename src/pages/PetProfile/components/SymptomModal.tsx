import { useState, useEffect } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SymptomModalProps {
  pets: any[]; // <--- 1. NEW PROP
  onSave: (
    petId: string,
    symptom: string,
    category: string,
    severity: string
  ) => Promise<void>;
  onClose: () => void;
}

const SYMPTOMS = [
  { icon: "🤮", label: "Vomiting", cat: "digestive" },
  { icon: "💩", label: "Diarrhea", cat: "digestive" },
  { icon: "🤕", label: "Limping", cat: "mobility" },
  { icon: "👂", label: "Scratching", cat: "skin" },
  { icon: "💤", label: "Lethargy", cat: "mood" },
  { icon: "🤧", label: "Coughing", cat: "respiratory" },
  { icon: "❌", label: "No Appetite", cat: "digestive" },
  { icon: "🩸", label: "Bleeding", cat: "injury" },
];

export default function SymptomModal({
  pets, // <--- Receive pets here
  onSave,
  onClose,
}: SymptomModalProps) {
  // Removed internal state for 'pets' since it comes from props now

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [severity, setSeverity] = useState("mild");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select if there is only one pet
  useEffect(() => {
    if (pets.length === 1 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets]);

  const handleSubmit = async () => {
    if (selected && selectedPetId && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onSave(selectedPetId, selected.label, selected.cat, severity);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-red-600 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" /> Log Incident
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. PET SELECTOR */}
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-2 block">
            Who is sick?
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {pets.map((pet) => (
              <button
                key={pet.id}
                onClick={() => setSelectedPetId(pet.id)}
                disabled={isSubmitting}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all shrink-0
                    ${
                      selectedPetId === pet.id
                        ? "border-red-600 bg-red-50 text-red-700 font-bold shadow-sm"
                        : "border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }
                  `}
              >
                <div className="w-6 h-6 rounded-full bg-white overflow-hidden shadow-sm border border-gray-100">
                  <img
                    src={
                      pet.petimage_url ||
                      "https://placehold.co/100x100?text=Pet"
                    }
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs">{pet.name}</span>
              </button>
            ))}

            {pets.length === 0 && (
              <p className="text-sm text-gray-500 italic">No pets found.</p>
            )}
          </div>
        </div>

        {/* 2. SYMPTOM GRID */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {SYMPTOMS.map((s) => (
            <button
              key={s.label}
              onClick={() => setSelected(s)}
              disabled={isSubmitting}
              className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                selected?.label === s.label
                  ? "border-red-500 bg-red-50 shadow-sm"
                  : "border-transparent bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <span className="text-3xl">{s.icon}</span>
              <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {/* 3. SEVERITY TOGGLE */}
        {selected && (
          <div className="mb-6 animate-in slide-in-from-top-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">
              Severity
            </label>
            <div className="flex bg-gray-100 p-1 rounded-xl mt-2">
              {["mild", "moderate", "severe"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverity(sev)}
                  disabled={isSubmitting}
                  className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all ${
                    severity === sev
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!selected || !selectedPetId || isSubmitting}
          className="w-full h-12 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-xl font-bold shadow-red-200 shadow-lg transition-all"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !selectedPetId ? (
            "Select a Pet"
          ) : (
            "Save Log"
          )}
        </Button>
      </div>
    </div>
  );
}
