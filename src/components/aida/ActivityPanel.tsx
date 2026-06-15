import { useActivity, type ActivityKind } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";

const dot: Record<ActivityKind, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  processing: "bg-amber-500 animate-pulse",
  error: "bg-red-500",
};

export function ActivityPanel() {
  const { entries, clear } = useActivity();
  return (
    <aside className="w-[300px] shrink-0 border-l border-border bg-sidebar/50 flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Активность</div>
          <div className="text-xs text-muted-foreground">Лента событий в реальном времени</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {entries.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-12">Пока нет событий</div>
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-start gap-2.5 px-2.5 py-2 rounded-md hover:bg-background/70 transition-colors animate-in fade-in slide-in-from-top-1 duration-300"
          >
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dot[e.kind]}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground leading-snug">{e.text}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{e.time}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border">
        <Button onClick={clear} variant="ghost" size="sm" className="w-full text-xs h-8">
          Очистить
        </Button>
      </div>
    </aside>
  );
}
