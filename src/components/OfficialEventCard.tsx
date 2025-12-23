import { format } from "date-fns";
import {
  MapPin,
  Clock,
  Users,
  MoreHorizontal,
  CalendarCheck,
  CheckCircle2,
  PawPrint,
  Briefcase,
  Tent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OutreachEvent } from "@/types";

interface OfficialEventCardProps {
  event: OutreachEvent;
  isRegistered: boolean;
  onRegister: () => void;
  onEdit: () => void;
  isAdmin: boolean;
}

export function OfficialEventCard({
  event,
  isRegistered,
  onRegister,
  onEdit,
  isAdmin,
}: OfficialEventCardProps) {
  // 1. Helper for Category Badge
  const getCategoryBadge = (type?: string) => {
    switch (type) {
      case "pet":
        return {
          icon: PawPrint,
          label: "Pet Service",
          color: "text-orange-600 bg-orange-50 border-orange-100",
        };
      case "member":
        return {
          icon: Briefcase,
          label: "Members Only",
          color: "text-blue-600 bg-blue-50 border-blue-100",
        };
      case "campus":
        return {
          icon: Tent,
          label: "Campus Event",
          color: "text-green-600 bg-green-50 border-green-100",
        };
      default:
        return {
          icon: CalendarCheck,
          label: "Official Event",
          color: "text-purple-600 bg-purple-50 border-purple-100",
        };
    }
  };

  const badge = getCategoryBadge(event.event_type);
  const BadgeIcon = badge.icon;

  // 2. Date Formatting
  const eventDate = event.event_date ? new Date(event.event_date) : new Date();
  const month = format(eventDate, "MMM").toUpperCase();
  const day = format(eventDate, "d");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden mb-4 group relative">
      {/* Edit Button (Admin Only - Absolute Position) */}
      {isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur rounded-full text-gray-500 hover:text-blue-600 shadow-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal size={18} />
        </button>
      )}

      {/* 3. Cover Image (If exists) */}
      {event.images && event.images.length > 0 && (
        <div className="h-40 w-full relative">
          <img
            src={event.images[0]}
            className="w-full h-full object-cover"
            alt="Event Cover"
          />
          {/* Category Badge Overlay */}
          <div
            className={`absolute top-3 left-3 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-sm bg-white/95 ${badge.color.replace(
              "bg-",
              "text-"
            )}`}
          >
            <BadgeIcon size={12} /> {badge.label}
          </div>
        </div>
      )}

      <div className="p-5 flex gap-4">
        {/* 4. The "Date Box" (Luma Style) */}
        <div className="shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border border-gray-100 bg-gray-50 shadow-sm">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
            {month}
          </span>
          <span className="text-2xl font-black text-gray-900 leading-none">
            {day}
          </span>
        </div>

        {/* 5. Event Details */}
        <div className="flex-1 min-w-0">
          {/* If no image, show badge here */}
          {(!event.images || event.images.length === 0) && (
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-2 ${badge.color}`}
            >
              <BadgeIcon size={10} /> {badge.label}
            </div>
          )}

          <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1 truncate">
            {event.title}
          </h3>

          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">
                {event.start_time
                  ? format(new Date(`2000-01-01T${event.start_time}`), "h:mm a")
                  : "TBD"}
                {event.end_time &&
                  ` - ${format(
                    new Date(`2000-01-01T${event.end_time}`),
                    "h:mm a"
                  )}`}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <a
                href={`http://googleusercontent.com/maps.google.com/search?q=${encodeURIComponent(
                  event.location
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {event.location}
              </a>
            </div>

            {event.max_attendees && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>Limited to {event.max_attendees} spots</span>
              </div>
            )}
          </div>

          {/* 6. Action Button (Bottom) */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-2 overflow-hidden">
              {/* Fake "Attendees" Faces for social proof (Optional - remove if simpler) */}
              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-500">
                ?
              </div>
            </div>

            {!isAdmin &&
              (isRegistered ? (
                <Button
                  disabled
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-green-600 border-green-200 bg-green-50"
                >
                  <CheckCircle2 size={16} /> Going
                </Button>
              ) : (
                <Button
                  onClick={onRegister}
                  size="sm"
                  className="h-9 px-6 font-bold rounded-full bg-black text-white hover:bg-gray-800 shadow-sm hover:shadow"
                >
                  Register
                </Button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
