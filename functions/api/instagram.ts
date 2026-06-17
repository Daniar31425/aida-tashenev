interface Env {
  INSTAGRAM_ACCESS_TOKEN: string;
  INSTAGRAM_USER_ID: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { imageUrl, caption: rawCaption } = await context.request.json() as {
      imageUrl: string;
      caption: string;
    };

    const accessToken = context.env.INSTAGRAM_ACCESS_TOKEN;
    const igUserId = context.env.INSTAGRAM_USER_ID;

    // Truncate caption if too long (Instagram limit is 2200 characters)
    const MAX_CAPTION_LENGTH = 2200;
    const caption = rawCaption.length > MAX_CAPTION_LENGTH 
      ? rawCaption.substring(0, MAX_CAPTION_LENGTH - 3) + '...'
      : rawCaption;

    if (!imageUrl || !caption) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageUrl, caption' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!accessToken || !igUserId) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: missing env variables' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken })
      }
    );

    const containerData = await containerRes.json() as { id?: string; error?: { message: string } };

    if (!containerRes.ok || containerData.error) {
      return new Response(
        JSON.stringify({ error: containerData.error?.message || 'Failed to create media container' }),
        { status: containerRes.status, headers: corsHeaders }
      );
    }

    const creationId = containerData.id;
    if (!creationId) {
      return new Response(
        JSON.stringify({ error: 'No creation_id returned from Instagram API' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Step 2: Publish the media
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: creationId, access_token: accessToken })
      }
    );

    const publishData = await publishRes.json() as { id?: string; error?: { message: string } };

    if (!publishRes.ok || publishData.error) {
      return new Response(
        JSON.stringify({ error: publishData.error?.message || 'Failed to publish media' }),
        { status: publishRes.status, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: publishData.id }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
