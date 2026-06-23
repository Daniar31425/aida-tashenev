import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { LogOut, Sparkles, Heart, MessageCircle, ExternalLink, Instagram as InstagramIcon } from "lucide-react";
import { ActivityProvider } from "@/lib/activity-log";
import { ActivityPanel } from "@/components/aida/ActivityPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VacancyBuilder, CandidateSearch, VacancyHistory } from "./_app.hr";
import { getPublishedPosts, InstagramError, type IGPost } from "@/lib/instagram";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const API_URL = "http://localhost:8000";
const UNIVERSITY = "Университет Ташенова";

export const Route = createFileRoute("/hr-app")({
  head: () => ({ meta: [{ title: "AIDA HR — Университет Ташенова" }] }),
  component: HRApp,
});

function HRApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(!!localStorage.getItem("auth_token"));
  }, []);

  if (authed === null) return null;

  return authed ? (
    <Dashboard onLogout={() => { localStorage.removeItem("auth_token"); localStorage.removeItem("user_role"); localStorage.removeItem("user_iin"); window.location.href = "/hr-app"; }} />
  ) : (
    <LoginScreen onSuccess={() => { setAuthed(true); }} />
  );
}

// ---------- Login ----------

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [iin, setIin] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{12}$/.test(iin)) {
      toast.error("ИИН должен содержать 12 цифр");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iin, password: pwd })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("auth_token", data.access_token);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("user_iin", iin);
        toast.success("Добро пожаловать!");
        onSuccess();
      } else if (res.status === 404) {
        toast.error("ИИН не найден в системе");
      } else {
        toast.error("Неверный ИИН или пароль");
      }
    } catch {
      toast.error("Ошибка соединения с сервером");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] px-4">
      <Toaster position="bottom-right" />
      <Card className="w-full max-w-md p-8 shadow-sm rounded-xl bg-white">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-lg leading-tight">AIDA HR</div>
            <div className="text-xs text-muted-foreground">{UNIVERSITY}</div>
          </div>
        </div>

        {showRegister ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight mb-1">Регистрация</h1>
            <p className="text-sm text-muted-foreground mb-6">Создайте аккаунт для HR-сотрудников</p>
            <RegisterForm onCancel={() => setShowRegister(false)} onSuccess={() => setShowRegister(false)} />
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight mb-1">Вход в систему</h1>
            <p className="text-sm text-muted-foreground mb-6">Только для HR-сотрудников</p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label className="text-sm mb-1.5 block">ИИН</Label>
                <Input
                  inputMode="numeric"
                  maxLength={12}
                  value={iin}
                  onChange={(e) => setIin(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000000000"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Пароль</Label>
                <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4fd1]">
                {loading ? "Вход..." : "Войти"}
              </Button>
            </form>

            <div className="flex items-center justify-between mt-5 text-sm">
              <button
                className="text-[#2563EB] hover:underline"
                onClick={() => toast("Свяжитесь с администратором для восстановления пароля")}
              >
                Забыли пароль?
              </button>
              <button
                className="text-[#2563EB] hover:underline"
                onClick={() => setShowRegister(true)}
              >
                Зарегистрироваться
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ---------- Registration ----------

function RegisterForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [iin, setIin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{12}$/.test(iin)) {
      toast.error("ИИН должен содержать 12 цифр");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      toast.error("Пароль должен содержать минимум 6 символов");
      return;
    }
    if (!recoveryEmail || !recoveryEmail.includes("@")) {
      toast.error("Введите корректный email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iin, password, recovery_email: recoveryEmail })
      });
      if (res.ok) {
        toast.success("Регистрация успешна! Войдите в систему");
        onSuccess();
      } else if (res.status === 400) {
        toast.error("ИИН не найден в базе сотрудников");
      } else if (res.status === 409) {
        toast.error("Пользователь с этим ИИН уже зарегистрирован");
      } else {
        toast.error("Ошибка регистрации");
      }
    } catch {
      toast.error("Ошибка соединения с сервером");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label className="text-sm mb-1.5 block">ИИН</Label>
        <Input
          inputMode="numeric"
          maxLength={12}
          value={iin}
          onChange={(e) => setIin(e.target.value.replace(/\D/g, ""))}
          placeholder="000000000000"
          autoFocus
        />
      </div>
      <div>
        <Label className="text-sm mb-1.5 block">Пароль</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      <div>
        <Label className="text-sm mb-1.5 block">Подтвердить пароль</Label>
        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
      </div>
      <div>
        <Label className="text-sm mb-1.5 block">Email для восстановления</Label>
        <Input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="example@email.com" />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11">
          Отмена
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 h-11 bg-[#2563EB] hover:bg-[#1d4fd1]">
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </Button>
      </div>
    </form>
  );
}

// ---------- Dashboard ----------

function Dashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <ActivityProvider>
      <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-foreground">
        <header className="h-16 px-6 border-b border-border bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold leading-tight">AIDA HR</div>
              <div className="text-xs text-muted-foreground">{UNIVERSITY}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-1.5" /> Выйти
          </Button>
        </header>

        <div className="flex-1 flex min-h-0">
          <main className="flex-1 min-w-0 overflow-y-auto">
            <ErrorBoundary>
              <div className="p-8 max-w-5xl">
                <header className="mb-6">
                  <h1 className="text-2xl font-semibold tracking-tight">HR Агент</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Создание вакансий, поиск кандидатов и публикации
                  </p>
                </header>

                <Tabs defaultValue="vacancy">
                  <TabsList>
                    <TabsTrigger value="vacancy">Создать вакансию</TabsTrigger>
                    <TabsTrigger value="search">Поиск кандидатов</TabsTrigger>
                    <TabsTrigger value="history">История вакансий</TabsTrigger>
                    <TabsTrigger value="instagram">Instagram</TabsTrigger>
                  </TabsList>
                  <TabsContent value="vacancy" className="mt-6"><VacancyBuilder /></TabsContent>
                  <TabsContent value="search" className="mt-6"><CandidateSearch /></TabsContent>
                  <TabsContent value="history" className="mt-6"><VacancyHistory /></TabsContent>
                  <TabsContent value="instagram" className="mt-6"><InstagramFeed /></TabsContent>
                </Tabs>
              </div>
            </ErrorBoundary>
          </main>
          <ActivityPanel />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </ActivityProvider>
  );
}

// ---------- Instagram tab ----------

const IG_PROFILE = "https://instagram.com/s1k4ov";

function InstagramFeed() {
  const [posts, setPosts] = useState<IGPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getPublishedPosts();
        setPosts(data ?? []);
      } catch (e) {
        if (e instanceof InstagramError && e.isTokenExpired) {
          setError("Токен Instagram истёк");
        } else {
          setError(e instanceof Error ? e.message : "Не удалось загрузить публикации");
        }
        setPosts([]);
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <Card className="p-5 shadow-sm bg-card rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center">
            <InstagramIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold">@s1k4ov</div>
            <div className="text-xs text-muted-foreground">Официальный аккаунт университета</div>
          </div>
        </div>
        <a href={IG_PROFILE} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            Открыть профиль <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </a>
      </Card>

      {error && (
        <Card className="p-4 shadow-sm bg-card rounded-xl text-sm text-muted-foreground">
          {error}
        </Card>
      )}

      {posts === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-3 shadow-sm bg-card rounded-xl space-y-3">
              <Skeleton className="w-full aspect-square rounded-lg" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-10 shadow-sm bg-card rounded-xl text-center text-sm text-muted-foreground">
          Публикации пока не загружены
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.slice(0, 12).map((p) => (
            <Card key={p.id} className="overflow-hidden shadow-sm bg-card rounded-xl">
              {p.media_url && (
                <img src={p.media_url} alt="" className="w-full aspect-square object-cover" />
              )}
              <div className="p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  {format(new Date(p.timestamp), "dd MMM yyyy, HH:mm", { locale: ru })}
                </div>
                {p.caption && (
                  <p className="text-sm line-clamp-3 leading-snug">{p.caption}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {p.like_count ?? 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {p.comments_count ?? 0}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
