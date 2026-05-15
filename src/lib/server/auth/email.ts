import { env } from '$env/dynamic/private';

type EmailPlatformEnv = {
  CLOUDFLARE_ACCOUNT_ID?: string;
  PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN?: string;
  PRIVATE_EMAIL_SENDER?: string;
  EMAIL_WORKER?: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
};

export async function sendLoginPinEmail(to: string, pin: string, platformEnv?: EmailPlatformEnv): Promise<void> {
  const emailWorker = platformEnv?.EMAIL_WORKER;
  const sender = platformEnv?.PRIVATE_EMAIL_SENDER || env.PRIVATE_EMAIL_SENDER;

  if (!sender) {
    throw new Error('Cloudflare email sender is not configured.');
  }

  const text = `Your CampusWeb verification PIN is ${pin}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <p>Your CampusWeb verification PIN is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">${pin}</p>
      <p>This PIN expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `;

  if (emailWorker) {
    const response = await emailWorker.fetch('https://mailer.internal/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to,
        subject: 'Your CampusWeb verification PIN',
        html,
        text
      })
    });
    const details = await response.text().catch(() => '');

    if (!response.ok) {
      throw new Error(`CampusWeb mailer worker failed with ${response.status}: ${details}`);
    }

    return;
  }

  const accountId = platformEnv?.CLOUDFLARE_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = platformEnv?.PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN || env.PRIVATE_CLOUDFLARE_EMAIL_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare email binding and REST credentials are both unavailable.');
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: sender,
      to,
      subject: 'Your CampusWeb verification PIN',
      html,
      text
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Cloudflare Email Sending failed with ${response.status}: ${details}`);
  }
}
