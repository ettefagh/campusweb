declare module '@toast-ui/calendar' {
	export default class Calendar {
		constructor(container: HTMLElement, options: any);
		createEvents(events: any[]): void;
		destroy(): void;
		today(): void;
		prev(): void;
		next(): void;
		setCalendars(calendars: any[]): void;
		clear(): void;
	}
}

declare module 'ical.js' {
	export function parse(icalContent: string): any;
	export class Component {
		constructor(jcalData: any);
		getAllSubcomponents(name: string): any[];
	}
	export class Event {
		constructor(vevent: any);
		uid: string;
		summary: string;
		location: string;
		startDate: Time;
		endDate: Time;
	}
	export class Time {
		isDate: boolean;
		toJSDate(): Date;
	}
}
