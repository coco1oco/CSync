import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/authContext"; // ✅ Added Import
import {
  Search,
  UserCog,
  Loader2,
  X,
  ShieldCheck,
  User,
  Activity,
  Ban,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// ✅ SYSTEM ROLE (Strict DB Enum)
type SystemRole = "user" | "admin" | "member";

// ✅ POSITIONS
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
  first_name: string | null;
  last_name: string | null;
  username: string;
  role: SystemRole;
  position?: string;
  committee?: string;
  last_sign_in_at?: string;
  created_at?: string;
  avatar_url?: string;
  banned_at?: string | null;
  deleted_at?: string | null;
};

type FormData = {
  role: SystemRole;
  position: string;
  committee: string;
};

export default function ManageTeam() {
  const { user: currentUser } = useAuth(); // ✅ Get Current Admin
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [confirmAction, setConfirmAction] = useState<"ban" | "delete" | null>(
    null
  );
  const [isProcessingAction, setIsProcessingAction] = useState(false);

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
        .is("deleted_at", null)
        .order("first_name", { ascending: true });

      if (error) throw error;
      if (data) setMembers(data as Profile[]);
    } catch (err) {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  // ✅ HELPER: Send Notification
  const sendSystemNotification = async (
    targetUserId: string,
    title: string,
    body: string
  ) => {
    if (!currentUser) return;

    // We use 'message' type for system alerts based on your DB constraints
    const { error } = await supabase.from("notifications").insert({
      user_id: targetUserId,
      from_user_id: currentUser.id,
      type: "system",
      title: title,
      body: body,
      is_unread: true,
    });

    if (error) console.error("Failed to send notification:", error);
  };

  const handleEditClick = (member: Profile) => {
    setSelectedMember(member);
    setFormData({
      role: member.role || "member",
      position: member.position || "Member",
      committee: member.committee || "",
    });
    setConfirmAction(null);
    setIsDialogOpen(true);
  };

  const handlePositionChange = (newPosition: string) => {
    let newSystemRole = formData.role;
    if (newPosition === "President" || newPosition === "Vice President") {
      newSystemRole = "admin";
    } else if (newPosition === "Member") {
      newSystemRole = "member";
    }
    setFormData({ ...formData, position: newPosition, role: newSystemRole });
  };

  const handleUpdate = async () => {
    if (!selectedMember || !currentUser) return;
    setUpdating(true);
    try {
      // 1. Update Database
      const { error } = await supabase
        .from("profiles")
        .update({
          role: formData.role,
          position: formData.position,
          committee: formData.committee || null,
        })
        .eq("id", selectedMember.id);

      if (error) throw error;

      // 2. ✅ Check & Send Notifications
      const notificationsToSend = [];

      // A. Admin Status Changed
      if (selectedMember.role !== formData.role) {
        if (formData.role === "admin") {
          notificationsToSend.push(
            sendSystemNotification(
              selectedMember.id,
              "Role Updated",
              "You have been promoted to Admin."
            )
          );
        } else if (selectedMember.role === "admin") {
          notificationsToSend.push(
            sendSystemNotification(
              selectedMember.id,
              "Role Updated",
              "Your Admin privileges have been revoked."
            )
          );
        }
      }

      // B. Position Changed
      if (selectedMember.position !== formData.position && formData.position) {
        notificationsToSend.push(
          sendSystemNotification(
            selectedMember.id,
            "New Position",
            `Your position is now: ${formData.position}.`
          )
        );
      }

      // C. Committee Changed
      if (selectedMember.committee !== formData.committee) {
        if (formData.committee) {
          notificationsToSend.push(
            sendSystemNotification(
              selectedMember.id,
              "Committee Assignment",
              `You have been added to the ${formData.committee}.`
            )
          );
        } else if (selectedMember.committee) {
           notificationsToSend.push(
            sendSystemNotification(
              selectedMember.id,
              "Committee Update",
              `You have been removed from the ${selectedMember.committee}.`
            )
          );
        }
      }

      await Promise.all(notificationsToSend);

      // 3. Update Local State
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, ...formData } : m
        )
      );

      toast.success(`Updated ${selectedMember.first_name}`);
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  // ... (Rest of executeConfirmationAction, getBadgeStyles, stats, etc. remains the same) ...
  // ✅ EXECUTE ACTION (Ban or Delete)
  const executeConfirmationAction = async () => {
    if (!selectedMember || !confirmAction) return;
    setIsProcessingAction(true);

    try {
      if (confirmAction === "ban") {
        // Toggle Ban Status using TIMESTAMP
        const isBanned = !!selectedMember.banned_at;
        const updates = {
          banned_at: isBanned ? null : new Date().toISOString(),
        };

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", selectedMember.id);

        if (error) throw error;

        setMembers((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id ? { ...m, ...updates } : m
          )
        );

        toast.success(
          isBanned
            ? `${selectedMember.first_name} has been unbanned.`
            : `${selectedMember.first_name} has been banned.`
        );
      } else if (confirmAction === "delete") {
        // Soft Delete using TIMESTAMP
        const updates = {
          deleted_at: new Date().toISOString(),
          banned_at: new Date().toISOString(), // Optional: also ban them just in case
        };

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", selectedMember.id);

        if (error) throw error;

        // Remove from local list immediately
        setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
        toast.success("User account deleted successfully.");
      }

      setIsDialogOpen(false);
      setConfirmAction(null);
    } catch (err: any) {
      console.error(err);
      toast.error(`Action failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const getBadgeStyles = (
    isBanned: boolean,
    role: string,
    position: string
  ) => {
    if (isBanned) return "bg-red-100 text-red-700 border-red-200";
    if (position === "President")
      return "bg-amber-100 text-amber-800 border-amber-200";
    if (position === "Vice President")
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (role === "admin")
      return "bg-purple-100 text-purple-700 border-purple-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const stats = useMemo(() => {
    const total = members.length;
    const admins = members.filter((m) => m.role === "admin").length;
    const banned = members.filter((m) => m.banned_at).length; // ✅ Use banned_at
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const active = members.filter(
      (m) => m.last_sign_in_at && new Date(m.last_sign_in_at) > lastWeek
    ).length;
    return { total, admins, active, banned };
  }, [members]);

  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    const fullName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
    const email = m.email?.toLowerCase() || "";
    return fullName.includes(term) || email.includes(term);
  });

  const getInitials = (first: string | null, last: string | null) => {
    const f = first ? first[0] : "";
    const l = last ? last[0] : "";
    return (f + l).toUpperCase() || "?";
  };

  const getDisplayName = (
    first: string | null,
    last: string | null,
    email: string
  ) => {
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    return email.split("@")[0];
  };

  if (loading) return <ManageTeamSkeleton />;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-950 tracking-tight">
            Team Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage organization roles and system access.
          </p>
        </div>
        <div className="w-full md:w-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full md:w-64 bg-white border-gray-200 focus:ring-blue-500 rounded-xl"
          />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">
              Total Users
            </p>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Admins</p>
            <p className="text-xl font-bold text-gray-900">{stats.admins}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-full">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Banned</p>
            <p className="text-xl font-bold text-gray-900">{stats.banned}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Active</p>
            <p className="text-xl font-bold text-gray-900">{stats.active}</p>
          </div>
        </div>
      </div>

      {/* MEMBER TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">System Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member) => {
                const isBanned = !!member.banned_at;
                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-gray-50/50 transition group ${
                      isBanned ? "bg-red-50/30" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            isBanned
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {getInitials(member.first_name, member.last_name)}
                        </div>
                        <div>
                          <div
                            className={`font-bold ${
                              isBanned
                                ? "text-red-600 line-through"
                                : "text-gray-900"
                            }`}
                          >
                            {getDisplayName(
                              member.first_name,
                              member.last_name,
                              member.email
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getBadgeStyles(
                          isBanned,
                          member.role,
                          member.position || ""
                        )}`}
                      >
                        {isBanned
                          ? "Banned"
                          : member.position || member.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isBanned ? (
                        <div className="flex items-center gap-1.5 text-red-600 font-medium">
                          <Ban className="w-4 h-4" /> Suspended
                        </div>
                      ) : member.role === "admin" ? (
                        <div className="flex items-center gap-1.5 text-purple-600 font-medium">
                          <ShieldCheck className="w-4 h-4" /> Admin
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-green-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Active
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(member)}
                        className="hover:bg-gray-100 rounded-full"
                      >
                        <UserCog className="w-4 h-4 text-gray-400" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* === EDIT / CONFIRMATION MODAL === */}
      {isDialogOpen && selectedMember && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* CONDITIONAL CONTENT: SHOW CONFIRMATION OR EDIT FORM */}
            {confirmAction ? (
              // === CONFIRMATION VIEW ===
              <div className="p-6 text-center">
                <div
                  className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 ${
                    confirmAction === "delete"
                      ? "bg-red-100 text-red-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {confirmAction === "delete"
                    ? "Delete User Account?"
                    : !!selectedMember.banned_at
                    ? "Restore User Access?"
                    : "Suspend User Account?"}
                </h3>

                <p className="text-sm text-gray-500 mb-6">
                  {confirmAction === "delete"
                    ? `Are you sure you want to delete ${selectedMember.first_name}? This action cannot be undone and will prevent them from accessing the app.`
                    : !!selectedMember.banned_at
                    ? `This will restore ${selectedMember.first_name}'s ability to log in and use the app.`
                    : `This will immediately block ${selectedMember.first_name} from logging in. You can unban them later.`}
                </p>

                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmAction(null)}
                    disabled={isProcessingAction}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={
                      confirmAction === "delete" || !selectedMember.banned_at
                        ? "destructive"
                        : "default"
                    }
                    onClick={executeConfirmationAction}
                    disabled={isProcessingAction}
                    className={`flex-1 ${
                      confirmAction === "ban" && !!selectedMember.banned_at
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : ""
                    }`}
                  >
                    {isProcessingAction && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    {confirmAction === "delete"
                      ? "Yes, Delete"
                      : !!selectedMember.banned_at
                      ? "Yes, Restore"
                      : "Yes, Suspend"}
                  </Button>
                </div>
              </div>
            ) : (
              // === EDIT FORM VIEW ===
              <>
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                  <h3 className="font-bold text-lg text-gray-900">
                    Edit Member
                  </h3>
                  <button
                    onClick={() => setIsDialogOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-gray-500">
                        Org Position
                      </Label>
                      <select
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm"
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
                      <Label className="text-xs font-bold uppercase text-gray-500">
                        System Role
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, role: "member" })
                          }
                          className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                            formData.role === "member"
                              ? "border-gray-600 bg-gray-50"
                              : "border-gray-100 opacity-60"
                          }`}
                        >
                          <User className="w-5 h-5 mb-1" />
                          <span className="font-bold text-sm">Member</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, role: "admin" })
                          }
                          className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                            formData.role === "admin"
                              ? "border-purple-600 bg-purple-50 text-purple-700"
                              : "border-gray-100 opacity-60"
                          }`}
                        >
                          <ShieldCheck className="w-5 h-5 mb-1" />
                          <span className="font-bold text-sm">Admin</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-gray-500">
                        Committee
                      </Label>
                      <select
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm"
                        value={formData.committee}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            committee: e.target.value,
                          })
                        }
                      >
                        <option value="">None (General Member)</option>
                        {OFFICIAL_COMMITTEES.map((comm) => (
                          <option key={comm} value={comm}>
                            {comm}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* DANGER ZONE */}
                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-4 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-wide">
                        Danger Zone
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* BAN BUTTON TRIGGER */}
                      <button
                        onClick={() => setConfirmAction("ban")}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          selectedMember.banned_at
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-orange-50 border-orange-200 text-orange-700"
                        }`}
                      >
                        <div className="text-left">
                          <span className="block font-bold text-sm">
                            {selectedMember.banned_at
                              ? "Restore Access"
                              : "Suspend Account"}
                          </span>
                          <span className="text-[10px] opacity-80">
                            {selectedMember.banned_at
                              ? "User can log in again"
                              : "User cannot log in"}
                          </span>
                        </div>
                        <Ban className="w-5 h-5" />
                      </button>

                      {/* DELETE BUTTON TRIGGER */}
                      <button
                        onClick={() => setConfirmAction("delete")}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all"
                      >
                        <div className="text-left">
                          <span className="block font-bold text-sm">
                            Delete Account
                          </span>
                          <span className="text-[10px] opacity-80">
                            Permanently remove data
                          </span>
                        </div>
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="rounded-xl h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11"
                  >
                    {updating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ManageTeamSkeleton() {
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* 1. Header Skeleton (Title + Search) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" /> {/* Title */}
          <Skeleton className="h-4 w-64" /> {/* Subtitle */}
        </div>
        <Skeleton className="h-11 w-full md:w-64 rounded-xl" /> {/* Search Input */}
      </div>

      {/* 2. Stats Grid Skeleton (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" /> {/* Icon */}
            <div className="space-y-2 w-full">
              <Skeleton className="h-3 w-20" /> {/* Label */}
              <Skeleton className="h-6 w-12" /> {/* Number */}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Table Skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between">
           <Skeleton className="h-4 w-32" />
           <Skeleton className="h-4 w-24 hidden md:block" />
           <Skeleton className="h-4 w-32 hidden md:block" />
           <Skeleton className="h-4 w-16" />
        </div>
        
        {/* Table Rows */}
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
              {/* Name Column */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>

              {/* Other Columns (Hidden on small screens for realism) */}
              <Skeleton className="h-6 w-24 rounded-full hidden md:block" /> {/* Role Badge */}
              <Skeleton className="h-4 w-24 hidden md:block" /> {/* Status */}
              
              {/* Action Button */}
              <Skeleton className="w-8 h-8 rounded-full shrink-0" /> 
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}