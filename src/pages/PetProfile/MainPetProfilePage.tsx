import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { Calendar, Plus, Dog, PawPrint, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MainPetProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ 1. STATE FOR TABS
  const [activeTab, setActiveTab] = useState<"personal" | "campus">("personal");

  // ✅ 2. FETCH DATA BASED ON TAB
  // The hook automatically refetches when 'activeTab' changes
  const { pets, loading } = usePets(user?.id, activeTab);

  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 pb-24">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Loading pets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-24">
      <main className="flex-1 p-4 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* HEADER & TABS CONTAINER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Pet Dashboard</h1>

            {/* ✅ 3. TABS UI */}
            <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm flex items-center">
              <button
                onClick={() => setActiveTab("personal")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === "personal"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <PawPrint size={16} />
                My Pets
              </button>
              <button
                onClick={() => setActiveTab("campus")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === "campus"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Building2 size={16} />
                Campus Dogs
              </button>
            </div>
          </div>

          {/* ADD BUTTON (Context Aware) */}
          {/* Show button if: It's Personal tab OR (It's Campus tab AND I am Admin) */}
          {(activeTab === "personal" || isAdmin) && (
            <div className="flex justify-end">
              <Button
                onClick={() => navigate(`/PetDashboard/new?mode=${activeTab}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                {activeTab === "personal" ? "Add My Pet" : "Add Campus Dog"}
              </Button>
            </div>
          )}

          {/* ✅ 4. EMPTY STATES */}
          {pets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Dog className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {activeTab === "personal"
                  ? "No pets found"
                  : "No campus dogs yet"}
              </h3>
              <p className="text-gray-500 max-w-sm mb-8">
                {activeTab === "personal"
                  ? "You haven't added any furry friends yet."
                  : "The organization hasn't listed any campus dogs."}
              </p>

              {/* Call to Action (Context Aware) */}
              {(activeTab === "personal" || isAdmin) && (
                <Button
                  onClick={() =>
                    navigate(`/PetDashboard/new?mode=${activeTab}`)
                  }
                  size="lg"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 font-bold px-8"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {activeTab === "personal"
                    ? "Add Your First Pet"
                    : "Register First Dog"}
                </Button>
              )}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="grid grid-cols-1 gap-4">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  onClick={() => navigate(`/PetDashboard/${pet.id}`)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer flex gap-4 items-center group"
                >
                  {/* Pet Image */}
                  <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 relative">
                    {pet.petimage_url ? (
                      <img
                        src={pet.petimage_url}
                        alt={pet.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Dog className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {pet.name}
                      </h3>
                      {activeTab === "campus" && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">
                          Campus
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        {pet.species || "Pet"}
                      </span>
                      {pet.dob && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(pet.dob).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="pr-2 text-gray-300 group-hover:text-blue-500 transition-colors">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
