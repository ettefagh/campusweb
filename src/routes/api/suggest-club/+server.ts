import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkUrlSecurity } from "$lib/server/security";

export async function POST({ request, platform }) {
  try {
    const data = await request.json();
    const {
      clubName,
      platform: socialPlatform,
      handleOrUrl,
      campusId,
      category,
      contactEmail,
      note,
    } = data;

    // 1. Validation
    if (!clubName || !handleOrUrl || !campusId) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Initialize telegram Payload
    const botToken = env.PRIVATE_TELEGRAM_BOT_TOKEN || platform?.env?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const chatId = env.PRIVATE_TELEGRAM_CHAT_ID || platform?.env?.PRIVATE_TELEGRAM_CHAT_ID;
    const kv = platform?.env?.STORIES_KV;

    if (!botToken || !chatId) {
      console.error("Missing Telegram keys for club suggestion");
      // Fail soft: tell user it's sent even if bot keys are missing (to avoid breaking UX in dev)
      return json({ success: true, warning: "Configuration missing on server" });
    }

    // Generate unique ID for this suggestion
    const suggestionId = crypto.randomUUID();

    // Store suggestion in KV for later approval
    if (kv) {
      await kv.put(`club_suggestion:${suggestionId}`, JSON.stringify({
        ...data,
        id: suggestionId,
        submittedAt: new Date().toISOString()
      }), {
        expirationTtl: 60 * 60 * 24 * 30 // 30 days
      });
    }

    const cleanClubName = clubName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cleanNote = note ? note.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
    
    // Security Scan
    const securityReport = await checkUrlSecurity(handleOrUrl, platform?.env);
    
    const caption = `
🤝 <b>New Club Suggestion</b>

<b>Club Name:</b> ${cleanClubName}
<b>Platform:</b> ${socialPlatform}
<b>Link/Handle:</b> ${handleOrUrl}
<b>Campus:</b> ${campusId}
<b>Category:</b> ${category || "None"}
${contactEmail ? `<b>Contact:</b> ${contactEmail}` : ""}

${cleanNote ? `<b>Note:</b>\n<i>${cleanNote}</i>` : ""}${securityReport}
    `.trim();

    // Final payload for Telegram
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `club_approve_${suggestionId}` },
          { text: "❌ Reject", callback_data: `club_reject_${suggestionId}` }
        ]
      ]
    };

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: caption,
        parse_mode: "HTML",
        reply_markup: keyboard
      })
    });

    if (!tgRes.ok) {
      const errData = await tgRes.text();
      console.error("Telegram API Error (Club):", errData);
      return json({ error: "Telegram failed to accept submission." }, { status: 500 });
    }

    return json({ success: true, id: suggestionId });
  } catch (err) {
    console.error("Internal error in suggest-club:", err);
    return json({ error: "Internal server failure." }, { status: 500 });
  }
}
