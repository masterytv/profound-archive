import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { generateExperiencerProfile } from '../src/lib/pipeline/experiencer-profile';

async function main() {
    // Read .env.local
    const envContent = readFileSync('.env.local', 'utf-8');
    for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!
    );

    const { data: profiles } = await supabase
        .from('experiencer_profiles')
        .select('id, full_name')
        .not('published_at', 'is', null)
        .order('id');

    console.log(`\nEnriching ${profiles?.length ?? 0} profiles...\n`);

    for (const p of profiles || []) {
        console.log(`${p.full_name} (ID: ${p.id})...`);
        const result = await generateExperiencerProfile(supabase, p.id);
        console.log(`  → ${result.status}: ${result.message}\n`);
    }

    console.log('Done!');
}

main().catch(console.error);
