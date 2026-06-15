import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActivity } from "@/lib/activity-log";
import {
  ArrowUpRight, Bot, Briefcase, Building2, GraduationCap, Workflow,
  CheckCircle2, Loader2, Clock,
} from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Панель управления — AIDA" }] }),
  component: Dashboard,
});

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return now;
}

const agents = [
  { id: "orchestrator", title: "ИИ Оркестратор", desc: "Маршрутизация задач между агентами", icon: Workflow, status: "active", to: "/orchestrator" as const },
  { id: "hr", title: "HR Агент", desc: "Подбор персонала, вакансии", icon: Briefcase, status: "active", to: "/hr" as const },
  { id: "aho", title: "Агент АХО", desc: "Хозяйственные заявки", icon: Building2, status: "idle", to: "/dashboard" as const },
  { id: "admission", title: "Агент Приёмная комиссия", desc: "Обработка заявок абитуриентов", icon: GraduationCap, status: "active", to: "/dashboard" as const },
];

function Dashboard() {
  const now = useClock();
  const { entries } = useActivity();
  const metrics = [
    { label: "Активных агентов", value: "4", icon: Bot },
    { label: "Задач сегодня", value: "37", icon: Clock },
    { label: "Выполнено", value: "29", icon: CheckCircle2 },
    { label: "В процессе", value: "8", icon: Loader2 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Панель управления</h1>
          <p className="text-sm text-muted-foreground mt-1">Система управления ИИ-агентами университета</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums tracking-tight" suppressHydrationWarning>
            {now ? now.toLocaleTimeString("ru-RU") : "--:--:--"}
          </div>
          <div className="text-xs text-muted-foreground capitalize" suppressHydrationWarning>
            {now ? now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }) : ""}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="p-5 shadow-sm border-border bg-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="text-3xl font-semibold mt-2 tabular-nums tracking-tight">{m.value}</div>
              </div>
              <m.icon className="w-4 h-4 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Агенты</h2>
        <div className="grid grid-cols-2 gap-4">
          {agents.map((a) => (
            <Card key={a.id} className="p-5 shadow-sm border-border bg-card group hover:border-foreground/20 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <a.icon className="w-4.5 h-4.5 text-foreground" />
                </div>
                <Badge variant="outline" className={a.status === "active" ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "text-muted-foreground"}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${a.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  {a.status === "active" ? "Активен" : "Ожидает"}
                </Badge>
              </div>
              <div className="text-base font-semibold">{a.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{a.desc}</div>
              <Link to={a.to} className="mt-4 inline-flex">
                <Button size="sm" variant="outline" className="gap-1.5">
                  Открыть <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Недавние события</h2>
        <Card className="shadow-sm border-border bg-card divide-y divide-border">
          {entries.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">Событий пока нет — взаимодействуйте с агентами, чтобы увидеть ленту</div>
          )}
          {entries.slice(0, 8).map((e) => (
            <div key={e.id} className="p-4 flex items-center gap-3 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${
                e.kind === "success" ? "bg-emerald-500" :
                e.kind === "processing" ? "bg-amber-500" :
                e.kind === "error" ? "bg-red-500" : "bg-blue-500"}`} />
              <span className="flex-1">{e.text}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{e.time}</span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
