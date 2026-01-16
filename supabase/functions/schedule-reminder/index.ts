import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  // 1. Setup Timezones (PH Time)
  const nowUtc = new Date();
  const PH_OFFSET = 8 * 60 * 60 * 1000; 
  const nowPh = new Date(nowUtc.getTime() + PH_OFFSET);
  
  const todayStr = nowPh.toISOString().split('T')[0];
  
  const tomorrow = new Date(nowPh);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`[Cron] Checking Time (PH): ${nowPh.toISOString()}`);

  // --- JOB A: TOMORROW REMINDERS (24 Hours) ---
  const { data: tomorrowEvents } = await supabase
    .from('schedules')
    .select('id, title, scheduled_time, owner_id, type, pet_id, pets(name), scheduled_date')
    .eq('scheduled_date', tomorrowStr)
    .eq('is_reminder_sent', false); // Check the "24h" checkbox

  // --- JOB B: TODAY URGENT REMINDERS (6 Hours) ---
  // We fetch ALL active events for today, then filter by time in JS
  const { data: todayEvents } = await supabase
    .from('schedules')
    .select('id, title, scheduled_time, owner_id, type, pet_id, pets(name), scheduled_date')
    .eq('scheduled_date', todayStr)
    .eq('is_urgent_reminder_sent', false); // Check the new "Urgent" checkbox

  const notifications = [];
  const standardIdsToUpdate = [];
  const urgentIdsToUpdate = [];

  // PROCESS JOB A (Tomorrow)
  if (tomorrowEvents && tomorrowEvents.length > 0) {
    for (const event of tomorrowEvents) {
      notifications.push({
        user_id: event.owner_id,
        from_user_id: event.owner_id,
        type: 'schedule',
        title: 'Upcoming Appointment',
        body: `Reminder: ${event.title} (${event.type}) is tomorrow (${event.scheduled_date}).`,
        data: { subtype: event.type, link: `/pet-profile/${event.pet_id}` },
        is_unread: true
      });
      standardIdsToUpdate.push(event.id);
    }
  }

  // PROCESS JOB B (Today - 6 Hour Check)
  if (todayEvents && todayEvents.length > 0) {
    for (const event of todayEvents) {
      // safely parse time (assuming HH:MM:SS format from DB)
      try {
        // Construct a Date object for the Event
        // We use string manipulation to ensure timezone safety
        const eventDateTimeStr = `${event.scheduled_date}T${event.scheduled_time}`;
        // Create date as if it's UTC, then adjust for comparison
        // (Simplest way: treat both as simple numbers)
        
        // Parse "14:30:00" -> Hours=14, Mins=30
        const [hours, minutes] = event.scheduled_time.split(':').map(Number);
        
        const eventTime = new Date(nowPh);
        eventTime.setHours(hours, minutes, 0, 0);

        const diffMs = eventTime.getTime() - nowPh.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // LOGIC: If event is in the future (diff > 0) AND within 6 hours
        if (diffHours > 0 && diffHours <= 6) {
           notifications.push({
            user_id: event.owner_id,
            from_user_id: event.owner_id,
            type: 'schedule',
            title: 'Appointment Soon',
            body: `Urgent: ${event.title} (${event.type}) is today at ${event.scheduled_time}.`,
            data: { subtype: event.type, link: `/pet-profile/${event.pet_id}` },
            is_unread: true
          });
          urgentIdsToUpdate.push(event.id);
        }
      } catch (e) {
        console.error("Error parsing time for event:", event.id, e);
      }
    }
  }

  // 3. SEND BATCH NOTIFICATIONS
  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  // 4. UPDATE CHECKBOXES
  if (standardIdsToUpdate.length > 0) {
    await supabase.from('schedules').update({ is_reminder_sent: true }).in('id', standardIdsToUpdate);
  }
  if (urgentIdsToUpdate.length > 0) {
    await supabase.from('schedules').update({ is_urgent_reminder_sent: true }).in('id', urgentIdsToUpdate);
  }

  return new Response(JSON.stringify({ 
    message: `Processed. Sent ${standardIdsToUpdate.length} standard and ${urgentIdsToUpdate.length} urgent reminders.`,
    ph_time: nowPh.toISOString()
  }), { headers: { 'Content-Type': 'application/json' } });
})