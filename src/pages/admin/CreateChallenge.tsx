import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowLeft, Trophy, Calendar, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useChallengeActions } from "@/hooks/useChallenges";
import { addDays, format } from "date-fns";

export default function CreateChallenge() {
  const navigate = useNavigate();
  const { createChallenge } = useChallengeActions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      theme: "",
      description: "",
      start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_date: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await createChallenge.mutateAsync({
        title: data.title,
        theme: data.theme,
        description: data.description,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
      });
      navigate("/AdminDashboard");
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="-ml-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="font-bold text-lg">Create Challenge</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6 p-4 bg-indigo-50 rounded-2xl text-indigo-700">
            <Trophy className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Launch a New Game</h3>
              <p className="text-xs text-indigo-600">
                This will immediately appear on the user dashboard.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label>Challenge Title</Label>
              <Input
                {...register("title", { required: "Title is required" })}
                placeholder="e.g. Sleepy Head"
                className="rounded-xl"
              />
              {errors.title && (
                <span className="text-xs text-red-500">
                  {errors.title.message as string}
                </span>
              )}
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <Label>Theme (The Prompt)</Label>
              <div className="relative">
                <Sparkles className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <Input
                  {...register("theme", { required: "Theme is required" })}
                  placeholder="e.g. Best Nap Position"
                  className="pl-9 rounded-xl"
                />
              </div>
              {errors.theme && (
                <span className="text-xs text-red-500">
                  {errors.theme.message as string}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...register("description", {
                  required: "Description is required",
                })}
                placeholder="Explain the rules or what kind of photos to submit..."
                className="rounded-xl h-24 resize-none"
              />
              {errors.description && (
                <span className="text-xs text-red-500">
                  {errors.description.message as string}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <Input
                    type="datetime-local"
                    {...register("start_date", { required: true })}
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <Input
                    type="datetime-local"
                    {...register("end_date", { required: true })}
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-200 mt-4"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Launch Challenge"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
