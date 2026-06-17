// Get a free ImgBB API key at: https://api.imgbb.com/
export async function uploadToImgBB(blob: Blob): Promise<string> {
  const key = import.meta.env.VITE_IMGBB_API_KEY as string;
  console.log('ImgBB key:', key);
  if (!key) throw new Error("VITE_IMGBB_API_KEY не задан");

  const formData = new FormData();
  formData.append("image", blob);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('ImgBB error response:', errorText);
    throw new Error(`ImgBB upload failed (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  console.log('ImgBB response:', data);
  if (!data?.data?.url) throw new Error("ImgBB: некорректный ответ");
  return data.data.url as string;
}
