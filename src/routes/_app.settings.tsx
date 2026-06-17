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
            <div className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">
              Без ключа ИИ-функции не работают. Получите ключ на console.groq.com.
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5 shadow-sm bg-card space-y-4">
        <SectionTitle>Основные</SectionTitle>
        <Field label="Название университета">
          <Input value={uni} onChange={(e) => setUni(e.target.value)} placeholder="Например: КазНУ им. аль-Фараби" />
        </Field>
        <Field label="Роль пользователя" hint="Определяет доступ к функциям системы">
          <Select value={role} onValueChange={(value: any) => setRole(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allRoles.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Текущая роль: {roleLabel}
          </Badge>
        </div>
      </Card>

      <Card className="p-5 shadow-sm bg-card space-y-4">
        <SectionTitle>ИИ — Groq</SectionTitle>
        <Field label="Groq API Key" hint="Хранится только в вашем браузере (localStorage)">
          <Input type="password" value={groq} onChange={(e) => setGroq(e.target.value)} placeholder="gsk_..." />
        </Field>
        <Field label="Системный промпт" hint="Инструкция для ИИ — как он должен отвечать и в каком стиле">
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Ты HR-агент..."
            rows={5}
            className="resize-none text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 text-xs text-muted-foreground"
            onClick={() => setSystemPrompt(DEFAULT_SYSTEM)}
          >
            Сбросить по умолчанию
          </Button>
        </Field>
        <Button size="sm" onClick={() => toast.success("Настройки ИИ сохранены")}>
          <Check className="w-3.5 h-3.5" /> Сохранить
        </Button>
      </Card>
            <Card className="p-5 shadow-sm bg-card space-y-4">
        <SectionTitle>Агенты</SectionTitle>
        {[
          ["orch", "ИИ Оркестратор"],
          ["hr", "HR Агент"],
          ["aho", "Агент АХО"],
          ["adm", "Агент Приёмная комиссия"],
        ].map(([k, label]) => (
          <div key={k} className="flex items-center justify-between py-1.5">
            <div className="text-sm">{label}</div>
            <Switch
              checked={(agents as any)[k]}
              onCheckedChange={(v) => setAgents((p) => ({ ...p, [k]: v }))}
            />
          </div>
        ))}
      </Card>

      <Card className="p-5 shadow-sm bg-card space-y-4">
        <SectionTitle>Уведомления — Telegram</SectionTitle>
        <Field label="Bot Token">
          <Input type="password" value={tg} onChange={(e) => setTg(e.target.value)} placeholder="123456:ABC-..." />
        </Field>
        <Field label="Chat ID">
          <Input value={tgChat} onChange={(e) => setTgChat(e.target.value)} placeholder="-100..." />
        </Field>
      </Card>

      <Card className="p-5 shadow-sm bg-card space-y-4">
        <SectionTitle>Интеграции — Источники кандидатов</SectionTitle>
        <Field label="HH.kz API Token">
          <Input type="password" value={hh} onChange={(e) => setHh(e.target.value)} placeholder="HH-..." />
        </Field>
        <Field label="LinkedIn">
          <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/40">
            Требуется партнёрский доступ
          </Badge>
        </Field>
      </Card>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      {children}
      {hint && <div className="text-xs text-muted-foreground mt-1.5">{hint}</div>}
    </div>
  );
}
