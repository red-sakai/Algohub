export function resolveStorageBucket(): string {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_IMAGES ?? process.env.SUPABASE_BUCKET_IMAGES;
  if (!bucket) {
    throw new Error('Supabase storage bucket environment variable is not configured.');
  }
  return bucket;
}

export function assertServiceKeyConfigured(): void {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase service key is not configured on the server.');
  }
}
