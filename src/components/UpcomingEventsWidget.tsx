import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { format } from "date-fns";
import { MapPin, Loader2, Ticket, ChevronRight, PawPrint } from "lucide-react";

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
    event_type: string;
    images: string[];
  };
};

export function UpcomingEventsWidget() {
  const { user } = useAuth();
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMyEvents();
  }, [user]);

  const fetchMyEvents = async () => {
    if (!user) return; // ✅ FIX: Stops TypeScript from complaining about "user possibly null"

    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("event_registrations")
        .select(
          `
          id, status, pet_id,
          pet:pets(name, species),
          event:outreach_events(
            id, title, event_date, location, start_time, event_type, images
          )
        `
        )
        .eq("user_id", user.id) // Now safe to use user.id
        .gte("event.event_date", today)
        .order("event(event_date)", { ascending: true })
        .limit(3);

      if (error) throw error;

      // Filter out null events (in case date filter failed in join) and sort manually
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
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex justify-center">
        <Loader2 className="animate-spin text-gray-300 w-6 h-6" />
      </div>
    );

  if (events.length === 0)
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-3">
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <Ticket className="w-4 h-4 text-blue-600" />
          My Tickets
        </h3>
        {/* Optional: Link to a full "My Events" page in the future */}
        {/* <button className="text-[10px] font-bold text-blue-600 hover:underline">View All</button> */}
      </div>

      <div className="divide-y divide-gray-50">
        {events.map(({ registration_id, event, pet }) => {
          const date = new Date(event.event_date);
          const month = format(date, "MMM").toUpperCase();
          const day = format(date, "d");

          return (
            <div
              key={registration_id}
              className="p-3 hover:bg-gray-50 transition-colors group cursor-pointer flex gap-3"
              // onClick={() => navigate(`/events/${event.id}`)} // If you have a details page
            >
              {/* Date Column */}
              <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors">
                <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-600">
                  {month}
                </span>
                <span className="text-lg font-black text-gray-900 group-hover:text-blue-700 leading-none">
                  {day}
                </span>
              </div>

              {/* Info Column */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-bold text-gray-900 text-sm truncate leading-tight mb-1">
                  {event.title}
                </h4>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                    <MapPin size={10} />
                    <span className="truncate max-w-[120px]">
                      {event.location.split(",")[0]}
                    </span>
                  </div>

                  {/* Pet Badge */}
                  {pet && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100 shrink-0">
                      <PawPrint size={8} /> {pet.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center text-gray-300 group-hover:text-blue-400">
                <ChevronRight size={16} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
