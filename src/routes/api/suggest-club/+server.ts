import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkUrlSecurity } from "$lib/server/security";
import { sendClubSuggestionReceiptEmail } from "$lib/server/email";

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
      logoDataUrl,
    } = data;

    if (!clubName || !handleOrUrl || !campusId) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    if (logoDataUrl && (typeof logoDataUrl !== "string" || !logoDataUrl.startsWith("data:image/"))) {
      return json({ error: "Invalid logo upload" }, { status: 400 });
    }

    if (logoDataUrl && logoDataUrl.length > 700_000) {
      return json({ error: "Logo upload is too large" }, { status: 400 });
    }

    const botToken = env.PRIVATE_TELEGRAM_BOT_TOKEN || platform?.env?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const chatId = env.PRIVATE_TELEGRAM_CHAT_ID || platform?.env?.PRIVATE_TELEGRAM_CHAT_ID;
    const kv = platform?.env?.STORIES_KV;

    if (!botToken || !chatId) {
      console.error("Missing Telegram keys for club suggestion");
      return json({ success: true, warning: "Configuration missing on server" });
    }

    const suggestionId = crypto.randomUUID();

    if (kv) {
      await kv.put(`club_suggestion:${suggestionId}`, JSON.stringify({
        clubName,
        platform: socialPlatform,
        handleOrUrl,
        campusId,
        category,
        contactEmail,
        note,
        logoDataUrl: logoDataUrl || "",
        id: suggestionId,
        submittedAt: new Date().toISOString()
      }), {
        expirationTtl: 60 * 60 * 24 * 30
      });
    }

    const cleanClubName = clubName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cleanNote = note ? note.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
    
    const securityReport = await checkUrlSecurity(handleOrUrl, platform?.env);
    
    const caption = `
🤝 <b>New Club Suggestion</b>

<b>Club Name:</b> ${cleanClubName}
<b>Platform:</b> ${socialPlatform}
<b>Link/Handle:</b> ${handleOrUrl}
<b>Campus:</b> ${campusId}
<b>Category:</b> ${category || "None"}
<b>Logo:</b> ${logoDataUrl ? "Included" : "None"}
${contactEmail ? `<b>Contact:</b> ${contactEmail}` : ""}

${cleanNote ? `<b>Note:</b>\n<i>${cleanNote}</i>` : ""}${securityReport}
    `.trim();

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

    if (contactEmail) {
      sendClubSuggestionReceiptEmail(contactEmail, clubName, platform?.env).catch((err) => {
        console.error("Club suggestion receipt email failed:", err);
      });
    }

    return json({ success: true, id: suggestionId });
  } catch (err) {
    console.error("Internal error in suggest-club:", err);
    return json({ error: "Internal server failure." }, { status: 500 });
  }
}
