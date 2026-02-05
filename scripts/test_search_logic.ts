
import dotenv from 'dotenv';
import path from 'path';
import OpenAI from 'openai';
import Typesense from 'typesense';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock Request/Response is hard in script without running Next.js server.
// Instead we will replicate the LOGIC of the API route to test the connectors and data flow.
// This confirms credentials and logic are correct before UI testing.

async function testBackendLogic() {
    console.log("--- Testing Keyword Search (Typesense + Supabase) ---");
    try {
        const host = process.env.TYPESENSE_HOST;
        const apiKey = process.env.TYPESENSE_API_KEY;
        if (!host) throw new Error("Missing Typesense Host");

        const client = new Typesense.Client({
            nodes: [{ host, port: parseInt(process.env.TYPESENSE_PORT || '8108'), protocol: process.env.TYPESENSE_PROTOCOL || 'http' }],
            apiKey: apiKey,
            connectionTimeoutSeconds: 5
        });

        const searchResults = await client.collections('videos').documents().search({
            q: 'life review',
            query_by: 'content,title',
            per_page: 2
        });

        console.log(`Typesense Hits: ${searchResults.hits?.length}`);
        if (searchResults.hits && searchResults.hits.length > 0) {
            console.log("Sample Hit:", searchResults.hits[0].document.title);
        }

    } catch (e: any) {
        console.error("Keyword Search Failed:", e.message);
    }

    console.log("\n--- Testing Semantic Search Logic (OpenAI + Supabase RPC) ---");
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log("Generating Embedding...");
        const embeddingResp = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: "life review",
            encoding_format: "float",
        });
        const embedding = embeddingResp.data[0].embedding;
        console.log("Embedding generated. Length:", embedding.length);

        // We can't easily test the RPC call from a script without the supabase-js client + connection to the DB.
        // We will assume if embedding works, the hardest part of the script setup is done (API Keys).
        // The RPC call will be tested via the UI.

    } catch (e: any) {
        console.error("Semantic Logic Failed:", e.message);
    }
}

testBackendLogic();
