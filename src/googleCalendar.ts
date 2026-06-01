/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { Meeting } from './types';

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

/**
 * Formats a Workspace Meeting into a Google Calendar Event structure
 */
export function formatMeetingToGoogleEvent(meeting: Meeting): GoogleCalendarEvent {
  // Parse date and time to construct valid ISO strings
  // Example inputs: meeting.date = "2026-05-29", meeting.startTime = "09:00", meeting.endTime = "10:00"
  
  let startIso = '';
  let endIso = '';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  try {
    const startParts = meeting.startTime.split(':');
    const endParts = meeting.endTime.split(':');
    
    const startDateObj = new Date(meeting.date);
    startDateObj.setHours(parseInt(startParts[0], 10) || 9);
    startDateObj.setMinutes(parseInt(startParts[1], 10) || 0);
    startDateObj.setSeconds(0);
    startIso = startDateObj.toISOString();
    
    const endDateObj = new Date(meeting.date);
    endDateObj.setHours(parseInt(endParts[0], 10) || 10);
    endDateObj.setMinutes(parseInt(endParts[1], 10) || 0);
    endDateObj.setSeconds(0);
    endIso = endDateObj.toISOString();
  } catch (err) {
    console.warn('Error formatting meeting times for Google Calendar. Defaulting to general ISO conversion.', err);
    startIso = new Date(`${meeting.date}T${meeting.startTime || '09:00'}:00`).toISOString();
    endIso = new Date(`${meeting.date}T${meeting.endTime || '10:00'}:00`).toISOString();
  }

  return {
    summary: meeting.title,
    description: `${meeting.description || 'Sprint Sync standup meeting on VFT Workspace.'}\n\nZoom Link: ${meeting.zoomLink || 'No direct zoom link configured.'}`,
    start: {
      dateTime: startIso,
      timeZone: timeZone
    },
    end: {
      dateTime: endIso,
      timeZone: timeZone
    }
  };
}

/**
 * Syncs a meeting event to Google Calendar
 * Will edit if a Google Calendar Event ID exists, otherwise will create new.
 */
export async function syncEventToGoogleCalendar(
  accessToken: string,
  meeting: Meeting,
  onConfirm: (msg: string) => Promise<boolean>
): Promise<string> {
  // Enforce User Confirmation check before proceeding to mutate calendars (MANDATORY per workspace-integration guidelines)
  const isCreation = !meeting.googleEventId;
  const actionText = isCreation 
    ? `Create "${meeting.title}" on your Google Calendar?` 
    : `Update the existing Google Calendar event for "${meeting.title}" with new times/details?`;
    
  const userConfirmed = await onConfirm(actionText);
  if (!userConfirmed) {
    throw new Error('Sync operation cancelled by user.');
  }

  const eventPayload = formatMeetingToGoogleEvent(meeting);
  
  const url = isCreation
    ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    : `https://www.googleapis.com/calendar/v3/calendars/primary/events/${meeting.googleEventId}`;
    
  const method = isCreation ? 'POST' : 'PUT';

  const response = await fetch(url, {
    method: method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventPayload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMsg = errorBody?.error?.message || response.statusText;
    throw new Error(`Google Calendar Sync Error (${response.status}): ${errorMsg}`);
  }

  const result = await response.json();
  if (!result.id) {
    throw new Error('Google Calendar did not return persistent Event ID.');
  }

  return result.id;
}

/**
 * Deletes an event from Google Calendar (Requires mandatory user confirmation first)
 */
export async function deleteEventFromGoogleCalendar(
  accessToken: string,
  googleEventId: string,
  eventTitle: string,
  onConfirm: (msg: string) => Promise<boolean>
): Promise<void> {
  const userConfirmed = await onConfirm(`Are you sure you want to delete the synchronized Google Calendar event for "${eventTitle}"? This cannot be undone.`);
  if (!userConfirmed) {
    throw new Error('Deletion operation cancelled by user.');
  }

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMsg = errorBody?.error?.message || response.statusText;
    throw new Error(`Google Calendar Deletion Error (${response.status}): ${errorMsg}`);
  }
}
