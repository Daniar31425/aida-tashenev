import { getApiKey } from "./apiKeys";

const BASE_URL = "https://graph.instagram.com";

async function getAccessToken(): Promise<string> {
  return await getApiKey("INSTAGRAM_ACCESS_TOKEN");
}

async function getUserId(): Promise<string> {
  return await getApiKey("INSTAGRAM_USER_ID");
}

export class InstagramError extends Error {
  status?: number;
  code?: number;
  isTokenExpired?: boolean;
  constructor(message: string, opts: { status?: number; code?: number; isTokenExpired?: boolean } = {}) {
    super(message);
    Object.assign(this, opts);
  }
}

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const err = data?.error || {};
    const code = err.code;
    const sub = err.error_subcode;
    const expired = code === 190 || sub === 463 || sub === 467;
    throw new InstagramError(err.message || `Instagram API error (${res.status})`, {
      status: res.status,
      code,
      isTokenExpired: expired,
    });
  }
  return data;
}

export async function publishJobPost(imageUrl: string, caption: string) {
  // Обрезаем caption до 1800 символов
  const safeCaption = caption.length > 1800
    ? caption.substring(0, 1797) + '...'
    : caption;

  const accessToken = await getAccessToken();
  const igUserId = await getUserId();

  const res = await fetch('/api/instagram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl,
      caption: safeCaption,
      accessToken,
      igUserId,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new InstagramError(data.error || 'Failed to publish to Instagram', {
      status: res.status,
    });
  }

  return data;
}

export interface IGPost {
  id: string;
  caption?: string;
  media_type: string;
  media_url: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export async function getPublishedPosts(): Promise<{ data: IGPost[] }> {
  const token = await getAccessToken();
  const res = await fetch(
    `${BASE_URL}/me/media?fields=id,caption,media_type,media_url,timestamp,like_count,comments_count&access_token=${token}`,
  );
  return handle(res);
}

export interface IGMessage {
  id?: string;
  message: string;
  from: { id: string; username?: string };
  created_time: string;
}
export interface IGConversation {
  id: string;
  messages?: { data: IGMessage[] };
}

export async function getMessages(): Promise<{ data: IGConversation[] }> {
  const token = await getAccessToken();
  const userId = await getUserId();
  const res = await fetch(
    `${BASE_URL}/${userId}/conversations?fields=messages{message,from,created_time}&access_token=${token}`,
  );
  return handle(res);
}

export async function replyToMessage(userId: string, message: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: userId },
      message: { text: message },
      access_token: token,
    }),
  });
  return handle(res);
}

export async function getPostComments(mediaId: string) {
  const token = await getAccessToken();
  const res = await fetch(
    `${BASE_URL}/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${token}`,
  );
  return handle(res);
}

export async function publishStory(imageUrl: string): Promise<void> {
  const token = await getAccessToken();
  const userId = await getUserId();
  
  // Step 1: Create media container for story
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${userId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        media_type: 'STORIES',
        access_token: token
      })
    }
  );
  const { id: creationId } = await handle(containerRes);

  // Step 2: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${userId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: token
      })
    }
  );
  await handle(publishRes);
}
