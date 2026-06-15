import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Check, Copy, Send, Workflow, MessageCircle, Mail, Phone, CalendarIcon } from "lucide-react";
import { useGroq } from "@/lib/useGroq";
import { useActivity } from "@/lib/activity-log";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export const Route = createFileRoute("/_app/orchestrator")({
  head: () => ({ meta: [{ title: "Оркестратор — AIDA" }] }),
  component: OrchestratorPage,
});

const EVENTS = [
  "Уволился сотрудник",
  "Принят новый сотрудник",
  "Студент не посещает занятия",
  "Абитуриент оставил заявку",
];

const FACULTIES = [
  "Инженерно-технический факультет",
  "Факультет информационных технологий",
  "Экономический факультет",
  "Юридический факультет",
  "Медицинский факультет",
  "Педагогический факультет",
];

const DEPARTMENTS: Record<string, string[]> = {
  "Инженерно-технический факультет": ["Программная инженерия", "Компьютерные науки", "Кибербезопасность"],
  "Факультет информационных технологий": ["Информационные системы", "Вычислительная техника", "ИИ и Data Science"],
  "Экономический факультет": ["Финансы", "Менеджмент", "Бухгалтерский учёт"],
  "Юридический факультет": ["Гражданское право", "Уголовное право", "Международное право"],
  "Медицинский факультет": ["Общая медицина", "Фармация", "Стоматология"],
  "Педагогический факультет": ["Математика", "Физика", "Казахский язык"],
};

type StepKind = "info" | "spinner" | "check";
interface RunStep { text: string; kind: StepKind; status: "pending" | "active" | "done" }

const STEP_TEMPLATE: { text: string; kind: StepKind }[] = [
  { text: "Оркестратор получил событие", kind: "info" },
  { text: "Анализ события и определение агента...", kind: "spinner" },
  { text: "Задача передана HR Агенту", kind: "check" },
  { text: "Агент формирует документ...", kind: "spinner" },
  { text: "Результат готов ✓", kind: "check" },
];

function OrchestratorPage() {
  const { complete } = useGroq();
  const { log } = useActivity();
  const [event, setEvent] = useState(EVENTS[0]);
  const [details, setDetails] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [resignationDate, setResignationDate] = useState<Date | undefined>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const isEmployeeResigned = event === "Уволился сотрудник";
  const availableDepartments = faculty ? DEPARTMENTS[faculty] || [] : [];

  async function runOrch() {
    setRunning(true);
    setResult(null);
    const base: RunStep[] = STEP_TEMPLATE.map((s) => ({ ...s, status: "pending" }));
    setSteps(base);
    log("processing", `Оркестратор: ${event}`);

    // Build prompt with conditional fields
    let promptDetails = details || "—";
    if (isEmployeeResigned) {
      const additionalInfo = [
        faculty && `Факультет: ${faculty}`,
        department && `Кафедра: ${department}`,
        employeeName && `ФИО сотрудника: ${employeeName}`,
        resignationDate && `Дата увольнения: ${format(resignationDate, "dd.MM.yyyy")}`,
      ].filter(Boolean).join(", ");
      if (additionalInfo) {
        promptDetails = `${promptDetails}. ${additionalInfo}`;
      }
    }

    // Kick off Groq in parallel so the result is ready when steps finish
    const completion = complete(
      `Событие: "${event}". Детали: ${promptDetails}. Сформируй краткий итоговый отчёт оркестратора для администрации университета: что произошло, какие действия выполнены, рекомендации. Профессиональный тон, на русском, 4-6 предложений.`
    ).catch((e: Error) => {
      toast.error(e.message);
      log("error", `Оркестратор: ${e.message}`);
      return "";
    });

    for (let i = 0; i < base.length; i++) {
      await wait(800);
      setSteps((p) => p.map((s, idx) => (idx === i ? { ...s, status: "active" } : s)));
      await wait(600);
      setSteps((p) => p.map((s, idx) => (idx === i ? { ...s, status: "done" } : s)));
    }

    const out = await completion;
    if (out) {
      setResult(out.trim());
      log("success", `Оркестратор завершил: ${event}`);
    }
    setRunning(false);
  }

  function sendVia(channel: string) {
    setNotifyOpen(false);
    toast.success(`Уведомление отправлено через ${channel}`);
    log("success", `Уведомление через ${channel}`);
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Workflow className="w-5 h-5" /> Оркестратор
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Запуск сценария обработки события</p>
      </header>

      <Card className="p-5 shadow-sm bg-card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Тип события</Label>
            <Select value={event} onValueChange={(value) => {
              setEvent(value);
              // Reset conditional fields when event changes
              if (value !== "Уволился сотрудник") {
                setFaculty("");
                setDepartment("");
                setEmployeeName("");
                setResignationDate(new Date());
              }
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Детали</Label>
            <Input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Например: ФИО, отдел, дата" />
          </div>
        </div>

        {isEmployeeResigned && (
          <div className="space-y-4 animate-fade-in pt-2 border-t border-border/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Факультет</Label>
                <Select value={faculty} onValueChange={(value) => {
                  setFaculty(value);
                  setDepartment(""); // Reset department when faculty changes
                }}>
                  <SelectTrigger><SelectValue placeholder="Выберите факультет" /></SelectTrigger>
                  <SelectContent>
                    {FACULTIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Кафедра</Label>
                <Select value={department} onValueChange={setDepartment} disabled={!faculty}>
                  <SelectTrigger><SelectValue placeholder={faculty ? "Выберите кафедру" : "Сначала выберите факультет"} /></SelectTrigger>
                  <SelectContent>
                    {availableDepartments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">ФИО сотрудника</Label>
                <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Фамилия Имя Отчество" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Дата увольнения</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={"w-full justify-start text-left font-normal"}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {resignationDate ? format(resignationDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={resignationDate}
                      onSelect={(date) => {
                        setResignationDate(date);
                        setDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}
        <Button onClick={runOrch} disabled={running} className="gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Запустить оркестратор
        </Button>
      </Card>

      {steps.length > 0 && (
        <Card className="p-5 shadow-sm bg-card">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Пошаговое выполнение
          </div>
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const visible = s.status !== "pending";
              return (
                <li
                  key={i}
                  className={`flex gap-3 items-start transition-all duration-300 ${
                    visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <StepIcon kind={s.kind} status={s.status} />
                    {i < steps.length - 1 && (
                      <div className={`w-px flex-1 my-1 min-h-6 ${s.status === "done" ? "bg-emerald-500/40" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-3 flex-1 text-sm pt-0.5">
                    <span className={s.status === "pending" ? "text-muted-foreground" : "text-foreground"}>
                      {s.text}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {result && (
        <Card className="p-5 shadow-sm bg-card space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Результат</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  toast.success("Скопировано");
                }}
              >
                <Copy className="w-3.5 h-3.5" /> Копировать
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setNotifyOpen(true)}>
                <Send className="w-3.5 h-3.5" /> Отправить уведомление
              </Button>
            </div>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{result}</div>
        </Card>
      )}

      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отправить уведомление</DialogTitle>
            <DialogDescription>Выберите канал доставки результата</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            <ChannelButton icon={<MessageCircle className="w-5 h-5" />} label="Telegram" onClick={() => sendVia("Telegram")} />
            <ChannelButton icon={<Mail className="w-5 h-5" />} label="Email" onClick={() => sendVia("Email")} />
            <ChannelButton icon={<Phone className="w-5 h-5" />} label="WhatsApp" onClick={() => sendVia("WhatsApp")} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotifyOpen(false)}>Отмена</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepIcon({ kind, status }: { kind: StepKind; status: RunStep["status"] }) {
  const base = "w-6 h-6 rounded-full flex items-center justify-center transition-colors";
  if (status === "pending") return <div className={`${base} bg-muted`} />;
  if (status === "done") {
    if (kind === "check") return <div className={`${base} bg-emerald-500 text-white`}><Check className="w-3.5 h-3.5" /></div>;
    if (kind === "info") return <div className={`${base} bg-primary`}><div className="w-2 h-2 rounded-full bg-primary-foreground" /></div>;
    return <div className={`${base} bg-emerald-500 text-white`}><Check className="w-3.5 h-3.5" /></div>;
  }
  // active
  if (kind === "spinner") return <div className={`${base} bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400`}><Loader2 className="w-3.5 h-3.5 animate-spin" /></div>;
  if (kind === "info") return <div className={`${base} bg-primary`}><div className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" /></div>;
  return <div className={`${base} bg-emerald-500 text-white`}><Check className="w-3.5 h-3.5" /></div>;
}

function ChannelButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors"
    >
      <div className="text-primary">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
