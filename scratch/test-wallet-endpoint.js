import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    env[key] = val;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Call function without auth header (should return 401 Unauthorized)
  try {
    const { data, error } = await supabase.functions.invoke('complete-wallet-payment', {
      body: { order_id: 'ac2ce6fd-b3aa-469e-8935-be114e2eb562' }
    });
    console.log('Result Data:', data);
    console.log('Result Error:', error);
    if (error) {
      console.log('Error context:', error.message);
      // Let's inspect the actual response from error if available
    }
  } catch (err) {
    console.error('Caught exception:', err);
  }
}

run();
