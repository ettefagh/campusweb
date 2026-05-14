import { env as svelteEnv } from '$env/dynamic/private';

type EmailPlatformEnv = {
	CLOUDFLARE_ACCOUNT_ID?: string;
	PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN?: string;
	PRIVATE_EMAIL_SENDER?: string;
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
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
}) {
	const accountId = platformEnv?.CLOUDFLARE_ACCOUNT_ID || svelteEnv.CLOUDFLARE_ACCOUNT_ID;
	const apiToken =
		platformEnv?.PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN || svelteEnv.PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN;
	const sender =
		platformEnv?.PRIVATE_EMAIL_SENDER ||
		svelteEnv.PRIVATE_EMAIL_SENDER ||
		'hello@campusweb.zardaloo.eu.org';

	if (!accountId || !apiToken) {
		console.warn('Cloudflare Email Sending REST API credentials are not configured.');
		return;
	}

	const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: { address: sender, name: 'CampusWeb' },
			to,
			subject,
			html,
			text
		})
	});

	if (!response.ok) {
		const details = await response.text().catch(() => '');
		throw new Error(`Cloudflare Email Sending failed with ${response.status}: ${details}`);
	}
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

	await sendEmail({
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
	storyTitle: string,
	platformEnv?: EmailPlatformEnv
) {
	const safeStoryTitle = escapeHtml(storyTitle);

	await sendEmail({
		to,
		subject: 'Your story has been approved',
		text: `Great news. Your story suggestion "${storyTitle}" has been approved and is now live on CampusWeb.`,
		html: `
			<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
				<h2 style="margin: 0 0 16px;">Your story is now live</h2>
				<p>Great news. Your story suggestion <strong>${safeStoryTitle}</strong> has been reviewed and approved.</p>
				<p>It is now visible in the CampusWeb stories feed.</p>
			</div>
		`,
		platformEnv
	});
}

export const sendApprovalEmail = sendClubApprovalEmail;
