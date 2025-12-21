import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton"; // ✅ Import Skeleton
import {
  Search,
  UserCog,
  Loader2,
  X,
  ShieldCheck,
  Users,
  Activity,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";

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
  last_sign_in_at?: string;
  created_at?: string;
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

      // Auto-Group Logic (Simplified for brevity, keep your full logic here)
      if (formData.committee) {
        /* ... check/create group logic ... */
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, ...formData } : m
        )
      );
      toast.success(`Updated ${selectedMember.first_name}'s permissions`);
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update.");
    } finally {
      setUpdating(false);
    }
  };

  const stats = useMemo(() => {
    const total = members.length;
    const admins = members.filter((m) => m.role === "admin").length;

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const active = members.filter(
      (m) => m.last_sign_in_at && new Date(m.last_sign_in_at) > lastWeek
    ).length;

    const committees: Record<string, number> = {};
    members.forEach((m) => {
      const c = m.committee || "Unassigned";
      committees[c] = (committees[c] || 0) + 1;
    });

    return { total, admins, active, committees };
  }, [members]);

  const filteredMembers = members.filter(
    (m) =>
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ SKELETON LOADING STATE
  if (loading) {
    return (
      <div className="space-y-6 pb-24">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-64 hidden md:block" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Table Skeleton */}
          <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights Skeleton */}
          <div className="xl:col-span-1 space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">Team Management</h1>
          <p className="text-sm text-gray-500">
            Promote members and assign committees.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* LEFT COLUMN: User Table */}
        <div className="xl:col-span-3 space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search members..."
              className="pl-9 bg-white border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

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
        </div>

        {/* RIGHT COLUMN: Insights Panel */}
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
              {stats.active} active in the last 7 days
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-bold border-b border-gray-100 pb-2">
              <PieChart className="w-5 h-5 text-orange-600" />
              <h2>Committees</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.committees).map(([name, count]) => (
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

          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-xl text-white shadow-md">
            <div className="flex items-start gap-3">
              <Users className="w-6 h-6 opacity-80" />
              <div>
                <h3 className="font-bold text-sm">Did you know?</h3>
                <p className="text-xs opacity-90 mt-1 leading-relaxed">
                  Assigning a user to a committee automatically adds them to
                  that committee's Group Chat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
