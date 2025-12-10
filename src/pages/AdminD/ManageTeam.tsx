import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
// ✅ FIXED: Removed missing ShadCN imports to prevent "Module not found" errors
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, UserCog, Loader2, X } from "lucide-react";
import { useAuth } from "@/context/authContext";

type UserRole = "user" | "admin";

type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: UserRole;
  position?: string;
  committee?: string;
};

// ✅ FIXED: Strict typing to prevent "Argument of type..." errors
type FormData = {
  role: UserRole;
  position: string;
  committee: string;
};

export default function ManageTeam() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    role: "user",
    position: "",
    committee: "",
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("first_name", { ascending: true });

    if (!error && data) {
      setMembers(data as Profile[]);
    }
    setLoading(false);
  };

  const handleEditClick = (member: Profile) => {
    setSelectedMember(member);
    setFormData({
      role: member.role || "user",
      position: member.position || "",
      committee: member.committee || "",
    });
    setIsDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedMember) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: formData.role,
          position: formData.position,
          committee: formData.committee,
        })
        .eq("id", selectedMember.id);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, ...formData } : m
        )
      );
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Failed to update role", err);
      alert("Failed to update member role.");
    } finally {
      setUpdating(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">Team Management</h1>
          <p className="text-sm text-gray-500">
            Manage roles, committees, and access permissions.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search members..."
            className="pl-9 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Position / Committee</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-xs text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {member.role === "admin" ? "Admin" : "Member"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 font-medium">
                      {member.position || "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.committee || "No Committee"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(member)}
                      className="hover:bg-gray-100 rounded-full"
                    >
                      <UserCog className="w-4 h-4 text-gray-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal (Standard Tailwind) */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">Edit Member</h3>
              <button
                onClick={() => setIsDialogOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>System Role</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as UserRole,
                    })
                  }
                >
                  <option value="user">Member (Restricted Access)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
                <p className="text-[10px] text-gray-500">
                  Admins can manage events, pets, and other members.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Organization Position</Label>
                <Input
                  placeholder="e.g. Vice President"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Committee</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.committee}
                  onChange={(e) =>
                    setFormData({ ...formData, committee: e.target.value })
                  }
                >
                  <option value="">None</option>
                  <option value="Executive Board">Executive Board</option>
                  <option value="Publicity">Publicity Committee</option>
                  <option value="Humane Education">
                    Humane Education Committee
                  </option>
                  <option value="Events">Events Committee</option>
                  <option value="Membership">Membership Committee</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
