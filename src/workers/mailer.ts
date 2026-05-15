interface Env {
	EMAIL: {
		send: (message: {
			to: string | string[];
			from: string | { email: string; name?: string };
			subject: string;
			html?: string;
			text?: string;
		}) => Promise<{ messageId?: string }>;
	};
	PRIVATE_EMAIL_SENDER?: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method !== 'POST') {
			return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
		}

		if (!env.PRIVATE_EMAIL_SENDER) {
			return Response.json({ success: false, error: 'PRIVATE_EMAIL_SENDER is not configured.' }, { status: 500 });
		}

		const body = (await request.json().catch(() => null)) as
			| {
					to?: string | string[];
					subject?: string;
					html?: string;
					text?: string;
			  }
			| null;

		if (!body?.to || !body?.subject || (!body.html && !body.text)) {
			return Response.json({ success: false, error: 'Missing required email fields.' }, { status: 400 });
		}

		try {
			const sendResult = await env.EMAIL.send({
				to: body.to,
				from: { email: env.PRIVATE_EMAIL_SENDER, name: 'CampusWeb' },
				subject: body.subject,
				html: body.html,
				text: body.text
			});

			return Response.json({
				success: true,
				result: {
					delivered: Array.isArray(body.to) ? body.to : [body.to],
					permanent_bounces: [],
					queued: [],
					messageId: sendResult?.messageId || null
				}
			});
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: typeof error === 'string'
						? error
						: 'Unknown email error';

			return Response.json({ success: false, error: message }, { status: 502 });
		}
	}
};
