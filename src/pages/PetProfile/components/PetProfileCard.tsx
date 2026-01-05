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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-50 to-transparent z-0" />

      <div className="flex justify-between items-start mb-6 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white hover:bg-gray-50 rounded-full text-gray-400 border shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        {canManage && (
          <button
            onClick={() => navigate(`/PetDashboard/${pet.id}/edit`)}
            className="p-2 bg-white hover:bg-blue-50 rounded-full text-gray-400 hover:text-blue-600 border shadow-sm"
          >
            <Edit2 size={20} />
          </button>
        )}
      </div>

      <div className="relative w-40 h-40 mx-auto mb-6 z-10">
        <div className="w-full h-full rounded-full p-1.5 border-4 border-white bg-white shadow-lg overflow-hidden">
          {pet.petimage_url ? (
            <img
              src={pet.petimage_url}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300">
              {pet.species?.toLowerCase() === "cat" ? (
                <Cat size={48} />
              ) : (
                <Dog size={48} />
              )}
            </div>
          )}
        </div>
        {isCampusPet && (
          <Badge className="absolute -top-1 -right-1 bg-blue-600 border-2 border-white">
            <ShieldCheck size={16} />
          </Badge>
        )}
      </div>

      <div className="text-center mb-8 relative z-10">
        <h1 className="text-3xl font-black text-gray-900 mb-1">{pet.name}</h1>
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          {pet.species || "Pet"} • {pet.breed || "Unknown"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-50 p-3 rounded-2xl border text-center">
          <p className="text-[10px] text-gray-400 uppercase font-bold">Age</p>
          <p className="font-bold text-gray-700">
            {pet.dob
              ? `${
                  new Date().getFullYear() - new Date(pet.dob).getFullYear()
                } yrs`
              : "?"}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-2xl border text-center">
          <p className="text-[10px] text-gray-400 uppercase font-bold">Sex</p>
          <p className="font-bold text-gray-700">{pet.sex || "?"}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
          <MapPin size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            {pet.location || (isCampusPet ? "Campus Resident" : "Home")}
          </span>
        </div>
        {pet.microchip_id && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
            <Fingerprint size={16} className="text-gray-400" />
            <span className="text-sm font-mono font-medium text-gray-600">
              {pet.microchip_id}
            </span>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {!isCampusPet && canManage && (
          <Button
            onClick={onShowQR}
            variant="outline"
            className="w-full rounded-xl font-bold"
          >
            <QrCode className="mr-2" size={18} /> Digital ID
          </Button>
        )}
        {canManage && (
          <Button
            onClick={onDelete}
            disabled={isDeleting}
            variant="ghost"
            className="w-full text-red-500 rounded-xl"
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
