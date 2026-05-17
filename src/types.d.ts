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

declare module '*.ics?raw' {
	const content: string;
	export default content;
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
				PRIVATE_AUTH_SECRET?: string;
				PRIVATE_EMAIL_SENDER?: string;
				PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN?: string;
				CLOUDFLARE_ACCOUNT_ID?: string;
				EMAIL_WORKER?: {
					fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
				};
				STORIES_KV?: any;
				AUTH_SECURITY_KV?: any;
				IMAGES_BUCKET?: any;
			};
		}

		interface Locals {
			authVerified?: boolean;
			user?: {
				verified: boolean;
				role: string;
			} | null;
		}
	}
}

export {};
