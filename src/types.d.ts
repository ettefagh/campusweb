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
