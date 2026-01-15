import {
  ArrowLeft,
  Edit2,
  ShieldCheck,
  MapPin,
  Fingerprint,
  QrCode,
  Trash2,
  Loader2,
  Dog,
  Cat,
  Bird,
  Rabbit,
  PawPrint,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  differenceInYears,
  differenceInMonths,
  differenceInDays,
} from "date-fns"; // ✅ Added date-fns

export default function PetProfileCard({
  pet,
  isOwner,
  isCampusPet,
  canManage,
  isDeleting,
  onDelete,
  onShowQR,
}: any) {
  const navigate = useNavigate();

  // ✅ Helper: Get Dynamic Icon based on Species
  const getSpeciesIcon = () => {
    const species = pet.species?.toLowerCase();
    const props = { size: 64, className: "text-blue-300/80" };

    switch (species) {
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

  // ✅ Helper: Precise Age Display (Years -> Months -> Days)
  const getAgeDisplay = (dob: string) => {
    if (!dob) return "?";
    const birth = new Date(dob);
    const now = new Date();

    const years = differenceInYears(now, birth);
    if (years >= 1) return `${years} yr${years > 1 ? "s" : ""}`;

    const months = differenceInMonths(now, birth);
    if (months >= 1) return `${months} mo${months > 1 ? "s" : ""}`;

    const days = differenceInDays(now, birth);
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-50 to-transparent z-0" />

      {/* Header Actions */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white hover:bg-gray-50 rounded-full text-gray-400 border shadow-sm transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        {canManage && (
          <button
            onClick={() => navigate(`/PetDashboard/${pet.id}/edit`)}
            className="p-2 bg-white hover:bg-blue-50 rounded-full text-gray-400 hover:text-blue-600 border shadow-sm transition-colors"
          >
            <Edit2 size={20} />
          </button>
        )}
      </div>

      {/* Main Profile Image */}
      <div className="relative w-40 h-40 mx-auto mb-6 z-10">
        <div className="w-full h-full rounded-full p-1.5 border-4 border-white bg-white shadow-lg overflow-hidden group">
          {pet.petimage_url ? (
            <img
              src={pet.petimage_url}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            // Dynamic Placeholder State
            <div className="flex items-center justify-center w-full h-full bg-blue-50/50">
              {getSpeciesIcon()}
            </div>
          )}
        </div>

        {/* Campus Badge */}
        {isCampusPet && (
          <Badge className="absolute -top-1 -right-1 bg-blue-600 border-2 border-white px-2 py-1 shadow-md">
            <ShieldCheck size={14} className="mr-1" /> Resident
          </Badge>
        )}
      </div>

      {/* Name & Identity */}
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
          {pet.name}
        </h1>
        <Badge
          variant="secondary"
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1"
        >
          {pet.species || "Pet"} • {pet.breed || "Unknown Breed"}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
            Age
          </p>
          <p className="font-bold text-gray-700 text-lg">
            {/* ✅ Updated Age Display */}
            {getAgeDisplay(pet.dob)}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
            Sex
          </p>
          <p className="font-bold text-gray-700 text-lg capitalize">
            {pet.sex || "?"}
          </p>
        </div>
      </div>

      {/* Info Rows */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
          <div className="p-2 bg-white rounded-full shadow-sm text-gray-400">
            <MapPin size={16} />
          </div>
          <span className="text-sm font-medium text-gray-600">
            {pet.location || (isCampusPet ? "Campus Resident" : "Home")}
          </span>
        </div>
        {pet.microchip_id && (
          <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
            <div className="p-2 bg-white rounded-full shadow-sm text-gray-400">
              <Fingerprint size={16} />
            </div>
            <span className="text-sm font-mono font-medium text-gray-600 tracking-wide">
              {pet.microchip_id}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 space-y-3">
        {!isCampusPet && canManage && (
          <Button
            onClick={onShowQR}
            variant="outline"
            className="w-full h-12 rounded-xl font-bold border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <QrCode className="mr-2" size={18} /> Digital ID
          </Button>
        )}
        {canManage && (
          <Button
            onClick={onDelete}
            disabled={isDeleting}
            variant="ghost"
            className="w-full h-12 text-red-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
          >
            {isDeleting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Trash2 className="mr-2" size={18} /> Delete Profile
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
