import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('nde_vids')
        .select('videoId, title, intake_status, intake_error, intake_completed_at')
        .in('intake_status', ['failed', 'no_captions', 'not_profound', 'indexing'])
        .order('intake_completed_at', { ascending: false })
        .limit(70);
    
    if (error) {
        console.error(error);
        return;
    }
    
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
