import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import {
  ArrowLeft,
  Upload,
  Heart,
  Trophy,
  Loader2,
  ImagePlus,
  Camera,
  CheckCircle2, // ✅ Added for status icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useActiveChallenge,
  useChallengeEntries,
  useChallengeActions,
} from "@/hooks/useChallenges";
import { usePets } from "@/hooks/usePets";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { formatDistanceToNow } from "date-fns";

export default function ChallengeDetailsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data Hooks
  const { data: challenge, isLoading: loadingChallenge } = useActiveChallenge();
  const { data: entries = [], isLoading: loadingEntries } = useChallengeEntries(
    challenge?.id,
    user?.id
  );

  const { pets = [] } = usePets(user?.id);
  const { submitEntry, toggleVote } = useChallengeActions();

  // ✅ CHECK: Has this user already submitted?
  const userEntry = entries.find((e) => e.user_id === user?.id);
  const hasSubmitted = !!userEntry;

  // Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HANDLERS ---
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
    toggleVote.mutate({
      entryId: entry.id,
      userId: user.id,
      hasVoted: entry.has_voted,
    });
  };

  if (loadingChallenge)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!challenge)
    return <div className="p-8 text-center">No active challenge found!</div>;

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
            <span className="font-bold text-lg">Weekly Challenge</span>
          </div>
          {/* Upload Button (Desktop) */}
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
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="bg-indigo-600 text-white py-12 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/50 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-4 border border-indigo-400">
          <Trophy size={14} className="text-yellow-300" /> Current Theme
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4 drop-shadow-sm">
          "{challenge.theme}"
        </h1>
        <p className="text-indigo-100 max-w-lg mx-auto text-lg leading-relaxed">
          {challenge.description}
        </p>
      </div>

      {/* ENTRIES GRID */}
      <div className="max-w-3xl mx-auto px-4 -mt-8">
        {/* Upload Button (Mobile Float) */}
        <div className="sm:hidden flex justify-center mb-6">
          {hasSubmitted ? (
            <div className="bg-white px-6 py-3 rounded-full shadow-lg border border-green-100 flex items-center gap-2 text-green-700 font-bold">
              <CheckCircle2 size={20} /> You've entered this challenge!
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

        {loadingEntries ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-indigo-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border shadow-sm">
            <ImagePlus className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Be the first to post!
            </h3>
            <p className="text-gray-500">
              Show us your pet's best look for this theme.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`group bg-white rounded-3xl overflow-hidden shadow-sm border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
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
                      <Trophy size={12} /> #1 Leader
                    </div>
                  )}
                  {entry.user_id === user?.id && (
                    <div className="absolute top-4 right-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg">
                      You
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
                      className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all active:scale-90 ${
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

      {/* UPLOAD MODAL */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-3xl">
          <div className="bg-indigo-600 p-6 text-white text-center">
            <h2 className="text-xl font-bold">Submit Entry</h2>
            <p className="text-indigo-100 text-sm">Theme: {challenge.theme}</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Image Preview */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                previewUrl
                  ? "border-transparent bg-black"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white font-bold text-sm flex items-center gap-2">
                      <ImagePlus size={16} /> Change Photo
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Upload size={20} />
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    Click to upload
                  </p>
                  <p className="text-xs text-gray-400">JPG, PNG up to 5MB</p>
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

            {/* Pet Selection */}
            <div className="space-y-2">
              <Label>Select Pet</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {pets.map((pet: any) => (
                  <button
                    key={pet.id}
                    onClick={() => setSelectedPetId(pet.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap ${
                      selectedPetId === pet.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                        : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <img
                      src={pet.petimage_url || "/default-pet.png"}
                      className="w-6 h-6 rounded-full bg-white object-cover"
                    />
                    <span className="text-sm font-bold">{pet.name}</span>
                  </button>
                ))}
                {pets.length === 0 && (
                  <p className="text-sm text-red-500">
                    You need to add a pet profile first!
                  </p>
                )}
              </div>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label>Caption (Optional)</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Tell us about this photo..."
                className="rounded-xl"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedFile || !selectedPetId}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-200"
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
