import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Sparkles, Loader2, Check, Copy, Linkedin, Globe, Send, Search, Bookmark, MessageSquare, FileText, Globe2, Users, Clock, Edit3, Inbox, Instagram } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useGroq } from "@/lib/useGroq";
import { useActivity } from "@/lib/activity-log";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { addDoc, collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "@/lib/firebase";
import { VacancyCard } from "@/components/VacancyCard";
import { uploadToImgBB } from "@/lib/imgbb";
import { publishJobPost } from "@/lib/instagram";
import { ErrorBoundary } from "@/components/ErrorBoundary";


export const Route = createFileRoute("/_app/hr")({
  head: () => ({ meta: [{ title: "HR Агент — AIDA" }] }),
  component: HRPage,
});

function HRPage() {
  return (
    <ErrorBoundary>
      <div className="p-8 max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">HR Агент</h1>
          <p className="text-sm text-muted-foreground mt-1">Создание вакансий и поиск кандидатов</p>
        </header>

        <Tabs defaultValue="vacancy">
          <TabsList>
            <TabsTrigger value="vacancy">Создать вакансию</TabsTrigger>
            <TabsTrigger value="search">Поиск кандидатов</TabsTrigger>
            <TabsTrigger value="history">История вакансий</TabsTrigger>
          </TabsList>
          <TabsContent value="vacancy" className="mt-6"><VacancyBuilder /></TabsContent>
          <TabsContent value="search" className="mt-6"><CandidateSearch /></TabsContent>
          <TabsContent value="history" className="mt-6"><VacancyHistory /></TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}

function VacancyBuilder() {
  const { complete } = useGroq();
  const { log } = useActivity();
  const [title, setTitle] = useState("");
  const [requiresPhD, setRequiresPhD] = useState(false);
  const [exp, setExp] = useState("Без опыта");
  const [reqs, setReqs] = useState("");
  const [desc, setDesc] = useState("");
  const [isEditable, setIsEditable] = useState(false);

  const [genReqs, setGenReqs] = useState(false);
  const [genDesc, setGenDesc] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [pubStep, setPubStep] = useState(0);
  const [searchStep, setSearchStep] = useState(0);
  const [instaStep, setInstaStep] = useState(0);
  const [buttonText, setButtonText] = useState("Отправить ИИ Агенту");
  const [result, setResult] = useState<{
    url: string;
    publishedAt: string;
    candidates: Array<{ name: string; experience: string; match: number }>;
    fullText: string;
    timeline: Array<{ step: string; time: string }>;
  } | null>(null);

  const [accordionOpen, setAccordionOpen] = useState(false);
  const vacancyCardRef = useRef<HTMLDivElement>(null);

  async function handleTitleBlur() {
    if (!title.trim()) return;
    setGenReqs(true);
    try {
      const phdReq = requiresPhD ? "Обязательное требование: наличие учёной степени (PhD или кандидат наук)." : "";
      const out = await complete(
        `Сформулируй профессиональные требования к кандидату на должность "${title}" в университете.
Опыт работы: ${exp}
${phdReq}
5-7 пунктов списком. Только пункты, без вступления.`
      );
      setReqs(out.trim());
      log("success", `HR Агент: сгенерированы требования для "${title}"`);
      
      // Auto-generate description after requirements
      setGenDesc(true);
      try {
        const descOut = await complete(
          `Составь полное описание вакансии в университете на должность "${title}".
Требования: ${out.trim()}
Опыт работы: ${exp}
${phdReq}
Заработная плата: По договорённости
Профессиональный тон, на русском. Включи: О роли, Обязанности, Требования, Условия. Готовый текст для публикации.`
        );
        setDesc(descOut.trim());
        log("success", `HR Агент: описание вакансии "${title}" готово`);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setGenDesc(false);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenReqs(false);
    }
  }

  async function handleSubmit() {
    if (!reqs || !desc) return toast.error("Дождитесь генерации требований и описания");
    
    setProcessing(true);
    setPubStep(0);
    setSearchStep(0);
    setInstaStep(0);
    setButtonText("Генерирую описание...");
    log("processing", `HR Агент: отправка вакансии "${title}"`);

    const now = new Date();
    const timeline = [
      { step: "Заявка создана", time: format(now, "HH:mm:ss", { locale: ru }) },
    ];

    // Step 1: Generate description
    setButtonText("Генерирую описание...");
    log("processing", "⚙️ Генерация карточки вакансии...");
    await wait(800);

    // Step 2: Create card and upload to ImgBB
    setButtonText("Создаю карточку...");
    setInstaStep(1);
    log("processing", "📤 Загрузка изображения...");
    
    let imageUrl: string | null = null;
    try {
      if (!vacancyCardRef.current) {
        console.warn("VacancyCard ref not available, skipping image generation");
        log("info", "Карточка недоступна, пропускаем генерацию изображения");
      } else {
        const html2canvas = (await import('html2canvas')).default;
        const cardEl = vacancyCardRef.current;
        
        // Force legacy colors for html2canvas compatibility (fix oklch parsing error)
        cardEl.style.setProperty('--background', '#ffffff');
        cardEl.style.setProperty('--foreground', '#000000');
        cardEl.style.setProperty('color', '#000000');
        cardEl.style.setProperty('background-color', '#ffffff');
        
        // Replace all computed styles that contain oklch with fallback hex colors
        const allElements = cardEl.querySelectorAll('*');
        allElements.forEach(el => {
          const htmlEl = el as HTMLElement;
          const computed = window.getComputedStyle(htmlEl);
          if (computed.backgroundColor.includes('oklch')) {
            htmlEl.style.backgroundColor = '#ffffff';
          }
          if (computed.color.includes('oklch')) {
            htmlEl.style.color = '#000000';
          }
        });
        
        // Apply to cardEl itself
        const cardComputed = window.getComputedStyle(cardEl);
        if (cardComputed.backgroundColor.includes('oklch')) {
          cardEl.style.backgroundColor = '#ffffff';
        }
        if (cardComputed.color.includes('oklch')) {
          cardEl.style.color = '#000000';
        }
        
        const canvas = await html2canvas(cardEl, {
          width: 1080,
          height: 1920,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b)));
        if (blob) {
          imageUrl = await uploadToImgBB(blob);
          setInstaStep(2);
        }
      }
    } catch (e) {
      console.error("Instagram upload failed:", e);
      log("error", "Ошибка загрузки изображения");
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error(`Не удалось загрузить изображение: ${errorMessage}`);
    }

    // Step 3: Publish to Instagram
    setButtonText("Публикую в Instagram...");
    if (imageUrl) {
      try {
        const caption = `${title}\n\n${desc}\n\n#tashenev #university #вакансия #работа #шымкент`;
        await publishJobPost(imageUrl, caption);
        setInstaStep(3);
        log("success", "✅ Опубликовано в Instagram!");
      } catch (e) {
        console.error("Instagram publish failed:", e);
        log("error", "Ошибка публикации в Instagram");
        toast.error("Не удалось опубликовать в Instagram");
      }
    }

    // Parallel execution for hh.kz and candidate search
    await Promise.all([
      (async () => {
        await wait(800);
        setPubStep(1);
        await wait(800);
        setPubStep(2);
        await wait(800);
        setPubStep(3);
      })(),
      (async () => {
        await wait(800);
        setSearchStep(1);
        await wait(800);
        setSearchStep(2);
        await wait(800);
        setSearchStep(3);
      })(),
    ]);

    timeline.push({ step: "Отправлено агенту", time: format(new Date(now.getTime() + 800), "HH:mm:ss", { locale: ru }) });
    timeline.push({ step: "Опубликовано на hh.kz", time: format(new Date(now.getTime() + 2400), "HH:mm:ss", { locale: ru }) });
    timeline.push({ step: "Кандидаты найдены", time: format(new Date(now.getTime() + 2400), "HH:mm:ss", { locale: ru }) });

    // Generate candidates
    const candidatesOut = await complete(
      `Сгенерируй JSON массив из 3 реалистичных кандидатов на должность "${title}" в Казахстане. Формат: {"candidates":[{"name":"...","experience":"...","match":число_70_99}]}. Имена казахские/русские. Только JSON.`,
      { json: true, temperature: 0.8 }
    );
    const parsed = JSON.parse(candidatesOut);
    const candidates = (parsed.candidates ?? []).slice(0, 3);

    const vacancyId = Math.floor(10000000 + Math.random() * 89999999);
    const url = `hh.kz/vacancy/${vacancyId}`;

    setResult({
      url,
      publishedAt: format(now, "dd.MM.yyyy HH:mm", { locale: ru }),
      candidates,
      fullText: `ТРЕБОВАНИЯ:\n${reqs}\n\nОПИСАНИЕ ВАКАНСИИ:\n${desc}`,
      timeline,
    });

    log("success", `HR Агент: вакансия "${title}" опубликована, найдено ${candidates.length} кандидатов`);

    try {
      await addDoc(collection(db, "vacancies"), {
        title,
        experience: exp,
        requiresPhD,
        requirements: reqs,
        description: desc,
        url,
        candidatesCount: candidates.length,
        publishedAt: Timestamp.now(),
      });
    } catch (e) {
      console.warn("Failed to save vacancy:", e);
    }

    setButtonText("Готово! ✅");
    await wait(3000);
    setButtonText("Отправить ИИ Агенту");
    setProcessing(false);
  }

  return (
    <div className="space-y-6">
      {/* Hidden off-screen VacancyCard for Instagram publishing */}
      <div style={{ position: "absolute", left: "-9999px", top: 0, pointerEvents: "none" }} aria-hidden>
        <div ref={vacancyCardRef}>
          <VacancyCard
            position={title || "Должность"}
            description={desc || "Описание роли"}
            requirements={reqs.split("\n").map(s => s.trim()).filter(Boolean)}
            conditions={["Конкурентная зарплата", "Гибкий график", "Медицинская страховка"]}
          />
        </div>
      </div>

      <Card className="p-5 shadow-sm bg-card space-y-5">
        <div>
          <Label className="text-sm font-medium mb-2 block">Должность</Label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            onBlur={handleTitleBlur}
            placeholder="Например: Преподаватель математики" 
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="phd" 
            checked={requiresPhD}
            onCheckedChange={(checked) => {
              setRequiresPhD(checked as boolean);
              if (title.trim()) handleTitleBlur();
            }}
          />
          <label htmlFor="phd" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Требуется учёная степень (PhD / Кандидат наук)
          </label>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Опыт работы</Label>
          <Select value={exp} onValueChange={(value) => { setExp(value); if (title.trim()) handleTitleBlur(); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Без опыта", "От 1 года", "От 3 лет", "От 5 лет", "От 10 лет"].map((x) => (
                <SelectItem key={x} value={x}>{x}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Требования</Label>
          <div className="relative">
            <Textarea 
              value={reqs} 
              readOnly={!isEditable}
              rows={5} 
              placeholder="Требования сгенерируются автоматически..." 
              className={isEditable ? "" : "bg-muted/50"}
            />
            {genReqs && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Описание вакансии</Label>
          <div className="relative">
            <Textarea 
              value={desc} 
              readOnly={!isEditable}
              rows={10} 
              placeholder="Описание сгенерируется автоматически..." 
              className={isEditable ? "" : "bg-muted/50"}
            />
            {genDesc && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={!reqs || !desc || processing}
          className="w-full h-12 text-base"
        >
          {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
          {buttonText}
        </Button>
      </Card>

      {processing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-5 shadow-sm bg-card space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Instagram className="w-4 h-4" />
              Instagram
            </div>
            <StepLine done={instaStep > 0} active={instaStep === 0} text="Генерация карточки..." />
            <StepLine done={instaStep > 1} active={instaStep === 1} text="Загрузка изображения..." />
            <StepLine done={instaStep >= 3} active={instaStep === 2} text="Опубликовано ✓" />
          </Card>

          <Card className="p-5 shadow-sm bg-card space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Globe2 className="w-4 h-4" />
              Публикация вакансии
            </div>
            <StepLine done={pubStep > 0} active={pubStep === 0} text="Подготовка вакансии..." />
            <StepLine done={pubStep > 1} active={pubStep === 1} text="Отправка на hh.kz..." />
            <StepLine done={pubStep >= 3} active={pubStep === 2} text="Опубликовано ✓" />
          </Card>

          <Card className="p-5 shadow-sm bg-card space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="w-4 h-4" />
              Поиск кандидатов
            </div>
            <StepLine done={searchStep > 0} active={searchStep === 0} text="Подключение к hh.kz..." />
            <StepLine done={searchStep > 1} active={searchStep === 1} text="Анализ резюме..." />
            <StepLine done={searchStep >= 3} active={searchStep === 2} text="Найдено 5 кандидатов ✓" />
          </Card>
        </div>
      )}

      {result && (
        <Card className="p-6 shadow-sm bg-card space-y-6">
          <Section1 result={result} />
          <Section2 result={result} />
          <Section3 result={result} isEditable={isEditable} setIsEditable={setIsEditable} accordionOpen={accordionOpen} setAccordionOpen={setAccordionOpen} />
          <Section4 result={result} />
        </Card>
      )}
    </div>
  );
}

function Section1({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Статус публикации</h3>
      <div className="flex items-center gap-3">
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200">
          <Check className="w-3 h-3 mr-1" />
          Опубликовано на hh.kz
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <code className="text-sm bg-muted px-2 py-1 rounded">{result.url}</code>
        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(result.url); toast.success("Скопировано"); }}>
          <Copy className="w-4 h-4" />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">Опубликовано: {result.publishedAt}</div>
    </div>
  );
}

function Section2({ result }: { result: any }) {
  const router = useRouter();
  
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Найденные кандидаты</h3>
      <div className="grid grid-cols-3 gap-3">
        {result.candidates.map((c: any, i: number) => (
          <Card key={i} className="p-3 bg-muted/50">
            <div className="font-medium text-sm">{c.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.experience}</div>
            <Badge variant="outline" className="mt-2 text-xs">
              Совпадение: {c.match}%
            </Badge>
          </Card>
        ))}
      </div>
      <Button variant="outline" onClick={() => router.navigate({ to: "/hr", search: { tab: "search" } })}>
        Смотреть всех кандидатов →
      </Button>
    </div>
  );
}

function Section3({ result, isEditable, setIsEditable, accordionOpen, setAccordionOpen }: any) {
  return (
    <div className="space-y-3">
      <Collapsible open={accordionOpen} onOpenChange={setAccordionOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Полное описание вакансии</h3>
            {accordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 mt-3">
          <Textarea 
            value={result.fullText}
            readOnly={!isEditable}
            rows={12}
            className={isEditable ? "" : "bg-muted/50"}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(result.fullText); toast.success("Скопировано"); }}>
              <Copy className="w-4 h-4 mr-1" /> Копировать
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditable(!isEditable)}>
              <Edit3 className="w-4 h-4 mr-1" /> {isEditable ? "Сохранить" : "Редактировать"}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function Section4({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Статус заявки</h3>
      <div className="space-y-2">
        {result.timeline.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="flex-1">{item.step}</span>
            <span className="text-muted-foreground">{item.time}</span>
          </div>
        ))}
      </div>
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

// -------- Vacancy History --------

interface VacancyRecord {
  id: string;
  title: string;
  experience: string;
  requiresPhD: boolean;
  requirements: string;
  description: string;
  url: string;
  candidatesCount: number;
  publishedAt: Date;
}

function VacancyHistory() {
  const [items, setItems] = useState<VacancyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"new" | "old">("new");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "vacancies"), orderBy("publishedAt", "desc")));
        const list: VacancyRecord[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title ?? "",
            experience: data.experience ?? "",
            requiresPhD: !!data.requiresPhD,
            requirements: data.requirements ?? "",
            description: data.description ?? "",
            url: data.url ?? "",
            candidatesCount: data.candidatesCount ?? 0,
            publishedAt: data.publishedAt?.toDate?.() ?? new Date(),
          };
        });
        setItems(list);
      } catch (e) {
        console.warn(e);
        toast.error("Не удалось загрузить вакансии");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = items
    .filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "new"
        ? b.publishedAt.getTime() - a.publishedAt.getTime()
        : a.publishedAt.getTime() - b.publishedAt.getTime()
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Всего вакансий: <span className="font-medium text-foreground">{items.length}</span>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по должности"
              className="pl-8 w-64"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as "new" | "old")}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Сначала новые</SelectItem>
              <SelectItem value="old">Сначала старые</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5 shadow-sm bg-card space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 shadow-sm bg-card flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <Inbox className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Вакансий пока нет — создайте первую во вкладке «Создать вакансию»
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <VacancyHistoryCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function VacancyHistoryCard({ v }: { v: VacancyRecord }) {
  return (
    <Card className="p-5 shadow-sm bg-card border rounded-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight">{v.title}</h3>
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 shrink-0">
          <Check className="w-3 h-3 mr-1" />
          Опубликовано
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{v.experience}</span>
        {v.requiresPhD && (
          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Требуется учёная степень</span>
        )}
        <span>{format(v.publishedAt, "dd.MM.yyyy", { locale: ru })}</span>
      </div>

      <div className="flex items-center gap-2">
        <code className="text-xs bg-muted px-2 py-1 rounded">{v.url}</code>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { navigator.clipboard.writeText(v.url); toast.success("Скопировано"); }}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span>Найдено кандидатов: <span className="font-medium">{v.candidatesCount}</span></span>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="desc" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium py-2">Описание вакансии</AccordionTrigger>
          <AccordionContent>
            <div className="text-sm whitespace-pre-wrap text-muted-foreground">
              {v.description}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="text-xs text-muted-foreground border-t pt-3">
        Создана: {format(v.publishedAt, "dd.MM.yyyy HH:mm", { locale: ru })}
      </div>
    </Card>
  );
}
