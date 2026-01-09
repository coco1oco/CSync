import { useNavigate } from "react-router-dom";
import { Camera, Trophy, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveChallenge } from "@/hooks/useChallenges";

export function ChallengeWidget() {
  const navigate = useNavigate();
  const { data: challenge, isLoading } = useActiveChallenge();

  if (isLoading)
    return <div className="h-32 bg-gray-100 rounded-3xl animate-pulse" />;

  // If no active challenge, show nothing (or a "Coming Soon" placeholder if you prefer)
  if (!challenge) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-xl shadow-purple-900/20 mb-6">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            Weekly Challenge
          </div>
          <h3 className="text-2xl font-black text-white leading-tight mb-2">
            "{challenge.theme}"
          </h3>
          <p className="text-indigo-100 text-sm font-medium line-clamp-2 opacity-90">
            {challenge.description ||
              "Upload your best photo and win the badge!"}
          </p>

          <Button
            onClick={() => navigate("/challenges/current")}
            className="mt-4 bg-white text-indigo-700 hover:bg-indigo-50 font-bold border-none rounded-xl h-10 px-5 shadow-lg active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4 mr-2" /> Join the Fun
          </Button>
        </div>

        {/* Floating Icon */}
        <div className="hidden sm:flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner rotate-3">
          <span className="text-3xl">📸</span>
        </div>
      </div>
    </div>
  );
}
