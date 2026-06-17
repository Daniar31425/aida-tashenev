import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, Instagram as InstagramIcon, ImageIcon } from "lucide-react";
import {
  publishJobPost,
  getPublishedPosts,
  getMessages,
  replyToMessage,
  InstagramError,
  type IGPost,
  type IGConversation,
} from "@/lib/instagram";
import { useActivity } from "@/lib/activity-log";
import { useRole } from "@/lib/useRole";

export const Route = createFileRoute("/_app/instagram")({
  head: () => ({ meta: [{ title: "Instagram — AIDA" }] }),
  component: InstagramPage,
});

function handleApiError(e: unknown, fallback: string) {
  if (e instanceof InstagramError && e.isTokenExpired) {
    toast.error("Токен Instagram истёк, обновите его в настройках");
    return;
  }
  const msg = e instanceof Error ? e.message : fallback;
  toast.error(msg);
}

function InstagramPage() {
  const { role } = useRole();
  const allowed = role === "admin" || role === "hr_manager";

  if (!allowed) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Доступ к Instagram доступен только администраторам и HR менеджерам.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <InstagramIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Instagram</h1>
          <p className="text-sm text-muted-foreground">Публикация вакансий и работа с сообщениями</p>
        </div>
      </div>

      <Tabs defaultValue="publish">
        <TabsList>
          <TabsTrigger value="publish">Публикация вакансий</TabsTrigger>
          <TabsTrigger value="messages">Сообщения</TabsTrigger>
        </TabsList>
        <TabsContent value="publish" className="mt-6">
          <PublishTab />
        </TabsContent>
        <TabsContent value="messages" className="mt-6">
          <MessagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PublishTab() {
  const { log } = useActivity();
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);

  const [posts, setPosts] = useState<IGPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getPublishedPosts()
      .then((r) => {
        if (!cancel) setPosts(r.data || []);
      })
      .catch((e) => handleApiError(e, "Не удалось загрузить публикации"))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [reloadKey]);

  async function onPublish() {
    if (!imageUrl.trim() || !caption.trim()) {
      toast.error("Заполните URL изображения и описание");
      return;
    }
    setPublishing(true);
    try {
      await publishJobPost(imageUrl.trim(), caption.trim());
      toast.success("Вакансия опубликована в Instagram");
      log("success", "Опубликована вакансия в Instagram");
      setImageUrl("");
      setCaption("");
      setReloadKey((k) => k + 1);
    } catch (e) {
      handleApiError(e, "Не удалось опубликовать пост");
      log("error", "Ошибка публикации в Instagram");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Новая публикация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">URL изображения</label>
            <Input
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Описание вакансии</label>
            <Textarea
              rows={6}
              placeholder="Текст вакансии с #хэштегами"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          <Button onClick={onPublish} disabled={publishing}>
            {publishing ? "Публикация…" : "Опубликовать в Instagram"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Опубликованные посты</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              Публикаций пока нет
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {p.media_type === "VIDEO" ? (
                    <video src={p.media_url} className="w-full h-full object-cover" controls />
                  ) : p.media_url ? (
                    <img src={p.media_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm line-clamp-3 whitespace-pre-wrap">{p.caption || "—"}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{new Date(p.timestamp).toLocaleString("ru-RU")}</span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" /> {p.like_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> {p.comments_count ?? 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessagesTab() {
  const [convs, setConvs] = useState<IGConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getMessages()
      .then((r) => {
        if (cancel) return;
        setConvs(r.data || []);
        if ((r.data || []).length) setActiveId(r.data[0].id);
      })
      .catch((e) => handleApiError(e, "Не удалось загрузить сообщения"))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, []);

  const active = useMemo(() => convs.find((c) => c.id === activeId) || null, [convs, activeId]);
  const messages = active?.messages?.data || [];
  const lastIncoming = messages.find((m) => m.from?.id);
  const peerId = lastIncoming?.from?.id;
  const peerName = lastIncoming?.from?.username || "Пользователь";

  async function onSend() {
    if (!reply.trim() || !peerId) return;
    setSending(true);
    try {
      await replyToMessage(peerId, reply.trim());
      toast.success("Сообщение отправлено");
      setReply("");
    } catch (e) {
      handleApiError(e, "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <Skeleton className="h-[480px] rounded-xl" />
        <Skeleton className="h-[480px] rounded-xl" />
      </div>
    );
  }

  if (!convs.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">
          Сообщений нет
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
      <Card className="overflow-hidden">
        <div className="divide-y">
          {convs.map((c) => {
            const last = c.messages?.data?.[0];
            const name = last?.from?.username || "Без имени";
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                  activeId === c.id ? "bg-muted" : ""
                }`}
              >
                <div className="text-sm font-medium truncate">{name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {last?.message || "—"}
                </div>
                {last?.created_time && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(last.created_time).toLocaleString("ru-RU")}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col h-[520px]">
        <CardHeader className="border-b">
          <CardTitle className="text-sm">{peerName}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto py-4 space-y-2">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Нет сообщений</p>
          )}
          {[...messages].reverse().map((m, i) => {
            const mine = !m.from || m.from?.id !== peerId;
            return (
              <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.message}</div>
                  <div className={`text-[10px] mt-1 opacity-70`}>
                    {new Date(m.created_time).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
        <div className="border-t p-3 flex items-center gap-2">
          <Input
            placeholder="Написать сообщение…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            disabled={!peerId || sending}
          />
          <Button onClick={onSend} disabled={!peerId || sending || !reply.trim()}>
            <Send className="w-4 h-4 mr-1.5" />
            Отправить
          </Button>
        </div>
      </Card>
    </div>
  );
}
