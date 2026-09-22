import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Run manually from backend AFTER confirming the project and applying the SQL.
const expectedHost = 'frraifjjwbleiztpebzw.supabase.co';
if (!process.env.SUPABASE_URL || new URL(process.env.SUPABASE_URL).hostname !== expectedHost) {
  throw new Error(`Refusing to configure storage: expected ${expectedHost}.`);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Backend service role key is missing.');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: buckets, error } = await db.storage.listBuckets();
if (error) throw new Error('Could not inspect storage. Check backend configuration.');
const existing = buckets.find((b) => b.id === 'club-news');
if (existing?.public) throw new Error('club-news already exists and is public. Stop and review its ownership.');
if (!existing) {
  const { error: createError } = await db.storage.createBucket('club-news', {
    public: false, fileSizeLimit: 6291456, allowedMimeTypes: ['image/webp'],
  });
  if (createError) throw new Error('Could not create the private news bucket.');
}
console.log('Private club-news bucket is ready. No public upload/read policies are needed.');
