import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useDialog } from "@/context/DialogContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  TrendingUp,
  Scale,
  TrendingDown,
  Minus,
  Activity,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import BCSGuideModal from "./BCSGuideModal";
import { toast } from "sonner";

interface WeightLog {
  id: string;
  weight: number;
  bcs?: number;
  date_logged: string;
}

const ITEMS_PER_PAGE = 10;

// ✅ Added canManage prop
export default function WeightSection({
  petId,
  canManage,
}: {
  petId: string;
  canManage?: boolean;
}) {
  const { confirm } = useDialog();
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [newWeight, setNewWeight] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showBCS, setShowBCS] = useState(false);
  const [tempBCS, setTempBCS] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  const fetchWeights = useCallback(
    async (pageNum: number) => {
      try {
        if (pageNum === 0) setLoading(true);
        else setLoadingMore(true);

        const from = pageNum * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data, error } = await supabase
          .from("pet_weights")
          .select("*")
          .eq("pet_id", petId)
          .order("date_logged", { ascending: false })
          .range(from, to);

        if (error) throw error;

        if (data) {
          if (data.length < ITEMS_PER_PAGE) setHasMore(false);
          setWeights((prev) => (pageNum === 0 ? data : [...prev, ...data]));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [petId]
  );

  useEffect(() => {
    fetchWeights(0);
  }, [fetchWeights]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchWeights(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchWeights, weights]);

  const handleAdd = async () => {
    if (!newWeight || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const weightNum = parseFloat(newWeight);
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("pet_weights")
        .insert({
          pet_id: petId,
          weight: weightNum,
          bcs: tempBCS,
          date_logged: today,
        })
        .select()
        .single();

      if (error) throw error;

      setWeights((prev) => [data, ...prev]);
      setIsAdding(false);
      setNewWeight("");
      setTempBCS(null);
      toast.success("Weight logged");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save weight. Check DB permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm("Remove this weight entry?", {
      title: "Delete Log",
      variant: "danger",
      confirmText: "Remove",
    });

    if (!isConfirmed) return;

    const previousWeights = [...weights];
    setWeights(weights.filter((w) => w.id !== id));

    const { error } = await supabase.from("pet_weights").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      setWeights(previousWeights);
    } else {
      toast.success("Entry removed");
    }
  };

  const getBCSLabel = (score: number) => {
    if (score <= 3)
      return { label: "Underweight", color: "bg-blue-100 text-blue-700" };
    if (score === 4 || score === 5)
      return { label: "Ideal Condition", color: "bg-green-100 text-green-700" };
    return { label: "Overweight", color: "bg-orange-100 text-orange-700" };
  };

  if (loading && page === 0)
    return <Skeleton className="h-48 w-full rounded-3xl" />;

  const currentWeight = weights[0]?.weight || 0;
  const previousWeight = weights[1]?.weight || currentWeight;
  const diff = currentWeight - previousWeight;
  const trend = diff > 0 ? "gained" : diff < 0 ? "lost" : "stable";
  const currentBCS = weights[0]?.bcs;
  const thresholdIndex = Math.floor(weights.length * 0.6);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Scale size={14} /> Current Status
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900">
              {weights.length > 0 ? currentWeight : "--"}
            </span>
            <span className="text-gray-500 font-medium">kg</span>
          </div>
          {weights.length > 1 && (
            <div
              className={`text-xs font-bold mt-2 flex items-center gap-1 ${
                trend === "gained"
                  ? "text-orange-600"
                  : trend === "lost"
                  ? "text-blue-600"
                  : "text-gray-400"
              }`}
            >
              {trend === "gained" && <TrendingUp size={14} />}
              {trend === "lost" && <TrendingDown size={14} />}
              {trend === "stable" && <Minus size={14} />}
              <span>
                {Math.abs(diff).toFixed(1)}kg {trend} since last log
              </span>
            </div>
          )}
          {currentBCS && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-3 ${
                getBCSLabel(currentBCS).color
              }`}
            >
              <Activity size={12} />
              {getBCSLabel(currentBCS).label} (BCS {currentBCS}/9)
            </div>
          )}
        </div>

        {/* ✅ Check canManage for Add Button */}
        {canManage && (
          <div className="z-10">
            <Button
              size="icon"
              className={`rounded-full h-12 w-12 shadow-lg transition-transform ${
                isAdding
                  ? "rotate-45 bg-red-50 text-red-600 hover:bg-red-100"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
              onClick={() => setIsAdding(!isAdding)}
            >
              <Plus size={24} />
            </Button>
          </div>
        )}
        <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-gray-50 rounded-full z-0" />
      </div>

      {isAdding && canManage && (
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-lg animate-in slide-in-from-top-2 space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1 ml-1">
              New Weight (kg)
            </p>
            <Input
              type="number"
              placeholder="0.0"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              autoFocus
              className="bg-gray-50 border-gray-200 text-lg font-bold"
            />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1 ml-1">
              Body Condition
            </p>
            {tempBCS ? (
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-100">
                <span className="text-sm font-bold text-blue-700">
                  Score: {tempBCS}/9 ({getBCSLabel(tempBCS).label})
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBCS(true)}
                  className="text-blue-600 h-auto py-1"
                >
                  Retake
                </Button>
              </div>
            ) : (
              <div>
                <Button
                  variant="outline"
                  onClick={() => setShowBCS(true)}
                  className="w-full justify-start text-gray-500 border-dashed border-2"
                >
                  <Activity className="w-4 h-4 mr-2" /> Assess Body Condition
                </Button>
                <p className="text-[10px] text-gray-400 mt-1 ml-1">
                  * General guideline only. Refer to your vet for accuracy.
                </p>
              </div>
            )}
          </div>
          <Button
            onClick={handleAdd}
            disabled={!newWeight || isSubmitting}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              "Save Log"
            )}
          </Button>
        </div>
      )}

      <div>
        <h3 className="font-bold text-gray-900 mb-4 px-1 flex items-center gap-2">
          History{" "}
          <span className="text-gray-400 text-xs font-normal">
            ({weights.length} logs)
          </span>
        </h3>

        {weights.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No weight logs yet.
          </div>
        ) : (
          <div className="space-y-3">
            {weights.map((log, index) => {
              const isThresholdItem = index === thresholdIndex;

              return (
                <div
                  key={log.id}
                  ref={isThresholdItem ? observerTarget : null}
                  className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center group hover:border-blue-200 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-lg">
                        {log.weight}{" "}
                        <span className="text-sm text-gray-500 font-medium">
                          kg
                        </span>
                      </p>
                      {log.bcs && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            getBCSLabel(log.bcs).color
                          }`}
                        >
                          BCS {log.bcs}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-medium">
                      {format(new Date(log.date_logged), "MMMM d, yyyy")}
                    </p>
                  </div>
                  {/* ✅ Check canManage for Delete Button */}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(log.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
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
            weights.length > 5 && (
              <div className="flex items-center gap-2 text-gray-300 text-xs font-medium uppercase tracking-widest">
                <CheckCircle2 size={14} /> You've reached the start
              </div>
            )
          )}
        </div>
      </div>

      {showBCS && (
        <BCSGuideModal
          onClose={() => setShowBCS(false)}
          onSave={(score) => {
            setTempBCS(score);
            setShowBCS(false);
          }}
        />
      )}
    </div>
  );
}
