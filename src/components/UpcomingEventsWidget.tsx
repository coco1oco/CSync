import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { format, isSameDay } from "date-fns"; 
import { useNavigate } from "react-router-dom"; // ✅ 1. Import useNavigate
import { 
  MapPin, 
  Ticket, 
  ChevronRight, 
  PawPrint, 
  Hourglass, 
  CheckCircle2, 
  UserCheck,
  Radio,
  XCircle,
} from "lucide-react"; 
// ... Type Definitions remain the same ...
type MyEvent = {
  registration_id: string;
  pet_id: string | null;
  status: string;
  pet?: {
    name: string;
    species: string;
  };
  event: {
    id: string;
    title: string;
    event_date: string;
    location: string;
    start_time: string | null;
    end_time: string | null;
    event_type: string;
    images: string[];
  };
};

export function UpcomingEventsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate(); // ✅ 2. Initialize Hook
  const [events, setEvents] = useState<MyEvent[]>([]);
  
  // ❌ Removed selectedEventForList state since we are navigating now
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!user) return;
    fetchMyEvents();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchMyEvents = async () => {
    // ... (Your existing fetch logic remains exactly the same) ...
    if (!user) return;

    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("event_registrations")
        .select(
          `
          id, status, pet_id,
          pet:pets(name, species),
          event:outreach_events(
            id, title, event_date, location, start_time, end_time, event_type, images
          )
        `
        )
        .eq("user_id", user.id)
        .gte("event.event_date", today)
        .order("event(event_date)", { ascending: true })
        .limit(3);

      if (error) throw error;

      const validEvents = (data || [])
        .filter((r: any) => r.event)
        .sort(
          (a: any, b: any) =>
            new Date(a.event.event_date).getTime() -
            new Date(b.event.event_date).getTime()
        );

      setEvents(
        validEvents.map((item: any) => ({
          registration_id: item.id,
          pet_id: item.pet_id,
          status: item.status,
          pet: item.pet,
          event: item.event,
        }))
      );
    } catch (err) {
      console.error("Error fetching tickets:", err);
    }
  };

  // ... (Empty state return remains the same) ...
  if (events.length === 0)
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-3 shadow-sm h-full flex flex-col items-center justify-center">
        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
          <Ticket size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">No upcoming plans</h3>
          <p className="text-xs text-gray-500">
            Register for an event to see it here.
          </p>
        </div>
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
      <div className="p-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <Ticket className="w-4 h-4 text-blue-600" />
          My Tickets
        </h3>
      </div>

      <div className="divide-y divide-gray-50">
        {events.map(({ registration_id, event, pet, status }) => {
          const date = new Date(event.event_date);
          const isToday = isSameDay(date, new Date());
          
          let isHappeningNow = false;
          if (isToday && event.start_time && event.end_time) {
             const now = currentTime;
             const currentMinutes = now.getHours() * 60 + now.getMinutes();

             const [startH, startM] = event.start_time.split(':').map(Number);
             const startTotalMinutes = startH * 60 + startM;

             const [endH, endM] = event.end_time.split(':').map(Number);
             const endTotalMinutes = endH * 60 + endM;

             isHappeningNow = currentMinutes >= startTotalMinutes && currentMinutes <= endTotalMinutes;
          }

          const month = format(date, "MMM").toUpperCase();
          const day = format(date, "d");

          const isWaitlist = status === "waitlist";
          const isCheckedIn = status === "checked_in";
          const isRejected = status === "rejected";

          return (
            <div
              key={registration_id}
              onClick={() => navigate(`/official-event/${event.id}`)}
              className={`p-3 transition-colors group cursor-pointer flex gap-3 items-center ${isHappeningNow ? 'bg-red-50/60' : isToday ? 'bg-red-50/20' : 'hover:bg-gray-50'}`}
            >
              <div
                className={`shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-lg border transition-colors ${
                  isHappeningNow
                    ? "bg-red-600 border-red-700 text-white animate-pulse"
                    : isToday
                    ? "bg-red-100 border-red-200 text-red-700" 
                    : isCheckedIn
                      ? "bg-blue-50 border-blue-200" 
                      : isWaitlist
                      ? "bg-amber-50 border-amber-200" 
                      : "bg-gray-100 border-gray-200 group-hover:border-blue-200 group-hover:bg-blue-50"
                      
                }`}
              >
                <span className={`text-[9px] font-bold uppercase ${isHappeningNow ? "text-white/90" : isToday ? "text-red-500" : isCheckedIn ? "text-blue-600" : isWaitlist ? "text-amber-600" : "text-gray-500"}`}>
                  {isHappeningNow ? "LIVE" : isToday ? "TODAY" : month}
                </span>
                <span className={`text-lg font-black leading-none ${isHappeningNow ? "text-white" : isToday ? "text-red-800" : isCheckedIn ? "text-blue-700" : isWaitlist ? "text-amber-700" : "text-gray-900"}`}>
                  {day}
                </span>
              </div>

              {/* Info Column */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className={`font-bold text-sm truncate leading-tight mb-1 ${isHappeningNow ? "text-red-700" : "text-gray-900"}`}>
                  {event.title}
                </h4>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                    <MapPin size={10} />
                    <span className="truncate max-w-[80px]">
                      {event.location.split(",")[0]}
                    </span>
                  </div>

                  {isHappeningNow ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white border border-red-600 shrink-0 uppercase tracking-wide">
                         <Radio size={8} className="animate-pulse" /> Happening Now
                      </span>
                  ) : isCheckedIn ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shrink-0 uppercase tracking-wide">
                      <UserCheck size={8} /> Checked In
                    </span>
                  ) : isWaitlist ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0 uppercase tracking-wide">
                      <Hourglass size={8} /> Waitlist
                    </span>
                  ) : isRejected ? (
                    // ✅ 2. Add Rejected Badge
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 shrink-0 uppercase tracking-wide">
                      <XCircle size={8} /> Declined
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 border border-green-200 shrink-0 uppercase tracking-wide">
                      <CheckCircle2 size={8} /> Going
                    </span>
                  )}

                  {pet && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-50 text-orange-700 border border-orange-100 shrink-0">
                      <PawPrint size={8} /> {pet.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center text-gray-300 group-hover:text-blue-400 shrink-0">
                <ChevronRight size={16} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
