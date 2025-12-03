import React, { useState } from "react";
import { useAuth } from "@/context/authContext";
import { useSchedules, type Schedule } from "@/lib/useSchedules";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2 } from "lucide-react";

interface ScheduleSectionProps {
  petId: string;
}

const statusBadgeColors = {
  pending: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function ScheduleSection({ petId }: ScheduleSectionProps) {
  const { user } = useAuth();
  const { schedules, addSchedule, updateSchedule, deleteSchedule, updateStatus } = useSchedules(petId, user?.id);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_date: "",
    scheduled_time: "",
    location: "",
    vet_name: "",
    status: "pending" as "pending" | "completed" | "cancelled",
  });

  const handleReset = () => {
    setFormData({
      title: "",
      description: "",
      scheduled_date: "",
      scheduled_time: "",
      location: "",
      vet_name: "",
      status: "pending",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (schedule: Schedule) => {
    setFormData({
      title: schedule.title,
      description: schedule.description || "",
      scheduled_date: schedule.scheduled_date,
      scheduled_time: schedule.scheduled_time || "",
      location: schedule.location || "",
      vet_name: schedule.vet_name || "",
      status: schedule.status,
    });
    setEditingId(schedule.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.scheduled_date) {
      alert("Please fill in required fields (Title and Date)");
      return;
    }

    if (editingId) {
      await updateSchedule(editingId, {
        title: formData.title,
        description: formData.description || undefined,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time || undefined,
        location: formData.location || undefined,
        vet_name: formData.vet_name || undefined,
        status: formData.status,
        pet_id: petId,
      } as any);
    } else {
      await addSchedule({
        pet_id: petId,
        title: formData.title,
        description: formData.description || undefined,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time || undefined,
        location: formData.location || undefined,
        vet_name: formData.vet_name || undefined,
        status: formData.status,
      });
    }

    handleReset();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      await deleteSchedule(id);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "pending" | "completed" | "cancelled") => {
    await updateStatus(id, newStatus);
  };

  return (
    <div className="space-y-4">
      {/* Schedule List */}
      {schedules.length > 0 && (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-base">{schedule.title}</p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold cursor-pointer ${statusBadgeColors[schedule.status]}`}
                      onClick={() => {
                        const nextStatus =
                          schedule.status === "pending"
                            ? "completed"
                            : schedule.status === "completed"
                            ? "cancelled"
                            : "pending";
                        handleStatusChange(schedule.id, nextStatus as any);
                      }}
                    >
                      {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                    </span>
                  </div>
                  {schedule.description && (
                    <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="p-1 hover:bg-blue-100 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="p-1 hover:bg-red-100 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <p>📅 {new Date(schedule.scheduled_date).toLocaleDateString()}</p>
                {schedule.scheduled_time && <p>🕐 {schedule.scheduled_time}</p>}
                {schedule.location && <p>📍 {schedule.location}</p>}
                {schedule.vet_name && <p>🏥 {schedule.vet_name}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {schedules.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500">
          <p>No schedules yet. Add one to get started!</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-200 space-y-3">
          <h3 className="font-semibold text-lg">
            {editingId ? "Edit Schedule" : "Add New Schedule"}
          </h3>

          <div>
            <label className="text-sm font-medium block mb-1">Title *</label>
            <input
              type="text"
              placeholder="e.g., Annual Health Checkup"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <textarea
              placeholder="Add any notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium block mb-1">Date *</label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Time</label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Location</label>
            <input
              type="text"
              placeholder="e.g., Happy Paws Veterinary Clinic"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Vet Name</label>
            <input
              type="text"
              placeholder="e.g., Dr. Smith"
              value={formData.vet_name}
              onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">
              {editingId ? "Update" : "Add"} Schedule
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
          Add Schedule
        </Button>
      )}
    </div>
  );
}
