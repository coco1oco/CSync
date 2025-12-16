import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/authContext';
import { NotificationCenter } from './NotificationCenter';

export function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchUnreadCount();
    const cleanup = subscribe();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function fetchUnreadCount() {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('is_unread', true);

    if (error) {
      console.error('Error fetching unread count:', error);
      return;
    }
    setUnreadCount(count || 0);
  }

  function subscribe() {
    if (!user?.id) return () => {};
    const channel = supabase
      .channel(`notifications:user_id=eq.${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchUnreadCount())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-600 rounded-full min-w-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          <div className="absolute right-0 mt-2 z-50">
            <NotificationCenter />
          </div>
          {/* backdrop to close on outside click */}
          <button
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
}
