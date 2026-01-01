import React, { useState } from "react";
import { useAuth } from "@/context/authContext";
import { useVaccinations, type Vaccination } from "@/lib/useVaccinations";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2 } from "lucide-react";

interface VaccinationSectionProps {
  petId: string;
  userId?: string;
}

export default function VaccinationSection({ petId }: VaccinationSectionProps) {
  const { user } = useAuth();
  const {
    vaccinations,
    addVaccination,
    updateVaccination,
    deleteVaccination,
    markCompleted,
  } = useVaccinations(petId, user?.id);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vaccine_name: "",
    last_date: "",
    next_due_date: "",
    vet_name: "",
    notes: "",
  });

  const handleReset = () => {
    setFormData({
      vaccine_name: "",
      last_date: "",
      next_due_date: "",
      vet_name: "",
      notes: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (vaccination: Vaccination) => {
    setFormData({
      vaccine_name: vaccination.vaccine_name,
      last_date: vaccination.last_date,
      next_due_date: vaccination.next_due_date,
      vet_name: vaccination.vet_name || "",
      notes: vaccination.notes || "",
    });
    setEditingId(vaccination.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.vaccine_name ||
      !formData.last_date ||
      !formData.next_due_date
    ) {
      alert("Please fill in required fields");
      return;
    }

    if (editingId) {
      await updateVaccination(editingId, {
        vaccine_name: formData.vaccine_name,
        last_date: formData.last_date,
        next_due_date: formData.next_due_date,
        vet_name: formData.vet_name || undefined,
        notes: formData.notes || undefined,
        pet_id: petId,
      } as any);
    } else {
      await addVaccination({
        pet_id: petId,
        vaccine_name: formData.vaccine_name,
        last_date: formData.last_date,
        next_due_date: formData.next_due_date,
        vet_name: formData.vet_name || undefined,
        notes: formData.notes || undefined,
      });
    }

    handleReset();
  };

  const handleDelete = async (id: string) => {
    if (
      window.confirm("Are you sure you want to delete this vaccination record?")
    ) {
      await deleteVaccination(id);
    }
  };

  const getStatusBadge = (vac: Vaccination) => {
    if (vac.status === "completed") {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-green-200 text-green-800 font-semibold">
          ✓ COMPLETED
        </span>
      );
    } else if (vac.status === "overdue") {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-red-200 text-red-800 font-semibold">
          ⚠️ OVERDUE
        </span>
      );
    } else {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-blue-200 text-blue-800 font-semibold">
          PENDING
        </span>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Vaccination List */}
      {vaccinations.length > 0 && (
        <div className="space-y-3">
          {vaccinations.map((vac) => (
            <div
              key={vac.id}
              className={`p-4 rounded-lg border-2 transition ${
                vac.status === "overdue"
                  ? "bg-red-50 border-red-200"
                  : vac.status === "completed"
                  ? "bg-green-50 border-green-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-base">
                      {vac.vaccine_name}
                    </p>
                    {getStatusBadge(vac)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(vac)}
                    className="p-1 hover:bg-blue-100 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(vac.id)}
                    className="p-1 hover:bg-red-100 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-700">
                <p>Last: {new Date(vac.last_date).toLocaleDateString()}</p>
                <p>
                  Next Due: {new Date(vac.next_due_date).toLocaleDateString()}
                </p>
                {vac.vet_name && <p>🏥 {vac.vet_name}</p>}
                {vac.notes && (
                  <p className="text-gray-600 mt-2 italic">"{vac.notes}"</p>
                )}
              </div>

              {vac.status !== "completed" && (
                <button
                  onClick={() => markCompleted(vac.id)}
                  className="mt-3 text-xs bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition"
                >
                  Mark as Completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {vaccinations.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500">
          <p>No vaccinations recorded yet. Add one to get started!</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-green-200 space-y-3">
          <h3 className="font-semibold text-lg">
            {editingId ? "Edit Vaccination" : "Add Vaccination Record"}
          </h3>

          <div>
            <label className="text-sm font-medium block mb-1">
              Vaccine Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Rabies Vaccine"
              value={formData.vaccine_name}
              onChange={(e) =>
                setFormData({ ...formData, vaccine_name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-green-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium block mb-1">
                Last Date *
              </label>
              <input
                type="date"
                value={formData.last_date}
                onChange={(e) =>
                  setFormData({ ...formData, last_date: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">
                Next Due Date *
              </label>
              <input
                type="date"
                value={formData.next_due_date}
                onChange={(e) =>
                  setFormData({ ...formData, next_due_date: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Vet Name</label>
            <input
              type="text"
              placeholder="e.g., Dr. Emily Chan"
              value={formData.vet_name}
              onChange={(e) =>
                setFormData({ ...formData, vet_name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <textarea
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-green-500 resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {editingId ? "Update" : "Add"} Vaccination
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Vaccination
        </Button>
      )}
    </div>
  );
}
