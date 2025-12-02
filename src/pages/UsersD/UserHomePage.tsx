// src/pages/user/UserHomePage.tsx
// User feed - read-only, see all events with engagement features

// Import React hooks
import { useEffect, useState, type JSX } from "react";
// Import useNavigate for page navigation
import { useNavigate } from "react-router-dom";
// Import Supabase client
import { supabase } from "@/lib/supabaseClient";
// Import event type
// Import event type
import type { OutreachEvent } from "@/types";
// Import shared components
import { EventCard } from "@/components/EventCard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Header } from "@/components/Header"; // NEW: Import Header component
// Import icons from lucide-react
import { Heart, MessageCircle } from "lucide-react";

// Component function - user home page
export function UserHomePage(): JSX.Element {
  // State: array of all events to display in feed
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  // State: whether data is still loading
  const [loading, setLoading] = useState(true);
  // State: track which events user has liked (event id -> true/false)
  const [likedEvents, setLikedEvents] = useState<{ [key: string]: boolean }>(
    {}
  );
  // State: track like counts for each event
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  // State: track comment counts for each event
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>(
    {}
  );
  // Hook to navigate to different pages
  const navigate = useNavigate();

  // Run once when component mounts
  useEffect(() => {
    // Async function to fetch events from database
    async function fetchEvents() {
      try {
        // Query all outreach_events from Supabase
        const { data, error } = await supabase
          .from("outreach_events")
          // Join with profiles table to get admin info (username, avatar)
          .select("*, admin:profiles(id, username, avatar_url)")
          // Sort: newest events first
          .order("created_at", { ascending: false });

        // If no error and data exists, store it in state
        if (!error && data) {
          // Cast data to OutreachEvent[] type
          setEvents(data as OutreachEvent[]);

          // Initialize like counts (in real app, fetch from database)
          const counts: { [key: string]: number } = {};
          data.forEach((event) => {
            // Set random like count for demo (1-50)
            counts[event.id] = Math.floor(Math.random() * 50) + 1;
          });
          setLikeCounts(counts);

          // Initialize comment counts (in real app, fetch from database)
          const comments: { [key: string]: number } = {};
          data.forEach((event) => {
            // Set random comment count for demo (0-10)
            comments[event.id] = Math.floor(Math.random() * 10);
          });
          setCommentCounts(comments);
        }
      } catch (err) {
        // Log any errors to console for debugging
        console.error("Error fetching events:", err);
      } finally {
        // Stop loading whether successful or not
        setLoading(false);
      }
    }

    // Call the async function
    fetchEvents();
  }, []); // Empty dependency array = run only once

  // Function: handle like button click
  const handleLike = (eventId: string) => {
    // Check if user already liked this event
    const isLiked = likedEvents[eventId];

    // Toggle like state
    setLikedEvents({
      ...likedEvents,
      [eventId]: !isLiked,
    });

    // Update like count
    setLikeCounts({
      ...likeCounts,
      [eventId]: isLiked
        ? (likeCounts[eventId] || 0) - 1 // Decrease if already liked
        : (likeCounts[eventId] || 0) + 1, // Increase if not liked
    });
  };

  // While loading, show loading message
  if (loading) {
    return (
      // Centered loading state
      <div className="flex h-screen items-center justify-center bg-white">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  // Main page JSX
  return (
    // Main container - min height screen, white background, padding bottom for nav
    <div className="min-h-screen bg-white pb-20">
      {/* ===== HEADER ===== */}
      {/* Use the new Header component instead of inline header */}
      {/* Pass title and showProfile props */}
      <Header title="PawPal" showProfile={true} />

      {/* ===== FEED ===== */}
      {/* Main content area with event cards */}
      <main className="mx-auto max-w-md space-y-4 px-4 py-4">
        {/* Show empty state if no events exist */}
        {events.length === 0 && (
          // Centered empty message
          <div className="text-center py-12">
            {/* Empty state text */}
            <p className="text-gray-500 text-sm">No posts yet</p>
            {/* Subtext */}
            <p className="text-gray-400 text-xs mt-1">
              Check back soon for updates!
            </p>
          </div>
        )}

        {/* Map through events array and display each as EventCard */}
        {events.map((event) => (
          // Container for each event card
          <div key={event.id} className="space-y-2">
            {/* EventCard component for each event */}
            <EventCard
              // Unique identifier for React rendering
              key={event.id}
              // Pass event data to card
              event={event}
              // User cannot edit/delete, so isAdmin is false
              isAdmin={false}
            />

            {/* ===== ENGAGEMENT SECTION (Like, Comment) ===== */}
            <div className="px-4 space-y-2">
              {/* Like and Comment buttons */}
              <div className="flex items-center gap-4">
                {/* Like button */}
                <button
                  // Call handleLike when clicked
                  onClick={() => handleLike(event.id)}
                  // Styling: text color changes if liked
                  className={`flex items-center gap-1 transition-colors ${
                    // If user liked, show red color
                    likedEvents[event.id]
                      ? "text-red-500"
                      : // If not liked, show gray
                        "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {/* Heart icon - filled if liked */}
                  <Heart
                    className="h-5 w-5"
                    // Fill the heart if liked
                    fill={likedEvents[event.id] ? "currentColor" : "none"}
                  />
                  {/* Like count */}
                  <span className="text-sm font-medium">
                    {likeCounts[event.id] || 0}
                  </span>
                </button>

                {/* Comment button */}
                <button
                  // Navigate to comments page (not implemented yet)
                  onClick={() => alert("Comments coming soon!")}
                  // Styling: gray text with hover
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {/* Message/comment icon */}
                  <MessageCircle className="h-5 w-5" />
                  {/* Comment count */}
                  <span className="text-sm font-medium">
                    {commentCounts[event.id] || 0}
                  </span>
                </button>
              </div>

              {/* Divider line */}
              <div className="border-t border-gray-200" />
            </div>
          </div>
        ))}
      </main>

      {/* ===== BOTTOM NAVIGATION ===== */}
      {/* Pass 'user' role to show user-specific navigation icons */}
      <BottomNavigation userRole="user" />
    </div>
  );
}
