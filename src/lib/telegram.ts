import { getApiKey } from "./apiKeys";

export async function sendTelegramMessage(message: string): Promise<void> {
  const botToken = await getApiKey("TELEGRAM_BOT_TOKEN");
  const chatId = await getApiKey("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured, skipping notification');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Telegram error:', errorText);
      throw new Error(`Telegram API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    console.log('Telegram response:', data);
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    throw error;
  }
}
