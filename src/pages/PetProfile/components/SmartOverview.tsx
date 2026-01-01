import { useMemo } from "react";
import { useVaccinations } from "@/lib/useVaccinations";
import { useTasks } from "@/lib/useTasks";
import { useSchedules } from "@/lib/useSchedules";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Heart,
  Sparkles,
  PawPrint,
  Dog,
  Cat,
  Clock,
  Syringe,
  CheckSquare,
  Calendar,
  Share2,
  Info,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";

// --- SMART FUN FACTS DATABASE ---
const FUN_FACTS: Record<string, string[]> = {
  dog: [
    "A dog's nose print is unique, much like a human's fingerprint.",
    "Dogs can smell your feelings! They pick up on subtle changes in your scent.",
    "Tail wagging has its own language. To the right means happy, to the left means nervous.",
    "Dogs have three eyelids!",
    "Your dog is as smart as a two-year-old toddler.",
  ],
  cat: [
    "Cats have 32 muscles in each ear to help them pinpoint sounds.",
    "A cat's purr can help improve bone density and healing.",
    "Cats can't taste sweetness.",
    "Cats spend about 70% of their lives sleeping.",
    "A cat has been mayor of a town in Alaska for 20 years!",
  ],
  general: [
    "Having a pet can lower your blood pressure and reduce stress.",
    "The world's oldest known pet was a tortoise that lived to be 188 years old.",
    "Pets can understand more human words than you might think!",
    "Animals have a much faster heart rate than humans.",
  ],
};

interface SmartOverviewProps {
  pet: any;
  userId?: string;
  onNavigate: (tab: string) => void;
  canManage: boolean;
  isOwner: boolean;
  isCampusPet: boolean;
}

export default function SmartOverview({
  pet,
  userId,
  onNavigate,
  canManage,
  isOwner,
  isCampusPet,
}: SmartOverviewProps) {
  // ✅ FIX: Destructure 'loading' with aliases to avoid naming conflicts
  const { vaccinations, loading: vLoading } = useVaccinations(pet.id, userId);
  const { tasks, loading: tLoading } = useTasks(pet.id, userId);
  const { schedules, loading: sLoading } = useSchedules(pet.id, userId);

  // 1. Calculate Fun Fact based on Species
  const funFact = useMemo(() => {
    const species = pet?.species?.toLowerCase() || "general";
    // Check if species string contains 'cat' or 'dog' to handle cases like 'Golden Retriever (Dog)'
    const categoryKey = species.includes("cat")
      ? "cat"
      : species.includes("dog")
      ? "dog"
      : "general";
    const category = FUN_FACTS[categoryKey] || FUN_FACTS["general"];
    return category[Math.floor(Math.random() * category.length)];
  }, [pet]);

  // 2. Loading State (Internal Skeleton)
  if (vLoading || tLoading || sLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-3xl" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // 3. Logic: Wellness Pulse
  const overdueVax = vaccinations.filter(
    (v) =>
      v.status === "overdue" ||
      (v.next_due_date &&
        isPast(new Date(v.next_due_date)) &&
        v.status !== "completed")
  );
  const isHealthy = overdueVax.length === 0;

  const wellnessScore = (() => {
    const total = vaccinations.length + tasks.length + schedules.length;
    if (total === 0) return 100;
    const completed = [...vaccinations, ...tasks, ...schedules].filter(
      (i: any) => i.status === "completed" || i.completed
    ).length;
    return Math.round((completed / total) * 100);
  })();

  // 4. Logic: Smart Timeline
  const timelineItems = [
    ...vaccinations
      .filter((v) => v.status !== "completed")
      .map((v) => ({
        type: "vaccine",
        date: v.next_due_date,
        title: v.vaccine_name,
        id: v.id,
        sub: "Due Soon",
      })),
    ...tasks
      .filter((t) => !t.completed)
      .map((t) => ({
        type: "task",
        date: t.due_date,
        title: t.title,
        id: t.id,
        sub: t.priority === "high" ? "High Priority" : "To Do",
      })),
    ...schedules
      .filter((s) => s.status === "pending")
      .map((s) => ({
        type: "visit",
        date: s.scheduled_date,
        title: s.title,
        id: s.id,
        sub: s.scheduled_time || "Appointment",
      })),
  ]
    .filter((i) => i.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* --- ROW 1: STATS & FUN FACT --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card A: Wellness Pulse */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-80 mb-1 text-xs font-bold uppercase tracking-wider">
              <Activity size={14} /> Wellness Pulse
            </div>
            <h3 className="text-2xl font-black">
              {isHealthy ? "Excellent" : "Needs Attention"}
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              {isHealthy
                ? "All records up to date."
                : `${overdueVax.length} overdue items.`}
            </p>
          </div>

          <div className="relative z-10 w-full bg-blue-900/30 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-1000"
              style={{ width: `${wellnessScore}%` }}
            />
          </div>

          <Heart className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-10 rotate-12" />
        </div>

        {/* Card B: Smart Fact */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-colors min-h-[160px]">
          <div>
            <div className="flex items-center gap-2 text-orange-500 mb-2 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> Did you know?
            </div>
            <p className="text-gray-700 font-medium italic leading-relaxed text-sm">
              "{funFact}"
            </p>
          </div>
          <div className="flex justify-end mt-4">
            <div className="p-2 bg-orange-50 rounded-full text-orange-500 group-hover:bg-orange-100 transition-colors">
              {pet.species?.toLowerCase() === "cat" ? (
                <Cat size={20} />
              ) : (
                <Dog size={20} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- ROW 2: ACTIONS (Conditional) --- */}
      {canManage && (
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-sm font-bold text-gray-900 mb-3 px-1">
            Quick Actions
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <ActionBtn
              onClick={() => onNavigate("vaccines")}
              icon={<Syringe size={20} />}
              label="Log Vax"
              color="bg-green-50 text-green-700"
            />
            <ActionBtn
              onClick={() => onNavigate("tasks")}
              icon={<CheckSquare size={20} />}
              label="Add Task"
              color="bg-blue-50 text-blue-700"
            />
            <ActionBtn
              onClick={() => onNavigate("schedule")}
              icon={<Calendar size={20} />}
              label="Book Visit"
              color="bg-purple-50 text-purple-700"
            />
            <ActionBtn
              onClick={() => {}}
              icon={<Share2 size={20} />}
              label="Share"
              color="bg-gray-50 text-gray-600"
            />
          </div>
        </div>
      )}

      {/* --- ROW 3: COMMUNITY CTA --- */}
      {isCampusPet && !isOwner && (
        <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6 rounded-3xl border border-violet-100 text-center">
          <h3 className="font-bold text-violet-900 text-lg mb-2">
            Want to support {pet.name}?
          </h3>
          <p className="text-violet-700/80 text-sm mb-4 max-w-sm mx-auto">
            Help provide food and care for our campus residents by donating to
            YFA.
          </p>
          <Button className="rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg px-8">
            Donate Now
          </Button>
        </div>
      )}

      {/* --- ROW 4: TIMELINE --- */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" /> Up Next
          </h3>
          {timelineItems.length > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={() => onNavigate("tasks")}
              className="text-blue-600 h-auto p-0"
            >
              View All
            </Button>
          )}
        </div>

        {timelineItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium">Nothing scheduled</p>
            <p className="text-gray-400 text-sm">Enjoy the free time!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {timelineItems.map((item) => {
              const dateObj = new Date(item.date!);
              const isUrgent = isPast(dateObj) && !isToday(dateObj);
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all"
                >
                  <div
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl shrink-0 ${
                      isUrgent
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-50 text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">
                      {format(dateObj, "MMM")}
                    </span>
                    <span className="text-xl font-black leading-none">
                      {format(dateObj, "d")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-bold text-sm truncate ${
                        isUrgent ? "text-red-700" : "text-gray-900"
                      }`}
                    >
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                      {item.sub}
                    </p>
                  </div>
                  <Info
                    size={18}
                    className="text-gray-300 group-hover:text-blue-600"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for buttons
function ActionBtn({
  onClick,
  icon,
  label,
  color,
}: {
  onClick: () => void;
  icon: any;
  label: string;
  color: string;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`${color} hover:opacity-80 h-auto py-3 flex-col gap-1 rounded-2xl`}
    >
      {icon}
      <span className="text-xs font-bold">{label}</span>
    </Button>
  );
}
