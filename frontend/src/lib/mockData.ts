export * from "../types";

import type { CalendarEvent } from "../types";

/**
 * Generates an official Google Calendar template link.
 */
export function formatGoogleCalendarUrl(event: CalendarEvent): string {
  try {
    const formatToGCalDate = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toISOString().replace(/-|:|\.\d\d\d/g, "");
      return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const startFormatted = formatToGCalDate(event.start_time);
    const endFormatted = formatToGCalDate(event.end_time || event.start_time);
    const datesParam = `${startFormatted}/${endFormatted}`;

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title || "CRM Meeting",
      dates: datesParam,
      details: `${event.description || ""}\n\nAttendee: ${event.attendee_name || ""} (${event.attendee_email || ""})\nCreated via Zigmaa CRM`.trim(),
      location: event.location || "Online Google Meet"
    });

    if (event.attendee_email) {
      params.append("add", event.attendee_email);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch {
    return "https://calendar.google.com";
  }
}

/**
 * Generates and triggers download of an .ics iCalendar file that can be opened in Google Calendar, Outlook, or Apple Calendar.
 */
export function downloadIcsFile(event: CalendarEvent): void {
  if (typeof window === "undefined") return;
  try {
    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return isNaN(d.getTime())
        ? new Date().toISOString().replace(/-|:|\.\d\d\d/g, "")
        : d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Zigmaa CRM//Omnichannel Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.id}-${Date.now()}@zigmaacrm.com`,
      `DTSTAMP:${formatDate(new Date().toISOString())}`,
      `DTSTART:${formatDate(event.start_time)}`,
      `DTEND:${formatDate(event.end_time || event.start_time)}`,
      `SUMMARY:${(event.title || "Meeting").replace(/[\n\r]/g, " ")}`,
      `DESCRIPTION:${(event.description || "").replace(/[\n\r]/g, " ")}`,
      `LOCATION:${(event.location || "Online").replace(/[\n\r]/g, " ")}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${(event.title || "event").replace(/[^a-zA-Z0-9]/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Error generating ICS file", err);
  }
}
