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
		description: string;
		location: string;
		startDate: Time;
		endDate: Time;
	}
	export class Time {
		isDate: boolean;
		toJSDate(): Date;
	}
}

declare module 'fs' {
	export const readFileSync: any;
	export const writeFileSync: any;
}

declare module 'path' {
	export const resolve: (...parts: string[]) => string;
}

declare global {
	const process:
		| {
				versions?: {
					node?: string;
				};
		  }
		| undefined;

	namespace App {
		interface Platform {
			env?: {
				PRIVATE_TELEGRAM_BOT_TOKEN?: string;
				PRIVATE_TELEGRAM_CHAT_ID?: string;
				PRIVATE_VIRUSTOTAL_API_KEY?: string;
				STORIES_KV?: any;
				IMAGES_BUCKET?: any;
			};
		}
	}
}

export {};
