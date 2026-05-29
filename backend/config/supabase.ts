import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('❌ SUPABASE_URL et SUPABASE_SERVICE_KEY requis dans .env');
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ws = require('ws');

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  }
);