// Polyfill WebSocket Node.js 18
if (typeof (global as any).WebSocket === 'undefined') { (global as any).WebSocket = require('ws'); }

import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('❌ SUPABASE_URL et SUPABASE_SERVICE_KEY requis dans .env');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: {} },
    db: { schema: 'public' },
    realtime: { timeout: 0 },
  }
);
