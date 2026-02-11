import ICAL from 'ical.js';

export interface CalendarEvent {
	id: string;
	calendarId: string;
	title: string;
	start: Date;
	end: Date;
	isAllDay: boolean;
	category: 'time' | 'allday';
	location?: string;
	backgroundColor?: string;
	borderColor?: string;
}

/**
 * Parse iCal file content and convert to TUI Calendar events
 */
export function parseICalEvents(
	icalContent: string,
	calendarId: string,
	backgroundColor: string,
	borderColor: string
): CalendarEvent[] {
	const events: CalendarEvent[] = [];

	try {
		// Parse the iCal content
		const jcalData = ICAL.parse(icalContent);
		const comp = new ICAL.Component(jcalData);
		const vevents = comp.getAllSubcomponents('vevent');

		vevents.forEach((vevent) => {
			const event = new ICAL.Event(vevent);
			
			// Get event properties
			const uid = event.uid;
			const summary = event.summary;
			const location = event.location;
			const dtstart = event.startDate;
			const dtend = event.endDate;

			// Check if it's an all-day event
			const isAllDay = !dtstart.isDate ? false : true;

			// Convert ICAL.Time to JavaScript Date
			const startDate = dtstart.toJSDate();
			const endDate = dtend.toJSDate();

			events.push({
				id: uid,
				calendarId,
				title: summary,
				location,
				start: startDate,
				end: endDate,
				isAllDay,
				category: isAllDay ? 'allday' : 'time',
				backgroundColor,
				borderColor
			});
		});
	} catch (error) {
		console.error('Error parsing iCal content:', error);
	}

	return events;
}

/**
 * Load and parse multiple iCal files
 */
export async function loadCalendarEvents(): Promise<CalendarEvent[]> {
	const allEvents: CalendarEvent[] = [];

	try {
		// Import the iCal files as raw text
		const lectureFreeResponse = await fetch('/Documents/lecture-free-periods.ics');
		const lectureFreeContent = await lectureFreeResponse.text();
		
		const examsResponse = await fetch('/Documents/exams.ics');
		const examsContent = await examsResponse.text();

		// Parse lecture-free periods (blue theme)
		const lectureFreeEvents = parseICalEvents(
			lectureFreeContent,
			'lecture-free',
			'#3b82f6', // blue-500
			'#2563eb'  // blue-600
		);

		// Parse exams (red theme)
		const examEvents = parseICalEvents(
			examsContent,
			'exams',
			'#ef4444', // red-500
			'#dc2626'  // red-600
		);

		allEvents.push(...lectureFreeEvents, ...examEvents);
	} catch (error) {
		console.error('Error loading calendar events:', error);
	}

	return allEvents;
}
