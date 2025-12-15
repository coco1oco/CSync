import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, UserCog, Loader2, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner"; // ✅ Added for feedback

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

type FormData = {
  role: UserRole;
  position: string;
  committee: string;
};

export default function ManageTeam() {
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

  // ✅ AUTOMATIC GROUP ASSIGNMENT LOGIC
  const handleUpdate = async () => {
    if (!selectedMember) return;
    setUpdating(true);

    try {
      // 1. Update Profile Data
      const { error } = await supabase
        .from("profiles")
        .update({
          role: formData.role,
          position: formData.position,
          committee: formData.committee,
        })
        .eq("id", selectedMember.id);

      if (error) throw error;

      // 2. AUTO-ADD TO COMMITTEE GC
      if (formData.committee) {
        const groupName = `${formData.committee} Committee`;

        // Find or Create Group
        let { data: commGroup } = await supabase
          .from("conversations")
          .select("id")
          .eq("name", groupName)
          .maybeSingle();

        if (!commGroup) {
          const { data: newGroup } = await supabase
            .from("conversations")
            .insert([{ name: groupName, is_group: true }])
            .select()
            .single();
          commGroup = newGroup;
        }

        // Add User to Group
        if (commGroup) {
          await supabase.from("conversation_members").upsert(
            {
              conversation_id: commGroup.id,
              user_id: selectedMember.id,
              role: "member", // They are a member of this chat
            },
            { onConflict: "conversation_id,user_id" }
          );
        }
      }

      // 3. AUTO-ADD TO EXECUTIVE BOARD (If President/VP)
      if (formData.position.toLowerCase().includes("president")) {
        const execName = "Executive Board";

        let { data: execGroup } = await supabase
          .from("conversations")
          .select("id")
          .eq("name", execName)
          .maybeSingle();

        if (!execGroup) {
          const { data: newGroup } = await supabase
            .from("conversations")
            .insert([{ name: execName, is_group: true }])
            .select()
            .single();
          execGroup = newGroup;
        }

        if (execGroup) {
          await supabase.from("conversation_members").upsert(
            {
              conversation_id: execGroup.id,
              user_id: selectedMember.id,
              role: "admin", // They have admin rights in this chat
            },
            { onConflict: "conversation_id,user_id" }
          );
        }
      }

      // 4. Update Local State & Close
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, ...formData } : m
        )
      );

      toast.success(
        `Updated ${selectedMember.first_name}'s role & permissions`
      );
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to update role", err);
      toast.error("Failed to update member role.");
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
            Promote members and assign committees.
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

      {/* Edit Modal */}
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
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "user" })}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      formData.role === "user"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <span className="font-semibold text-sm">Member</span>
                    <span className="text-[10px] text-gray-500">
                      Standard Access
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "admin" })}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      formData.role === "admin"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 mb-1" />
                    <span className="font-semibold text-sm">Admin</span>
                    <span className="text-[10px] opacity-80">Full Control</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Organization Position</Label>
                <Input
                  placeholder="e.g. Vice President, Head"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                />
                <p className="text-[10px] text-gray-400">
                  * If "President" is in the title, they will be added to
                  Executive Board chat.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Committee Assignment</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.committee}
                  onChange={(e) =>
                    setFormData({ ...formData, committee: e.target.value })
                  }
                >
                  <option value="">None (General Member)</option>
                  <option value="Publicity">Publicity Committee</option>
                  <option value="Humane Education">
                    Humane Education Committee
                  </option>
                  <option value="Events">Events Committee</option>
                  <option value="Membership">Membership Committee</option>
                  <option value="Finance">Finance Committee</option>
                </select>
                <p className="text-[10px] text-gray-400">
                  * Assigning a committee auto-adds them to its Group Chat.
                </p>
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
                  "Save & Update Permissions"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
