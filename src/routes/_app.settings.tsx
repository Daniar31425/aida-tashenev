import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Check, Moon, Sun, Shield } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/lib/useRole";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Настройки — AIDA" }] }),
  component: SettingsPage,
});

function useLS(key: string, initial = "") {
  const [v, setV] = useState(initial);
  useEffect(() => { const x = localStorage.getItem(key); if (x !== null) setV(x); }, [key]);
  useEffect(() => { if (v !== undefined) localStorage.setItem(key, v); }, [key, v]);
  return [v, setV] as const;
}

const DEFAULT_SYSTEM = `Ты HR-агент университета в Казахстане. Создаёшь профессиональные вакансии, анализируешь кандидатов, пишешь уведомления. Отвечай на русском языке. Ответы готовые к использованию, без лишних пояснений.`;

function SettingsPage() {
  const { role, setRole, roleLabel, allRoles } = useRole();
  const [groq, setGroq] = useLS("groq_api_key");
  const [systemPrompt, setSystemPrompt] = useLS("groq_system_prompt", DEFAULT_SYSTEM);
  const [uni, setUni] = useLS("aida_university", "Университет");
  const [tg, setTg] = useLS("aida_telegram_token");
  const [tgChat, setTgChat] = useLS("aida_telegram_chat");
  const [hh, setHh] = useLS("aida_hh_token");
  const [agents, setAgents] = useState({ orch: true, hr: true, aho: true, adm: true });
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem("aida_dark") === "1";
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
  }, []);

  function toggleDark(v: boolean) {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    localStorage.setItem("aida_dark", v ? "1" : "0");
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
          <p className="text-sm text-muted-foreground mt-1">Интеграции, API-ключи и параметры системы</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => toggleDark(!dark)}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? "Светлая" : "Тёмная"}
        </Button>
      </header>

      {!groq && (
        <Card className="p-4 shadow-sm bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/50 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Не задан Groq API ключ</div>
            <div className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">Без ключа ИИ-функции (генерация вакансий, кандидатов, оркестратор) не работают. Получите ключ на console.groq.com.</div>
          </div>
        </Card>
      )}

      <Card className="p-5 shadow-sm bg-card space-y-4">
        <SectionTitle>Основные</SectionTitle>
        <Field label="Название университета">
          <Input value={uni} onChange={(e) => setUni(e.target.value)} placeholder="Например: КазНУ им. аль-Фараби" />
        </Field>
        <Field label="Роль пользователя" hint="Определяет доступ к функциям системы">…
