'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

const SUPABASE_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const LICENSE_BUCKET = 'license-photos';
const LICENSE_FOLDER = 'license_cards';

function isLikelyRlsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const status = (error as { status?: unknown }).status;
  if (typeof status === 'number' && (status === 400 || status === 401 || status === 403)) {
    return true;
  }
  const message = typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : undefined;
  return Boolean(message && message.toLowerCase().includes('row-level security'));
}

async function requestSignedUrlViaApi(path: string, expiresInSeconds: number): Promise<string | null> {
  if (typeof fetch === 'undefined') {
    return null;
  }
  try {
    const response = await fetch('/api/storage/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, expiresInSeconds }),
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { url?: string | null };
    return typeof json?.url === 'string' && json.url.length > 0 ? json.url : null;
  } catch (error) {
    console.warn('[ParkingActions] Failed to sign license image via API', error);
    return null;
  }
}

async function fetchLatestLicenseViaApi(folder: string): Promise<string | null> {
  if (typeof fetch === 'undefined') {
    return null;
  }
  try {
    const response = await fetch('/api/storage/license/latest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { path?: string | null };
    return typeof json?.path === 'string' && json.path.length > 0 ? json.path : null;
  } catch (error) {
    console.warn('[ParkingActions] Failed to fetch latest license via API', error);
    return null;
  }
}

function getClient(): SupabaseClient | null {
  if (!SUPABASE_ENABLED) {
    return null;
  }
  try {
    return getSupabaseClient();
  } catch (error) {
    console.warn('[ParkingActions] Failed to create Supabase client', error);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return SUPABASE_ENABLED;
}

export async function resolveLicenseImageUrl(objectPath: string, expiresInSeconds = 60 * 60): Promise<string | null> {
  if (!objectPath) {
    return null;
  }
  if (objectPath.startsWith('http')) {
    return objectPath;
  }
  const client = getClient();
  if (!client) {
    const apiUrl = await requestSignedUrlViaApi(objectPath, expiresInSeconds);
    if (apiUrl) {
      return apiUrl;
    }
    return null;
  }
  try {
    const { data: signedData, error: signedError } = await client.storage
      .from(LICENSE_BUCKET)
      .createSignedUrl(objectPath, expiresInSeconds);
    if (!signedError && signedData?.signedUrl) {
      return signedData.signedUrl;
    }
    if (signedError && isLikelyRlsError(signedError)) {
      const apiUrl = await requestSignedUrlViaApi(objectPath, expiresInSeconds);
      if (apiUrl) {
        return apiUrl;
      }
    }
    const { data: publicData } = client.storage.from(LICENSE_BUCKET).getPublicUrl(objectPath);
    return publicData?.publicUrl ?? null;
  } catch (error) {
    if (isLikelyRlsError(error)) {
      const apiUrl = await requestSignedUrlViaApi(objectPath, expiresInSeconds);
      if (apiUrl) {
        return apiUrl;
      }
    }
    console.warn('[ParkingActions] Failed to resolve license image URL', error);
    return null;
  }
}

export async function fetchLatestLicenseObjectPath(): Promise<string | null> {
  const client = getClient();
  if (!client) {
    return fetchLatestLicenseViaApi(LICENSE_FOLDER);
  }
  try {
    const { data, error } = await client.storage.from(LICENSE_BUCKET).list(LICENSE_FOLDER, {
      limit: 20,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) {
      if (isLikelyRlsError(error)) {
        return fetchLatestLicenseViaApi(LICENSE_FOLDER);
      }
      throw error;
    }
    const candidate = data?.find((file) => file.name && !file.name.startsWith('.'));
    return candidate ? `${LICENSE_FOLDER}/${candidate.name}` : null;
  } catch (error) {
    if (isLikelyRlsError(error)) {
      const fallback = await fetchLatestLicenseViaApi(LICENSE_FOLDER);
      if (fallback) {
        return fallback;
      }
    }
    console.warn('[ParkingActions] Failed to fetch latest license object', error);
    return null;
  }
}
