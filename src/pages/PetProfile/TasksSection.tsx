import React, { useState } from "react";
import { useAuth } from "@/context/authContext";
import { useTasks, type PetTask } from "@/lib/useTasks";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, Check } from "lucide-react";

interface TasksSectionProps {
  petId: string;
}

const priorityColors = {
  low: "bg-blue-100 text-blue-700 border-blue-300",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  high: "bg-red-100 text-red-700 border-red-300",
};

const urgencyColors = {
  normal: "bg-yellow-100 text-yellow-700",
  urgent: "bg-orange-100 text-orange-700",
  immediate: "bg-red-100 text-red-700",
};

interface FormData {
  title: string;
  description: string;
  due_date: string;
  priority: "low" | "medium" | "high";
  urgency: "normal" | "urgent" | "immediate";
  requires_immediate_attention: boolean;
}

export default function TasksSection({ petId }: TasksSectionProps) {
  const { user } = useAuth();
  const { tasks, addTask, updateTask, deleteTask, toggleTaskComplete, setUrgency } = useTasks(petId, user?.id);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ✅ FIX: Initialize with proper type annotation
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
    urgency: "normal",
    requires_immediate_attention: false,
  });

  const handleReset = () => {
    setFormData({
      title: "",
      description: "",
      due_date: "",
      priority: "medium",
      urgency: "normal",
      requires_immediate_attention: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (task: PetTask) => {
    setFormData({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date,
      priority: task.priority,
      urgency: task.urgency,
      requires_immediate_attention: task.requires_immediate_attention,
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.due_date) {
      alert("Please fill in required fields");
      return;
    }

    if (editingId) {
      await updateTask(editingId, {
        title: formData.title,
        description: formData.description || undefined,
        due_date: formData.due_date,
        priority: formData.priority,
        urgency: formData.urgency,
        requires_immediate_attention: formData.requires_immediate_attention,
        pet_id: petId,
      } as any);
    } else {
      await addTask({
        pet_id: petId,
        title: formData.title,
        description: formData.description || undefined,
        due_date: formData.due_date,
        priority: formData.priority,
        urgency: formData.urgency,
        completed: false,
        requires_immediate_attention: formData.requires_immediate_attention,
      });
    }

    handleReset();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteTask(id);
    }
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const getUrgencyBadge = (urgency: string, requiresImmediate: boolean) => {
    if (requiresImmediate) {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
          ⚠️ Requires immediate attention
        </span>
      );
    }

    if (urgency === "immediate") {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
          🔴 IMMEDIATE
        </span>
      );
    } else if (urgency === "urgent") {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
          🟠 URGENT
        </span>
      );
    } else {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
          🟡 NORMAL
        </span>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Active Tasks ({activeTasks.length})</h4>
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-2 flex-1">
                    <button
                      onClick={() => toggleTaskComplete(task.id, true)}
                      className="p-1 hover:bg-green-100 rounded-lg transition mt-1 flex-shrink-0"
                    >
                      <Check className="w-4 h-4 text-gray-400 hover:text-green-600" />
                    </button>
                    <div className="flex-1">
                      <p className="font-semibold text-base">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(task)}
                      className="p-1 hover:bg-blue-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1 hover:bg-red-100 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center text-sm mb-2">
                  {getUrgencyBadge(task.urgency, task.requires_immediate_attention)}
                  <span
                    className={`text-xs px-2 py-1 rounded-full border font-semibold cursor-pointer ${priorityColors[task.priority]}`}
                  >
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                  </span>
                  <span className="text-gray-600">📅 {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-2">Completed ({completedTasks.length})</h4>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div key={task.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 opacity-60">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2 flex-1">
                    <button
                      onClick={() => toggleTaskComplete(task.id, false)}
                      className="p-1 hover:bg-gray-200 rounded-lg transition mt-1 flex-shrink-0"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </button>
                    <div>
                      <p className="font-semibold text-base line-through text-gray-500">{task.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeTasks.length === 0 && completedTasks.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500">
          <p>No tasks yet. Add one to get started!</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-orange-200 space-y-3">
          <h3 className="font-semibold text-lg">
            {editingId ? "Edit Task" : "Add New Task"}
          </h3>

          <div>
            <label className="text-sm font-medium block mb-1">Task Title *</label>
            <input
              type="text"
              placeholder="e.g., Give heartworm medication"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <textarea
              placeholder="Add details about this task..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500 resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Due Date *</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium block mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as "low" | "medium" | "high" })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Urgency</label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value as "normal" | "urgent" | "immediate" })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="immediate">Immediate</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="immediate"
              checked={formData.requires_immediate_attention}
              onChange={(e) => setFormData({ ...formData, requires_immediate_attention: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="immediate" className="text-sm font-medium">
              Requires immediate attention
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1 bg-orange-600 hover:bg-orange-700">
              {editingId ? "Update" : "Add"} Task
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
          Add Task
        </Button>
      )}
    </div>
  );
}
