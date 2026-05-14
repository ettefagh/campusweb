import { error } from '@sveltejs/kit';

import exams from '$lib/server/calendar/academic-calendar-examinations.ics?raw';
import lectureFree from '$lib/server/calendar/academic-calendar-lecture-free.ics?raw';
import modules from '$lib/server/calendar/academic-calendar-modules.ics?raw';
import semesterDates from '$lib/server/calendar/academic-calendar-semester-dates.ics?raw';
import welcomeWeek from '$lib/server/calendar/academic-calendar-welcome-week.ics?raw';

const academicCalendars: Record<string, string> = {
	'academic-calendar-examinations.ics': exams,
	'academic-calendar-lecture-free.ics': lectureFree,
	'academic-calendar-modules.ics': modules,
	'academic-calendar-semester-dates.ics': semesterDates,
	'academic-calendar-welcome-week.ics': welcomeWeek
};

export function GET({ locals, params }) {
	if (!locals.authVerified) {
		throw error(401, 'Verification required.');
	}

	const content = academicCalendars[params.file];
	if (!content) {
		throw error(404, 'Calendar not found.');
	}

	return new Response(content, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Cache-Control': 'private, max-age=300'
		}
	});
}
