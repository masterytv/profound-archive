import fs from 'fs';

// Parse .env.local manually
const env = fs.readFileSync('.env.local', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) acc[match[1]] = match[2];
    return acc;
  }, {});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY;

async function run() {
  const url = `${SUPABASE_URL}/rest/v1/nde_vids?intake_status=in.(failed,no_captions,indexing,not_profound)&select=videoId,title,intake_status,intake_error,intake_completed_at&order=intake_completed_at.desc&limit=70`;
  
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) {
    console.error('Error fetching:', await res.text());
    return;
  }

  const data = await res.json();
  const counts = {};
  
  for (const row of data) {
    let errSnippet = row.intake_error || 'No error message';
    if (errSnippet.length > 100) errSnippet = errSnippet.substring(0, 100) + '...';
    console.log(`[${row.intake_status}] ${row.videoId} - ${errSnippet}`);
    counts[row.intake_status] = (counts[row.intake_status] || 0) + 1;
  }
  
  console.log('\nSummary of last 70 items:', counts);
}
run();
