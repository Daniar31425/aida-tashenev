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

    // Wait for Instagram to process the media
    await new Promise(r => setTimeout(r, 8000));

    // Retry publish up to 3 times
    let publishResult: { id?: string; error?: { message: string } } | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: creationId, access_token: accessToken })
        }
      );

      publishResult = await publishRes.json() as { id?: string; error?: { message: string } };
      
      if (publishResult.id) break; // success
      if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
    }

    if (!publishResult?.id) {
      return new Response(
        JSON.stringify({ error: publishResult?.error?.message || 'Failed to publish media after retries' }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: publishResult.id }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
