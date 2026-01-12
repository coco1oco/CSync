import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { ArrowLeft, Loader2, Search, Plus, Calendar, Trophy } from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Services & Hooks
import { notifyRegistrationUpdate } from "@/lib/NotificationService";
import { useAdminChallenges } from "@/hooks/useChallenges";
import { notifyAttendees } from "@/lib/NotificationService";

// Components
import { SendNotificationModal } from "@/components/SendNotificationModal";

import { EventCard, type EventSummary } from "./EventCard";
import { ChallengeCard } from "./ChallengeCard";
import { EventDetailPanel } from "./EventDetailPanel";

export default function ManageEventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- STATE ---
  const [viewMode, setViewMode] = useState<"events" | "challenges">("events");
  const { data: challenges, isLoading: loadingChallenges } = useAdminChallenges();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Detail Panel
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState(""); 
  const [eventSearch, setEventSearch] = useState(""); 
  const [activeTab, setActiveTab] = useState<"guests" | "analytics">("guests");
  const [guestFilter, setGuestFilter] = useState<"all" | "going" | "waitlist" | "rejected">("all");

  // Modals & Status
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
  const [eventDeadline, setEventDeadline] = useState<Date | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  useEffect(() => {
    if (user) fetchEvents();
  }, [user]);

  // --- FETCHING ---
  const fetchEvents = async (silent = false) => {
    if (!silent) setLoadingEvents(true);
    try {
      const { data: eventData, error } = await supabase
        .from("outreach_events")
        .select("id, title, event_date, location, max_attendees, event_type, is_hidden, images")
        .in("event_type", ["official", "pet", "member", "campus"])
        .order("event_date", { ascending: false });

      if (error) throw error;

      const eventsWithCounts = await Promise.all(
        (eventData || []).map(async (ev) => {
          const { count: regCount } = await supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("event_id", ev.id);
          const { count: checkInCount } = await supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("event_id", ev.id).eq("status", "checked_in");
          return { ...ev, registered_count: regCount || 0, checked_in_count: checkInCount || 0, is_hidden: ev.is_hidden || false };
        })
      );
      setEvents(eventsWithCounts as EventSummary[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load events");
    } finally {
      if (!silent) setLoadingEvents(false);
    }
  };

  const fetchAttendees = async (eventId: string, title: string) => {
    setSelectedEventId(eventId);
    setSelectedEventTitle(title);
    setLoadingAttendees(true);
    setGuestFilter("all"); 
    setSearchQuery("");

    try {
      const { data: eventData } = await supabase.from("outreach_events").select("registration_closed_manually, registration_deadline").eq("id", eventId).single();
      if (eventData) {
        setIsRegistrationClosed(eventData.registration_closed_manually || false);
        setEventDeadline(eventData.registration_deadline ? new Date(eventData.registration_deadline) : null);
      }

      const { data, error } = await supabase.from("event_registrations")
        .select(`id, status, created_at, user_id, user:profiles!event_registrations_user_id_fkey(first_name, last_name, username, avatar_url), pet:pets!event_registrations_pet_id_fkey(name, species)`)
        .eq("event_id", eventId).order("created_at", { ascending: true });

      if (error) throw error;
      setAttendees(data as any);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load guest list");
    } finally {
      setLoadingAttendees(false);
    }
  };

  // --- ACTIONS ---
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setEvents(prev => prev.filter(e => e.id !== eventId)); 
    const { error } = await supabase.from('outreach_events').delete().eq('id', eventId);
    if (error) { toast.error("Failed to delete"); fetchEvents(true); } else { toast.success("Event deleted"); }
  };

  const handleToggleHide = async (eventId: string, currentStatus: boolean) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, is_hidden: !currentStatus } : e));
    const { error } = await supabase.from('outreach_events').update({ is_hidden: !currentStatus }).eq('id', eventId);
    if (error) { toast.error("Update failed"); fetchEvents(true); } else { toast.success(currentStatus ? "Event Visible" : "Event Hidden"); }
  };

  // ✅ Define the specific allowed values
  type NotificationType = "approved" | "rejected" | "waitlist" | "checked_in" | "removed";

  const updateGuestStatus = async (
    regId: string, 
    newStatus: string, 
    successMsg: string, 
    notifyType?: NotificationType // 👈 CHANGE THIS from 'string' to 'NotificationType'
  ) => {
    setAttendees(prev => prev.map(a => a.id === regId ? { ...a, status: newStatus as any } : a));
    
    const { error } = await supabase.from("event_registrations").update({ status: newStatus }).eq("id", regId);
    
    if (error) { 
        toast.error("Action failed"); 
        fetchAttendees(selectedEventId!, selectedEventTitle); 
    } else { 
        toast.success(successMsg); 
        if (notifyType) {
            const attendee = attendees.find(a => a.id === regId);
            // ✅ Now TypeScript knows 'notifyType' is safe to pass here
            if (attendee) notifyRegistrationUpdate(attendee.user_id, selectedEventId!, selectedEventTitle, notifyType, user!.id);
        }
    }
  };

  // --- FILTERS ---
  const filteredEvents = useMemo(() => events.filter(e => e.title.toLowerCase().includes(eventSearch.toLowerCase()) || e.location.toLowerCase().includes(eventSearch.toLowerCase())), [events, eventSearch]);
  
  const filteredAttendees = useMemo(() => attendees.filter((a) => {
    const matchesSearch = a.user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (guestFilter === "going") return ["approved", "checked_in"].includes(a.status);
    if (guestFilter === "waitlist") return a.status === "waitlist";
    if (guestFilter === "rejected") return a.status === "rejected";
    return true;
  }), [attendees, searchQuery, guestFilter]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="font-bold text-lg text-gray-900">Manage Activities</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                <button onClick={() => setViewMode("events")} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === "events" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Events</button>
                <button onClick={() => setViewMode("challenges")} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === "challenges" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Challenges</button>
            </div>

            {viewMode === "events" ? (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Search events..." value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} className="pl-9 bg-white border-gray-200 h-10 rounded-xl" />
                    </div>
                    <Button onClick={() => navigate("/admin/events/new-official")} size="sm" className="rounded-xl h-10 px-4 bg-gray-900 hover:bg-black"><Plus className="w-4 h-4 mr-2"/> Create</Button>
                </div>
            ) : (
                <Button onClick={() => navigate("/admin/challenges/create")} size="sm" className="rounded-xl h-10 px-4 bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2"/> New Challenge</Button>
            )}
        </div>

        {/* Content */}
        {viewMode === "events" ? (
            loadingEvents ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div> :
            filteredEvents.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900">No events found</h3>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredEvents.map(event => (
                        <EventCard 
                            key={event.id} 
                            event={event} 
                            onClick={() => fetchAttendees(event.id, event.title)}
                            onEdit={() => navigate(`/admin/events/edit-official/${event.id}`)}
                            onToggleHide={() => handleToggleHide(event.id, event.is_hidden)}
                            onDelete={() => handleDeleteEvent(event.id)}
                        />
                    ))}
                </div>
            )
        ) : (
            loadingChallenges ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div> :
            !challenges?.length ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900">No challenges found</h3>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {challenges.map(c => <ChallengeCard key={c.id} challenge={c} onClick={() => navigate(`/challenges/view/${c.id}`)} />)}
                </div>
            )
        )}
      </div>

      <EventDetailPanel 
        isOpen={!!selectedEventId}
        onClose={() => { setSelectedEventId(null); setAttendees([]); }}
        title={selectedEventTitle}
        attendees={filteredAttendees}
        allAttendees={attendees}
        loading={loadingAttendees}
        filters={{ searchQuery, guestFilter }}
        setFilters={{ setSearchQuery, setGuestFilter }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={{ isRegistrationClosed, eventDeadline }}
        actions={{
            checkIn: (id, s) => updateGuestStatus(id, s === "checked_in" ? "approved" : "checked_in", "Checked In", "checked_in"),
            promote: (id) => updateGuestStatus(id, "approved", "Approved", "approved"),
            demote: (id) => updateGuestStatus(id, "waitlist", "Moved to Waitlist", "waitlist"),
            reject: (id) => updateGuestStatus(id, "rejected", "Rejected", "rejected"),
            remove: async (id) => { if(confirm("Remove guest?")) { await supabase.from("event_registrations").delete().eq("id", id); setAttendees(p => p.filter(a => a.id !== id)); toast.success("Removed"); } },
            sendUpdate: () => setIsNotificationModalOpen(true),
            toggleRegistration: async () => {
                const newVal = !isRegistrationClosed;
                setIsRegistrationClosed(newVal);
                await supabase.from("outreach_events").update({ registration_closed_manually: newVal }).eq("id", selectedEventId);
                toast.success(newVal ? "Closed" : "Opened");
            },
            exportCSV: () => {
                const csv = Papa.unparse(attendees.map(a => ({ Name: `${a.user.first_name} ${a.user.last_name}`, Status: a.status })));
                const link = document.createElement("a");
                link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
                link.download = "guests.csv";
                link.click();
            }
        }}
      />

      <SendNotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} onSend={async (msg) => { await notifyAttendees(selectedEventId!, selectedEventTitle, msg, user!.id); toast.success("Sent!"); setIsNotificationModalOpen(false); }} eventTitle={selectedEventTitle} />
    </div>
  );
}