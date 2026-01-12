import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { format, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
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
  CalendarDays,
} from "lucide-react";

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
  const navigate = useNavigate();
  const [events, setEvents] = useState<MyEvent[]>([]);
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
    if (!user) return;

    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          id, status, pet_id,
          pet:pets(name, species),
          event:outreach_events(
            id, title, event_date, location, start_time, end_time, event_type, images
          )
        `)
        .eq("user_id", user.id)
        .gte("event.event_date", today)
        .order("event(event_date)", { ascending: true });

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

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center">
        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 border border-gray-100">
          <Ticket className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No Upcoming Tickets</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          You haven't registered for any events yet. Check the dashboard to find something fun!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Optional: Section Title if used on a dedicated page */}
      {/* <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Ticket className="w-5 h-5 text-gray-500" /> Your Tickets
      </h2> */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          const month = format(date, "MMM");
          const day = format(date, "d");
          const weekday = format(date, "EEEE");
          
          // Status Logic
          const isWaitlist = status === "waitlist";
          const isCheckedIn = status === "checked_in";
          const isRejected = status === "rejected";
          const isGoing = !isWaitlist && !isCheckedIn && !isRejected;

          return (
            <div
              key={registration_id}
              onClick={() => navigate(`/official-event/${event.id}`)}
              className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              {/* Top Banner for Status */}
              <div className="flex items-center justify-between p-4 pb-2">
                {/* Date Badge */}
                <div className={`flex items-center gap-2 text-sm font-medium ${isToday ? "text-blue-700" : "text-gray-500"}`}>
                  <CalendarDays className="w-4 h-4" />
                  <span>
                    {isToday ? "Today, " : ""}{weekday}, {month} {day}
                  </span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5">
                  {isHappeningNow && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-sm animate-pulse">
                      <Radio size={10} /> LIVE
                    </span>
                  )}
                  
                  {!isHappeningNow && (
                    <>
                      {isCheckedIn && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                          <UserCheck size={12} /> Checked In
                        </span>
                      )}
                      {isWaitlist && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                          <Hourglass size={12} /> Waitlist
                        </span>
                      )}
                      {isRejected && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                          <XCircle size={12} /> Declined
                        </span>
                      )}
                      {isGoing && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                          <CheckCircle2 size={12} /> Going
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="p-4 pt-1 flex gap-4">
                {/* Thumbnail Image (if available) or Fallback Icon */}
                <div className="shrink-0 w-16 h-16 rounded-lg bg-gray-100 overflow-hidden border border-gray-100">
                  {event.images && event.images.length > 0 ? (
                    <img src={event.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Ticket size={24} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-base leading-snug truncate mb-1 group-hover:text-blue-600 transition-colors">
                    {event.title}
                  </h4>
                  
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                    <MapPin size={12} />
                    <span className="truncate">{event.location}</span>
                  </div>

                  {/* Pet Badge */}
                  {pet && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-600">
                      <PawPrint size={10} className="text-gray-400" />
                      <span className="font-medium">{pet.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer (Optional visual cue) */}
              <div className="mt-auto border-t border-gray-50 bg-gray-50/50 p-2 flex justify-end">
                 <span className="text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <ChevronRight size={12} />
                 </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}