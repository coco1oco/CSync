// pages/HomePage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EventCard } from '@/components/EventCard';
import { BottomNavigation } from '@/components/BottomNavigation';
import { User } from 'lucide-react';

export function HomePage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('outreach_events')
      .select(`
        *,
        organization:organizations(name, location, logo_url)
      `)
      .order('created_at', { ascending: false });

    if (data) setEvents(data);
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded" />
          <h1 className="text-xl font-bold">PawPal</h1>
        </div>
        <button className="p-2">
          <User className="w-6 h-6" />
        </button>
      </header>

      {/* Events Feed */}
      <main className="max-w-md mx-auto p-4 space-y-6">
        {events.map(event => (
          <EventCard
            key={event.id}
            title={event.title}
            location={event.location}
            description={event.description}
            images={event.images || []}
            organization={event.organization}
          />
        ))}
      </main>

      <BottomNavigation />
    </div>
  );
}
