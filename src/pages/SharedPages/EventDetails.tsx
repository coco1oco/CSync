import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { FeedPost } from "@/components/FeedPost"; // Check your import path
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { OutreachEvent } from "@/types";

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<OutreachEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

   async function fetchEvent() {
  try {
    setLoading(true);
    const { data, error } = await supabase
      .from("outreach_events")
      .select(`
        *,
        profiles:admin_id (
          username,
          avatar_url
        )
      `) // 👈 This joins the profile of the creator
      .eq("id", id)
      .single();
        console.log("DB DATA:", data);
    if (error) throw error;
    setEvent(data);
  } catch (err) {
    console.error("Error fetching event:", err);
  } finally {
    setLoading(false);
  }
}

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">Event not found.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

 return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Navbar / Back Button */}
      <div className="bg-white border-b px-4 py-3 mb-6 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">Event Details</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4">
     <FeedPost 
    event={event} 
    // This converts the null you see in your console to undefined
    customUsername={event.profiles?.username ?? undefined} 
    customAvatar={event.profiles?.avatar_url ?? undefined}
    isAdmin={false} 
    onDelete={() => navigate(-1)} 
    onEdit={() => {}} 
/>
      </div>
    </div>
  );
}