import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/authContext";
import { LocationPicker } from "@/components/LocationPicker";
import {
  Calendar,
  Clock,
  Image as ImageIcon,
  Loader2,
  Users,
  ArrowLeft,
  UploadCloud,
  PawPrint,
  Briefcase,
  Tent,
} from "lucide-react";
import { toast } from "sonner";

export default function EditOfficialEvent() {
  const navigate = useNavigate();
  const { id } = useParams(); // Get the ID from the URL
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [requiresRegistration, setRequiresRegistration] = useState(true);
  const [eventType, setEventType] = useState<"pet" | "member" | "campus">(
    "pet"
  );

  // Image State
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 1. FETCH EXISTING DATA
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("outreach_events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Could not find event");
        navigate("/admin");
        return;
      }

      // Populate Form
      setTitle(data.title);
      setDescription(data.description || "");
      setLocation(data.location || "");
      setEventDate(data.event_date || "");
      setStartTime(data.start_time || "");
      setEndTime(data.end_time || "");
      setMaxAttendees(data.max_attendees ? data.max_attendees.toString() : "");
      setRequiresRegistration(data.requires_registration);
      setEventType(data.event_type || "pet");

      // Handle Image
      if (data.images && data.images.length > 0) {
        setExistingImage(data.images[0]);
        setPreviewUrl(data.images[0]);
      }

      setFetching(false);
    };

    fetchEvent();
  }, [id, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !eventDate || !location) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      let imageUrls: string[] = existingImage ? [existingImage] : [];

      // If a NEW image was selected, upload it and replace the old one
      if (coverImage) {
        const url = await uploadImageToCloudinary(coverImage, "chat");
        imageUrls = [url];
      }

      const { error } = await supabase
        .from("outreach_events")
        .update({
          title,
          description,
          location,
          event_date: eventDate,
          start_time: startTime || null,
          end_time: endTime || null,
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
          requires_registration: requiresRegistration,
          images: imageUrls,
          event_type: eventType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id); // ✅ IMPORTANT: Update specific ID

      if (error) throw error;

      toast.success("Event updated successfully!");
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900">Edit Event</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* CATEGORY SELECTION */}
        <section>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-3">
            Event Category
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setEventType("pet")}
              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                eventType === "pet"
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
              }`}
            >
              <PawPrint className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">
                Pet Service
              </span>
            </button>

            <button
              type="button"
              onClick={() => setEventType("member")}
              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                eventType === "member"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
              }`}
            >
              <Briefcase className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Members</span>
            </button>

            <button
              type="button"
              onClick={() => setEventType("campus")}
              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                eventType === "campus"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
              }`}
            >
              <Tent className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Campus</span>
            </button>
          </div>
        </section>

        {/* COVER PHOTO */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden ${
            previewUrl
              ? "border-transparent bg-black"
              : "border-gray-300 bg-white hover:bg-gray-50 hover:border-blue-400"
          }`}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity bg-black/30 font-medium">
                <ImageIcon className="w-5 h-5 mr-2" /> Change Cover
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-center">
              <UploadCloud className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">
                Upload Event Cover
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        {/* MAIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Event Name *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-bold h-12 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date *
                </label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Start
                  </label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-white px-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    End
                  </label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-white px-2"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                Location *
              </label>
              {/* ✅ Reusing the smart LocationPicker */}
              <LocationPicker
                value={location}
                onChange={(val) => setLocation(val)}
                placeholder="Search venue..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
            <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> Registration Logic
            </h3>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Require Registration?
              </span>
              <input
                type="checkbox"
                checked={requiresRegistration}
                onChange={(e) => setRequiresRegistration(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            {requiresRegistration && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Capacity Limit
                </label>
                <Input
                  type="number"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  className="bg-white"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
