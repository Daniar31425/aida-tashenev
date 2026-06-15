import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Loader2, Check, Copy, Linkedin, Globe, Send, Search, Bookmark, MessageSquare, FileText } from "lucide-react";
import { useGroq } from "@/lib/useGroq";
import { useActivity } from "@/lib/activity-log";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/hr")({
  head: () => ({ meta: [{ title: "HR Агент — AIDA" }] }),
  component: HRPage,
});

function HRPage() {
  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">HR Агент</h1>
        <p className="text-sm text-muted-foreground mt-1">Создание вакансий и поиск кандидатов</p>
      </header>

      <Tabs defaultValue="vacancy">
        <TabsList>
          <TabsTrigger value="vacancy">Создать вакансию</TabsTrigger>
          <TabsTrigger value="search">Поиск кандидатов</TabsTrigger>
        </TabsList>
        <TabsContent value="vacancy" className="mt-6"><VacancyBuilder /></TabsContent>
        <TabsContent value="search" className="mt-6"><CandidateSearch /></TabsContent>
      </Tabs>
    </div>
  );
}

function VacancyBuilder() {
  const { complete } = useGroq();
  const { log } = useActivity();
  const [title, setTitle] = useState("");
  const [reqs, setReqs] = useState("");
  const [exp, setExp] = useState("Без опыта");
  const [salFrom, setSalFrom] = useState("");
  const [salTo, setSalTo] = useState("");
  const [desc, setDesc] = useState("");
  const [aiComment, setAiComment] = useState("");

  const [gen, setGen] = useState<string | null>(null);
  const [pub, setPub] = useState<{ open: boolean; platform: string; step: number; url?: string }>({ open: false, platform: "", step: 0 });

  async function genRequirements() {
    if (!title.trim()) return toast.error("Сначала укажите должность");
    setGen("req");
    try {
      const out = await complete(
        `Сформулируй профессиональные требования к кандидату на должность "${title}" в университете. 5-7 пунктов списком. Только пункты, без вступления.`
      );
      setReqs(out.trim());
      log("success", `HR Агент: сгенерированы требования для "${title}"`);
    } catch (e: any) { toast.error(e.message); } finally { setGen(null); }
  }

  async function genDescription() {
    if (!title.trim()) return toast.error("Сначала укажите должность");
    setGen("desc");
    try {
      const prompt = `Составь полное описание вакансии в университете на должность "${title}".
Требования: ${reqs || "стандартные"}
Опыт: ${exp}
Зарплата: ${salFrom || "—"} — ${salTo || "—"} тенге
Профессиональный тон, на русском. Включи: О роли, Обязанности, Требования, Условия. Готовый текст для публикации.`;
      const out = await complete(prompt);
      setDesc(out.trim());
      log("success", `HR Агент: описание вакансии "${title}" готово`);

      const c = await complete(
        `Дай короткий комментарий HR-эксперта (2-3 предложения) к вакансии "${title}". Подскажи, что можно улучшить, и отметь сильные стороны. Без вступления.`
      );
      setAiComment(c.trim());
    } catch (e: any) { toast.error(e.message); } finally { setGen(null); }
  }

  async function publish(platform: string) {
    setPub({ open: true, platform, step: 0 });
    log("processing", `Публикация вакансии "${title}" на ${platform}`);
    await wait(800); setPub((p) => ({ ...p, step: 1 }));
    await wait(1000); setPub((p) => ({ ...p, step: 2 }));
    await wait(900);
    const id = Math.floor(10000000 + Math.random() * 89999999);
    const host = platform.toLowerCase().includes("linkedin") ? "linkedin.com/jobs" : "hh.kz/vacancy";
    const url = `${host}/${id}`;
    setPub((p) => ({ ...p, step: 3, url }));
    log("success", `Опубликовано: ${url}`);
  }

  return (
    <div className="space-y-5">
      <FieldCard label="Должность" hint="Например: Преподаватель математики">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Введите должность..." />
      </FieldCard>

      <FieldCard
        label="Требования"
        action={
          <Button size="sm" variant="outline" onClick={genRequirements} disabled={gen === "req"}>
            {gen === "req" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Сгенерировать
          </Button>
        }
      >
        <Textarea value={reqs} onChange={(e) => setReqs(e.target.value)} rows={5} placeholder="Требования к кандидату..." />
      </FieldCard>

      <div className="grid grid-cols-2 gap-4">
        <FieldCard label="Опыт работы">
          <Select value={exp} onValueChange={setExp}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Без опыта", "От 1 года", "От 3 лет", "От 5 лет"].map((x) => (
                <SelectItem key={x} value={x}>{x}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldCard>
        <FieldCard label="Зарплата (тенге)">
          <div className="flex items-center gap-2">
            <Input value={salFrom} onChange={(e) => setSalFrom(e.target.value)} placeholder="от" />
            <span className="text-muted-foreground text-sm">—</span>
            <Input value={salTo} onChange={(e) => setSalTo(e.target.value)} placeholder="до" />
          </div>
        </FieldCard>
      </div>

      <FieldCard
        label="Описание вакансии"
        action={
          <Button size="sm" variant="outline" onClick={genDescription} disabled={gen === "desc"}>
            {gen === "desc" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Автозаполнить описание
          </Button>
        }
      >
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={10} placeholder="Текст вакансии появится здесь..." />
      </FieldCard>

      {aiComment && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 shadow-none">
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 Комментарий ИИ</div>
          <div className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">{aiComment}</div>
        </Card>
      )}

      <Card className="p-4 shadow-sm bg-card">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Публикация</div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => publish("LinkedIn")}><Linkedin className="w-4 h-4" /> LinkedIn</Button>
          <Button variant="outline" onClick={() => publish("hh.kz")}><Globe className="w-4 h-4" /> hh.kz</Button>
          <Button onClick={() => publish("LinkedIn и hh.kz")}><Send className="w-4 h-4" /> Опубликовать везде</Button>
        </div>
      </Card>

      <Dialog open={pub.open} onOpenChange={(v) => !v && setPub({ open: false, platform: "", step: 0 })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Публикация вакансии</DialogTitle>
            <DialogDescription>{title || "Вакансия"} → {pub.platform}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 py-2">
            <StepLine done={pub.step > 0} active={pub.step === 0} text="Подготовка вакансии..." />
            <StepLine done={pub.step > 1} active={pub.step === 1} text={`Отправка на ${pub.platform}...`} />
            <StepLine done={pub.step >= 3} active={pub.step === 2} text="Успешно опубликовано!" />
          </div>
          {pub.step >= 3 && pub.url && (
            <Card className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <code className="flex-1 text-sm">{pub.url}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(pub.url!); toast.success("Скопировано"); }}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldCard({ label, hint, action, children }: { label: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-4 shadow-sm bg-card">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">{label}</Label>
        {action}
      </div>
      {children}
      {hint && <div className="text-xs text-muted-foreground mt-1.5">{hint}</div>}
    </Card>
  );
}

function StepLine({ done, active, text }: { done: boolean; active: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {done ? <Check className="w-4 h-4 text-emerald-600" /> : active ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <span className="w-4 h-4 rounded-full border border-border" />}
      <span className={done || active ? "text-foreground" : "text-muted-foreground"}>{text}</span>
    </div>
  );
}

function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// -------- Candidate Search --------

interface Candidate {
  name: string; role: string; company: string; years: number;
  skills: string[]; source: "LinkedIn" | "hh.kz"; match: number; resume?: string;
}

function CandidateSearch() {
  const { complete } = useGroq();
  const { log } = useActivity();
  const [q, setQ] = useState("");
  const [exp, setExp] = useState("любой");
  const [source, setSource] = useState("Оба");
  const [step, setStep] = useState(-1);
  const [cands, setCands] = useState<Candidate[]>([]);
  const [saved, setSaved] = useState<Candidate[]>([]);
  const [resume, setResume] = useState<{ open: boolean; loading: boolean; text: string; name: string }>({ open: false, loading: false, text: "", name: "" });

  async function run() {
    if (!q.trim()) return toast.error("Укажите должность");
    setCands([]); setStep(0);
    log("processing", `Поиск кандидатов: ${q}`);
    await wait(1000); setStep(1);
    await wait(1000); setStep(2);
    try {
      const out = await complete(
        `Сгенерируй JSON массив из 5 реалистичных кандидатов на должность "${q}" в Казахстане. Формат: {"candidates":[{"name":"...","role":"...","company":"...","years":число,"skills":["..","..","..","..", ],"source":"LinkedIn"|"hh.kz","match":число_70_99}]}. Имена казахские/русские. Только JSON.`,
        { json: true, temperature: 0.8 }
      );
      const parsed = JSON.parse(out);
      const list: Candidate[] = (parsed.candidates ?? []).slice(0, 5);
      await wait(800); setStep(3); setCands(list);
      log("success", `Найдено ${list.length} кандидатов`);
    } catch (e: any) {
      toast.error(e.message); setStep(-1);
    }
  }

  async function viewResume(c: Candidate) {
    setResume({ open: true, loading: true, text: "", name: c.name });
    try {
      const out = await complete(
        `Составь профессиональное резюме кандидата "${c.name}", должность "${c.role}" в "${c.company}", опыт ${c.years} лет. Разделы: О себе, Опыт работы, Образование, Навыки, Языки. На русском.`
      );
      setResume((r) => ({ ...r, loading: false, text: out }));
    } catch (e: any) { toast.error(e.message); setResume({ open: false, loading: false, text: "", name: "" }); }
  }

  function save(c: Candidate) {
    if (saved.find((s) => s.name === c.name)) return toast("Уже сохранён");
    setSaved((p) => [c, ...p]);
    toast.success(`${c.name} добавлен в сохранённые`);
    log("info", `Сохранён кандидат: ${c.name}`);
  }

  return (
    <Tabs defaultValue="search">
      <TabsList>
        <TabsTrigger value="search">Поиск</TabsTrigger>
        {saved.length > 0 && <TabsTrigger value="saved">Сохранённые ({saved.length})</TabsTrigger>}
      </TabsList>
      <TabsContent value="search" className="mt-5 space-y-5">
        <Card className="p-4 shadow-sm bg-card grid grid-cols-[1fr_180px_180px_auto] gap-3 items-end">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Должность</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Например: Преподаватель английского" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Опыт</Label>
            <Select value={exp} onValueChange={setExp}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["любой", "от 1 года", "от 3 лет"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Источник</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["LinkedIn", "hh.kz", "Оба"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={run} disabled={step >= 0 && step < 3}><Search className="w-4 h-4" /> Найти</Button>
        </Card>

        {step >= 0 && step < 3 && (
          <Card className="p-4 shadow-sm bg-card space-y-2.5">
            <StepLine done={step > 0} active={step === 0} text="Подключение к LinkedIn..." />
            <StepLine done={step > 1} active={step === 1} text="Подключение к hh.kz..." />
            <StepLine done={step > 2} active={step === 2} text="Анализ профилей..." />
          </Card>
        )}

        {cands.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Найдено {cands.length} кандидатов</div>
            {cands.map((c, i) => <CandidateCard key={i} c={c} onView={() => viewResume(c)} onSave={() => save(c)} />)}
          </div>
        )}
      </TabsContent>
      <TabsContent value="saved" className="mt-5 space-y-3">
        {saved.map((c, i) => <CandidateCard key={i} c={c} onView={() => viewResume(c)} onSave={() => save(c)} />)}
      </TabsContent>

      <Dialog open={resume.open} onOpenChange={(v) => !v && setResume({ open: false, loading: false, text: "", name: "" })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Резюме — {resume.name}</DialogTitle>
          </DialogHeader>
          {resume.loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Генерация резюме...</div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{resume.text}</pre>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

function CandidateCard({ c, onView, onSave }: { c: Candidate; onView: () => void; onSave: () => void }) {
  const initials = c.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const hue = (c.name.charCodeAt(0) * 37) % 360;
  return (
    <Card className="p-4 shadow-sm bg-card flex gap-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
        style={{ background: `hsl(${hue} 55% 50%)` }}
      >{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-muted-foreground">{c.role} · {c.company}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline">{c.source}</Badge>
            <Badge className={
              c.match >= 90 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200" :
              c.match >= 80 ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200" :
              "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200"
            }>Совпадение: {c.match}%</Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">Опыт: {c.years} {pluralYears(c.years)}</div>
        <div className="flex gap-1.5 flex-wrap mt-2.5">
          {c.skills?.slice(0, 4).map((s) => <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>)}
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={onView}><FileText className="w-3.5 h-3.5" /> Просмотреть резюме</Button>
          <Button size="sm" variant="outline" onClick={() => toast.success("Сообщение отправлено кандидату")}><MessageSquare className="w-3.5 h-3.5" /> Связаться</Button>
          <Button size="sm" variant="ghost" onClick={onSave}><Bookmark className="w-3.5 h-3.5" /> Сохранить</Button>
        </div>
      </div>
    </Card>
  );
}

function pluralYears(n: number) {
  const m = n % 10, k = n % 100;
  if (m === 1 && k !== 11) return "год";
  if (m >= 2 && m <= 4 && (k < 12 || k > 14)) return "года";
  return "лет";
}
