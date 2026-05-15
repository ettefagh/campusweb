import { env as svelteEnv } from '$env/dynamic/private';

type EmailPlatformEnv = {
	CLOUDFLARE_ACCOUNT_ID?: string;
	PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN?: string;
	PRIVATE_EMAIL_SENDER?: string;
	EMAIL_WORKER?: {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};
};

export type EmailSendResult = {
	delivered: string[];
	permanent_bounces: string[];
	queued: string[];
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function formatCloudflareMessages(items: unknown): string {
	if (!Array.isArray(items) || items.length === 0) return '';

	return items
		.map((item) => {
			if (item && typeof item === 'object') {
				const { code, message } = item as { code?: string | number; message?: string };
				return [code, message].filter(Boolean).join(': ');
			}

			return String(item);
		})
		.filter(Boolean)
		.join('; ');
}

async function sendEmail({
	to,
	subject,
	html,
	text,
	platformEnv
}: {
	to: string;
	subject: string;
	html: string;
	text: string;
	platformEnv?: EmailPlatformEnv;
}): Promise<EmailSendResult> {
	const sender = platformEnv?.PRIVATE_EMAIL_SENDER || svelteEnv.PRIVATE_EMAIL_SENDER;
	const emailWorker = platformEnv?.EMAIL_WORKER;

	if (!sender) {
		throw new Error('Cloudflare email sender is not configured.');
	}

	if (emailWorker) {
		const response = await emailWorker.fetch('https://mailer.internal/send', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ to, subject, html, text })
		});
		const details = await response.text().catch(() => '');

		if (!response.ok) {
			throw new Error(`CampusWeb mailer worker failed with ${response.status}: ${details}`);
		}

		const parsed = details ? JSON.parse(details) : null;

		if (!parsed?.success) {
			throw new Error(`CampusWeb mailer worker rejected the email: ${details || 'empty response body'}`);
		}

		const result = parsed?.result || {};

		return {
			delivered: Array.isArray(result.delivered) ? result.delivered : [to],
			permanent_bounces: Array.isArray(result.permanent_bounces) ? result.permanent_bounces : [],
			queued: Array.isArray(result.queued) ? result.queued : []
		};
	}

	const accountId = platformEnv?.CLOUDFLARE_ACCOUNT_ID || svelteEnv.CLOUDFLARE_ACCOUNT_ID;
	const apiToken =
		platformEnv?.PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN || svelteEnv.PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN;

	if (!accountId || !apiToken) {
		throw new Error('Cloudflare email binding and REST credentials are both unavailable.');
	}

	const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: sender,
			to,
			subject,
			html,
			text
		})
	});

	const details = await response.text().catch(() => '');

	if (!response.ok) {
		throw new Error(`Cloudflare Email Sending failed with ${response.status}: ${details}`);
	}

	const parsed = details ? JSON.parse(details) : null;

	if (parsed?.success === false) {
		const errors = formatCloudflareMessages(parsed.errors);
		const messages = formatCloudflareMessages(parsed.messages);
		const summary = [errors, messages].filter(Boolean).join(' | ') || details;
		throw new Error(`Cloudflare Email Sending rejected the email: ${summary}`);
	}

	const result = parsed?.result || {};
	const delivered = Array.isArray(result.delivered) ? result.delivered : [];
	const permanent_bounces = Array.isArray(result.permanent_bounces) ? result.permanent_bounces : [];
	const queued = Array.isArray(result.queued) ? result.queued : [];

	if (delivered.length + permanent_bounces.length + queued.length === 0) {
		throw new Error(`Cloudflare Email Sending returned no delivery result: ${details || 'empty response body'}`);
	}

	return {
		delivered,
		permanent_bounces,
		queued
	};
}

export async function sendClubSuggestionReceiptEmail(
	to: string,
	clubName: string,
	platformEnv?: EmailPlatformEnv
) {
	const safeClubName = escapeHtml(clubName);

	await sendEmail({
		to,
		subject: 'CampusWeb received your club suggestion',
		text: `Thanks for suggesting ${clubName}. The CampusWeb admins will review it and publish it if the details look good.`,
		html: `
			<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
				<h2 style="margin: 0 0 16px;">Suggestion received</h2>
				<p>Thanks for suggesting <strong>${safeClubName}</strong>.</p>
				<p>The CampusWeb admins will review it and publish it if the details look good.</p>
			</div>
		`,
		platformEnv
	});
}

export async function sendStorySuggestionReceiptEmail(
	to: string,
	storyTitle: string,
	platformEnv?: EmailPlatformEnv
) {
	const safeStoryTitle = escapeHtml(storyTitle);

	await sendEmail({
		to,
		subject: 'CampusWeb received your story suggestion',
		text: `Thanks for suggesting "${storyTitle}". The CampusWeb admins will review it and publish it if it fits the feed.`,
		html: `
			<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
				<h2 style="margin: 0 0 16px;">Story suggestion received</h2>
				<p>Thanks for suggesting <strong>${safeStoryTitle}</strong>.</p>
				<p>The CampusWeb admins will review it and publish it if it fits the feed.</p>
			</div>
		`,
		platformEnv
	});
}

export async function sendClubApprovalEmail(
	to: string,
	clubName: string,
	platformEnv?: EmailPlatformEnv
) {
	const safeClubName = escapeHtml(clubName);

	return sendEmail({
		to,
		subject: 'Your club has been approved',
		text: `Great news. Your suggestion for ${clubName} has been approved and is now live on CampusWeb.`,
		html: `
			<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
				<h2 style="margin: 0 0 16px;">Your club is now live</h2>
				<p>Great news. Your suggestion for <strong>${safeClubName}</strong> has been reviewed and approved.</p>
				<p>It is now visible on CampusWeb for students to discover.</p>
			</div>
		`,
		platformEnv
	});
}

export async function sendStoryApprovalEmail(
	to: string,
	story: {
		title: string;
		subtitle?: string;
		tag?: string;
		slides?: Array<{
			imageUrl?: string;
			subtitle?: string;
		}>;
		imageUrl?: string;
		linkUrl?: string;
		siteUrl?: string;
	},
	platformEnv?: EmailPlatformEnv
) {
	const safeStoryTitle = escapeHtml(story.title);
	const safeStorySubtitle = story.subtitle ? escapeHtml(story.subtitle) : "";
	const safeStoryTag = story.tag ? escapeHtml(story.tag) : "";
  const safeStorySlides = Array.isArray(story.slides) ? story.slides.filter((slide) => slide.imageUrl || slide.subtitle) : [];
	const safeImageUrl = story.imageUrl
		? escapeHtml(story.imageUrl.startsWith("http") ? story.imageUrl : `${story.siteUrl || ""}${story.imageUrl}`)
		: "";
	const safeLinkUrl = story.linkUrl ? escapeHtml(story.linkUrl) : "";
  const storyModeLabel = safeStorySlides.length > 1 ? `${safeStorySlides.length}-part tale` : "story";

	return sendEmail({
		to,
		subject: 'Your story has been approved',
		text: `Great news. Your ${storyModeLabel} "${story.title}"${story.tag ? ` [${story.tag}]` : ''} has been approved and is now live on CampusWeb.`,
		html: `
			<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 560px;">
				<h2 style="margin: 0 0 16px;">Your story is now live</h2>
				<table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse;">
					<tr>
						<td style="width: 132px; padding: 0 16px 0 0; vertical-align: top;">
							${safeImageUrl ? `<img src="${safeImageUrl}" alt="${safeStoryTitle}" style="display:block; width:120px; height:90px; object-fit:cover; border-radius:10px; border:1px solid #e5e7eb;" />` : ''}
						</td>
						<td style="vertical-align: top;">
							<p style="margin: 0 0 8px;">Great news. Your story suggestion <strong>${safeStoryTitle}</strong> has been reviewed and approved.</p>
							${safeStoryTag ? `<p style="margin: 0 0 8px; display:inline-block; background:#eef2ff; color:#3730a3; font-size:12px; font-weight:700; letter-spacing:0.03em; text-transform:uppercase; padding:4px 8px; border-radius:999px;">${safeStoryTag}</p>` : ''}
							${safeStorySubtitle ? `<p style="margin: 0 0 8px; color: #4b5563;">${safeStorySubtitle}</p>` : ''}
							${safeStorySlides.length > 1 ? `<p style="margin: 0 0 8px; color: #4b5563;">This tale has ${safeStorySlides.length} images.</p>` : ''}
							${safeLinkUrl ? `<p style="margin: 0 0 8px;"><a href="${safeLinkUrl}" style="color: #2563eb; text-decoration: none;">Open the story link</a></p>` : ''}
						</td>
					</tr>
				</table>
				<p style="margin: 16px 0 0;">It is now visible in the CampusWeb stories feed.</p>
			</div>
		`,
		platformEnv
	});
}

export const sendApprovalEmail = sendClubApprovalEmail;
