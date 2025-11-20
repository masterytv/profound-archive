"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typesense_1 = __importDefault(require("typesense"));
const supabase_js_1 = require("@supabase/supabase-js");
// This script reads data from your Supabase database and indexes it in Typesense.
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // --- 1. Initialize Clients ---
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.TYPESENSE_HOST || !process.env.TYPESENSE_API_KEY) {
            throw new Error("Missing required environment variables. Check your .env file in the project root.");
        }
        const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const typesense = new typesense_1.default.Client({
            'nodes': [{
                    'host': process.env.TYPESENSE_HOST,
                    'port': 8108,
                    'protocol': 'http'
                }],
            'apiKey': process.env.TYPESENSE_API_KEY,
            'connectionTimeoutSeconds': 5
        });
        // --- 2. Define the Typesense Collection Schema ---
        const schema = {
            name: 'videos',
            fields: [
                { name: 'title', type: 'string' },
                { name: 'content', type: 'string' },
                { name: 'videoId', type: 'string' },
                { name: 'channelName', type: 'string', 'facet': true },
                { name: 'isNde', type: 'string', 'facet': true },
                { name: 'viewCount', type: 'int32', 'sort': true },
                { name: 'date', type: 'int64', 'sort': true },
                { name: 'thumbnailUrl', type: 'string' },
                { name: 'url', type: 'string' },
                { name: 'start_time', type: 'float' },
            ],
            default_sorting_field: 'viewCount'
        };
        console.log('Checking for existing "videos" collection in Typesense...');
        try {
            yield typesense.collections('videos').delete();
            console.log('Deleted existing collection to ensure a fresh start.');
        }
        catch (error) {
            console.log('No existing collection found, proceeding to create a new one.');
        }
        console.log('Creating new "videos" collection...');
        yield typesense.collections().create(schema);
        console.log('Collection created successfully.');
        // --- 3. Fetch Data from Supabase in Two Steps ---
        // Step A: Fetch all video data and create a lookup map
        console.log('Fetching all video metadata from nde_vids...');
        const { data: videos, error: videosError } = yield supabase
            .from('nde_vids')
            .select('videoId, title, url, thumbnailUrl, date, viewCount, channelName, isNde');
        if (videosError) {
            throw new Error(`Supabase fetch error (nde_vids): ${videosError.message}`);
        }
        const videoMap = new Map(videos.map(v => [v.videoId, v]));
        console.log(`Created a lookup map with ${videoMap.size} videos.`);
        // Step B: Fetch all embeddings
        console.log('Fetching all embeddings from nde_punctuated_embeddings...');
        const { data: embeddings, error: embeddingsError } = yield supabase
            .from('nde_punctuated_embeddings')
            .select('content, start_time, video_id');
        if (embeddingsError) {
            throw new Error(`Supabase fetch error (nde_punctuated_embeddings): ${embeddingsError.message}`);
        }
        if (!embeddings || embeddings.length === 0) {
            console.log('No embeddings found in Supabase to index.');
            return;
        }
        console.log(`Fetched ${embeddings.length} embeddings.`);
        // --- 4. Transform and Index Data ---
        console.log('Transforming and joining data for Typesense...');
        const typesenseDocs = embeddings.map((embedding) => {
            const videoDetails = videoMap.get(embedding.video_id);
            // If there are no video details for this embedding, skip it.
            if (!videoDetails) {
                return null;
            }
            return {
                title: videoDetails.title,
                content: embedding.content,
                videoId: embedding.video_id,
                channelName: videoDetails.channelName,
                isNde: videoDetails.isNde,
                viewCount: videoDetails.viewCount || 0,
                date: videoDetails.date ? Math.floor(new Date(videoDetails.date).getTime() / 1000) : 0,
                thumbnailUrl: videoDetails.thumbnailUrl,
                url: videoDetails.url,
                start_time: embedding.start_time,
            };
        }).filter(doc => doc !== null); // Filter out any null entries
        console.log(`Processing ${typesenseDocs.length} valid documents for indexing...`);
        try {
            yield typesense.collections('videos').documents().import(typesenseDocs, { action: 'create', batch_size: 100 });
            console.log('Data indexed successfully!');
        }
        catch (err) {
            console.error('Error indexing documents:', err.importResults);
        }
    });
}
main().catch(console.error);
//# sourceMappingURL=index-data.js.map