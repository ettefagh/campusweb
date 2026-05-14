import { env as svelteEnv } from "$env/dynamic/private";

export async function sendApprovalEmail(to: string, clubName: string, platformEnv: any) {
  // Use Cloudflare's Workers Send Email feature
  // Requirement: The "EMAIL" binding must be added to wrangler.toml or dashboard
  // and the "from" address must be a verified domain in Cloudflare Email Routing.
  const emailBinding = platformEnv?.EMAIL || (svelteEnv as any).EMAIL;
  
  if (!emailBinding) {
    console.warn("Cloudflare EMAIL binding not found. Skipping email notification.");
    return;
  }

  try {
    const sender = platformEnv?.PRIVATE_EMAIL_SENDER || (svelteEnv as any).PRIVATE_EMAIL_SENDER || "noreply@yourdomain.com";
    
    console.log(`Attempting to send email from ${sender} to ${to}...`);
    
    // Cloudflare Workers Send Email API
    await emailBinding.send({
      from: sender,
      to,
      subject: "Your club has been approved! 🚀",
      content: [
        {
          type: "text/html",
          value: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #007bff;">Great news!</h2>
              <p>Your suggestion for <strong>${clubName}</strong> has been approved and is now live on CampusWeb.</p>
              <p>Thank you for contributing to the community! ✨</p>
              <br />
              <p>Cheers,<br />The CampusWeb Team</p>
            </div>
          `
        }
      ]
    });

    console.log(`✅ Email sent successfully to ${to}`);
  } catch (err: any) {
    console.error("❌ Error sending email via Cloudflare:", err);
    if (err.message) console.error("Error message:", err.message);
  }
}
