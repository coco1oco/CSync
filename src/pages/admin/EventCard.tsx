import { 
  CalendarDays, MapPin, MoreHorizontal, Edit, Eye, EyeOff, Trash2, 
  ChevronRight, Calendar 
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// You can move this to your global types file later
export type EventSummary = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  max_attendees: number | null;
  registered_count: number;
  checked_in_count: number;
  is_hidden: boolean;
  event_type: string;
  images: string[] | null;
};

interface EventCardProps {
  event: EventSummary;
  onClick: () => void;
  onEdit: () => void;
  onToggleHide: () => void;
  onDelete: () => void;
}

export function EventCard({ event, onClick, onEdit, onToggleHide, onDelete }: Readonly<EventCardProps>) {
  return (
    <div 
      onClick={onClick} 
      className={`group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col h-full ${event.is_hidden ? 'opacity-75 bg-gray-50' : ''}`}
    >
      {/* Fixed Three Dots */}
      <div className="absolute top-3 right-3 z-20" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 z-30 bg-white">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleHide}>
              {event.is_hidden ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              {event.is_hidden ? "Unhide" : "Hide"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Date & Hidden Badge */}
      <div className="p-4 pb-0 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-bold uppercase tracking-wide">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          {event.event_date ? format(new Date(event.event_date), "MMM d") : "TBD"}
        </div>
        {event.is_hidden && (
          <span className="text-[9px] uppercase font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded mr-8">Hidden</span>
        )}
      </div>

      {/* Image & Info */}
      <div className="p-4 flex gap-4 items-center">
        <div className="shrink-0 w-16 h-16 rounded-xl bg-gray-100 border border-gray-100 overflow-hidden flex items-center justify-center">
          {event.images && event.images[0] ? (
            <img src={event.images[0]} className="w-full h-full object-cover" alt={event.title} />
          ) : (
            <Calendar className="w-6 h-6 text-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 text-lg leading-tight truncate mb-1 group-hover:text-blue-600 transition-colors pr-6">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-gray-400 font-bold">Reg</span>
              <span className="text-xs font-bold text-gray-900">{event.registered_count}</span>
            </div>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-gray-400 font-bold">In</span>
              <span className="text-xs font-bold text-green-600">{event.checked_in_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-3 flex justify-end border-t border-gray-50/50 bg-gray-50/30">
        <span className="text-sm font-bold text-blue-600 flex items-center gap-1 opacity-100 translate-y-0 md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all">
          View Details <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
}