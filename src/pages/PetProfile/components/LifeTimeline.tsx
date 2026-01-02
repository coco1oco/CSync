import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useDialog } from "@/context/DialogContext"; // ✅ Custom Dialog Hook
import { format, isPast, isFuture, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Syringe,
  Pill,
  FileText,
  Stethoscope,
  AlertCircle,
  Trash2,
  Loader2,
  Archive,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface LifeTimelineProps {
  petId: string;
}

type TimelineItem = {
  id: string;
  type: "visit" | "medication" | "vaccine" | "task" | "incident";
  title: string;
  date: string;
  subtitle?: string;
  status?: string;
};

type FilterType = "all" | "medical" | "routine";

const ITEMS_PER_BATCH = 15;

export default function LifeTimeline({ petId }: LifeTimelineProps) {
  const { confirm } = useDialog(); // ✅ Init Hook
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  const fetchTimeline = useCallback(
    async (isLoadMore = false) => {
      try {
        if (!isLoadMore) setLoading(true);
        else setLoadingMore(true);

        const limit = page * ITEMS_PER_BATCH;

        const { data: visits } = await supabase
          .from("schedules")
          .select("*")
          .eq("pet_id", petId)
          .order("scheduled_date", { ascending: true });

        const { data: medLogs } = await supabase
          .from("medication_logs")
          .select("*, medications(name, unit)")
          .eq("pet_id", petId)
          .order("logged_at", { ascending: false })
          .limit(limit);

        const { data: vax } = await supabase
          .from("vaccinations")
          .select("*")
          .eq("pet_id", petId)
          .limit(limit);

        const { data: incidents } = await supabase
          .from("pet_incidents")
          .select("*")
          .eq("pet_id", petId)
          .order("logged_at", { ascending: false })
          .limit(limit);

        const normalized: TimelineItem[] = [];

        visits?.forEach((v: any) => {
          normalized.push({
            id: `visit-${v.id}`,
            type: "visit",
            title: v.title,
            date: `${v.scheduled_date}T${v.scheduled_time || "00:00:00"}`,
            subtitle: v.vet_name
              ? `Dr. ${v.vet_name} @ ${v.location}`
              : v.location,
            status: v.status,
          });
        });

        medLogs?.forEach((m: any) => {
          normalized.push({
            id: `med-${m.id}`,
            type: "medication",
            title: `Gave ${m.medications?.name}`,
            date: m.logged_at,
            subtitle: `Dose: ${m.dosage_taken} ${m.medications?.unit || ""}`,
            status: "completed",
          });
        });

        vax?.forEach((v: any) => {
          if (v.last_date)
            normalized.push({
              id: `vax-last-${v.id}`,
              type: "vaccine",
              title: `Vaccine: ${v.vaccine_name}`,
              date: v.last_date,
              status: "completed",
            });
          if (v.next_due_date)
            normalized.push({
              id: `vax-next-${v.id}`,
              type: "vaccine",
              title: `Due: ${v.vaccine_name}`,
              date: v.next_due_date,
              status: "pending",
            });
        });

        incidents?.forEach((i: any) => {
          normalized.push({
            id: `inc-${i.id}`,
            type: "incident",
            title: `Incident: ${i.symptom}`,
            date: i.logged_at,
            subtitle: `Severity: ${i.severity} • ${i.category}`,
            status: i.severity,
          });
        });

        const sorted = normalized.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        if (sorted.length === items.length && page > 1) {
          setHasMore(false);
        }

        setItems(sorted);
      } catch (err) {
        console.error("Timeline error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [petId, page]
  );

  useEffect(() => {
    fetchTimeline(page > 1);
  }, [fetchTimeline, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, items]);

  const handleDelete = async (itemId: string, type: string) => {
    // ✅ Custom Danger Confirm
    const isConfirmed = await confirm(
      "Are you sure you want to delete this log?",
      {
        title: "Delete Log",
        variant: "danger",
        confirmText: "Delete",
      }
    );

    if (!isConfirmed) return;

    const rawId = itemId.split("-").slice(1).join("-");
    let table = "";

    if (itemId.startsWith("med-")) table = "medication_logs";
    else if (itemId.startsWith("inc-")) table = "pet_incidents";
    else if (itemId.startsWith("visit-")) table = "schedules";
    else if (itemId.startsWith("vax-")) table = "vaccinations";

    if (!table) return;

    try {
      let uuid = rawId;
      if (itemId.startsWith("vax-last-") || itemId.startsWith("vax-next-")) {
        uuid = itemId.split("-").slice(2).join("-");
      }

      const { error } = await supabase.from(table).delete().eq("id", uuid);
      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Log deleted");
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Could not delete item");
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "medical")
      return ["visit", "vaccine", "incident"].includes(item.type);
    if (filter === "routine") return ["medication", "task"].includes(item.type);
    return true;
  });

  const upcoming = filteredItems
    .filter((i) => isFuture(parseISO(i.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const history = filteredItems.filter((i) => isPast(parseISO(i.date)));
  const thresholdIndex = Math.floor(history.length * 0.6);

  if (loading && page === 1) return <TimelineSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-20 py-2 -mx-2 px-2 flex gap-2 overflow-x-auto scrollbar-hide border-b border-gray-100/50">
        <FilterBtn
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All Events"
        />
        <FilterBtn
          active={filter === "medical"}
          onClick={() => setFilter("medical")}
          label="Medical"
          icon={<Stethoscope size={14} />}
        />
        <FilterBtn
          active={filter === "routine"}
          onClick={() => setFilter("routine")}
          label="Routine"
          icon={<Pill size={14} />}
        />
      </div>

      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
              <CalendarIcon size={16} />
            </div>
            <h3 className="font-bold text-gray-900">Coming Up</h3>
          </div>
          <div className="grid gap-3">
            {upcoming.map((item) => (
              <div
                key={item.id}
                className="relative bg-white border border-blue-100 shadow-sm rounded-xl p-4 flex gap-4 overflow-hidden group hover:border-blue-300 transition-colors"
              >
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500" />
                <div className="flex flex-col items-center justify-center w-14 shrink-0 text-blue-600 bg-blue-50 rounded-lg">
                  <span className="text-[10px] font-bold uppercase">
                    {format(parseISO(item.date), "MMM")}
                  </span>
                  <span className="text-xl font-black">
                    {format(parseISO(item.date), "d")}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-500">
                    {item.subtitle || format(parseISO(item.date), "h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="relative">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 bg-gray-100 text-gray-600 rounded-lg">
            <Clock size={16} />
          </div>
          <h3 className="font-bold text-gray-900">Recent History</h3>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">
              {filter === "all"
                ? "No history logged yet."
                : `No ${filter} events found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6 relative ml-3">
            <div className="absolute top-2 left-[19px] bottom-0 w-0.5 bg-gray-200" />
            {history.map((item, index) => {
              let Icon = FileText;
              let colorClass = "bg-gray-100 text-gray-500";
              if (item.type === "medication") {
                Icon = Pill;
                colorClass = "bg-green-100 text-green-600";
              }
              if (item.type === "visit") {
                Icon = Stethoscope;
                colorClass = "bg-purple-100 text-purple-600";
              }
              if (item.type === "vaccine") {
                Icon = Syringe;
                colorClass = "bg-orange-100 text-orange-600";
              }
              if (item.type === "incident") {
                Icon = AlertCircle;
                colorClass = "bg-red-100 text-red-600";
              }

              const isThresholdItem = index === thresholdIndex;

              return (
                <div
                  key={item.id}
                  ref={isThresholdItem ? observerTarget : null}
                  className="relative flex gap-4 items-start group"
                >
                  <div
                    className={`relative z-10 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0 ${colorClass}`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 bg-white border border-gray-100 p-3 rounded-2xl shadow-sm group-hover:shadow-md transition-shadow flex justify-between items-center pr-4">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-gray-900 text-sm">
                          {item.title}
                        </h4>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium block mt-1">
                        {format(parseISO(item.date), "MMM d, yyyy")}
                      </span>
                      {item.subtitle && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id, item.type)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full"
                      title="Delete log"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-center pb-8">
          {loadingMore && hasMore ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="animate-spin w-5 h-5" />
            </div>
          ) : (
            !hasMore &&
            history.length > 5 && (
              <div className="flex items-center gap-2 text-gray-300 text-xs font-medium uppercase tracking-widest">
                <Archive size={14} />
                End of history
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}

function FilterBtn({ active, onClick, label, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
        active
          ? "bg-gray-900 text-white shadow-md"
          : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
