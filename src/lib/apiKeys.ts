const BACKEND_URL = "http://localhost:8000";

let cachedSettings: Record<string, string> = {};

export async function getApiKey(keyName: string): Promise<string> {
  if (cachedSettings[keyName]) return cachedSettings[keyName];
  
  const res = await fetch(`${BACKEND_URL}/api/settings/${keyName}`);
  const data = await res.json();
  cachedSettings[keyName] = data.value;
  return data.value;
}

export async function getAllKeys(): Promise<Record<string, string>> {
  const keys = [
    "GROQ_API_KEY",
    "TELEGRAM_BOT_TOKEN", 
    "TELEGRAM_CHAT_ID",
    "HH_CLIENT_ID",
    "HH_CLIENT_SECRET",
    "INSTAGRAM_ACCESS_TOKEN",
    "INSTAGRAM_USER_ID"
  ];
  
  const results = await Promise.all(
    keys.map(async key => {
      const value = await getApiKey(key);
      return [key, value];
    })
  );
  
  cachedSettings = Object.fromEntries(results);
  return cachedSettings;
}
