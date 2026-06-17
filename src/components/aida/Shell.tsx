import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { ActivityPanel } from "./ActivityPanel";
import { ActivityProvider } from "@/lib/activity-log";
import { Toaster } from "@/components/ui/sonner";

export function Shell() {
  return (
    <ActivityProvider>
      <div className="min-h-screen w-full flex bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
        <ActivityPanel />
      </div>
      <Toaster position="bottom-right" />
    </ActivityProvider>
  );
}
