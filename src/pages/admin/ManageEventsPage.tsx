import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Loader2,
  ChevronRight,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Trash2,
  Lock,
  Unlock,
  BellRing,
  Edit,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isPast } from "date-fns";
import { toast } from "sonner";

// Services
import { notifyAttendees, notifyRegistrationUpdate } from "@/lib/NotificationService";

// Components
import { SendNotificationModal } from "@/components/SendNotificationModal";

// Types
type EventSummary = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  max_attendees: number | null;
  registered_count: number;
  checked_in_count: number;
  is_hidden: boolean;
  event_type: string;
};

type Attendee = {
  id: string;
  user_id: string;
  user: {
    first_name: string;
    last_name: string;
    username: string;
    avatar_url: string | null;
  };
  pet?: {
    name: string;
    species: string;
  };
  status: "pending" | "approved" | "rejected" | "checked_in" | "waitlist";
  created_at: string;
};

export default function ManageEventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection & Detail State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
  const [eventDeadline, setEventDeadline] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"guests" | "analytics">("guests");
  const [guestFilter, setGuestFilter] = useState<"all" | "going" | "waitlist" | "rejected">("all");

  // Notification Modal State
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  useEffect(() => {
    if (user) fetchEvents();
  }, [user]);

  const fetchEvents = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: eventData, error } = await supabase
        .from("outreach_events")
        .select("id, title, event_date, location, max_attendees, event_type, is_hidden")
        .in("event_type", ["official", "pet", "member", "campus"])
        .order("event_date", { ascending: false });

      if (error) throw error;

      const eventsWithCounts = await Promise.all(
        (eventData || []).map(async (ev) => {
          const { count: regCount } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", ev.id);

          const { count: checkInCount } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", ev.id)
            .eq("status", "checked_in");

          return {
            ...ev,
            registered_count: regCount || 0,
            checked_in_count: checkInCount || 0,
            is_hidden: ev.is_hidden || false,
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load events");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure? This will delete the event and all guest data.")) return;
    setEvents(prev => prev.filter(e => e.id !== eventId)); // Optimistic
    const { error } = await supabase.from('outreach_events').delete().eq('id', eventId);
    if (error) {
        toast.error("Failed to delete event");
        fetchEvents(true);
    } else {
        toast.success("Event deleted");
    }
  };

  const handleToggleHide = async (eventId: string, currentStatus: boolean) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, is_hidden: !currentStatus } : e)); // Optimistic
    const { error } = await supabase
        .from('outreach_events')
        .update({ is_hidden: !currentStatus })
        .eq('id', eventId);
    if (error) {
        toast.error("Update failed");
        fetchEvents(true);
    } else {
        toast.success(currentStatus ? "Event is now visible" : "Event hidden");
    }
  };

  const handleEditEvent = (event: EventSummary) => {
      navigate(`/admin/events/edit-official/${event.id}`);
  };

  const fetchAttendees = async (eventId: string, title: string) => {
    setSelectedEventId(eventId);
    setSelectedEventTitle(title);
    setLoadingAttendees(true);
    setGuestFilter("all"); 
    setSearchQuery("");

    try {
      const { data: eventData } = await supabase
        .from("outreach_events")
        .select("registration_closed_manually, registration_deadline")
        .eq("id", eventId)
        .single();
      
      if (eventData) {
        setIsRegistrationClosed(eventData.registration_closed_manually || false);
        setEventDeadline(eventData.registration_deadline ? new Date(eventData.registration_deadline) : null);
      }

      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          id, status, created_at, user_id,
          user:profiles(first_name, last_name, username, avatar_url),
          pet:pets(name, species)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setAttendees(data as any);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load guest list");
    } finally {
      setLoadingAttendees(false);
    }
  };

  const toggleRegistrationStatus = async () => {
    if (!selectedEventId) return;
    const newValue = !isRegistrationClosed;
    setIsRegistrationClosed(newValue);

    try {
      const { error } = await supabase
        .from("outreach_events")
        .update({ registration_closed_manually: newValue })
        .eq("id", selectedEventId);

      if (error) throw error;
      toast.success(newValue ? "Registration closed manually" : "Registration reopened");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
      setIsRegistrationClosed(!newValue);
    }
  };

  // --- NOTIFICATION HANDLER ---
  const handleSendNotification = async (message: string) => {
    if (!selectedEventId || !user) return;

    try {
      await notifyAttendees(
        selectedEventId, 
        selectedEventTitle, 
        message, 
        user.id
      );
      toast.success("Update sent to all guests!");
      setIsNotificationModalOpen(false); // Close modal on success
    } catch (error) {
      console.error(error);
      toast.error("Failed to send notification.");
    }
  };

  // --- GUEST MANAGEMENT HANDLERS ---
  const handleCheckIn = async (registrationId: string, currentStatus: string) => {
    const attendee = attendees.find(a => a.id === registrationId);
    if (!attendee) return;

    const newStatus = currentStatus === "checked_in" ? "approved" : "checked_in";
    const isCheckingIn = newStatus === "checked_in";

    setAttendees((prev) => prev.map((a) => a.id === registrationId ? { ...a, status: newStatus } : a));
    
    const { error } = await supabase.from("event_registrations").update({ status: newStatus }).eq("id", registrationId);
    
    if (error) {
      toast.error("Failed to save check-in");
      fetchAttendees(selectedEventId!, selectedEventTitle);
    } else {
      if (isCheckingIn) {
        toast.success("Checked in!");
        notifyRegistrationUpdate(attendee.user_id, selectedEventId!, selectedEventTitle, "checked_in", user!.id);
      }
    }
  };

 const handlePromote = async (registrationId: string) => {
    const attendee = attendees.find(a => a.id === registrationId);
    if (!attendee) return;

    // 1. Optimistic Update: Change status to 'approved' (NOT 'waitlist')
    setAttendees((prev) => prev.map((a) => a.id === registrationId ? { ...a, status: "approved" } : a));
    
    // 2. Switch tab to 'Going' so you can see where they went
    if (guestFilter === "rejected" || guestFilter === "waitlist") {
        setGuestFilter("going");
    }
    
    toast.success("Guest approved/restored!");
    
    // 3. Database Update
    const { error } = await supabase.from("event_registrations").update({ status: "approved" }).eq("id", registrationId);
    
    if (!error) {
        notifyRegistrationUpdate(attendee.user_id, selectedEventId!, selectedEventTitle, "approved", user!.id);
    } else {
        toast.error("Failed to approve guest");
        fetchAttendees(selectedEventId!, selectedEventTitle); // Revert on error
    }
  };

 const handleDemote = async (registrationId: string) => {
    const attendee = attendees.find(a => a.id === registrationId);
    if (!attendee) return;

    // 1. Optimistic Update
    setAttendees((prev) => prev.map((a) => a.id === registrationId ? { ...a, status: "waitlist" } : a));
    
    // 2. Switch tab so the admin sees where the user went
    setGuestFilter("waitlist"); 
    toast.success("Guest moved to waitlist");
    
    // 3. Database Update
    const { error } = await supabase.from("event_registrations").update({ status: "waitlist" }).eq("id", registrationId);

    if (error) {
        toast.error("Failed to move guest");
        // Revert optimistic update on error
        setAttendees((prev) => prev.map((a) => a.id === registrationId ? { ...a, status: "approved" } : a));
    } else {
        // 4. Send Notification
        notifyRegistrationUpdate(
            attendee.user_id, 
            selectedEventId!, 
            selectedEventTitle, 
            "waitlist", // Triggers 'Waitlist Update' notification
            user!.id
        );
    }
  };

 const handleRemove = async (registrationId: string) => {
    const attendeeToRemove = attendees.find(a => a.id === registrationId);
    if (!attendeeToRemove) return;
    
    if (!confirm("Are you sure you want to remove this guest? This action cannot be undone.")) return;

    // 1. Database Delete
    const { error } = await supabase.from("event_registrations").delete().eq("id", registrationId);

    if (error) {
      toast.error("Failed to remove guest");
      return;
    }

    // 2. Local State Update
    setAttendees(prev => prev.filter(a => a.id !== registrationId));
    toast.success("Guest removed from list");

    // 3. Notify the removed user
    notifyRegistrationUpdate(
      attendeeToRemove.user_id,
      selectedEventId!,
      selectedEventTitle,
      "removed", // Triggers 'Removed from Guest List' notification
      user!.id
    );
  };

  const handleReject = async (registrationId: string) => {
    const attendee = attendees.find(a => a.id === registrationId);
    if (!attendee) return;

    if (!confirm("Are you sure you want to reject this registration?")) return;

    // 1. Optimistic Update
    setAttendees((prev) => prev.map((a) => a.id === registrationId ? { ...a, status: "rejected" } : a));

    // 2. Database Update
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "rejected" })
      .eq("id", registrationId);

    if (error) {
      toast.error("Failed to reject guest");
      fetchAttendees(selectedEventId!, selectedEventTitle); // Revert
    } else {
      toast.success("Registration rejected");
      
      // 3. Notify User
      notifyRegistrationUpdate(
        attendee.user_id,
        selectedEventId!,
        selectedEventTitle,
        "rejected", // Triggers 'Registration Declined' notification
        user!.id
      );
    }
  };

 const closeDetail = () => {
    setSelectedEventId(null);
    setAttendees([]);
    setSearchQuery("");
    setActiveTab("guests");
    fetchEvents(true);
 };

  // Stats & Filtering
  const waitlistCount = attendees.filter(a => a.status === 'waitlist').length;
  const goingCount = attendees.filter(a => ['approved', 'checked_in'].includes(a.status)).length;
  const checkedInCount = attendees.filter(a => a.status === 'checked_in').length;

  const filteredAttendees = attendees.filter((a) => {
    const matchesSearch =
      a.user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user.username?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (guestFilter === "going") return ["approved", "checked_in"].includes(a.status);
    if (guestFilter === "waitlist") return a.status === "waitlist";
    if (guestFilter === "rejected") return a.status === "rejected";
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg text-gray-900">Manage Events</h1>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-4xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12"> <Loader2 className="w-8 h-8 animate-spin text-blue-600" /> </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900">No events found</h3>
            <Button onClick={() => navigate("/admin/events/new-official")}>Create Event</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div 
                key={event.id} 
                onClick={() => fetchAttendees(event.id, event.title)} 
                className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative ${event.is_hidden ? 'opacity-70 bg-gray-50' : ''}`}
              >
                
                {/* Actions Dropdown */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button 
                                onClick={(e) => e.stopPropagation()} 
                                className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-full text-gray-400 hover:text-blue-600 hover:border-blue-200"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 z-20 bg-white">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleHide(event.id, event.is_hidden); }}>
                                {event.is_hidden ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                                {event.is_hidden ? "Unhide" : "Hide"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} 
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                {/* Hidden Badge */}
                {event.is_hidden && (
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-bold rounded uppercase">
                        Hidden
                    </div>
                )}

                {/* Card Content */}
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-blue-50 text-blue-700 font-bold text-xs px-2 py-1 rounded-md uppercase tracking-wide">
                    {event.event_date ? format(new Date(event.event_date), "MMM d") : "TBD"}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                </div>
                
                <h3 className="font-bold text-gray-900 line-clamp-1 mb-1">{event.title}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-4"><MapPin className="w-3 h-3" /> {event.location}</p>
                
                <div className="flex items-center gap-4 text-sm border-t border-gray-50 pt-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-400 font-bold">Registered</span>
                    <span className="font-bold text-gray-900">{event.registered_count}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-400 font-bold">Checked In</span>
                    <span className="font-bold text-green-600">{event.checked_in_count}</span>
                  </div>
                </div>
                
                <div className="h-1 w-full bg-gray-100 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (event.checked_in_count / (event.registered_count || 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-over Detail Panel */}
      {selectedEventId && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in" onClick={closeDetail} />
          
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="bg-white border-b border-gray-100 p-6 pb-0">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                        <h2 className="font-bold text-xl text-gray-900 leading-tight pr-4">{selectedEventTitle}</h2>
                        
                        {/* SEND UPDATE BUTTON */}
                        <button 
                            onClick={() => setIsNotificationModalOpen(true)}
                            className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors w-fit"
                        >
                            <BellRing size={14} /> Send Update to Guests
                        </button>
                    </div>
                    <Button variant="ghost" size="icon" onClick={closeDetail}><XCircle className="w-6 h-6 text-gray-300" /></Button>
                </div>

                {/* Stats */}
                <div className="flex gap-6 mb-6 mt-4">
                    <div><p className="text-3xl font-black text-gray-900">{goingCount}</p><p className="text-xs font-bold text-gray-400 uppercase">Going</p></div>
                    <div><p className="text-3xl font-black text-amber-500">{waitlistCount}</p><p className="text-xs font-bold text-amber-500/70 uppercase">Waitlist</p></div>
                    <div><p className="text-3xl font-black text-green-600">{checkedInCount}</p><p className="text-xs font-bold text-green-600/70 uppercase">Checked In</p></div>
                </div>

                {/* Open/Close Toggle */}
                {(() => {
                    const isDeadlinePassed = eventDeadline ? isPast(eventDeadline) : false;
                    const isActuallyClosed = isRegistrationClosed || isDeadlinePassed;
                    return (
                    <div className={`flex items-center justify-between p-4 rounded-xl mb-6 border transition-colors ${isActuallyClosed ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                        <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isActuallyClosed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {isActuallyClosed ? <Lock size={18} /> : <Unlock size={18} />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">
                            {isDeadlinePassed ? "Registration Closed (Deadline)" : isRegistrationClosed ? "Registration Closed" : "Registration Open"}
                            </p>
                            <p className="text-xs text-gray-500">
                            {isDeadlinePassed ? "The deadline has passed. No new signups." : isRegistrationClosed ? "You manually closed registration." : "Accepting new guests and waitlist."}
                            </p>
                        </div>
                        </div>
                        <button 
                        onClick={isDeadlinePassed ? undefined : toggleRegistrationStatus} 
                        disabled={isDeadlinePassed}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActuallyClosed ? 'bg-red-500' : 'bg-green-500'} ${isDeadlinePassed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActuallyClosed ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    );
                })()}
                
                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-100">
                    <button onClick={() => setActiveTab("guests")} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "guests" ? "border-black text-black" : "border-transparent text-gray-400"}`}>Guests</button>
                    <button onClick={() => setActiveTab("analytics")} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "analytics" ? "border-black text-black" : "border-transparent text-gray-400"}`}>Insights</button>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                {activeTab === "guests" ? (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                      <button onClick={() => setGuestFilter("all")} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${guestFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>All Guests</button>
                      <button onClick={() => setGuestFilter("going")} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${guestFilter === 'going' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>Going ({goingCount})</button>
                      <button onClick={() => setGuestFilter("waitlist")} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${guestFilter === 'waitlist' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200'}`}>Waitlist ({waitlistCount})</button>
                      <button onClick={() => setGuestFilter("rejected")} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${guestFilter === 'rejected' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'}`}>Rejected</button>
                  </div>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search guests..." className="pl-9 bg-white border-gray-200" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  {loadingAttendees ? ( <div className="flex justify-center py-10"> <Loader2 className="animate-spin text-gray-400" /> </div> ) : filteredAttendees.length === 0 ? ( <div className="text-center py-10 text-gray-400"> No guests found. </div> ) : (
                    <div className="space-y-2">
                        {filteredAttendees.map((a) => (
                            <div key={a.id} className={`p-3 rounded-xl border flex items-center gap-3 shadow-sm transition-all ${a.status === 'waitlist' ? 'bg-amber-50/50 border-amber-100' : a.status === 'rejected' ? 'bg-red-50/30 border-red-100 opacity-60 grayscale-[0.5]' : 'bg-white border-gray-100'}`}>
                                <img src={a.user.avatar_url || "/default-avatar.png"} className="w-10 h-10 rounded-full bg-gray-100 object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 text-sm truncate">{a.user.first_name} {a.user.last_name}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="truncate">@{a.user.username}</span>
                                        {a.pet && ( <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold truncate max-w-[100px]">+ {a.pet.name}</span> )}
                                        {a.status === 'waitlist' && ( <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Waitlist</span> )}
                                        {a.status === 'rejected' && ( <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Rejected</span> )}
                                    </div>
                                </div>
                                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                                   {a.status === "waitlist" ? (
        // Case 1: Waitlist -> Show Approve
        <button 
            onClick={() => handlePromote(a.id)} 
            className="shrink-0 w-24 h-9 rounded-lg font-bold text-xs bg-amber-500 text-white hover:bg-amber-600 transition-all active:scale-95 shadow-sm"
        >
            Approve
        </button>
    ) : a.status === "rejected" ? (
        // Case 2: Rejected -> Show Text Only (Forces use of Dropdown to Restore)
        <span className="shrink-0 w-24 text-center text-xs font-bold text-red-400">
            Declined
        </span>
    ) : (
        // Case 3: Approved OR Checked In -> Show Check In Button
        <button 
            onClick={() => handleCheckIn(a.id, a.status)} 
            className={`shrink-0 w-24 h-9 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 ${
                a.status === "checked_in" 
                ? "bg-green-100 text-green-700 border border-green-200" 
                : "bg-black text-white hover:bg-gray-800"
            }`}
        >
            {a.status === "checked_in" ? ( 
                <> <CheckCircle2 className="w-3.5 h-3.5" /> In </> 
            ) : ( 
                "Check In" 
            )}
        </button>
    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="h-9 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 focus:outline-none transition-colors"><MoreHorizontal className="w-4 h-4" /></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-white z-110">
                                            
                                            {/* --- APPROVED ACTIONS --- */}
                                            {a.status === "approved" && (
                                                <>
                                                    <DropdownMenuItem onClick={() => handleDemote(a.id)} className="text-geo-600 focus:text-amber-700 focus:bg-amber-50">
                                                      <XCircle className="w-3.5 h-3.5 mr-2" />
                                                        <span className="text-xs font-medium">Move to Waitlist</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleReject(a.id)} className="text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                                                        <XCircle className="w-3.5 h-3.5 mr-2" />
                                                        <span className="text-xs font-medium">Reject</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            {/* --- REJECTED ACTIONS --- */}
                                        {a.status === "rejected" && (
                                            <>
                                                {/* Option 1: Restore directly to GOING */}
                                                <DropdownMenuItem onClick={() => handlePromote(a.id)}>
                                                    <Unlock className="w-3.5 h-3.5 mr-2" />
                                                    <span className="text-xs font-medium">Restore to Going</span>
                                                </DropdownMenuItem>

                                                {/* Option 2: Restore back to WAITLIST */}
                                                {/* We reuse handleDemote because it sets status="waitlist" */}
                                                <DropdownMenuItem onClick={() => handleDemote(a.id)}>
                                                    <Unlock className="w-3.5 h-3.5 mr-2" />
                                                    <span className="text-xs font-medium">Restore to Waitlist</span>
                                                </DropdownMenuItem>
                                            </>
)}

                                            {/* --- WAITLIST ACTIONS --- */}
                                            {a.status === "waitlist" && (
                                                <>
                                                    <DropdownMenuItem onClick={() => handleReject(a.id)} className="text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                                                        <XCircle className="w-3.5 h-3.5 mr-2" />
                                                        <span className="text-xs font-medium">Reject</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            {/* --- GLOBAL ACTIONS --- */}
                                            <DropdownMenuItem onClick={() => handleRemove(a.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                <span className="text-xs font-medium">Remove Completely</span>
                                            </DropdownMenuItem>

                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                  )}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400"><p>Analytics features coming soon!</p></div>
                )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white"><Button className="w-full gap-2" variant="outline" disabled={attendees.length === 0}><Download className="w-4 h-4" /> Export Guest List (CSV)</Button></div>
          </div>
        </div>
      )}

      {/* NOTIFICATION MODAL */}
      <SendNotificationModal 
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onSend={handleSendNotification}
        eventTitle={selectedEventTitle}
       />
    </div>
  );
}