import { getSupabaseClient } from "@/lib/supabase/client";

export type UploadResult = {
  path: string;
  publicUrl?: string;
};

export function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const [meta, base64] = dataUrl.split(",");
  if (!meta || !base64) throw new Error("Invalid data URL");
  const match = /data:(.*?);base64/.exec(meta);
  const contentType = match?.[1] || "image/png";
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: contentType }), contentType };
}

function makeFileName(ext: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}.${ext.replace(/^\./, "")}`;
}

export async function uploadImageDataUrl(dataUrl: string, opts?: { folder?: string; makePublic?: boolean }): Promise<UploadResult> {
  const supabase = getSupabaseClient();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_IMAGES;
  if (!bucket) throw new Error("Missing NEXT_PUBLIC_SUPABASE_BUCKET_IMAGES env var");

  const { blob, contentType } = dataUrlToBlob(dataUrl);
  const ext = contentType.split("/")[1] || "png";
  const name = makeFileName(ext);
  const folder = (opts?.folder || "captures").replace(/^\/+|\/+$/g, "");
  const path = `${folder}/${name}`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    cacheControl: "3600",
    contentType,
    upsert: false,
  });
  if (error) throw error;

  let publicUrl: string | undefined;
  if (opts?.makePublic) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    publicUrl = data.publicUrl;
  }

  return { path, publicUrl };
}
