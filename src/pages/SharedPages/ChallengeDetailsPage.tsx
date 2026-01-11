import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import {
  ArrowLeft,
  Upload,
  Heart,
  Trophy,
  Loader2,
  ImagePlus,
  Camera,
  CheckCircle2,
  Trash2,
  Ban, // ✅ Added for "Terminate" vs "Delete" distinction
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useActiveChallenge,
  useChallengeById,
  useChallengeEntries,
  useChallengeActions,
} from "@/hooks/useChallenges";
import { usePets } from "@/hooks/usePets";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  formatDistanceToNow,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";

export default function ChallengeDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";

  // Data Hooks
  const { data: specificChallenge, isLoading: loadingSpecific } =
    useChallengeById(id);
  const { data: activeChallenge, isLoading: loadingActive } =
    useActiveChallenge();

  const challenge = id ? specificChallenge : activeChallenge;
  const isLoading = id ? loadingSpecific : loadingActive;

  const { data: entries = [], isLoading: loadingEntries } = useChallengeEntries(
    challenge?.id,
    user?.id
  );

  const { pets = [] } = usePets(user?.id);

  // ✅ ADDED: deleteChallenge
  const { submitEntry, toggleVote, terminateChallenge, deleteChallenge } =
    useChallengeActions();

  const userEntry = entries.find((e) => e.user_id === user?.id);
  const hasSubmitted = !!userEntry;

  const isEnded = challenge
    ? !challenge.is_active || new Date() > new Date(challenge.end_date)
    : false;

  // Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Countdown Logic
  useEffect(() => {
    if (!challenge) return;
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(challenge.end_date);

      if (!challenge.is_active) {
        setTimeLeft("Terminated");
        return;
      }
      if (now > end) {
        setTimeLeft("Ended");
        return;
      }

      const days = differenceInDays(end, now);
      const hours = differenceInHours(end, now) % 24;
      const minutes = differenceInMinutes(end, now) % 60;
      if (days > 0) setTimeLeft(`${days}d ${hours}h remaining`);
      else setTimeLeft(`${hours}h ${minutes}m remaining`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [challenge]);

  // --- HANDLERS ---
  const handleTerminate = async () => {
    if (!challenge) return;
    if (
      confirm(
        "Are you sure you want to END this challenge? It will be hidden from users immediately."
      )
    ) {
      await terminateChallenge.mutateAsync(challenge.id);
    }
  };

  const handleDelete = async () => {
    if (!challenge) return;
    if (
      confirm(
        "⚠️ WARNING: This will PERMANENTLY DELETE this challenge and all photos/votes associated with it. This cannot be undone."
      )
    ) {
      await deleteChallenge.mutateAsync(challenge.id);
      navigate("/AdminDashboard");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedPetId || !challenge || !user) return;
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadImageToCloudinary(
        selectedFile,
        "challenges"
      );
      await submitEntry.mutateAsync({
        challengeId: challenge.id,
        userId: user.id,
        petId: selectedPetId,
        imageUrl,
        caption,
      });
      setIsUploadOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setSelectedPetId("");
  };

  const handleVote = (entry: any) => {
    if (!user) return;
    if (isEnded && !isAdmin) return;

    toggleVote.mutate({
      entryId: entry.id,
      userId: user.id,
      hasVoted: entry.has_voted,
    });
  };

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!challenge)
    return <div className="p-8 text-center">Challenge not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="-ml-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <span className="font-bold text-lg">
              {id ? "Challenge Results" : "Weekly Challenge"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ Admin Controls */}
            {isAdmin && (
              <>
                {!isEnded ? (
                  // Active -> Show Terminate
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleTerminate}
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none mr-2 gap-2"
                  >
                    <Ban size={16} />{" "}
                    <span className="hidden sm:inline">End</span>
                  </Button>
                ) : (
                  // Ended -> Show Delete
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="bg-red-100 text-red-600 hover:bg-red-200 border-none mr-2 gap-2"
                  >
                    <Trash2 size={16} />{" "}
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                )}
              </>
            )}

            {/* Upload Button */}
            {!isEnded && (
              <div className="hidden sm:block">
                {hasSubmitted ? (
                  <Button
                    disabled
                    className="bg-gray-100 text-green-700 border border-green-200 rounded-full gap-2 opacity-100"
                  >
                    <CheckCircle2 size={16} /> Entry Submitted
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsUploadOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-full"
                  >
                    <Upload size={16} /> Submit Entry
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HERO SECTION */}
      <div
        className={`${
          isEnded ? "bg-gray-800" : "bg-indigo-600"
        } text-white py-12 px-6 text-center transition-colors`}
      >
        <div className="flex flex-col items-center gap-3 mb-4">
          {isEnded ? (
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
              Challenge Ended
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-indigo-500/50 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider border border-indigo-400">
              <Trophy size={14} className="text-yellow-300" /> Current Theme
            </div>
          )}

          <div className="inline-flex items-center gap-2 text-white/70 text-xs font-semibold px-3 py-1 rounded-full">
            <Clock size={12} /> {timeLeft}
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-black mb-4 drop-shadow-sm">
          "{challenge.theme}"
        </h1>
        <p className="text-white/80 max-w-lg mx-auto text-lg leading-relaxed">
          {challenge.description}
        </p>
      </div>

      {/* ENTRIES GRID */}
      <div className="max-w-3xl mx-auto px-4 -mt-8">
        {!isEnded && (
          <div className="sm:hidden flex justify-center mb-6">
            {hasSubmitted ? (
              <div className="bg-white px-6 py-3 rounded-full shadow-lg border border-green-100 flex items-center gap-2 text-green-700 font-bold">
                <CheckCircle2 size={20} /> You've entered!
              </div>
            ) : (
              <Button
                onClick={() => setIsUploadOpen(true)}
                size="lg"
                className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-xl border-2 border-indigo-50 rounded-full font-bold px-8 h-12 gap-2"
              >
                <Camera size={20} /> Submit Your Pet
              </Button>
            )}
          </div>
        )}

        {loadingEntries ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-indigo-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border shadow-sm">
            <ImagePlus className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No entries yet!
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`group bg-white rounded-3xl overflow-hidden shadow-sm border ${
                  entry.user_id === user?.id
                    ? "border-indigo-200 ring-2 ring-indigo-500/20"
                    : "border-gray-100"
                }`}
              >
                <div className="relative aspect-square bg-gray-100">
                  <img
                    src={entry.image_url}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {index === 0 && (
                    <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg flex items-center gap-1">
                      <Trophy size={12} /> {isEnded ? "WINNER" : "#1 LEADER"}
                    </div>
                  )}
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={entry.user.avatar_url || "/default-avatar.png"}
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                      />
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          {entry.pet.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          by @{entry.user.username}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleVote(entry)}
                      disabled={isEnded && !isAdmin}
                      className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all ${
                        entry.has_voted
                          ? "bg-red-50 text-red-600"
                          : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      <Heart
                        size={20}
                        className={entry.has_voted ? "fill-current" : ""}
                      />
                      <span className="text-[10px] font-bold mt-0.5">
                        {entry.vote_count}
                      </span>
                    </button>
                  </div>
                  {entry.caption && (
                    <p className="text-gray-600 text-sm leading-relaxed">
                      "{entry.caption}"
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-3 font-medium uppercase tracking-wide">
                    {formatDistanceToNow(new Date(entry.created_at))} ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-3xl">
          <div className="bg-indigo-600 p-6 text-white text-center">
            <h2 className="text-xl font-bold">Submit Entry</h2>
            <p className="text-indigo-100 text-sm">Theme: {challenge.theme}</p>
          </div>
          <div className="p-6 space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                previewUrl
                  ? "border-transparent bg-black"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-4">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-bold">Click to upload</p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </div>
            <div className="space-y-2">
              <Label>Select Pet</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {pets.map((pet: any) => (
                  <button
                    key={pet.id}
                    onClick={() => setSelectedPetId(pet.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                      selectedPetId === pet.id
                        ? "bg-indigo-600 text-white"
                        : "bg-white"
                    }`}
                  >
                    <span className="text-sm font-bold">{pet.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Caption</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedFile || !selectedPetId}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Submit Entry"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
