import { useEffect, useMemo, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useDialog } from "@/context/DialogContext";
import { format, isFuture, parseISO, formatDistanceToNow } from "date-fns";
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
  CheckCircle2,
  Utensils,
  ThumbsUp,
  Activity,
  Siren,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface LifeTimelineProps {
  petId: string;
  isCampusPet?: boolean;
  canManage?: boolean; // ✅ Added prop
}

type TimelineItem = {
  id: string;
  originalId: string;
  table: string;
  type:
    | "visit"
    | "medication"
    | "vaccine"
    | "incident"
    | "feeding"
    | "sighting";
  title: string;
  date: string;
  subtitle?: string;
  severity?: string;
};

const ITEMS_PER_PAGE = 20;

export default function LifeTimeline({
  petId,
  isCampusPet = false,
  canManage = false, // ✅ Default to false
}: LifeTimelineProps) {
  const { confirm } = useDialog();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<TimelineItem[], Error>({
      queryKey: ["pet-timeline-infinite", petId, isCampusPet],
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        return lastPage.length < ITEMS_PER_PAGE ? undefined : allPages.length;
      },
      queryFn: async ({ pageParam = 0 }): Promise<TimelineItem[]> => {
        const from = (pageParam as number) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        const normalized: TimelineItem[] = [];

        if (isCampusPet) {
          const { data: incidents } = await supabase
            .from("pet_incidents")
            .select("*")
            .eq("pet_id", petId)
            .order("logged_at", { ascending: false })
            .range(from, to);

          if (incidents) {
            incidents.forEach((i: any) => {
              let type: TimelineItem["type"] = "incident";
              let title = i.symptom || "Incident Report";

              if (i.category === "feeding") {
                type = "feeding";
                title = "Feeding Round";
              } else if (i.category === "sighting") {
                type = "sighting";
                title = "Sighting Log";
              } else {
                if (i.category === "injury") title = "Injury Report";
                if (i.category === "skin") title = "Skin Issue";
                if (i.category === "aggression") title = "Aggression Log";
              }

              normalized.push({
                id: `inc-${i.id}`,
                originalId: i.id,
                table: "pet_incidents",
                type,
                title,
                date: i.logged_at,
                subtitle: i.description || i.notes || `Severity: ${i.severity}`,
                severity: i.severity,
              });
            });
          }
        } else {
          // 🏠 PERSONAL MODE (Unchanged logic)
          const [visits, medLogs, vax, incidents] = await Promise.all([
            supabase
              .from("schedules")
              .select("*")
              .eq("pet_id", petId)
              .order("scheduled_date", { ascending: false })
              .range(from, to),
            supabase
              .from("medication_logs")
              .select("*, medications(name, unit)")
              .eq("pet_id", petId)
              .order("logged_at", { ascending: false })
              .range(from, to),
            supabase
              .from("vaccinations")
              .select("*")
              .eq("pet_id", petId)
              .order("last_date", { ascending: false })
              .range(from, to),
            supabase
              .from("pet_incidents")
              .select("*")
              .eq("pet_id", petId)
              .order("logged_at", { ascending: false })
              .range(from, to),
          ]);

          visits.data?.forEach((v: any) => {
            normalized.push({
              id: `visit-${v.id}`,
              originalId: v.id,
              table: "schedules",
              type: "visit",
              title: v.title,
              date: `${v.scheduled_date}T${v.scheduled_time || "00:00:00"}`,
              subtitle: v.vet_name ? `Dr. ${v.vet_name}` : v.location,
            });
          });

          medLogs.data?.forEach((m: any) => {
            normalized.push({
              id: `med-${m.id}`,
              originalId: m.id,
              table: "medication_logs",
              type: "medication",
              title: `Gave ${m.medications?.name}`,
              date: m.logged_at,
              subtitle: `${m.dosage_taken} ${m.medications?.unit || ""}`,
            });
          });

          vax.data?.forEach((v: any) => {
            if (v.last_date)
              normalized.push({
                id: `vax-${v.id}`,
                originalId: v.id,
                table: "vaccinations",
                type: "vaccine",
                title: `Vaccine: ${v.vaccine_name}`,
                date: v.last_date,
                subtitle: v.next_due_date
                  ? `Next due: ${format(parseISO(v.next_due_date), "MMM yyyy")}`
                  : "Completed",
              });
          });

          incidents.data?.forEach((i: any) => {
            normalized.push({
              id: `inc-${i.id}`,
              originalId: i.id,
              table: "pet_incidents",
              type: "incident",
              title: i.symptom || "Incident",
              date: i.logged_at,
              subtitle: i.description || i.notes,
            });
          });
        }

        return normalized.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      },
      staleTime: 1000 * 60 * 5,
    });

  const allEvents = useMemo(() => {
    return data?.pages.flatMap((page) => page) || [];
  }, [data]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const deleteMutation = useMutation({
    mutationFn: async (item: TimelineItem) => {
      const { error } = await supabase
        .from(item.table)
        .delete()
        .eq("id", item.originalId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Log deleted");
      queryClient.invalidateQueries({
        queryKey: ["pet-timeline-infinite", petId],
      });
    },
    onError: () => toast.error("Could not delete item"),
  });

  const handleDelete = async (item: TimelineItem) => {
    const isConfirmed = await confirm("Delete this history log?", {
      title: "Confirm Delete",
      variant: "danger",
      confirmText: "Delete",
    });
    if (isConfirmed) deleteMutation.mutate(item);
  };

  if (isLoading) return <TimelineSkeleton />;

  const upcoming = allEvents.filter((i: TimelineItem) =>
    isFuture(parseISO(i.date))
  );
  const history = allEvents.filter(
    (i: TimelineItem) => !isFuture(parseISO(i.date))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
              <CalendarIcon size={16} />
            </div>
            <h3 className="font-bold text-gray-900">Coming Up</h3>
          </div>
          <div className="grid gap-3">
            {upcoming.map((item: TimelineItem) => (
              <TimelineCard
                key={item.id}
                item={item}
                onDelete={() => handleDelete(item)}
                canManage={canManage}
              />
            ))}
          </div>
        </section>
      )}

      <section className="relative">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 bg-gray-100 text-gray-600 rounded-lg">
            <Clock size={16} />
          </div>
          <h3 className="font-bold text-gray-900">History Log</h3>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">No history logged yet.</p>
          </div>
        ) : (
          <div className="space-y-6 relative ml-3">
            <div className="absolute top-2 left-[19px] bottom-0 w-0.5 bg-gray-200" />
            {history.map((item: TimelineItem, index: number) => {
              const isTriggerIndex = index === Math.floor(history.length * 0.7);
              return (
                <div key={item.id} ref={isTriggerIndex ? loadMoreRef : null}>
                  <TimelineCard
                    item={item}
                    onDelete={() => handleDelete(item)}
                    canManage={canManage}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-center pb-8">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-gray-400 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
              <Loader2 className="animate-spin w-4 h-4" />
              <span className="text-xs font-medium">
                Loading older history...
              </span>
            </div>
          ) : !hasNextPage && history.length > 5 ? (
            <div className="flex items-center gap-2 text-gray-300 text-xs font-bold uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-full">
              <CheckCircle2 size={14} />
              You've reached the start
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function TimelineCard({
  item,
  onDelete,
  canManage,
}: {
  item: TimelineItem;
  onDelete: () => void;
  canManage: boolean; // ✅ Added
}) {
  let Icon = FileText;
  let colorClass = "bg-gray-100 text-gray-500";

  // ... (Icon logic remains the same)
  if (item.type === "medication") {
    Icon = Pill;
    colorClass = "bg-green-100 text-green-600";
  } else if (item.type === "visit") {
    Icon = Stethoscope;
    colorClass = "bg-purple-100 text-purple-600";
  } else if (item.type === "vaccine") {
    Icon = Syringe;
    colorClass = "bg-blue-100 text-blue-600";
  } else if (item.type === "feeding") {
    Icon = Utensils;
    colorClass = "bg-emerald-100 text-emerald-600";
  } else if (item.type === "sighting") {
    Icon = ThumbsUp;
    colorClass = "bg-blue-50 text-blue-600";
  } else if (item.type === "incident") {
    Icon = AlertCircle;
    colorClass = "bg-orange-100 text-orange-600";
    if (item.title.includes("Injury")) {
      Icon = Activity;
      colorClass = "bg-red-100 text-red-600";
    }
    if (item.title.includes("Aggression")) {
      Icon = Siren;
      colorClass = "bg-red-600 text-white";
    }
    if (item.title.includes("Skin")) {
      Icon = AlertTriangle;
      colorClass = "bg-orange-100 text-orange-700";
    }
  }

  return (
    <div className="relative flex gap-4 items-start group">
      <div
        className={`relative z-10 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0 ${colorClass}`}
      >
        <Icon size={16} />
      </div>

      <div className="flex-1 bg-white border border-gray-100 p-3 rounded-2xl shadow-sm group-hover:shadow-md transition-shadow flex justify-between items-start pr-4">
        <div>
          <h4 className="font-bold text-gray-900 text-sm leading-tight">
            {item.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {format(parseISO(item.date), "MMM d, yyyy • h:mm a")}
            </span>
            <span className="text-[10px] text-gray-300">•</span>
            <span className="text-[10px] text-gray-400 italic">
              {formatDistanceToNow(parseISO(item.date), { addSuffix: true })}
            </span>
          </div>
          {item.subtitle && (
            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed bg-gray-50 p-2 rounded-lg inline-block">
              {item.subtitle}
            </p>
          )}
        </div>

        {/* ✅ Check canManage for Delete */}
        {canManage && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 -mr-2 -mt-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full"
            title="Delete entry"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-8 w-32" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
