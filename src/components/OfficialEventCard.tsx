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
  ArrowRight,
  Hourglass, // Add this icon for waitlist
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OutreachEvent } from "@/types";

interface OfficialEventCardProps {
  event: OutreachEvent;
  isRegistered: boolean;
  // ✅ FIX: Add this prop to the interface
  registrationStatus?: string;
  onRegister: () => void;
  onUnregister?: () => void; // Optional: good for completeness
  onEdit: () => void;
  isAdmin: boolean;
  onDelete?: () => void; // Add this if you use it
  currentCount?: number; // Add this if you use it
  onSuccess?: () => void; // Add this if you use it
  onHide?: () => void; // Add this if you use it
  isHidden?: boolean; // Add this if you use it
}

export function OfficialEventCard({
  event,
  isRegistered,
  registrationStatus, // ✅ Destructure it
  onRegister,
  onUnregister,
  onEdit,
  isAdmin,
}: OfficialEventCardProps) {
  // ... (Keep existing getTheme and date logic) ...
  const getTheme = (type?: string) => {
    switch (type) {
      case "pet":
        return {
          icon: PawPrint,
          label: "Pet Service",
          bg: "bg-orange-50",
          text: "text-orange-700",
          border: "border-orange-100",
          gradient: "from-orange-400 to-red-400",
        };
      case "member":
        return {
          icon: Briefcase,
          label: "Members Only",
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-100",
          gradient: "from-blue-400 to-indigo-400",
        };
      case "campus":
        return {
          icon: Tent,
          label: "Campus Event",
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-100",
          gradient: "from-emerald-400 to-teal-400",
        };
      default:
        return {
          icon: CalendarCheck,
          label: "Official Event",
          bg: "bg-purple-50",
          text: "text-purple-700",
          border: "border-purple-100",
          gradient: "from-purple-400 to-pink-400",
        };
    }
  };

  const theme = getTheme(event.event_type);
  const BadgeIcon = theme.icon;
  const eventDate = event.event_date ? new Date(event.event_date) : new Date();
  const month = format(eventDate, "MMM");
  const day = format(eventDate, "d");
  const hasImage = event.images && event.images.length > 0;

  return (
    <div className="group relative bg-white rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* ... (Keep Hero Image Section same as before) ... */}
      <div className="relative h-48 w-full shrink-0 overflow-hidden">
        {hasImage ? (
          <img
            src={event.images[0]}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            alt={event.title}
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${theme.gradient} relative`}
          >
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              <BadgeIcon size={64} />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
        <div className="absolute top-4 left-4 flex flex-col items-center justify-center w-12 h-14 rounded-xl bg-white/90 backdrop-blur-md shadow-lg text-center border border-white/50">
          <span className="text-[10px] font-bold text-gray-500 uppercase leading-none mt-1">
            {month}
          </span>
          <span className="text-xl font-black text-gray-900 leading-none">
            {day}
          </span>
        </div>
        <div className="absolute top-4 right-4">
          <div
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 shadow-sm backdrop-blur-md bg-white/90 ${theme.text}`}
          >
            <BadgeIcon size={12} /> {theme.label}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-black text-gray-900 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>

        <div className="space-y-2 mt-1 mb-4">
          {/* Time & Location (Keep existing code) */}
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <Clock className="w-4 h-4 text-blue-500/70" />
            <span>
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
          <a
            href={`http://googleusercontent.com/maps.google.com/search?q=${encodeURIComponent(
              event.location
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-start gap-2 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-1 -ml-1 rounded-lg transition-colors group/loc"
          >
            <MapPin className="w-4 h-4 text-red-500/70 mt-0.5 group-hover/loc:text-red-600" />
            <span className="truncate underline decoration-dotted decoration-gray-300 underline-offset-4">
              {event.location}
            </span>
          </a>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto border-t border-gray-100 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-400">
              <Users size={12} />
            </div>
            {event.max_attendees && (
              <span className="text-xs text-gray-400 font-medium pl-1">
                Limit: {event.max_attendees}
              </span>
            )}
          </div>

          {isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-gray-400 hover:text-gray-900"
            >
              <MoreHorizontal size={18} />
            </Button>
          ) : isRegistered ? (
            // ✅ HANDLE DIFFERENT STATUSES
            registrationStatus === "waitlist" ? (
              // ✅ FIX: Explicitly type 'e' as React.MouseEvent
              <div
                className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full text-xs font-bold"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onUnregister?.();
                }}
              >
                <Hourglass size={14} /> Waitlist
              </div>
            ) : (
              // ✅ FIX: Explicitly type 'e' as React.MouseEvent
              <div
                className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-bold"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onUnregister?.();
                }}
              >
                <CheckCircle2 size={14} /> Going
              </div>
            )
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onRegister();
              }}
              className="rounded-full bg-gray-900 text-white font-bold text-xs h-9 px-5 shadow-lg shadow-gray-200 hover:bg-blue-600 hover:shadow-blue-200 transition-all active:scale-95"
            >
              Register <ArrowRight size={14} className="ml-1 opacity-70" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
