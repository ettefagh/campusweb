import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { incrementStat } from "$lib/server/stats";
import { sendClubApprovalEmail, sendStoryApprovalEmail } from "$lib/server/email";
import { allLinks } from "$lib/data/links";

function parseExpiration(expiresParsed: string): string {
  let finalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (expiresParsed) {
    const p = expiresParsed.toLowerCase().trim();
    if (p.startsWith('+') && p.endsWith('d')) {
      const days = parseInt(p.replace('+','').replace('d',''));
      if (!isNaN(days)) finalExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    } else if (p.startsWith('+') && p.endsWith('w')) {
      const weeks = parseInt(p.replace('+','').replace('w',''));
      if (!isNaN(weeks)) finalExpiresAt = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      const parts = expiresParsed.split('/');
      if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) finalExpiresAt = d.toISOString();
      }
    }
  }
  return finalExpiresAt;
}

function extractEmailFromText(text: string): string {
  const contactMatch = text.match(/Contact:\s*([^\s<>\n]+@[^\s<>\n]+)/i);
  if (contactMatch?.[1]) return contactMatch[1].trim();

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return emailMatch?.[0]?.trim() || "";
}

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST({ request, platform }) {
  try {
    const body = await request.json();
    const runtimeEnv = platform?.env;
    const botToken = (env as any).PRIVATE_TELEGRAM_BOT_TOKEN || (runtimeEnv as any)?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const adminChatId = (env as any).PRIVATE_TELEGRAM_CHAT_ID || (runtimeEnv as any)?.PRIVATE_TELEGRAM_CHAT_ID;
    const siteUrl = (env as any).PRIVATE_SITE_URL || (runtimeEnv as any)?.PRIVATE_SITE_URL || "https://campusweb.pages.dev";

    if (!botToken) return json({ error: "No bot token" }, { status: 500 });

    if (body.message && body.message.reply_to_message && body.message.text) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const originalMsgId = body.message.reply_to_message.message_id;
        const originalKeyboard = body.message.reply_to_message.reply_markup;
        
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msgChatId,
            message_id: originalMsgId,
            caption: body.message.text,
            parse_mode: "HTML",
            reply_markup: originalKeyboard
          })
        });

        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msgChatId,
            message_id: body.message.message_id
          })
        });
        
        const kv = runtimeEnv?.STORIES_KV;
        if (kv) incrementStat(kv, "actions", "edited").catch(() => {});
      }
      return json({ success: true });
    }

    if (body.message && body.message.text?.startsWith("/alert")) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = runtimeEnv?.STORIES_KV;
        if (kv) {
          const text = body.message.text.replace("/alert", "").trim();
          const adminName = body.message.from.first_name || "Admin";
          
          if (text === "clear" || text === "") {
            await kv.delete("campus_alert");
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, text: `✅ <b>Global alert cleared</b> by ${adminName}.`, parse_mode: "HTML" })
            });
          } else {
            await kv.put("campus_alert", JSON.stringify({ 
              text, 
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              createdBy: adminName
            }));
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, text: `🚨 <b>Global alert broadcasted</b> by ${adminName} for 24h!\n\n"${text}"`, parse_mode: "HTML" })
            });
          }
        }
      }
      return json({ success: true });
    }

    if (body.message && body.message.text === "/help") {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const text = `🛠 <b>CampusWeb Bot Guide</b>\n\n` +
          `<b>Commands:</b>\n` +
          `/list - Manage active Stories\n` +
          `/clubs - Manage approved Clubs\n` +
          `/alert [text] - Set global app alert\n` +
          `/alert clear - Remove global alert\n` +
          `/stats - View system statistics\n` +
          `/help - Show this guide\n\n` +
          `<b>Workflow:</b>\n` +
          `1. Student submits suggestion via Web App.\n` +
          `2. You receive a notification with <b>Approve/Reject</b> buttons.\n` +
          `3. Approving automatically publishes and notifies the student.\n\n` +
          `<b>Direct Entry:</b>\n` +
          `Send a Photo with <code>/create</code> in the caption to bypass the form.`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text, parse_mode: "HTML" })
        });
      }
      return json({ success: true });
    }

    if (body.message && body.message.text === "/stats") {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = runtimeEnv?.STORIES_KV;
        if (!kv) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: "⚠️ Cloudflare KV not bound!" })
          });
          return json({ success: true });
        }
        
        const raw = await kv.get("bot_stats");
        const dynamicClubsRaw = await kv.get("dynamic_clubs");
        const storiesRaw = await kv.get("stories");
        
        let statsStr = `📊 <b>System Statistics</b>\n\n`;
        
        let clubsCount = 0;
        try { clubsCount = JSON.parse(dynamicClubsRaw || "[]").length; } catch(e) {}
        let storiesCount = 0;
        try { storiesCount = JSON.parse(storiesRaw || "[]").length; } catch(e) {}
        
        statsStr += `<b>Live Content:</b>\n`;
        statsStr += `- Active Stories: ${storiesCount}\n`;
        statsStr += `- Approved Clubs: ${clubsCount}\n\n`;

        if (raw) {
          try {
            const st = JSON.parse(raw);
            statsStr += `<b>Engagement:</b>\n`;
            statsStr += `- Suggestions (All Time): ${st.suggestions?.allTime || 0}\n`;
            const today = new Date().toISOString().split("T")[0];
            statsStr += `- Suggestions (Today): ${st.suggestions?.daily?.[today] || 0}\n\n`;
            
            statsStr += `<b>Admin Performance:</b>\n`;
            statsStr += `- Approved: ${st.actions?.approved || 0}\n`;
            statsStr += `- Declined: ${st.actions?.declined || 0}\n`;
            statsStr += `- Direct Created: ${st.actions?.directCreated || 0}\n`;

            const linkTotals = st.links?.allTime || {};
            const todayLinks = st.links?.daily?.[today] || {};
            const popularLinks = Object.entries(linkTotals)
              .map(([linkId, total]) => {
                const link = allLinks.find((item) => item.id === linkId);
                return {
                  linkId,
                  title: link?.title || linkId,
                  total: Number(total) || 0,
                  today: Number(todayLinks[linkId]) || 0
                };
              })
              .filter((item) => item.total > 0)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5);

            if (popularLinks.length > 0) {
              statsStr += `\n<b>Popular Links:</b>\n`;
              popularLinks.forEach((link, index) => {
                statsStr += `${index + 1}. ${escapeTelegramHtml(link.title)} - ${link.total} total, ${link.today} today\n`;
              });
            }
          } catch(e) {}
        }
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text: statsStr, parse_mode: "HTML" })
        });
      }
      return json({ success: true });
    }

    if (body.message && (body.message.text === "/list" || body.message.text === "/clubs")) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = runtimeEnv?.STORIES_KV;
        if (!kv) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: "⚠️ Cloudflare KV not bound!" })
          });
          return json({ success: true });
        }
        
        const isClubs = body.message.text === "/clubs";
        const key = isClubs ? "dynamic_clubs" : "stories";
        const label = isClubs ? "Clubs" : "Stories";
        const prefix = isClubs ? "club" : "story";
        
        let items: any[] = [];
        const kvData = await kv.get(key);
        if (kvData) { try { items = JSON.parse(kvData); } catch(e) {} }
        
        if (items.length === 0) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: `📭 There are no active dynamic ${label.toLowerCase()}.` })
          });
          return json({ success: true });
        }
        
        let text = `📚 <b>Dynamic ${label} Management</b>\n\n`;
        const inline_keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
        
        items.slice(0, 15).forEach((item, idx) => {
          const name = item.name || item.title || "Untitled";
          const sub = item.handle || item.subtitle || "";
          text += `${idx + 1}. <b>${name}</b> ${sub ? `(@${sub})` : ""}\n`;
          inline_keyboard.push([{ text: `🗑 Delete ${idx + 1}`, callback_data: `action_delete_${prefix}_${item.id}` }]);
        });
        
        if (items.length > 15) text += `\n<i>(Showing first 15 of ${items.length})</i>`;
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard } })
        });
      }
      return json({ success: true });
    }

    if (body.message && body.message.photo) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const msg = body.message;
        const isCreate = msg.caption?.startsWith("/create");
        const isAlbumSecondary = msg.media_group_id && !msg.caption;
        
        if (isCreate || isAlbumSecondary) {
          const kv = runtimeEnv?.STORIES_KV;
          if (!kv) return json({ error: "No KV bound" });
          
          let title = "Direct Story", subtitle = "", linkUrl = "", expiresParsed = "";
          let finalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          
          if (isCreate) {
            const caption = msg.caption || "";
            const extract = (label: string) => {
              const regex = new RegExp(`${label}:\\s*(.+)`, "i");
              const match = caption.match(regex);
              return match && match[1].trim() !== "None" ? match[1].trim() : "";
            };
            title = extract("Title") || "Direct Story";
            subtitle = extract("Subtitle");
            linkUrl = extract("Link");
            expiresParsed = extract("Expires");
            finalExpiresAt = parseExpiration(expiresParsed);
            
            if (msg.media_group_id) {
              await kv.put(`album_${msg.media_group_id}`, JSON.stringify({ title, subtitle, linkUrl, finalExpiresAt }), { expirationTtl: 300 });
            }
          } else if (isAlbumSecondary) {
            let cached = null;
            for (let i = 0; i < 4; i++) {
              cached = await kv.get(`album_${msg.media_group_id}`);
              if (cached) break;
              await new Promise(r => setTimeout(r, 500));
            }
            if (cached) {
              try {
                const data = JSON.parse(cached);
                title = data.title; subtitle = data.subtitle; linkUrl = data.linkUrl; finalExpiresAt = data.finalExpiresAt;
              } catch(e) {}
            } else {
              return json({ success: true });
            }
          }
          
          const photoId = msg.photo[msg.photo.length - 1].file_id;
          const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoId}`);
          const fileData = await fileRes.json();
          if (!fileData.ok) return json({ error: "File fetch failed" });
          
          const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          const r2 = runtimeEnv?.IMAGES_BUCKET;
          if (!r2) return json({ error: "No R2 bound" });
          
          let imgBlob;
          try {
            const imgRes = await fetch(fileUrl);
            imgBlob = await imgRes.blob();
          } catch (e: any) { return json({ error: "Telegram download failed" }); }
          
          const filename = `story-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
          await r2.put(filename, imgBlob, { httpMetadata: { contentType: "image/jpeg" } });
          const permanentImageUrl = `/api/images/${filename}`;
          
          const newStory = {
            id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title, subtitle, imageUrl: permanentImageUrl, linkUrl,
            seen: false, createdAt: new Date().toISOString(), expiresAt: finalExpiresAt
          };
          let existingStories = [];
          const kvData = await kv.get("stories");
          if (kvData) { try { existingStories = JSON.parse(kvData); } catch(e) {} }
          existingStories.unshift(newStory);
          await kv.put("stories", JSON.stringify(existingStories));
          
          if (isCreate) {
            incrementStat(kv, "actions", "directCreated").catch(() => {});
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, text: msg.media_group_id ? "✅ <b>Direct Album Published!</b>" : "✅ <b>Direct Story Published!</b>", parse_mode: "HTML", reply_to_message_id: msg.message_id })
            });
          }
          return json({ success: true });
        }
      }
    }

    if (!body.callback_query) {
      return json({ success: true });
    }

    const cb = body.callback_query;
    const action = cb.data;
    const message = cb.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    const editMessage = async (newCaption: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption: newCaption,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] }
        })
      });
    };

    const editTextMessage = async (newText: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] }
        })
      });
    };

    if (action === "action_edit_hint") {
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          callback_query_id: cb.id, 
          text: "✏️ HOW TO EDIT:\n\n1. Copy the text of this message.\n2. Paste it in your chat and fix any typos.\n3. Swipe Left on THIS message to Reply to it.\n4. Send your message!\n\nThe bot will automatically overwrite this suggestion with your edited text.", 
          show_alert: true 
        })
      }).catch(() => {});
      return json({ success: true });
    }

    if (action.startsWith("action_delete_story_") || action.startsWith("action_delete_club_")) {
      const isClub = action.startsWith("action_delete_club_");
      const id = action.replace(isClub ? "action_delete_club_" : "action_delete_story_", "");
      const kv = runtimeEnv?.STORIES_KV;
      
      if (kv) {
        const key = isClub ? "dynamic_clubs" : "stories";
        let items: Array<{ id: string }> = [];
        const kvData = await kv.get(key);
        if (kvData) { try { items = JSON.parse(kvData); } catch(e) {} }
        
        const updated = items.filter(item => item.id !== id);
        await kv.put(key, JSON.stringify(updated));
        
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: `🗑 ${isClub ? "Club" : "Story"} deleted!`, show_alert: true })
        }).catch(() => {});
        
        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId })
        });
      }
      return json({ success: true });
    }

    if (
      action === "action_reject" ||
      action === "club_reject" ||
      action.startsWith("club_reject_") ||
      action.startsWith("story_reject_")
    ) {
      const isClub = action.startsWith("club_reject");
      const isStory = action.startsWith("story_reject_");
      const suggestionId = (isClub
        ? action.replace("club_reject_", "")
        : isStory
          ? action.replace("story_reject_", "")
          : null)?.replace("_confirm", "");
      const adminName = cb.from.first_name || "Admin";
      
      if (!action.includes("_confirm")) {
        const confirmAction = `${action}_confirm`;
        const resetAction = isClub
          ? `club_reset_${suggestionId}`
          : isStory
            ? `story_reset_${suggestionId}`
            : "action_reset";
        
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "⚠️ Confirm Rejection", callback_data: confirmAction },
                  { text: "🔙 Cancel", callback_data: resetAction }
                ]
              ]
            }
          })
        });
        
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: "Are you sure?" })
        }).catch(() => {});
        return json({ success: true });
      }

      const kv = runtimeEnv?.STORIES_KV;
      if (kv && !isClub) incrementStat(kv, "actions", "declined").catch(() => {});
      
      const label = isClub ? "Club Suggestion" : "Suggestion";
      const originalText = (message.text || message.caption || "").split("\n---")[0];
      const newText = originalText + `\n\n---\n❌ <b>${label} Rejected</b> by ${adminName}`;
      
      if (isClub) {
        await editTextMessage(newText);
        if (suggestionId && kv) await kv.delete(`club_suggestion:${suggestionId}`);
      } else {
        await editMessage(newText);
        if (isStory && suggestionId && kv) await kv.delete(`story_suggestion:${suggestionId}`);
      }
      
      return json({ success: true });
    }

    if (action.startsWith("club_reset_") || action.startsWith("story_reset_") || action === "action_reset") {
      const isClub = action.startsWith("club_reset_");
      const isStory = action.startsWith("story_reset_");
      const suggestionId = isClub
        ? action.replace("club_reset_", "")
        : isStory
          ? action.replace("story_reset_", "")
          : null;
      
      const keyboard = isClub ? {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `club_approve_${suggestionId}` },
            { text: "❌ Reject", callback_data: `club_reject_${suggestionId}` }
          ]
        ]
      } : {
        inline_keyboard: [
          [
            { text: "✅ Approve & Publish", callback_data: isStory ? `story_approve_${suggestionId}` : "action_approve" },
            { text: "✏️ Edit Text", callback_data: "action_edit_hint" },
            { text: "❌ Reject", callback_data: isStory ? `story_reject_${suggestionId}` : "action_reject" }
          ]
        ]
      };

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          reply_markup: keyboard
        })
      });
      return json({ success: true });
    }

    if (action.startsWith("club_approve_")) {
      const suggestionId = action.replace("club_approve_", "");
      const kv = runtimeEnv?.STORIES_KV;
      const adminName = cb.from.first_name || "Admin";
      
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text: "🚀 Publishing club..." })
      }).catch(() => {});

      if (!kv) {
        await editTextMessage(`⚠️ <b>Error:</b> STORIES_KV not bound.\n\n` + (message.text || ""));
        return json({ success: true });
      }

      const suggestionRaw = await kv.get(`club_suggestion:${suggestionId}`);
      if (!suggestionRaw) {
        await editTextMessage(`⚠️ <b>Error:</b> Suggestion expired or not found.\n\n` + (message.text || ""));
        return json({ success: true });
      }

      const suggestion = JSON.parse(suggestionRaw);

      const platform = suggestion.platform;
      let handle = suggestion.handleOrUrl;
      let url = suggestion.handleOrUrl;

      if (platform === "instagram") {
        handle = handle.replace("@", "").replace("https://www.instagram.com/", "").replace("/", "");
        url = `https://www.instagram.com/${handle}/`;
      }

      const newClub = {
        id: `club-${suggestionId.substring(0, 8)}`,
        type: "club",
        name: suggestion.clubName,
        handle: platform === "instagram" ? handle : "Join Group",
        platform: platform,
        url: url,
        campusIds: [suggestion.campusId],
        categories: suggestion.category ? [suggestion.category] : [],
        logoUrl: suggestion.logoDataUrl || undefined,
        description: suggestion.note ? suggestion.note.slice(0, 180) : undefined,
        verified: true,
        priority: 0
      };

      const dynamicClubsRaw = await kv.get("dynamic_clubs");
      let dynamicClubs = [];
      if (dynamicClubsRaw) {
        try { dynamicClubs = JSON.parse(dynamicClubsRaw); } catch(e) {}
      }
      
      if (!dynamicClubs.some((c: any) => c.url === newClub.url)) {
        dynamicClubs.unshift(newClub);
        await kv.put("dynamic_clubs", JSON.stringify(dynamicClubs));
      }

      if (suggestion.contactEmail) {
        sendClubApprovalEmail(suggestion.contactEmail, suggestion.clubName, runtimeEnv).catch(console.error);
      }

      const finalKeyboard = {
        inline_keyboard: [
          [{ text: "🌐 View on Website", url: `${siteUrl}/feed` }]
        ]
      };

      const originalText = (message.text || "").split("\n---")[0];
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: originalText + `\n\n---\n✅ <b>Published</b> by ${adminName} at ${timeStr}`,
          parse_mode: "HTML",
          reply_markup: finalKeyboard
        })
      });
      
      await kv.delete(`club_suggestion:${suggestionId}`);
      
      return json({ success: true });
    }

    if (action === "action_approve" || action.startsWith("story_approve_")) {
      const suggestionId = action.startsWith("story_approve_")
        ? action.replace("story_approve_", "")
        : null;
      let storedSuggestion: any = null;

      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text: "Processing..." })
      }).catch(() => {});

      if (!message.photo || message.photo.length === 0) {
        await editMessage("⚠️ Error: No photo found in this message.");
        return json({ error: "No photo" });
      }

      const photoId = message.photo[message.photo.length - 1].file_id;

      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoId}`);
      const fileData = await fileRes.json();
      
      if (!fileData.ok) {
        await editMessage("⚠️ Error: Failed to retrieve file path from Telegram.");
        return json({ error: "Telegram file get failed" });
      }

      const filePath = fileData.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

      const r2 = runtimeEnv?.IMAGES_BUCKET;
      if (!r2) {
        await editMessage("⚠️ Error: Cloudflare R2 (IMAGES_BUCKET) is not bound.");
        return json({ error: "No R2 bound" });
      }

      let imgBlob;
      try {
        const imgRes = await fetch(fileUrl);
        imgBlob = await imgRes.blob();
      } catch (e: any) {
        await editMessage(`⚠️ Error: Failed to download image from Telegram. ${e.message}`);
        return json({ error: "Telegram download failed" });
      }

      const filename = `story-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;

      try {
        await r2.put(filename, imgBlob, {
          httpMetadata: { contentType: "image/jpeg" }
        });
      } catch (e: any) {
        await editMessage(`⚠️ Error: R2 upload failed. ${e.message}`);
        return json({ error: "R2 upload failed" });
      }

      const permanentImageUrl = `/api/images/${filename}`;

      const caption = message.caption || "";
      
      const extract = (label: string) => {
        const regex = new RegExp(`${label}:\\s*(.+)`, "i");
        const match = caption.match(regex);
        return match && match[1].trim() !== "None" ? match[1].trim() : "";
      };

      const title = extract("Title") || "New Story";
      const subtitle = extract("Subtitle");
      const linkUrl = extract("Link");
      const expiresParsed = extract("Expires");

      const finalExpiresAt = parseExpiration(expiresParsed);

      const kv = runtimeEnv?.STORIES_KV;
      if (!kv) {
        await editMessage("⚠️ Error: Cloudflare KV (STORIES_KV) is not bound. Image uploaded but story not saved.");
        return json({ error: "No KV bound" });
      }

      if (suggestionId) {
        const suggestionRaw = await kv.get(`story_suggestion:${suggestionId}`);
        if (suggestionRaw) {
          try {
            storedSuggestion = JSON.parse(suggestionRaw);
          } catch (e) {}
        }
      }

      const newStory = {
        id: `story-${Date.now()}`,
        title,
        subtitle,
        imageUrl: permanentImageUrl,
        linkUrl,
        seen: false,
        createdAt: new Date().toISOString(),
        expiresAt: finalExpiresAt
      };

      let existingStories = [];
      const kvData = await kv.get("stories");
      if (kvData) {
        try {
          existingStories = JSON.parse(kvData);
        } catch(e) {}
      }

      existingStories.unshift(newStory);
      await kv.put("stories", JSON.stringify(existingStories));
      
      incrementStat(kv, "actions", "approved").catch(() => {});

      const contactEmail = storedSuggestion?.contactEmail || extractEmailFromText(caption);
      if (contactEmail) {
        sendStoryApprovalEmail(contactEmail, title, runtimeEnv).catch(console.error);
      }
      if (suggestionId) {
        await kv.delete(`story_suggestion:${suggestionId}`);
      }

      const adminName = cb.from.first_name || "Admin";
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const originalCaption = (message.caption || "").split("\n---")[0];

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption: originalCaption + `\n\n---\n✅ <b>Published</b> by ${adminName} at ${timeStr}`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🌐 View on Website", url: `${siteUrl}/feed` }]
            ]
          }
        })
      });
      
      return json({ success: true });
    }

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
