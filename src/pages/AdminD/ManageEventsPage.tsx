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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";

// Types
type EventSummary = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  max_attendees: number | null;
  registered_count: number;
  checked_in_count: number;
};

type Attendee = {
  id: string;
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
  status: "pending" | "approved" | "rejected" | "checked_in";
  created_at: string;
};

export default function ManageEventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Event Logic
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"guests" | "analytics">("guests");

  useEffect(() => {
    if (user) fetchEvents();
  }, [user]);

  const fetchEvents = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: eventData, error } = await supabase
        .from("outreach_events")
        .select("id, title, event_date, location, max_attendees, event_type")
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

  const fetchAttendees = async (eventId: string, title: string) => {
    setSelectedEventId(eventId);
    setSelectedEventTitle(title);
    setLoadingAttendees(true);

    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(
          `
          id, status, created_at,
          user:profiles(first_name, last_name, username, avatar_url),
          pet:pets(name, species)
        `
        )
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

  const handleCheckIn = async (
    registrationId: string,
    currentStatus: string
  ) => {
    const newStatus =
      currentStatus === "checked_in" ? "approved" : "checked_in";
    const isCheckingIn = newStatus === "checked_in";

    // 1. Optimistic Update: Guest List (Instant feedback)
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === registrationId ? { ...a, status: newStatus } : a
      )
    );

    // 2. Optimistic Update: Main Dashboard Numbers (Instant feedback)
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === selectedEventId) {
          return {
            ...ev,
            checked_in_count: isCheckingIn
              ? ev.checked_in_count + 1
              : Math.max(0, ev.checked_in_count - 1),
          };
        }
        return ev;
      })
    );

    // 3. Database Update
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: newStatus })
      .eq("id", registrationId);

    if (error) {
      toast.error("Failed to save check-in");
      console.error(error);
      // Revert on error
      fetchAttendees(selectedEventId!, selectedEventTitle);
      fetchEvents(true); // Silent refresh
    } else {
      if (isCheckingIn) toast.success("Checked in!");
    }
  };

  const closeDetail = () => {
    // Just close the panel. The stats are already updated optimistically.
    setSelectedEventId(null);
    setAttendees([]);
    setSearchQuery("");
    setActiveTab("guests");
    // Optionally trigger a silent sync just to be safe, but NO SPINNER
    fetchEvents(true);
  };

  const filteredAttendees = attendees.filter(
    (a) =>
      a.user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkedInCount = attendees.filter(
    (a) => a.status === "checked_in"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg text-gray-900">Manage Events</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900">No events found</h3>
            <p className="text-gray-500 text-sm mb-4">
              Create an official event to start tracking.
            </p>
            <Button onClick={() => navigate("/admin/events/new-official")}>
              Create Event
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => fetchAttendees(event.id, event.title)}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-blue-50 text-blue-700 font-bold text-xs px-2 py-1 rounded-md uppercase tracking-wide">
                    {event.event_date
                      ? format(new Date(event.event_date), "MMM d")
                      : "TBD"}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                </div>

                <h3 className="font-bold text-gray-900 line-clamp-1 mb-1">
                  {event.title}
                </h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-4">
                  <MapPin className="w-3 h-3" /> {event.location}
                </p>

                <div className="flex items-center gap-4 text-sm border-t border-gray-50 pt-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-400 font-bold">
                      Registered
                    </span>
                    <span className="font-bold text-gray-900">
                      {event.registered_count}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-400 font-bold">
                      Checked In
                    </span>
                    <span className="font-bold text-green-600">
                      {event.checked_in_count}
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1 w-full bg-gray-100 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (event.checked_in_count /
                          (event.registered_count || 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LUMA-STYLE MANAGER DRAWER */}
      {selectedEventId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in"
            onClick={closeDetail}
          />

          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Top Stats Header */}
            <div className="bg-white border-b border-gray-100 p-6 pb-0">
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-bold text-xl text-gray-900 leading-tight pr-4">
                  {selectedEventTitle}
                </h2>
                <Button variant="ghost" size="icon" onClick={closeDetail}>
                  <XCircle className="w-6 h-6 text-gray-300" />
                </Button>
              </div>

              <div className="flex gap-6 mb-6">
                <div>
                  <p className="text-3xl font-black text-gray-900">
                    {attendees.length}
                  </p>
                  <p className="text-xs font-bold text-gray-400 uppercase">
                    Going
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black text-green-600">
                    {checkedInCount}
                  </p>
                  <p className="text-xs font-bold text-green-600/70 uppercase">
                    Checked In
                  </p>
                </div>
              </div>

              {/* TABS */}
              <div className="flex gap-6 border-b border-gray-100">
                <button
                  onClick={() => setActiveTab("guests")}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === "guests"
                      ? "border-black text-black"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  Guests
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === "analytics"
                      ? "border-black text-black"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  Insights
                </button>
              </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
              {activeTab === "guests" ? (
                <div className="p-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search guests..."
                      className="pl-9 bg-white border-gray-200"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {loadingAttendees ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="animate-spin text-gray-400" />
                    </div>
                  ) : filteredAttendees.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      No guests found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredAttendees.map((a) => (
                        <div
                          key={a.id}
                          className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-3 shadow-sm"
                        >
                          <img
                            src={a.user.avatar_url || "/default-avatar.png"}
                            className="w-10 h-10 rounded-full bg-gray-100 object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">
                              {a.user.first_name} {a.user.last_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="truncate">
                                @{a.user.username}
                              </span>
                              {a.pet && (
                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold truncate max-w-[100px]">
                                  + {a.pet.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* CHECK IN BUTTON */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckIn(a.id, a.status);
                            }}
                            className={`shrink-0 w-24 h-9 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 ${
                              a.status === "checked_in"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-black text-white hover:bg-gray-800"
                            }`}
                          >
                            {a.status === "checked_in" ? (
                              <>
                                {" "}
                                <CheckCircle2 className="w-3.5 h-3.5" /> In{" "}
                              </>
                            ) : (
                              "Check In"
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <p>Analytics features coming soon!</p>
                  <p className="text-xs">
                    Gender ratio, Pet species breakdown, etc.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <Button
                className="w-full gap-2"
                variant="outline"
                disabled={attendees.length === 0}
              >
                <Download className="w-4 h-4" /> Export Guest List (CSV)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
