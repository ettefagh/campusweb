import ICAL from 'ical.js';

export function extractCalendarName(icalContent: string): string | null {
	const match = icalContent.match(/^X-WR-CALNAME:(.*)$/m);
	return match ? match[1].trim() : null;
}

export interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	allDay: boolean;
	backgroundColor?: string;
	extendedProps?: {
		location?: string;
		shortLocation?: string;
		calendarId?: string;
		description?: string;
		classGroupId?: string;
	};
}

/**
 * Parse iCal file content and convert to Event Calendar compatible events
 */
export function parseICalEvents(
	icalContent: string,
	calendarId: string,
	backgroundColor: string,
	_borderColor: string
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
			const description = vevent.getFirstPropertyValue('description');
			const dtstart = event.startDate;
			const dtend = event.endDate;

			// Check if it's an all-day event
			const isAllDay = !dtstart.isDate ? false : true;

			// Convert ICAL.Time to JavaScript Date
			const startDate = dtstart.toJSDate();
			const endDate = dtend.toJSDate();

			// Extract short location label (room code) from the full address
			const fullLocation = location || '';
			const shortLocation = fullLocation.includes(',')
				? fullLocation.split(',')[0].trim()
				: fullLocation;

			// Extract class grouping ID (Course ID) if present, otherwise group as "Other Events"
			let classGroupId = 'Other Events';
			if (description) {
				const match = description.match(/Course ID:\s*(?!N\/A)(k_[A-Z0-9_]+)/i);
				if (match && match[1]) {
					classGroupId = match[1];
				}
			}

			events.push({
				id: uid,
				title: summary,
				start: startDate,
				end: endDate,
				allDay: isAllDay,
				backgroundColor,
				extendedProps: {
					location: fullLocation,
					shortLocation,
					calendarId,
					description,
					classGroupId
				}
			});
		});
	} catch (error) {
		console.error('Error parsing iCal content:', error);
	}

	return events;
}

/**
 * Load and parse multiple iCal files for the academic calendar
 */
export async function loadCalendarEvents(): Promise<CalendarEvent[]> {
	const allEvents: CalendarEvent[] = [];
	
	const sources = [
		{ id: 'lecture-free', file: 'academic-calendar-lecture-free.ics', color: 'var(--event-lecture-free)' },
		{ id: 'exams', file: 'academic-calendar-examinations.ics', color: 'var(--event-exams)' },
		{ id: 'modules', file: 'academic-calendar-modules.ics', color: 'var(--event-orange)' },
		{ id: 'welcome-week', file: 'academic-calendar-welcome-week.ics', color: 'var(--event-pink)' },
		{ id: 'semester-dates', file: 'academic-calendar-semester-dates.ics', color: 'var(--event-purple)' }
	];

	try {
		const results = await Promise.all(sources.map(async (src) => {
			try {
				const response = await fetch(`/Documents/${src.file}`);
				if (!response.ok) return [];
				const content = await response.text();
				return parseICalEvents(content, src.id, src.color, src.color);
			} catch (e) {
				console.warn(`Failed to load ${src.file}`, e);
				return [];
			}
		}));

		results.forEach(evts => allEvents.push(...evts));
	} catch (error) {
		console.error('Error loading academic calendar events:', error);
	}

	return allEvents;
}
