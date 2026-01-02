import React, { useState } from "react";
import { useAuth } from "@/context/authContext";
import { useSchedules } from "@/lib/useSchedules";
import { supabase } from "@/lib/supabaseClient";
import { useDialog } from "@/context/DialogContext"; // ✅ Custom Dialog Hook
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Edit2,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  User,
  Stethoscope,
  Scissors,
  Syringe,
  Repeat,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addYears } from "date-fns";

interface ScheduleSectionProps {
  petId: string;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  checkup: {
    icon: <Stethoscope size={18} />,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  grooming: {
    icon: <Scissors size={18} />,
    color: "text-pink-600",
    bg: "bg-pink-100",
  },
  vaccine: {
    icon: <Syringe size={18} />,
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  other: {
    icon: <CalendarIcon size={18} />,
    color: "text-purple-600",
    bg: "bg-purple-100",
  },
};

export default function ScheduleSection({ petId }: ScheduleSectionProps) {
  const { user } = useAuth();
  const { confirm } = useDialog(); // ✅ Init hook
  const {
    schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    updateStatus,
    loading,
  } = useSchedules(petId, user?.id);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    type: "checkup",
    recurrence: "none",
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
      type: "checkup",
      recurrence: "none",
      description: "",
      scheduled_date: "",
      scheduled_time: "",
      location: "",
      vet_name: "",
      status: "pending",
    });
    setEditingId(null);
    setIsSubmitting(false);
  };

  const closeForm = () => {
    handleReset();
    setShowForm(false);
  };

  const handleEdit = (schedule: any) => {
    setFormData({
      title: schedule.title,
      type: schedule.type || "other",
      recurrence: schedule.recurrence || "none",
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

  const handleMarkAsDone = async (schedule: any) => {
    if (processingIds.includes(schedule.id)) return;
    setProcessingIds((prev) => [...prev, schedule.id]);

    try {
      await updateStatus(schedule.id, "completed");
      toast.success("Appointment completed!", {
        action: {
          label: "Undo",
          onClick: async () => {
            await updateStatus(schedule.id, "pending");
            toast.info("Status reverted");
          },
        },
      });

      // ✅ Custom Confirmation Dialog
      if (schedule.type === "vaccine") {
        const shouldLog = await confirm(
          `Do you want to add "${schedule.title}" to the Health Passport automatically?`,
          {
            title: "Update Passport?",
            confirmText: "Yes, Add It",
            cancelText: "No, Skip",
            variant: "default",
          }
        );

        if (shouldLog) {
          try {
            const today = new Date();
            const nextDue = addYears(today, 1);
            const { error } = await supabase.from("vaccinations").insert({
              pet_id: petId,
              owner_id: user?.id,
              vaccine_name: schedule.title,
              last_date: format(today, "yyyy-MM-dd"),
              next_due_date: format(nextDue, "yyyy-MM-dd"),
              vet_name: schedule.vet_name || "Unknown Vet",
              notes: `Auto-logged from schedule on ${format(
                today,
                "MMM d, yyyy"
              )}`,
              status: "completed",
            });
            if (error) throw error;
            toast.success("Health Passport updated successfully!");
          } catch (innerErr: any) {
            toast.error(`Error adding to Passport: ${innerErr.message}`);
          }
        }
      }
    } catch (err) {
      toast.error("Error updating records");
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== schedule.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.title || !formData.scheduled_date) {
      toast.error("Please add a title and date.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      pet_id: petId,
      title: formData.title,
      description: formData.description || undefined,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time || undefined,
      location: formData.location || undefined,
      vet_name: formData.vet_name || undefined,
      status: formData.status,
      type: formData.type,
      recurrence: formData.recurrence,
    };

    try {
      if (editingId) {
        await updateSchedule(editingId, payload as any);
        toast.success("Appointment updated");
        closeForm();
      } else {
        await addSchedule(payload);
        toast.success("Appointment scheduled");
        if (keepOpen) {
          setFormData((prev) => ({ ...prev, title: "", description: "" }));
          setIsSubmitting(false);
        } else {
          closeForm();
        }
      }
    } catch (err) {
      toast.error("Failed to save schedule");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    // ✅ Custom Danger Confirm
    const isConfirmed = await confirm(
      "Are you sure you want to delete this event?",
      {
        title: "Delete Event",
        variant: "danger",
        confirmText: "Delete",
      }
    );

    if (isConfirmed) {
      await deleteSchedule(id);
      toast.success("Event removed");
    }
  };

  const getGoogleCalendarLink = (schedule: any) => {
    // ... same google calendar logic ...
    const dateStr = schedule.scheduled_date;
    const timeStr = schedule.scheduled_time || "09:00";
    const start = new Date(`${dateStr}T${timeStr}`)
      .toISOString()
      .replace(/-|:|\.\d\d\d/g, "");
    const end = new Date(
      new Date(`${dateStr}T${timeStr}`).getTime() + 60 * 60 * 1000
    )
      .toISOString()
      .replace(/-|:|\.\d\d\d/g, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `🐾 ${schedule.title} (${schedule.type})`,
      dates: `${start}/${end}`,
      details: schedule.description || "Pet Appointment via PawPal",
      location: schedule.location || "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {!showForm && (
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex justify-between items-end">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <CalendarIcon size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">
                Planner
              </span>
            </div>
            <h2 className="text-3xl font-black mb-1">Visits & Care</h2>
            <p className="text-violet-100 text-sm max-w-xs leading-relaxed">
              Manage vet appointments, grooming sessions, and recurring health
              events.
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="relative z-10 bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-800 font-bold shadow-lg rounded-xl h-12 px-6 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" /> Book Visit
          </Button>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <CalendarIcon className="absolute -bottom-6 right-20 w-40 h-40 text-white/5 rotate-12 pointer-events-none" />
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
          </div>
        ) : schedules.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border-2 border-dashed border-gray-100 rounded-3xl text-center">
            <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mb-4 text-violet-300">
              <Sparkles size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">All Clear!</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto mt-1">
              No upcoming appointments. Enjoy the free time with your pet!
            </p>
          </div>
        ) : (
          schedules.map((schedule: any) => {
            const config = typeConfig[schedule.type] || typeConfig.other;
            const dateObj = parseISO(schedule.scheduled_date);
            const isProcessing = processingIds.includes(schedule.id);
            return (
              <div
                key={schedule.id}
                className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-violet-100 hover:border-violet-100 transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row"
              >
                <div
                  className={`md:w-24 bg-gray-50 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-100 group-hover:bg-violet-50/50 transition-colors`}
                >
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {format(dateObj, "MMM")}
                  </span>
                  <span className="text-3xl font-black text-gray-900">
                    {format(dateObj, "d")}
                  </span>
                  <span className="text-xs font-bold text-gray-400 mt-1">
                    {format(dateObj, "EEE")}
                  </span>
                </div>
                <div className="flex-1 p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-xl ${config.bg} ${config.color}`}
                      >
                        {config.icon}
                      </div>
                      <div>
                        <h3
                          className={`font-bold text-gray-900 text-lg leading-tight ${
                            schedule.status === "completed"
                              ? "line-through opacity-50"
                              : ""
                          }`}
                        >
                          {schedule.title}
                        </h3>
                        {schedule.recurrence &&
                          schedule.recurrence !== "none" && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit mt-1">
                              <Repeat size={10} /> {schedule.recurrence}
                            </div>
                          )}
                      </div>
                    </div>
                    {schedule.status === "completed" && (
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 size={12} /> DONE
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-4">
                    {schedule.scheduled_time && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <Clock size={14} className="text-orange-400" />
                        {schedule.scheduled_time}
                      </div>
                    )}
                    {schedule.location && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <MapPin size={14} className="text-red-400" />
                        {schedule.location}
                      </div>
                    )}
                    {schedule.vet_name && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium col-span-2">
                        <User size={14} className="text-blue-400" />
                        {schedule.vet_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 flex md:flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-gray-50 bg-gray-50/30">
                  {schedule.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsDone(schedule)}
                      disabled={isProcessing}
                      className="w-full md:w-auto h-9 text-xs font-bold text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 size={14} className="animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 size={14} className="mr-1" />
                      )}
                      {isProcessing ? "Saving..." : "Done"}
                    </Button>
                  )}
                  <div className="flex gap-1 w-full md:w-auto justify-end">
                    <a
                      href={getGoogleCalendarLink(schedule)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-gray-400 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-100"
                      title="Add to Google Calendar"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => handleEdit(schedule)}
                      disabled={isProcessing}
                      className="p-2 text-gray-400 hover:bg-white hover:text-gray-900 hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-100 disabled:opacity-50"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      disabled={isProcessing}
                      className="p-2 text-gray-400 hover:bg-white hover:text-red-600 hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-100 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-[2rem] w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  {editingId ? "Edit Appointment" : "Book Appointment"}
                </h3>
                <p className="text-gray-500 text-xs mt-1">
                  Fill in the details below.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeForm}
                className="rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <span className="text-xl font-bold">×</span>
              </Button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                  Visit Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "checkup", label: "Vet", config: typeConfig.checkup },
                    {
                      id: "grooming",
                      label: "Groom",
                      config: typeConfig.grooming,
                    },
                    { id: "vaccine", label: "Vax", config: typeConfig.vaccine },
                    { id: "other", label: "Other", config: typeConfig.other },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, type: item.id })
                      }
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                        formData.type === item.id
                          ? `border-${item.config.color.split("-")[1]}-500 ${
                              item.config.bg
                            } ${item.config.color} font-bold`
                          : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      }`}
                    >
                      {item.config.icon}
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                    Title
                  </label>
                  <Input
                    className="bg-gray-50 border-gray-200 font-bold text-gray-800"
                    placeholder="e.g. Annual Checkup"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                      Date
                    </label>
                    <Input
                      type="date"
                      className="bg-gray-50 border-gray-200"
                      value={formData.scheduled_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scheduled_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                      Time
                    </label>
                    <Input
                      type="time"
                      className="bg-gray-50 border-gray-200"
                      value={formData.scheduled_time}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scheduled_time: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                    Recurrence
                  </label>
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {["none", "weekly", "monthly", "annually"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, recurrence: opt })
                        }
                        className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all ${
                          formData.recurrence === opt
                            ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {opt === "none" ? "Never" : opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                      Location
                    </label>
                    <div className="relative">
                      <Input
                        className="pl-9 bg-gray-50 border-gray-200"
                        placeholder="Clinic"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                      />
                      <MapPin className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                      Provider
                    </label>
                    <div className="relative">
                      <Input
                        className="pl-9 bg-gray-50 border-gray-200"
                        placeholder="Dr. Name"
                        value={formData.vet_name}
                        onChange={(e) =>
                          setFormData({ ...formData, vet_name: e.target.value })
                        }
                      />
                      <User className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button
                  onClick={(e) => handleSubmit(e, false)}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 font-bold shadow-lg shadow-violet-200 transition-all active:scale-95"
                >
                  {editingId ? "Save Changes" : "Confirm Booking"}
                </Button>
                {!editingId && (
                  <Button
                    onClick={(e) => handleSubmit(e, true)}
                    variant="outline"
                    className="px-4 h-12 rounded-xl border-violet-100 text-violet-600 hover:bg-violet-50 font-bold"
                    title="Save and Add Another"
                  >
                    <Plus size={20} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
