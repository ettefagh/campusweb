import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

export async function POST({ request, platform }) {
  try {
    const { clubName, platform, handleOrUrl, campusId, category, contactEmail, note } = await request.json();

    // 1. Validation
    if (!clubName || !handleOrUrl || !campusId) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Initialize telegram Payload
    const botToken = env.PRIVATE_TELEGRAM_BOT_TOKEN || platform?.env?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const chatId = env.PRIVATE_TELEGRAM_CHAT_ID || platform?.env?.PRIVATE_TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("Missing Telegram keys for club suggestion");
      // Fail soft: tell user it's sent even if bot keys are missing (to avoid breaking UX in dev)
      return json({ success: true, warning: "Configuration missing on server" });
    }

    const cleanClubName = clubName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cleanNote = note ? note.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
    
    const caption = `
🤝 <b>New Club Suggestion</b>

<b>Club Name:</b> ${cleanClubName}
<b>Platform:</b> ${platform}
<b>Link/Handle:</b> ${handleOrUrl}
<b>Campus:</b> ${campusId}
<b>Category:</b> ${category || "None"}
${contactEmail ? `<b>Contact:</b> ${contactEmail}` : ""}

${cleanNote ? `<b>Note:</b>\n<i>${cleanNote}</i>` : ""}
    `.trim();

    // Final payload for Telegram
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: "club_approve" },
          { text: "❌ Reject", callback_data: "club_reject" }
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

    return json({ success: true });
  } catch (err) {
    console.error("Internal error in suggest-club:", err);
    return json({ error: "Internal server failure." }, { status: 500 });
  }
}
