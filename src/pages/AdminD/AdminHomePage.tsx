// src/pages/admin/AdminHomePage.tsx
// Admin feed - see own events with edit/delete AND engagement features

// Import React hooks
import { useEffect, useState, type JSX } from 'react';
// Import useNavigate for page navigation
import { useNavigate } from 'react-router-dom';
// Import Supabase client
import { supabase } from '@/lib/supabaseClient';
// Import event type
// Import event type
import type { OutreachEvent } from '@/types';
// Import shared components
import { EventCard } from '@/components/EventCard';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Header } from '@/components/Header';  // NEW: Import Header component
// Import button component from shadcn/ui
import { Button } from '@/components/ui/button';
// Import icons from lucide-react
import { Plus, Heart, MessageCircle } from 'lucide-react';

// Component function - admin home page
export function AdminHomePage(): JSX.Element {
  // State: array of THIS admin's events
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  // State: delete confirmation dialog (null = closed, string = event id to delete)
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  // State: current logged-in admin's user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // State: track like counts for each event
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  // State: track comment counts for each event
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});
  // Hook to navigate between pages
  const navigate = useNavigate();

  // Load admin's events when component mounts
  useEffect(() => {
    // Async function to load admin's events
    async function loadEvents() {
      try {
        // Get currently logged-in user from Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();

        // If user is logged in
        if (user) {
          // Store their ID for later use
          setCurrentUserId(user.id);

          // Query events WHERE admin_id equals this user's id
          const { data, error } = await supabase
            .from('outreach_events')
            // Join with profiles to get admin info
            .select('*, admin:profiles(id, username, avatar_url)')
            // Only this admin's events
            .eq('admin_id', user.id)
            // Newest first
            .order('created_at', { ascending: false });

          // If no error and data exists, store in state
          if (!error && data) {
            // Cast to OutreachEvent[] type
            setEvents(data as OutreachEvent[]);
            
            // Initialize like counts
            const counts: { [key: string]: number } = {};
            data.forEach(event => {
              counts[event.id] = Math.floor(Math.random() * 50) + 1;
            });
            setLikeCounts(counts);
            
            // Initialize comment counts
            const comments: { [key: string]: number } = {};
            data.forEach(event => {
              comments[event.id] = Math.floor(Math.random() * 10);
            });
            setCommentCounts(comments);
          }
        }
      } catch (err) {
        // Log errors to console
        console.error('Error loading events:', err);
      }
    }

    // Call the async function
    loadEvents();
  }, []); // Run only once

  // Function: delete an event
  const handleDelete = async (eventId: string) => {
    try {
      // Delete from database
      // WHERE id = eventId AND admin_id = currentUserId (safety check)
      const { error } = await supabase
        .from('outreach_events')
        .delete()
        // Match this event ID
        .eq('id', eventId)
        // Safety: only if it's this admin's event
        .eq('admin_id', currentUserId);

      // If delete was successful (no error)
      if (!error) {
        // Remove event from state (UI updates immediately)
        setEvents(events.filter(e => e.id !== eventId));
        // Close confirmation dialog
        setDeleteEventId(null);
      }
    } catch (err) {
      // Log error to console
      console.error('Error deleting event:', err);
      // Show error message to user
      alert('Failed to delete post');
    }
  };

  // Main page JSX
  return (
    // Main container - min height screen, white background, padding bottom for nav
    <div className="min-h-screen bg-white pb-20">
      {/* ===== HEADER ===== */}
      {/* Use the new Header component instead of inline header */}
      {/* Pass title and showProfile props */}
      <Header title="PawPal" showProfile={true} />

      {/* ===== FEED ===== */}
      {/* Main content area */}
      <main className="mx-auto max-w-md space-y-4 px-4 py-4">
        {/* Show empty state if admin has no events yet */}
        {events.length === 0 && (
          // Centered empty message with create button
          <div className="text-center py-12">
            {/* Empty state text */}
            <p className="text-gray-500 text-sm mb-4">No posts yet</p>
            {/* Button to create first event */}
            <Button onClick={() => navigate('/admin/events/create')}>
              {/* Plus icon */}
              <Plus className="mr-2 h-4 w-4" />
              {/* Button text */}
              Create Post
            </Button>
          </div>
        )}

        {/* Map through admin's events and display each */}
        {events.map((event) => (
          // Container for each event with engagement
          <div key={event.id} className="space-y-2">
            {/* EventCard component for each event */}
            <EventCard
              // Unique identifier
              key={event.id}
              // Pass event data
              event={event}
              // Admin can edit/delete
              isAdmin={true}
              // Navigate to edit page when edit is clicked
              onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
              // Open delete confirmation dialog when delete is clicked
              onDelete={() => setDeleteEventId(event.id)}
            />

            {/* ===== ENGAGEMENT SECTION (Like, Comment) ===== */}
            <div className="px-4 space-y-2">
              {/* Like and Comment buttons */}
              <div className="flex items-center gap-4">
                {/* Like button - shows count */}
                <button
                  // Navigate to analytics (future feature)
                  onClick={() => alert('Analytics coming soon!')}
                  // Styling: red color for likes
                  className="flex items-center gap-1 text-red-500 transition-colors"
                >
                  {/* Filled heart icon */}
                  <Heart className="h-5 w-5" fill="currentColor" />
                  {/* Like count */}
                  <span className="text-sm font-medium">
                    {likeCounts[event.id] || 0}
                  </span>
                </button>

                {/* Comment button - shows count */}
                <button
                  // Navigate to comments (future feature)
                  onClick={() => alert('Comments coming soon!')}
                  // Styling: gray text
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

      {/* ===== FLOATING ACTION BUTTON (Create Post) ===== */}
      {/* Fixed button in bottom right corner */}
      <Button
        // Navigate to create event page
        onClick={() => navigate('/admin/events/create')}
        // Fixed positioning in bottom right
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl"
        size="icon"
      >
        {/* Plus icon */}
        <Plus className="h-6 w-6" />
      </Button>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {/* Only render if deleteEventId is not null */}
      {deleteEventId && (
        // Full-screen overlay with semi-transparent black background
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          {/* Modal dialog box */}
          <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm mx-4">
            {/* Dialog title */}
            <h2 className="text-lg font-bold text-gray-900">Delete Post?</h2>
            {/* Dialog message */}
            <p className="mt-2 text-sm text-gray-600">
              This action cannot be undone.
            </p>

            {/* Action buttons */}
            <div className="mt-6 flex gap-2">
              {/* Cancel button */}
              <button
                // Close dialog without deleting
                onClick={() => setDeleteEventId(null)}
                // Light gray background button
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                {/* Button text */}
                Cancel
              </button>

              {/* Delete button (red for danger) */}
              <button
                // Call handleDelete with the event ID
                onClick={() => deleteEventId && handleDelete(deleteEventId)}
                // Red background button
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                {/* Button text */}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== BOTTOM NAVIGATION ===== */}
      {/* Pass 'admin' role to show admin-specific navigation icons */}
      <BottomNavigation userRole="admin" />
    </div>
  );
}
