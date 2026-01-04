import type { OutreachEvent } from "@/types";

export const createGoogleCalendarLink = (event: OutreachEvent) => {
  // 1. Fallback to empty string if date is missing (|| "")
  const { 
    title, 
    description, 
    location, 
    event_date, 
    start_time, 
    end_time 
  } = event;

  // Ensure event_date is a string. If null, use empty string (though practically it should exist)
  const dateStr = event_date || ""; 

  // Helper: Format date for Google (YYYYMMDDTHHmmSSZ)
  const formatGoogleDate = (dStr: string, timeStr?: string | null) => {
    if (!dStr) return ""; // Guard clause
    const combined = `${dStr}T${timeStr || "00:00"}`;
    const d = new Date(combined);
    return d.toISOString().replace(/-|:|\.\d+/g, "");
  };

  // 2. Use the safe 'dateStr' variable instead of 'event_date'
  const start = formatGoogleDate(dateStr, start_time);
  
  let end;
  if (end_time) {
    end = formatGoogleDate(dateStr, end_time);
  } else {
    // Default to 1 hour duration
    const d = new Date(`${dateStr}T${start_time || "00:00"}`);
    d.setHours(d.getHours() + 1);
    end = d.toISOString().replace(/-|:|\.\d+/g, "");
  }

  const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const textParam = `&text=${encodeURIComponent(title)}`;
  const datesParam = `&dates=${start}/${end}`;
  const locationParam = location ? `&location=${encodeURIComponent(location)}` : "";
  const detailsParam = description ? `&details=${encodeURIComponent(description)}` : "";

  return `${baseUrl}${textParam}${datesParam}${locationParam}${detailsParam}`;
};