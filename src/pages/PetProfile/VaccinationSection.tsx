import React, { useState } from "react";
import { useAuth } from "@/context/authContext";
import { useVaccinations, type Vaccination } from "@/hooks/useVaccinations";
import { useDialog } from "@/context/DialogContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Edit2,
  Syringe,
  AlertTriangle,
  CheckCircle2,
  User,
  ShieldCheck,
  History,
  Clock,
  Loader2,
} from "lucide-react";
import { format, isBefore, parseISO } from "date-fns";
import { toast } from "sonner";

interface VaccinationSectionProps {
  petId: string;
  canManage?: boolean; // ✅ Added prop
}

export default function VaccinationSection({
  petId,
  canManage,
}: VaccinationSectionProps) {
  const { user } = useAuth();
  const { confirm } = useDialog();
  const {
    vaccinations,
    addVaccination,
    updateVaccination,
    deleteVaccination,
    markCompleted,
    loading,
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

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(false);
  };

  const handleEdit = (vac: Vaccination) => {
    setFormData({
      vaccine_name: vac.vaccine_name,
      last_date: vac.last_date,
      next_due_date: vac.next_due_date,
      vet_name: vac.vet_name || "",
      notes: vac.notes || "",
    });
    setEditingId(vac.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.vaccine_name ||
      !formData.last_date ||
      !formData.next_due_date
    ) {
      toast.error("Please fill in required fields");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateVaccination(editingId, { ...formData, pet_id: petId });
        toast.success("Record updated");
      } else {
        await addVaccination({ ...formData, pet_id: petId });
        toast.success("Vaccination recorded");
      }
      handleReset();
    } catch (err) {
      toast.error("Operation failed");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm("Permanently remove this record?", {
      title: "Delete Vaccine",
      variant: "danger",
      confirmText: "Delete",
    });

    if (isConfirmed) {
      await deleteVaccination(id);
      toast.success("Record deleted");
    }
  };

  const overdue = vaccinations.filter(
    (v) =>
      v.status === "overdue" ||
      (v.status !== "completed" &&
        isBefore(parseISO(v.next_due_date), new Date()))
  );

  const active = vaccinations.filter(
    (v) => v.status !== "completed" && !overdue.find((o) => o.id === v.id)
  );

  const completed = vaccinations.filter((v) => v.status === "completed");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {!showForm && (
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex justify-between items-end">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <ShieldCheck size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">
                Immunizations
              </span>
            </div>
            <h2 className="text-3xl font-black mb-1">Vaccines</h2>
            <p className="text-emerald-100 text-sm max-w-xs leading-relaxed">
              Track shots, set reminders, and keep digital proof handy.
            </p>
          </div>
          {/* ✅ Check canManage before showing Add Button */}
          {canManage && (
            <Button
              onClick={() => setShowForm(true)}
              className="relative z-10 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold shadow-lg rounded-xl h-12 px-6 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" /> Add Record
            </Button>
          )}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <Syringe className="absolute -bottom-6 right-20 w-40 h-40 text-white/5 rotate-12 pointer-events-none" />
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {!loading && vaccinations.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 bg-white border-2 border-dashed border-gray-100 rounded-3xl text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 text-emerald-300">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Records Found</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto mt-1">
            Keep your pet safe by logging their vaccination history.
          </p>
        </div>
      )}

      {!showForm && !loading && (
        <div className="space-y-8">
          {overdue.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-red-600 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle size={16} /> Action Required
              </h3>
              {overdue.map((vac) => (
                <VaccineCard
                  key={vac.id}
                  vac={vac}
                  variant="overdue"
                  onEdit={() => handleEdit(vac)}
                  onDelete={() => handleDelete(vac.id)}
                  onComplete={() => markCompleted(vac.id)}
                  canManage={canManage} // ✅ Pass canManage
                />
              ))}
            </div>
          )}

          {active.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                <Clock size={16} /> Upcoming
              </h3>
              {active.map((vac) => (
                <VaccineCard
                  key={vac.id}
                  vac={vac}
                  variant="active"
                  onEdit={() => handleEdit(vac)}
                  onDelete={() => handleDelete(vac.id)}
                  onComplete={() => markCompleted(vac.id)}
                  canManage={canManage} // ✅ Pass canManage
                />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
              <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                <History size={16} /> History
              </h3>
              {completed.map((vac) => (
                <VaccineCard
                  key={vac.id}
                  vac={vac}
                  variant="completed"
                  onEdit={() => handleEdit(vac)}
                  onDelete={() => handleDelete(vac.id)}
                  canManage={canManage} // ✅ Pass canManage
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95">
            {/* Form Content (Unchanged) */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  {editingId ? "Edit Record" : "Log Vaccine"}
                </h3>
                <p className="text-gray-500 text-xs mt-1">
                  Enter details from your vet's record.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <span className="text-xl font-bold">×</span>
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                  Vaccine Name
                </label>
                <Input
                  placeholder="e.g. Rabies, DHPP"
                  value={formData.vaccine_name}
                  onChange={(e) =>
                    setFormData({ ...formData, vaccine_name: e.target.value })
                  }
                  className="bg-gray-50 border-gray-200 font-bold"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                    Date Given
                  </label>
                  <Input
                    type="date"
                    value={formData.last_date}
                    onChange={(e) =>
                      setFormData({ ...formData, last_date: e.target.value })
                    }
                    className="bg-gray-50 border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                    Next Due
                  </label>
                  <Input
                    type="date"
                    value={formData.next_due_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        next_due_date: e.target.value,
                      })
                    }
                    className="bg-gray-50 border-gray-200"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                  Veterinarian / Clinic
                </label>
                <div className="relative">
                  <Input
                    placeholder="e.g. Dr. Smith"
                    value={formData.vet_name}
                    onChange={(e) =>
                      setFormData({ ...formData, vet_name: e.target.value })
                    }
                    className="pl-9 bg-gray-50 border-gray-200"
                  />
                  <User className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                  Notes
                </label>
                <Textarea
                  placeholder="Batch number, side effects, etc..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="bg-gray-50 border-gray-200 resize-none"
                  rows={3}
                />
              </div>
              <div className="pt-2 flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold shadow-lg shadow-emerald-200"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : editingId ? (
                    "Save Changes"
                  ) : (
                    "Save Record"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VaccineCard({
  vac,
  variant,
  onEdit,
  onDelete,
  onComplete,
  canManage,
}: any) {
  const isOverdue = variant === "overdue";
  const isCompleted = variant === "completed";

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all hover:shadow-lg flex flex-col md:flex-row overflow-hidden ${
        isOverdue
          ? "border-red-100 shadow-sm shadow-red-50"
          : "border-gray-100 shadow-sm"
      }`}
    >
      <div
        className={`w-full md:w-2 ${
          isOverdue
            ? "bg-red-500"
            : isCompleted
            ? "bg-gray-200"
            : "bg-emerald-500"
        }`}
      />
      <div className="flex-1 p-5 flex flex-col justify-center">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4
              className={`font-bold text-lg text-gray-900 ${
                isCompleted && "line-through text-gray-400"
              }`}
            >
              {vac.vaccine_name}
            </h4>
            {vac.vet_name && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <User size={12} /> {vac.vet_name}
              </p>
            )}
          </div>
          {isOverdue && (
            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
              Overdue
            </span>
          )}
          {isCompleted && (
            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
              Completed
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              Given
            </span>
            <span className="font-semibold text-gray-700">
              {format(parseISO(vac.last_date), "MMM d, yyyy")}
            </span>
          </div>
          {!isCompleted && (
            <>
              <div className="w-px h-8 bg-gray-100" />
              <div className="flex flex-col">
                <span
                  className={`text-[10px] font-bold uppercase ${
                    isOverdue ? "text-red-400" : "text-gray-400"
                  }`}
                >
                  Next Due
                </span>
                <span
                  className={`font-bold ${
                    isOverdue ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {format(parseISO(vac.next_due_date), "MMM d, yyyy")}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ Only show Action Buttons if canManage is true */}
      {canManage && (
        <div className="bg-gray-50/50 p-3 flex md:flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-gray-100">
          {!isCompleted && onComplete && (
            <Button
              onClick={onComplete}
              variant="outline"
              size="sm"
              className="w-full md:w-auto h-8 text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <CheckCircle2 size={14} className="mr-1" /> Done
            </Button>
          )}
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
