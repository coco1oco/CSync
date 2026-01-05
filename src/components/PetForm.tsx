import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Trash2,
  Camera,
  Info,
  Scissors,
  Activity,
  AlertTriangle,
} from "lucide-react"; // Added icons
import { Switch } from "@/components/ui/switch"; // Ensure you have this or use a checkbox

// Shared Breed Data (Kept the same)
const BREED_DATA: Record<string, string[]> = {
  Dog: [
    "Aspin (Askal)",
    "Beagle",
    "Bulldog",
    "Chihuahua",
    "Dachshund",
    "German Shepherd",
    "Golden Retriever",
    "Labrador Retriever",
    "Pomeranian",
    "Poodle",
    "Pug",
    "Shih Tzu",
    "Siberian Husky",
    "Mixed Breed",
  ],
  Cat: [
    "Puspin (Domestic Short Hair)",
    "Persian",
    "Siamese",
    "Maine Coon",
    "British Shorthair",
    "Ragdoll",
    "Bengal",
    "Scottish Fold",
    "Sphynx",
    "Mixed Breed",
  ],
  Bird: ["Parakeet", "Cockatiel", "Lovebird", "Canary", "Parrot", "Finch"],
  Rabbit: ["Netherland Dwarf", "Holland Lop", "Lionhead", "Mini Rex"],
};

const CAMPUS_LOCATIONS = [
  "Main Gate",
  "CVSU Park",
  "Engineering",
  "Hostel",
  "Old Market",
  "Roaming",
];

export interface PetFormData {
  name: string;
  species: string;
  breed: string;
  color: string;
  sex: string;
  dob: string;
  location: string;
  microchip_id: string;
  imageFile?: File | null;
  petimage_url?: string;
  // ✅ Added these for Campus Pets
  spayed_neutered?: boolean;
  status?: string;
}

interface PetFormProps {
  initialData?: Partial<PetFormData>;
  onSubmit: (data: PetFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  isCampusMode?: boolean; // ✅ Added prop
}

export default function PetForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitLabel,
  isCampusMode = false,
}: PetFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<PetFormData>({
    name: "",
    species: "",
    breed: "",
    color: "",
    sex: "",
    dob: "",
    location: "",
    microchip_id: "",
    petimage_url: "",
    spayed_neutered: false,
    status: "healthy",
    ...initialData,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.petimage_url || null
  );
  const [availableBreeds, setAvailableBreeds] = useState<string[]>([]);

  useEffect(() => {
    if (formData.species && BREED_DATA[formData.species]) {
      setAvailableBreeds(BREED_DATA[formData.species]);
    } else {
      setAvailableBreeds([]);
    }
  }, [formData.species]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "species" && value !== prev.species) {
        return { ...prev, [name]: value, breed: "" };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, imageFile: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageFile: null, petimage_url: "" }));
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* === LEFT COLUMN: PHOTO UPLOAD (Sticky on Desktop) === */}
        <div className="w-full lg:w-1/3 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Pet Photo</h3>
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-400 transition-all group">
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-3 bg-red-500 text-white rounded-full hover:scale-110 transition"
                      title="Remove Photo"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-blue-600 text-white rounded-full hover:scale-110 transition"
                      title="Change Photo"
                    >
                      <Camera size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-blue-50/50 transition-colors">
                  <div className="p-4 bg-blue-50 text-blue-500 rounded-full mb-3">
                    <Upload size={32} />
                  </div>
                  <span className="font-semibold text-gray-500">
                    Upload Photo
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    Supports JPG, PNG
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {!imagePreview && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl flex gap-3 items-start">
                <Info className="shrink-0 w-5 h-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800 leading-relaxed">
                  <strong>Tip:</strong> Good lighting helps! A clear face photo
                  makes your pet easier to identify.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* === RIGHT COLUMN: FORM FIELDS === */}
        <div className="w-full lg:w-2/3">
          <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            {/* Section: Identity */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                1. Basic Identity
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Pet Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Buddy"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Species
                  </label>
                  <select
                    name="species"
                    value={formData.species}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium transition-all"
                  >
                    <option value="">Select...</option>
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Breed
                  </label>
                  <input
                    type="text"
                    name="breed"
                    list="breed-suggestions"
                    value={formData.breed}
                    onChange={handleChange}
                    placeholder="Search breed..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                  />
                  <datalist id="breed-suggestions">
                    {availableBreeds.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Section: Physical Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100 pt-4">
                2. Physical Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Gender
                  </label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium transition-all"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Color / Markings
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="e.g. Brown with white socks"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                  />
                </div>

                {/* 🚨 CAMPUS MODE: Show CNVR Toggle instead of Microchip */}
                {isCampusMode ? (
                  <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl flex items-center justify-between border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm">
                        <Scissors size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          Spayed / Neutered
                        </p>
                        <p className="text-xs text-gray-500">
                          Is this dog fixed (Kapon)?
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.spayed_neutered}
                      onCheckedChange={(c) =>
                        setFormData((p) => ({ ...p, spayed_neutered: c }))
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Microchip ID (Optional)
                    </label>
                    <input
                      type="text"
                      name="microchip_id"
                      value={formData.microchip_id}
                      onChange={handleChange}
                      placeholder="XXXX-XXXX-XXXX"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                    />
                  </div>
                )}

                {/* 🚨 CAMPUS MODE: Show Status Dropdown */}
                {isCampusMode && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Current Status
                    </label>
                    <div className="relative">
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                      >
                        <option value="healthy">🟢 Healthy</option>
                        <option value="injured">🔴 Injured</option>
                        <option value="sick">🟠 Sick</option>
                        <option value="missing">❓ Missing</option>
                        <option value="aggressive">⚠️ Aggressive</option>
                      </select>
                      <AlertTriangle
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        size={16}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Location (Full Width) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Location / Address
              </label>
              {isCampusMode ? (
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all appearance-none"
                >
                  <option value="">Select Territory...</option>
                  {CAMPUS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Home, or Campus Sector 4"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                />
              )}
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-10 py-6 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
              >
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
