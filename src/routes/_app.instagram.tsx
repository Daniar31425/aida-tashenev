import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { Heart, MessageCircle, Send, Instagram as InstagramIcon, ImageIcon, Eye } from "lucide-react";
import {
  publishJobPost,
  publishStory,
  getPublishedPosts,
  getMessages,
  replyToMessage,
  InstagramError,
  type IGPost,
  type IGConversation,
} from "@/lib/instagram";
import { uploadToImgBB } from "@/lib/imgbb";
import { VacancyCard } from "@/components/VacancyCard";
import { StoryCard, type StoryCardProps } from "@/components/StoryCard";
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

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Публикации</TabsTrigger>
          <TabsTrigger value="stories">Сторис</TabsTrigger>
          <TabsTrigger value="messages">Сообщения</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-6">
          <PostsTab />
        </TabsContent>
        <TabsContent value="stories" className="mt-6">
          <StoriesTab />
        </TabsContent>
        <TabsContent value="messages" className="mt-6">
          <MessagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PostsTab() {
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

  return (
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
  );
}

function StoriesTab() {
  const { log } = useActivity();
  const [type, setType] = useState<StoryCardProps["type"]>("Объявление");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [link, setLink] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [stories, setStories] = useState<Array<{ id: string; type: StoryCardProps["type"]; title: string; publishedAt: Date }>>([]);

  const storyCardRef = useRef<HTMLDivElement>(null);

  const textLength = text.length;
  const maxTextLength = 200;

  async function captureStoryBlob(): Promise<Blob> {
    if (!storyCardRef.current) throw new Error("Карточка сторис не готова");
    const canvas = await html2canvas(storyCardRef.current, {
      width: 1080,
      height: 1920,
      scale: 1,
      backgroundColor: "#FFFFFF",
      useCORS: true,
    });
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92);
    });
  }

  async function onPublishStory() {
    if (!title.trim() || !text.trim()) {
      toast.error("Заполните заголовок и текст сторис");
      return;
    }
    if (textLength > maxTextLength) {
      toast.error(`Текст не должен превышать ${maxTextLength} символов`);
      return;
    }
    setPublishing(true);

    let blob: Blob;
    try {
      blob = await captureStoryBlob();
    } catch (e) {
      console.error(e);
      toast.error("Ошибка генерации сторис");
      setPublishing(false);
      return;
    }

    let imageUrl: string;
    try {
      imageUrl = await uploadToImgBB(blob);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка загрузки изображения");
      setPublishing(false);
      return;
    }

    try {
      await publishStory(imageUrl);
      toast.success("Сторис опубликована в Instagram! ✅");
      log("success", `Опубликована сторис в Instagram: ${title}`);
      
      // Add to stories history
      setStories((prev) => [
        { id: Date.now().toString(), type, title, publishedAt: new Date() },
        ...prev,
      ]);

      // Reset form
      setTitle("");
      setText("");
      setDate("");
      setLink("");
      setShowPreview(false);
    } catch (e) {
      if (e instanceof InstagramError && e.isTokenExpired) {
        toast.error("Токен Instagram истёк, обновите его в настройках");
      } else {
        toast.error("Ошибка публикации сторис");
      }
      log("error", "Ошибка публикации сторис");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hidden offscreen card used for capture */}
      <div style={{ position: "absolute", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
        <StoryCard
          ref={storyCardRef}
          type={type}
          title={title || "Заголовок"}
          text={text || "Текст сторис"}
          date={type === "Мероприятие" ? date : undefined}
          link={link || undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Новая сторис</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Тип сторис</Label>
              <Select value={type} onValueChange={(value: StoryCardProps["type"]) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Объявление">Объявление</SelectItem>
                  <SelectItem value="Мероприятие">Мероприятие</SelectItem>
                  <SelectItem value="Новость">Новость</SelectItem>
                  <SelectItem value="Достижение">Достижение</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Заголовок</Label>
              <Input
                placeholder="Краткий заголовок"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>
                Текст сторис ({textLength}/{maxTextLength})
              </Label>
              <Textarea
                rows={4}
                placeholder="Основной текст сторис"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={maxTextLength}
              />
            </div>

            {type === "Мероприятие" && (
              <div className="space-y-1.5 md:col-span-2">
                <Label>Дата и время события</Label>
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <Label>Ссылка (необязательно)</Label>
              <Input
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setShowPreview((v) => !v)}>
              <Eye className="w-4 h-4 mr-1.5" />
              {showPreview ? "Скрыть предпросмотр" : "Предпросмотр сторис"}
            </Button>
            <Button onClick={onPublishStory} disabled={publishing}>
              {publishing ? "Публикация…" : "Опубликовать сторис"}
            </Button>
          </div>

          {showPreview && (
            <div className="rounded-xl border bg-muted/30 p-4 overflow-hidden flex justify-center">
              <div style={{ width: 1080 * 0.3, height: 1920 * 0.3, position: "relative" }}>
                <div
                  style={{
                    transform: "scale(0.3)",
                    transformOrigin: "top left",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  <StoryCard
                    type={type}
                    title={title || "Заголовок"}
                    text={text || "Текст сторис"}
                    date={type === "Мероприятие" ? date : undefined}
                    link={link || undefined}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {stories.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">История сторис</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stories.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                    {s.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {s.publishedAt.toLocaleString("ru-RU")}
                  </span>
                </div>
                <p className="text-sm font-medium">{s.title}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
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
