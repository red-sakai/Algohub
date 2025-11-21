import { getSupabaseClient } from "@/lib/supabase/client";

export type UploadResult = {
  path: string;
  publicUrl?: string;
};

type UploadOptions = {
  folder?: string;
  makePublic?: boolean;
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

function normalizeFolder(input?: string): string {
  const value = input && input.trim().length > 0 ? input.trim() : "captures";
  return value.replace(/^\/+/g, "").replace(/\/+$/g, "");
}

function deriveExtension(contentType: string): string {
  const [, ext] = contentType.split("/");
  return (ext || "png").toLowerCase();
}

function makeFileName(ext: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}.${ext.replace(/^\./, "")}`;
}

export function createStoragePath(contentType: string, folder?: string): { path: string; extension: string; folder: string } {
  const normalizedFolder = normalizeFolder(folder);
  const extension = deriveExtension(contentType);
  return {
    folder: normalizedFolder,
    extension,
    path: `${normalizedFolder}/${makeFileName(extension)}`,
  };
}

function isLikelyRlsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = typeof (error as { message?: unknown }).message === "string" ? (error as { message: string }).message : undefined;
  if (message && message.toLowerCase().includes("row-level security")) {
    return true;
  }
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number" && status === 400) {
    const name = typeof (error as { name?: unknown }).name === "string" ? (error as { name: string }).name : undefined;
    if (name && name.toLowerCase().includes("storage")) {
      return true;
    }
  }
  return false;
}

async function uploadViaApiRoute(dataUrl: string, opts: UploadOptions): Promise<UploadResult> {
  if (typeof fetch === "undefined") {
    throw new Error("Fetch API is not available for fallback upload.");
  }
  const response = await fetch("/api/storage/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataUrl,
      folder: opts.folder,
      makePublic: opts.makePublic,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fallback upload failed (${response.status}): ${text || response.statusText}`);
  }
  const json = (await response.json()) as UploadResult;
  if (!json?.path) {
    throw new Error("Fallback upload response missing path.");
  }
  return json;
}

export async function uploadImageDataUrl(dataUrl: string, opts?: UploadOptions): Promise<UploadResult> {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_IMAGES;
  if (!bucket) throw new Error("Missing NEXT_PUBLIC_SUPABASE_BUCKET_IMAGES env var");

  const { blob, contentType } = dataUrlToBlob(dataUrl);
  const supabase = getSupabaseClient();
  const { path } = createStoragePath(contentType, opts?.folder);

  try {
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });
    if (error) {
      throw error;
    }

    let publicUrl: string | undefined;
    if (opts?.makePublic) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      publicUrl = data.publicUrl;
    }

    return { path, publicUrl };
  } catch (error) {
    if (typeof window === "undefined" || !isLikelyRlsError(error)) {
      throw error;
    }
    return uploadViaApiRoute(dataUrl, opts ?? {});
  }
}
