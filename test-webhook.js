import fs from 'fs';

async function testWebhook() {
  const payload = {
    callback_query: {
      id: "test_query_id",
      data: "action_approve",
      message: {
        message_id: 12345,
        chat: { id: 54495238 },
        caption: "🌟 <b>New Story Suggestion</b>\n\n<b>Title:</b> Test\n<b>Subtitle:</b> Sub\n<b>Link:</b> None",
        photo: [ { file_id: "test_file_id" } ]
      }
    }
  };

  try {
    const res = await fetch("https://campusweb.pages.dev/api/telegram-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (err) {
    console.error(err);
  }
}

testWebhook();
