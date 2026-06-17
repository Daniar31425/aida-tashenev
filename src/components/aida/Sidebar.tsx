import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Workflow, Settings as SettingsIcon, Sparkles, Package, Instagram } from "lucide-react";
import { useEffect, useState } from "react";
import { useRole } from "@/lib/useRole";

const nav = [
  { to: "/dashboard", label: "Панель управления", icon: LayoutDashboard, roles: null },
  { to: "/hr", label: "HR Агент", icon: Users, roles: null },
  { to: "/aho", label: "Агент АХО", icon: Package, roles: null },
  { to: "/instagram", label: "Instagram", icon: Instagram, roles: ["admin", "hr_manager"] as string[] },
  { to: "/orchestrator", label: "Оркестратор", icon: Workflow, roles: null },
  { to: "/settings", label: "Настройки", icon: SettingsIcon, roles: null },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useRole();
  const [uni, setUni] = useState("Университет");
  useEffect(() => {
    const u = localStorage.getItem("aida_university");
    if (u) setUni(u);
    const onStorage = () => {
      const v = localStorage.getItem("aida_university");
      if (v) setUni(v);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <aside className="w-[220px] shrink-0 border-r border-border bg-sidebar flex flex-col">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">AIDA</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{uni}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {nav.filter((n) => !n.roles || n.roles.includes(role)).map((n) => {
          const active = pathname === n.to;
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Все системы в норме
        </div>
      </div>
    </aside>
  );
}
