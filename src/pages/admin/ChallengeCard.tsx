import { CalendarDays, Trophy, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ChallengeCardProps {
  challenge: any; // Ideally import your Challenge type here
  onClick: () => void;
}

export function ChallengeCard({ challenge, onClick }: Readonly<ChallengeCardProps>) {
  const isUpcoming = new Date(challenge.start_date) > new Date();
  const isEnded = !challenge.is_active || new Date() > new Date(challenge.end_date);
  const isActive = !isUpcoming && !isEnded;

  return (
    <div 
      onClick={onClick} 
      className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col h-full"
    >
      <div className="p-4 pb-0 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-bold uppercase tracking-wide">
          <CalendarDays className="w-4 h-4 text-indigo-600" />
          {format(new Date(challenge.start_date), "MMM d")} - {format(new Date(challenge.end_date), "MMM d")}
        </div>
        {isActive && <span className="text-[9px] uppercase font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Active</span>}
        {isUpcoming && <span className="text-[9px] uppercase font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Upcoming</span>}
        {isEnded && <span className="text-[9px] uppercase font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">Ended</span>}
      </div>

      <div className="p-4 flex gap-4 items-center">
        <div className="shrink-0 w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 text-lg leading-tight truncate mb-1 group-hover:text-indigo-600 transition-colors">
            {challenge.theme}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2">
            {challenge.description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="mt-auto px-4 py-3 flex justify-end border-t border-gray-50/50 bg-gray-50/30">
        <span className="text-sm font-bold text-indigo-600 flex items-center gap-1 opacity-100 translate-y-0 md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all">
          View Stats <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
}