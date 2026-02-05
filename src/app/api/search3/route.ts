
import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// --- Configuration ---

// Typesense Client
const getTypesenseClient = () => {
    const host = process.env.TYPESENSE_HOST;
    const apiKey = process.env.TYPESENSE_API_KEY;
    const protocol = process.env.TYPESENSE_PROTOCOL || 'http';
    const port = parseInt(process.env.TYPESENSE_PORT || '8108', 10);

    if (!host || !apiKey) {
        throw new Error("Missing Typesense configuration");
    }

    return new Typesense.Client({
        nodes: [{ host, port, protocol }],
        apiKey,
        connectionTimeoutSeconds: 5
    });
};

// Supabase Client (Service Role for search? Or standard client depending on permissions)
// For generic operations, createClient from utils is synonymous with client-side or anon.
// However, api routes safely run server-side.
const getSupabaseClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Prefer Service Key for server-side operations to bypass RLS
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
    }
    return createClient(supabaseUrl, supabaseKey);
};

// OpenAI Client
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OpenAI API Key");
    }
    return new OpenAI({ apiKey });
};


export async function POST(req: NextRequest) {
    try {
        const { searchTerm, filters, sortBy, page, type = 'keyword', similarity = 0.50 } = await req.json();
        const pageNum = page || 1;
        const perPage = 12; // Standardize page size

        console.log(`Executing /search3 (${type}): "${searchTerm}" page ${pageNum}`);

        if (type === 'semantic') {
            return await handleSemanticSearch(searchTerm, pageNum, perPage, similarity, sortBy);
        } else {
            return await handleKeywordSearch(searchTerm, filters, sortBy, pageNum, perPage);
        }

    } catch (error: any) {
        console.error('Search API Error:', error);
        return NextResponse.json(
            { message: "Search failed", error: error.message },
            { status: 500 }
        );
    }
}

// --- Keyword Search (Typesense + Supabase Summary Enrichment) ---
async function handleKeywordSearch(searchTerm: string, filters: any, sortBy: any, page: number, perPage: number) {
    const typesense = getTypesenseClient();

    // 1. Prepare Filters
    const filterConditions = Object.entries(filters || {})
        .filter(([field, values]) => Array.isArray(values) && values.length > 0)
        .map(([field, values]) => {
            const fieldValues = (values as string[]).map(v => `\`${v}\``).join(', ');
            return `${field}:=[${fieldValues}]`;
        })
        .join(' && ');

    // 2. Prepare Sort
    let sortQuery = 'viewCount:desc';
    if (searchTerm && searchTerm !== '*') {
        sortQuery = '_text_match:desc';
    }
    if (sortBy) {
        const [field, dir] = sortBy.split(':');
        // Handle mapped sorts if they differ from Typesense fields
        sortQuery = sortBy;
    }

    const searchParameters = {
        'q': searchTerm || '*',
        'query_by': 'content,title',
        'page': page,
        'per_page': perPage,
        'facet_by': 'channelName,isNde',
        'filter_by': filterConditions,
        'sort_by': sortQuery,
        'max_facet_values': 100,
    };

    // 3. Execute Typesense Search
    const searchResults: any = await typesense.collections('videos').documents().search(searchParameters);

    // 4. Enrich with Summaries from Supabase
    // Extract video IDs from hits
    const hits = searchResults.hits || [];
    const videoIds = hits.map((hit: any) => hit.document.videoId);

    if (videoIds.length > 0) {
        const supabase = getSupabaseClient();
        const { data: summaries, error } = await supabase
            .from('nde_vids')
            .select('videoId, analysis_nde_summary')
            .in('videoId', videoIds);

        if (!error && summaries) {
            // Map summaries to hits
            const summaryMap = new Map(summaries.map((s: any) => [s.videoId, s.analysis_nde_summary]));
            hits.forEach((hit: any) => {
                const summary = summaryMap.get(hit.document.videoId);
                if (summary) {
                    hit.document.analysis_nde_summary = summary;
                }
            });
        } else if (error) {
            console.error("Error fetching summaries:", error);
        }
    }

    return NextResponse.json(searchResults);
}

// --- Semantic Search (OpenAI + Supabase Vector RPC) ---
async function handleSemanticSearch(searchTerm: string, page: number, perPage: number, similarityThreshold: number, sortBy: any) {
    const supabase = getSupabaseClient();
    const openai = getOpenAIClient();

    // 1. Generate Embedding
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: searchTerm,
        encoding_format: "float",
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 2. Determine Sort
    // Frontend passes "viewCount:desc", RPC expects "viewCount", "DESC"
    let sortColumn = 'similarity';
    let sortDirection = 'DESC';

    if (sortBy) {
        const parts = sortBy.split(':');
        if (parts.length === 2) {
            sortColumn = parts[0];
            sortDirection = parts[1].toUpperCase();
        } else {
            sortColumn = sortBy;
        }
    }

    if (sortColumn === '_text_match') sortColumn = 'similarity'; // Map typesense sort to supabase sort

    // 3. Call RPC
    const offset = (page - 1) * perPage;

    const { data, error } = await supabase.rpc('search_punctuated_embeddings', {
        query_embedding: embedding,
        similarity_threshold: similarityThreshold,
        sort_column: sortColumn,
        sort_direction: sortDirection,
        page_limit: perPage,
        page_offset: offset
    });

    if (error) {
        throw error;
    }

    // 4. Format response to match Typesense structure (roughly) to re-use frontend components if possible
    // But frontend expecting "hits" structure or can adapt.
    // Let's return a unified structure if possible? 
    // Actually the frontend for /search2 expects specific Typesense structure.
    // Let's mimic it for the hits.

    const hits = data.map((item: any) => ({
        document: {
            id: item.video_id, // Map for key
            videoId: item.video_id,
            title: item.title,
            content: item.content,
            channelName: item.channelName,
            isNde: null, // Data not available in this RPC return
            viewCount: item.viewCount,
            date: new Date(item.date).getTime() / 1000, // Typesense expects unix timestamp in seconds
            thumbnailUrl: item.thumbnailUrl,
            url: item.url,
            start_time: item.start_time,
            analysis_nde_summary: item.analysis_nde_summary,
            // Extra fields for semantic display
            similarity: item.similarity
        },
        highlights: [] // No highlights for vector search
    }));

    return NextResponse.json({
        found: 100, // Approx or just indicate there are results. RPC doesn't return count.
        hits: hits,
        facet_counts: [], // No facets in semantic mode yet
        page: page
    });
}
