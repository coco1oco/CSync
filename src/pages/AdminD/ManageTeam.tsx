import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  UserCog,
  Loader2,
  X,
  ShieldCheck,
  User,
  Activity,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";

// ✅ SYSTEM ROLE = Permissions (Strict DB Enum)
type SystemRole = "user" | "admin" | "member";

// ✅ POSITIONS = Titles (Display Only)
const OFFICIAL_POSITIONS = ["President", "Vice President", "Member"];

const OFFICIAL_COMMITTEES = [
  "Publicity Committee",
  "Humane Education Committee",
  "Events Committee",
  "Membership Committee",
  "Finance Committee",
];

type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: SystemRole;
  position?: string;
  committee?: string;
  last_sign_in_at?: string;
  created_at?: string;
};

type FormData = {
  role: SystemRole;
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
    role: "member",
    position: "",
    committee: "",
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("first_name", { ascending: true });

      if (error) throw error;
      if (data) setMembers(data as Profile[]);
    } catch (err) {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (member: Profile) => {
    setSelectedMember(member);
    setFormData({
      role: member.role || "member",
      position: member.position || "Member",
      committee: member.committee || "",
    });
    setIsDialogOpen(true);
  };

  const handlePositionChange = (newPosition: string) => {
    let newSystemRole = formData.role;

    if (newPosition === "President") {
      newSystemRole = "admin";
    } else if (newPosition === "Vice President") {
      newSystemRole = "admin";
    } else if (newPosition === "Member") {
      newSystemRole = "member";
    }

    setFormData({
      ...formData,
      position: newPosition,
      role: newSystemRole,
    });
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
          committee: formData.committee || null,
        })
        .eq("id", selectedMember.id);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, ...formData } : m
        )
      );

      toast.success(`Updated permissions for ${selectedMember.first_name}`);
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  // ✅ FIXED: Position Colors now take priority over Admin Role
  const getBadgeStyles = (role: string, position: string) => {
    // 1. High Ranking Officers (Gold & Blue) - CHECK THIS FIRST
    if (position === "President")
      return "bg-amber-100 text-amber-800 border-amber-200";
    if (position === "Vice President")
      return "bg-blue-100 text-blue-700 border-blue-200";

    // 2. System Admins (Purple) - Only if they are NOT President/VP
    if (role === "admin")
      return "bg-purple-100 text-purple-700 border-purple-200";

    // 3. Standard Members (Gray)
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const stats = useMemo(() => {
    const total = members.length;
    const admins = members.filter((m) => m.role === "admin").length;

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const active = members.filter(
      (m) => m.last_sign_in_at && new Date(m.last_sign_in_at) > lastWeek
    ).length;

    const commCounts: Record<string, number> = {};
    members.forEach((m) => {
      const c = m.committee || "Unassigned";
      commCounts[c] = (commCounts[c] || 0) + 1;
    });

    return { total, admins, active, commCounts };
  }, [members]);

  const filteredMembers = members.filter(
    (m) =>
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <ManageTeamSkeleton />;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">Team Management</h1>
          <p className="text-sm text-gray-500">
            Manage organization roles and system access.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* LEFT: Table */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Org Position</th>
                  <th className="px-6 py-4">System Role</th>
                  <th className="px-6 py-4">Committee</th>
                  <th className="px-6 py-4 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50/50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getBadgeStyles(
                          member.role,
                          member.position || ""
                        )}`}
                      >
                        {member.position || "Member"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {member.role === "admin" ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-purple-900">
                              Admin
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">User</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {member.committee || "-"}
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

        {/* RIGHT: ANALYTICS SIDEBAR */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-bold border-b border-gray-100 pb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2>Overview</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-semibold uppercase">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600 font-semibold uppercase">
                  Admins
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.admins}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {stats.active} active recently
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-bold border-b border-gray-100 pb-2">
              <PieChart className="w-5 h-5 text-orange-600" />
              <h2>Committees</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.commCounts).map(([name, count]) => (
                <div
                  key={name}
                  className="flex justify-between items-center text-sm"
                >
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                      name === "Unassigned"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-orange-50 text-orange-800"
                    }`}
                  >
                    {name}
                  </span>
                  <span className="font-bold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
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

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">
                  Organization Position
                </Label>
                <select
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  value={formData.position}
                  onChange={(e) => handlePositionChange(e.target.value)}
                >
                  <option value="">Select Position...</option>
                  {OFFICIAL_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase text-gray-500">
                    System Access Level
                  </Label>
                  <span className="text-[10px] text-gray-400">
                    Controls what they can edit
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "member" })}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      formData.role === "member" || formData.role === "user"
                        ? "border-gray-600 bg-gray-50 ring-1 ring-gray-200"
                        : "border-gray-100 hover:border-gray-200 opacity-60"
                    }`}
                  >
                    <User className="w-5 h-5 mb-1 text-gray-700" />
                    <span className="font-bold text-sm text-gray-800">
                      Member
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Standard View
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "admin" })}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      formData.role === "admin"
                        ? "border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                        : "border-gray-100 hover:border-gray-200 opacity-60"
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 mb-1" />
                    <span className="font-bold text-sm">System Admin</span>
                    <span className="text-[10px] opacity-80">
                      Full Database Access
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">
                  Committee
                </Label>
                <select
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.committee}
                  onChange={(e) =>
                    setFormData({ ...formData, committee: e.target.value })
                  }
                >
                  <option value="">None (General Member)</option>
                  {OFFICIAL_COMMITTEES.map((comm) => (
                    <option key={comm} value={comm}>
                      {comm}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-blue-600 font-medium px-1">
                  * Auto-joins the {formData.committee || "General"} Group Chat
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

function ManageTeamSkeleton() {
  return (
    <div className="space-y-6 pb-24">
      <Skeleton className="h-12 w-48" />
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <div className="xl:col-span-1 space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
