import Typesense from 'typesense';
import { createClient } from '@supabase/supabase-js';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

// --- Helper: Fetch all rows from Supabase with Pagination ---
async function fetchAll(supabase: any, table: string, select: string) {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000; // Supabase max limit per request
  
  console.log(`Fetching ${table}...`);
  
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(`Error fetching ${table}: ${error.message}`);
    
    if (!data || data.length === 0) break;
    
    allData.push(...data);
    console.log(`Loaded ${allData.length} rows from ${table}...`);
    
    if (data.length < pageSize) break; // Reached the end
    page++;
  }
  
  return allData;
}

async function main() {
  // --- 1. Validate Env ---
  // Note: On the server, we will use a standard .env file, so standard loading works.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.TYPESENSE_HOST || !process.env.TYPESENSE_API_KEY) {
    throw new Error("Missing env variables. Ensure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, TYPESENSE_HOST, and TYPESENSE_API_KEY are set.");
  }

  // --- 2. Init Clients ---
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const typesense = new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST,
      port: 8108,
      protocol: 'http'
    }],
    apiKey: process.env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 60 // High timeout for large imports
  });

  // --- 3. Reset & Create Collection ---
  const schema: CollectionCreateSchema = {
    name: 'videos',
    fields: [
      { name: 'title', type: 'string' },
      { name: 'content', type: 'string' },
      { name: 'videoId', type: 'string' },
      { name: 'channelName', type: 'string', facet: true },
      { name: 'isNde', type: 'string', facet: true },
      { name: 'viewCount', type: 'int32', sort: true },
      { name: 'date', type: 'int64', sort: true },
      { name: 'thumbnailUrl', type: 'string' },
      { name: 'url', type: 'string' },
      { name: 'start_time', type: 'float' },
    ],
    defaultSortingField: 'viewCount' // Correct CamelCase for JS Client
  };

  try {
    await typesense.collections('videos').delete();
    console.log('Deleted old collection.');
  } catch (e) {}

  await typesense.collections().create(schema);
  console.log('Created new collection.');

  // --- 4. Fetch Data (Paginated) ---
  const videos = await fetchAll(supabase, 'nde_vids', 'videoId, title, url, thumbnailUrl, date, viewCount, channelName, isNde');
  const videoMap = new Map(videos.map((v: any) => [v.videoId, v]));

  // Fetching embeddings could take a while/memory. 
  // ideally we stream this, but for <1M simple rows, memory might hold. 
  // If this crashes on the server, we process in chunks.
  const embeddings = await fetchAll(supabase, 'nde_punctuated_embeddings', 'content, start_time, video_id');

  // --- 5. Transform & Index ---
  console.log('Transforming data...');
  const documents = embeddings
    .filter((e: any) => videoMap.has(e.video_id))
    .map((e: any) => {
      const v = videoMap.get(e.video_id);
      return {
        title: v.title,
        content: e.content,
        videoId: e.video_id,
        channelName: v.channelName,
        isNde: v.isNde,
        viewCount: v.viewCount || 0,
        date: v.date ? Math.floor(new Date(v.date).getTime() / 1000) : 0,
        thumbnailUrl: v.thumbnailUrl,
        url: v.url,
        start_time: e.start_time,
      };
    });

  console.log(`Starting import of ${documents.length} documents to Typesense...`);
  
  // Import in batches using Typesense's optimized importer
  try {
    const results = await typesense.collections('videos').documents().import(documents, { action: 'upsert', batch_size: 2000 });
    const failed = results.filter((r: any) => r.success === false);
    if (failed.length > 0) {
      console.error(`Failed to import ${failed.length} documents.`);
      console.error(failed[0]);
    } else {
      console.log('Success! All documents indexed.');
    }
  } catch (error) {
    console.error('Import failed:', error);
  }
}

main().catch(console.error);
