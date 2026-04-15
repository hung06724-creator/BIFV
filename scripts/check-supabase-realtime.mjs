import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function parseEnv(path) {
  const out = new Map();
  const text = fs.readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    out.set(trimmed.slice(0, i), trimmed.slice(i + 1));
  }
  return out;
}

async function main() {
  if (!fs.existsSync('.env.local')) {
    throw new Error('Missing .env.local');
  }

  const env = parseEnv('.env.local');
  const url = env.get('VITE_SUPABASE_URL');
  const key = env.get('VITE_SUPABASE_PUBLISHABLE_KEY');

  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const probeKey = `realtime_probe_${Date.now()}`;
  const updatedAt = new Date().toISOString();
  let writeError = null;

  const channel = supabase.channel('probe-realtime-relational');

  const result = await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 8000);

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
        const nextKey = payload?.new?.key;
        const oldKey = payload?.old?.key;
        if (nextKey === probeKey || oldKey === probeKey) {
          clearTimeout(timeout);
          resolve(true);
        }
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        const { error } = await supabase
          .from('app_settings')
          .upsert([{ key: probeKey, value: { probe: true, at: updatedAt } }], { onConflict: 'key' });

        if (error) {
          writeError = `Write failed: ${error.message}`;
          clearTimeout(timeout);
          resolve(false);
        }
      });
  });

  await supabase.from('app_settings').delete().eq('key', probeKey);
  await supabase.removeChannel(channel);

  if (writeError) {
    console.error(writeError);
    process.exit(1);
  }

  if (!result) {
    console.error('REALTIME_CHECK_FAIL: no postgres_changes event received within timeout.');
    process.exit(2);
  }

  console.log('REALTIME_CHECK_OK: postgres_changes event received on relational tables.');
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
