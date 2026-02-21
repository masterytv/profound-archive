import Typesense from 'typesense';
import { createClient } from '@supabase/supabase-js';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// --- Helper: Fetch all rows for small tables (Offset is OK for < 10k rows) ---
async function fetchSmallTable(supabase: any, table: string, select: string) {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  console.log(`Fetching ${table}...`);
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(`Error fetching ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return allData;
}

// --- Helper: Bucket intensity rating into filterable labels ---
function bucketIntensity(rating: number | null | undefined): string {
  if (rating == null) return 'Unknown';
  if (rating >= 8) return 'Profound';
  if (rating >= 6) return 'Deep';
  if (rating >= 4) return 'Moderate';
  return 'Mild';
}

async function main() {
  // --- 1. Validate Env ---
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.TYPESENSE_HOST || !process.env.TYPESENSE_API_KEY) {
    throw new Error("Missing env variables. Ensure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, TYPESENSE_HOST, and TYPESENSE_API_KEY are set.");
  }

  // --- 2. Init Clients ---
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const typesense = new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST,
      'port': 8108,
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
      // Phase 2: NDE analysis facets
      { name: 'experienceType', type: 'string', facet: true, optional: true },
      { name: 'triggerCategory', type: 'string', facet: true, optional: true },
      { name: 'overallTone', type: 'string', facet: true, optional: true },
      { name: 'intensityBucket', type: 'string', facet: true, optional: true },
      { name: 'greysonScore', type: 'int32', optional: true },
      { name: 'transformationScore', type: 'int32', optional: true },
      { name: 'veridicalScore', type: 'int32', optional: true },
    ],
    default_sorting_field: 'viewCount'
  };

  try {
    await typesense.collections('videos').delete();
    console.log('Deleted old collection.');
  } catch (e) { }

  await typesense.collections().create(schema);
  console.log('Created new collection.');

  // --- 4. Fetch Base Data (Paginated) ---
  const videos = await fetchSmallTable(supabase, 'nde_vids', 'videoId, title, url, thumbnailUrl, date, viewCount, channelName, isNde, rvnde_total_score');
  const videoMap = new Map(videos.map((v: any) => [v.videoId, v]));

  // Phase 2: Fetch NDE analysis data for facets
  const analyses = await fetchSmallTable(supabase, 'nde_analysis', 'video_id, experience_type, trigger_category, overall_tone, intensity_rating, total_greyson_score, transformation_score');
  const analysisMap = new Map(analyses.map((a: any) => [a.video_id, a]));
  console.log(`Loaded ${analyses.length} analysis records for faceting.`);

  // --- 5. Stream Huge Table (Cursor-based Pagination) ---
  console.log('Streaming transcript chunks to Typesense in batches...');
  let lastId = 0;
  const batchSize = 1000;
  let totalProcessed = 0;

  while (true) {
    const { data: embeddings, error } = await supabase
      .from('nde_punctuated_embeddings')
      .select('id, content, start_time, video_id')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(batchSize);

    if (error) throw new Error(`Error reading embeddings: ${error.message}`);
    if (!embeddings || embeddings.length === 0) break;

    // Update lastId for next iteration
    lastId = embeddings[embeddings.length - 1].id;

    // Transform batch
    const documents = embeddings
      .filter((e: any) => videoMap.has(e.video_id))
      .map((e: any) => {
        const v = videoMap.get(e.video_id);
        const analysis = analysisMap.get(e.video_id);
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
          // Phase 2: NDE analysis facets
          experienceType: analysis?.experience_type || 'Unknown',
          triggerCategory: analysis?.trigger_category || 'Unknown',
          overallTone: analysis?.overall_tone || 'Unknown',
          intensityBucket: bucketIntensity(analysis?.intensity_rating),
          greysonScore: typeof analysis?.total_greyson_score === 'number' ? Math.round(analysis.total_greyson_score) : null,
          transformationScore: typeof analysis?.transformation_score === 'number' ? Math.round(analysis.transformation_score) : null,
          veridicalScore: typeof v.rvnde_total_score === 'number' ? Math.round(v.rvnde_total_score) : null,
        };
      });

    if (documents.length > 0) {
      try {
        const results = await typesense.collections('videos').documents().import(documents, { action: 'upsert' });
        const failed = results.filter((r: any) => r.success === false);
        if (failed.length > 0) {
          console.error(`Failed to import ${failed.length} docs in batch. Example err:`, failed[0]);
        }
      } catch (err: any) {
        console.error('Batch import failed:', err.message);
      }
    }

    totalProcessed += embeddings.length;
    console.log(`Processed ${totalProcessed} rows...`);
  }

  console.log('Success! Stream indexing complete.');
}

main().catch(console.error);
