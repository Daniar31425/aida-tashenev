import { useCallback } from "react";

const DEFAULT_SYSTEM = `Ты HR-агент университета в Казахстане. Создаёшь профессиональные вакансии, анализируешь кандидатов, пишешь уведомления. Отвечай на русском языке. Ответы готовые к использованию, без лишних пояснений.`;

export function getGroqKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("groq_api_key");
}

export function getSystemPrompt(): string {
  if (typeof window === "undefined") return DEFAULT_SYSTEM;
  return localStorage.getItem("groq_system_prompt") || DEFAULT_SYSTEM;
}

export interface GroqOptions {
  system?: string;
  json?: boolean;
  temperature?: number;
}

export function useGroq() {
  const complete = useCallback(async (prompt: string, opts: GroqOptions = {}): Promise<string> => {
    const key = getGroqKey();
    if (!key) throw new Error("Не задан Groq API ключ. Откройте Настройки.");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: opts.temperature ?? 0.6,
        messages: [
          { role: "system", content: opts.system ?? getSystemPrompt() },
          { role: "user", content: prompt },
        ],
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Groq API: ${res.status} ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }, []);

  return { complete, hasKey: !!getGroqKey() };
}
