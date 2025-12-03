import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { Calendar, Plus } from "lucide-react";

export default function MainPetProfilePage() {
  const { user } = useAuth();
  const { pets, loading } = usePets(user?.id);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white pb-24">
        <div className="text-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your pets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white pb-24">
  <div className="w-full min-h-screen bg-gray-50 flex">
 

  {/* MAIN CONTENT */}
  <main className="flex-1 p-6 lg:p-12">
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Pet List */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100">
        {pets.map((pet) => (
          <div
            key={pet.id}
            onClick={() => navigate(`/PetDashboard/${pet.id}`)}
            className="flex items-center gap-6 p-6 hover:bg-blue-50 cursor-pointer transition border-b last:border-b-0"
          >
            {/* Pet Image */}
            <div className="w-20 h-20 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0">
              {pet.petimage_url ? (
                <img src={pet.petimage_url} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-4xl">🐾</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{pet.name}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                {new Date(pet.dob).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">Tap to view details →</p>
            </div>

            {/* Check */}
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold">✓</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow border text-center">
          <p className="text-gray-500 text-sm">Total Pets</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{pets.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border text-center">
          <p className="text-gray-500 text-sm">Health Score</p>
          <p className="text-3xl font-bold text-green-600 mt-1">A+</p>
        </div>
      </div>
    </div>
  </main>

  {/* Floating button */}
  <button
    onClick={() => navigate("/PetDashboard/new")}
    className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-blue-600 text-white shadow-2xl hover:scale-105 active:scale-95 flex items-center justify-center"
  >
    <Plus className="w-8 h-8" />
  </button>
</div>
  </div>
  );
}
