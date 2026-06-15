import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sparkles, Loader2, Check, Copy, Package, Clock, AlertCircle, MoreVertical } from "lucide-react";
import { useGroq } from "@/lib/useGroq";
import { useActivity } from "@/lib/activity-log";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useRole } from "@/lib/useRole";

export const Route = createFileRoute("/_app/aho")({
  head: () => ({ meta: [{ title: "Агент АХО — AIDA" }] }),
  component: AHOPage,
});

const MATERIAL_TYPES = [
  "Канцелярские товары",
  "Офисная техника",
  "Мебель",
  "Расходные материалы (картриджи, бумага)",
  "Инвентарь и оборудование",
  "Хозяйственные товары (моющие средства и тп)",
  "Другое",
];

const UNITS = ["шт", "уп", "кг", "л", "м"];

const URGENCY = [
  { value: "normal", label: "Обычная (до 2 недель)", color: "default" },
  { value: "urgent", label: "Срочная (до 3 дней)", color: "yellow" },
  { value: "critical", label: "Критическая (сегодня)", color: "red" },
];

const DEPARTMENTS = [
  "Деканат",
  "Кафедра математики",
  "Кафедра информатики",
  "Бухгалтерия",
  "Библиотека",
  "Столовая",
  "Общежитие",
  "IT отдел",
];

interface RequestHistory {
  id: string;
  date: string;
  type: string;
  name: string;
  quantity: string;
  urgency: string;
  status: "completed" | "in_progress" | "rejected";
}

function AHOPage() {
  const { complete } = useGroq();
  const { log } = useActivity();
  const { canChangeAHOStatus } = useRole();

  const [materialType, setMaterialType] = useState("");
  const [otherType, setOtherType] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("шт");
  const [urgency, setUrgency] = useState("normal");
  const [department, setDepartment] = useState("");
  const [justification, setJustification] = useState("");
  const [aiComment, setAiComment] = useState("");

  const [genJustification, setGenJustification] = useState(false);
  const [steps, setSteps] = useState<number[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const [history, setHistory] = useState<RequestHistory[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("aho_history");
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  const saveToHistory = (request: Omit<RequestHistory, "id" | "date">) => {
    const newEntry: RequestHistory = {
      ...request,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    const updated = [newEntry, ...history].slice(0, 5);
    setHistory(updated);
    localStorage.setItem("aho_history", JSON.stringify(updated));
  };

  const updateStatus = (id: string, newStatus: "completed" | "rejected") => {
    const updated = history.map((item) =>
      item.id === id ? { ...item, status: newStatus } : item
    );
    setHistory(updated);
    localStorage.setItem("aho_history", JSON.stringify(updated));
    toast.success(`Статус изменен на "${newStatus === "completed" ? "Выполнено" : "Отклонено"}"`);
    log("info", `АХО Агент: статус заявки изменен на "${newStatus}"`);
  };

  async function generateJustification() {
    if (!materialType || !itemName) {
      return toast.error("Заполните тип материала и наименование");
    }

    setGenJustification(true);
    try {
      const type = materialType === "Другое" ? otherType : materialType;
      const prompt = `Составь профессиональное обоснование для заявки на закупку в университете.
Тип материала: ${type}
Наименование: ${itemName}
Количество: ${quantity} ${unit}
Срочность: ${urgency === "critical" ? "критическая" : urgency === "urgent" ? "срочная" : "обычная"}
Подразделение: ${department}

Обоснование должно быть кратким, профессиональным и убедительным (3-4 предложения). На русском языке.`;

      const out = await complete(prompt);
      setJustification(out.trim());
      log("success", `АХО Агент: обоснование сгенерировано для "${itemName}"`);

      const comment = await complete(
        `Дай 2-3 коротких совета (каждый на новой строке) для заявки на "${itemName}" (${type}). Подскажи, какие документы или дополнения могут ускорить рассмотрение. Без вступления, только советы.`
      );
      setAiComment(comment.trim());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenJustification(false);
    }
  }

  async function createRequest() {
    if (!materialType || !itemName || !quantity || !department) {
      return toast.error("Заполните обязательные поля");
    }

    setSteps([0]);
    log("processing", `АХО Агент: новая заявка "${itemName}"`);

    await wait(800);
    setSteps([0, 1]);
    await wait(1000);
    setSteps([0, 1, 2]);
    await wait(900);
    setSteps([0, 1, 2, 3]);
    await wait(800);
    setSteps([0, 1, 2, 3, 4]);

    const type = materialType === "Другое" ? otherType : materialType;
    const urgencyLabel = URGENCY.find((u) => u.value === urgency)?.label || urgency;
    const resultText = `ЗАЯВКА НА ЗАКУПКУ

Тип материала: ${type}
Наименование: ${itemName}
Количество: ${quantity} ${unit}
Срочность: ${urgencyLabel}
Подразделение: ${department}
Обоснование: ${justification || "Не указано"}

Дата создания: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: ru })}`;

    setResult(resultText);
    log("success", `АХО Агент: заявка "${itemName}" создана`);

    saveToHistory({
      type,
      name: itemName,
      quantity: `${quantity} ${unit}`,
      urgency: urgencyLabel,
      status: "in_progress",
    });

    toast.success("Заявка успешно создана");
  }

  function clearForm() {
    setMaterialType("");
    setOtherType("");
    setItemName("");
    setQuantity("");
    setUnit("шт");
    setUrgency("normal");
    setDepartment("");
    setJustification("");
    setAiComment("");
    setResult(null);
    setSteps([]);
  }

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Агент АХО</h1>
        <p className="text-sm text-muted-foreground mt-1">Управление хозяйственными заявками</p>
      </header>

      <Card className="p-5 shadow-sm bg-card space-y-4">
        <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Новая заявка</div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Тип материала</Label>
            <Select value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {materialType === "Другое" && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Укажите тип</Label>
              <Input value={otherType} onChange={(e) => setOtherType(e.target.value)} placeholder="Например: Строительные материалы" />
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Наименование</Label>
          <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Что конкретно нужно" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Количество</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Единица измерения</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Срочность</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {URGENCY.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    <div className="flex items-center gap-2">
                      {u.color === "yellow" && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                      {u.color === "red" && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                      {u.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Подразделение</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Выберите подразделение" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs text-muted-foreground">Обоснование</Label>
            <Button size="sm" variant="outline" onClick={generateJustification} disabled={genJustification}>
              {genJustification ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Сгенерировать обоснование
            </Button>
          </div>
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={4}
            placeholder="Зачем нужен этот материал..."
          />
        </div>

        {aiComment && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 shadow-none">
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 Комментарий ИИ</div>
            <div className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed whitespace-pre-line">{aiComment}</div>
          </Card>
        )}

        <div className="flex gap-2">
          <Button onClick={createRequest} disabled={steps.length > 0 && steps.length < 5}>
            {steps.length > 0 && steps.length < 5 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            Создать заявку
          </Button>
          <Button variant="outline" onClick={clearForm}>Очистить форму</Button>
        </div>
      </Card>

      {steps.length > 0 && (
        <Card className="p-5 shadow-sm bg-card space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Обработка заявки</div>
          <StepLine done={steps.includes(1)} active={steps.includes(0)} text="АХО Агент получил заявку" />
          <StepLine done={steps.includes(2)} active={steps.includes(1)} text="Проверка бюджета и остатков..." />
          <StepLine done={steps.includes(3)} active={steps.includes(2)} text="Формирование документа..." />
          <StepLine done={steps.includes(4)} active={steps.includes(3)} text="Уведомление отправлено ответственному" />
          <StepLine done={steps.includes(4)} active={steps.includes(4)} text="Заявка создана ✓" />
        </Card>
      )}

      {result && (
        <Card className="p-5 shadow-sm bg-card space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Результат</div>
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
          </div>
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{result}</pre>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="p-5 shadow-sm bg-card space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">История заявок</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Дата</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Тип</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Наименование</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Кол-во</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Срочность</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Статус</th>
                  {canChangeAHOStatus && <th className="text-left py-2 px-2 font-medium text-muted-foreground w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 group hover:bg-accent/50 transition-colors">
                    <td className="py-2 px-2">{format(new Date(item.date), "dd.MM.yyyy", { locale: ru })}</td>
                    <td className="py-2 px-2">{item.type}</td>
                    <td className="py-2 px-2">{item.name}</td>
                    <td className="py-2 px-2">{item.quantity}</td>
                    <td className="py-2 px-2">{item.urgency}</td>
                    <td className="py-2 px-2">
                      <Badge
                        variant="outline"
                        className={
                          item.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200"
                            : item.status === "in_progress"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200"
                            : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200"
                        }
                      >
                        {item.status === "completed" ? "Выполнено" : item.status === "in_progress" ? "В работе" : "Отклонено"}
                      </Badge>
                    </td>
                    {canChangeAHOStatus && item.status === "in_progress" && (
                      <td className="py-2 px-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateStatus(item.id, "completed")}>
                              <Check className="w-4 h-4 mr-2 text-emerald-600" />
                              Выполнено
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(item.id, "rejected")}>
                              <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                              Отклонено
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                    {canChangeAHOStatus && item.status !== "in_progress" && (
                      <td className="py-2 px-2"></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StepLine({ done, active, text }: { done: boolean; active: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {done ? (
        <Check className="w-4 h-4 text-emerald-600" />
      ) : active ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      ) : (
        <span className="w-4 h-4 rounded-full border border-border" />
      )}
      <span className={done || active ? "text-foreground" : "text-muted-foreground"}>{text}</span>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
