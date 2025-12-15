import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { Calendar, Dog } from "lucide-react";

export default function CampusPetsPage() {
  const { user } = useAuth();
  // ✅ Fetching "campus" mode pets
  const { pets, loading } = usePets(user?.id, "campus");
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Loading CvSU Dogs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">CvSU Campus Dogs 🐾</h1>
        <p className="text-blue-100 opacity-90 max-w-lg">
          Meet the furry residents of Cavite State University. These dogs are
          monitored and cared for by YFA.
        </p>
      </div>

      {/* List */}
      {pets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Dog className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            No campus dogs listed yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pets.map((pet) => (
            <div
              key={pet.id}
              onClick={() => navigate(`/PetDashboard/${pet.id}`)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex gap-4"
            >
              {/* Image */}
              <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {pet.petimage_url ? (
                  <img
                    src={pet.petimage_url}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Dog className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 py-1">
                <h3 className="text-lg font-bold text-gray-900">{pet.name}</h3>
                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mt-1">
                  Campus Resident
                </span>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {pet.dob ? new Date(pet.dob).getFullYear() : "Unknown Age"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
