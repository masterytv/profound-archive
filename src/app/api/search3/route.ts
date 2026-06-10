
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { checkRateLimit } from '@/lib/rate-limit';

// Per-IP throttle (S-1): semantic searches bill OpenAI embeddings.
const RATE_LIMIT = { name: 'search3', windowMs: 60_000, max: 30 };

// --- Configuration ---

// Supabase Client (service role for server-side operations)
const getSupabaseClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
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
    const limited = checkRateLimit(req, RATE_LIMIT);
    if (limited) return limited;

    try {
        const { searchTerm, filters, sortBy, page, type = 'keyword', similarity = 0.50 } = await req.json();
        const pageNum = page || 1;
        const perPage = 12;

        console.log(`Executing /search3 (${type}): "${searchTerm}" page ${pageNum}`);

        if (type === 'semantic') {
            return await handleSemanticSearch(searchTerm, filters, pageNum, perPage, similarity, sortBy);
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

// --- Keyword Search (PostgreSQL FTS via Supabase RPC) ---
async function handleKeywordSearch(searchTerm: string, filters: any, sortBy: any, page: number, perPage: number) {
    const supabase = getSupabaseClient();

    // 1. Parse sort
    let sortColumn = 'viewCount';
    let sortDirection = 'DESC';

    if (searchTerm && searchTerm !== '*') {
        sortColumn = 'relevance';
    }

    if (sortBy) {
        const parts = sortBy.split(':');
        if (parts.length === 2) {
            sortColumn = parts[0];
            sortDirection = parts[1].toUpperCase();
        } else {
            sortColumn = sortBy;
        }
    }

    // Map Typesense sort names to our RPC names
    if (sortColumn === '_text_match' || sortColumn === 'text_match') sortColumn = 'relevance';

    // 2. Process filters
    const filterChannelName = filters?.channelName?.length > 0 ? filters.channelName : null;
    const filterExperienceType = filters?.experienceType?.length > 0 ? filters.experienceType : null;
    const filterTriggerCategory = filters?.triggerCategory?.length > 0 ? filters.triggerCategory : null;
    const filterOverallTone = filters?.overallTone?.length > 0 ? filters.overallTone : null;
    const filterMinGreyson = filters?.minGreyson?.length > 0 ? parseInt(filters.minGreyson[0]) : null;
    const filterMinTransformation = filters?.minTransformation?.length > 0 ? parseInt(filters.minTransformation[0]) : null;
    const filterMinVeridical = filters?.minVeridical?.length > 0 ? parseInt(filters.minVeridical[0]) : null;

    // Convert intensityBucket labels to min/max
    let filterIntensityMin = null;
    let filterIntensityMax = null;
    if (filters?.intensityBucket?.length > 0) {
        let min = 10;
        let max = 1;
        if (filters.intensityBucket.includes('Mild')) { min = Math.min(min, 1); max = Math.max(max, 3); }
        if (filters.intensityBucket.includes('Moderate')) { min = Math.min(min, 4); max = Math.max(max, 5); }
        if (filters.intensityBucket.includes('Deep')) { min = Math.min(min, 6); max = Math.max(max, 7); }
        if (filters.intensityBucket.includes('Profound')) { min = Math.min(min, 8); max = Math.max(max, 10); }
        if (min <= max) {
            filterIntensityMin = min;
            filterIntensityMax = max;
        }
    }

    // 3. Execute search via Supabase RPC
    const offset = (page - 1) * perPage;

    const { data, error } = await supabase.rpc('keyword_search_videos', {
        search_query: searchTerm || '*',
        sort_column: sortColumn,
        sort_direction: sortDirection,
        page_limit: perPage,
        page_offset: offset,
        filter_channel_name: filterChannelName,
        filter_experience_type: filterExperienceType,
        filter_trigger_category: filterTriggerCategory,
        filter_overall_tone: filterOverallTone,
        filter_intensity_min: filterIntensityMin,
        filter_intensity_max: filterIntensityMax,
        filter_greyson_min: filterMinGreyson,
        filter_transformation_min: filterMinTransformation,
        filter_veridical_min: filterMinVeridical,
    });

    if (error) {
        console.error('Keyword search RPC error:', error);
        throw error;
    }

    // 4. Get total count from first row (all rows carry it via window function)
    const totalCount = data?.length > 0 ? Number(data[0].total_count) : 0;

    // 5. Format response to match frontend's expected Typesense-like structure
    const hits = (data || []).map((item: any) => ({
        document: {
            id: `${item.video_id}-${item.id}`,
            videoId: item.video_id,
            title: item.title,
            content: item.content,
            channelName: item.channelName,
            isNde: null,
            viewCount: item.viewCount,
            date: item.date ? new Date(item.date).getTime() / 1000 : 0,
            thumbnailUrl: item.thumbnailUrl,
            url: item.url,
            start_time: item.start_time,
            analysis_nde_summary: item.analysis_nde_summary,
        },
        highlights: []
    }));

    // 6. Fetch facet counts
    const facetCounts = await fetchFacets(supabase);

    return NextResponse.json({
        found: totalCount,
        hits,
        facet_counts: facetCounts,
        page,
    });
}

// --- Shared: Fetch Facets from Supabase ---
async function fetchFacets(supabase: any): Promise<any[]> {
    try {
        const { data, error } = await supabase.rpc('keyword_search_facets');
        if (error) {
            console.error('Facet RPC error:', error);
            return [];
        }
        // RPC returns a jsonb array of facet objects
        return data || [];
    } catch (err) {
        console.error('Failed to fetch facets:', err);
        return [];
    }
}

// --- Semantic Search (OpenAI + Supabase Vector RPC) ---
async function handleSemanticSearch(searchTerm: string, filters: any, page: number, perPage: number, similarityThreshold: number, sortBy: any) {
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

    if (sortColumn === '_text_match' || sortColumn === 'text_match') sortColumn = 'similarity';

    // 3. Process filters for Semantic Search RPC
    const filterExperienceType = filters?.experienceType?.length > 0 ? filters.experienceType : null;
    const filterTriggerCategory = filters?.triggerCategory?.length > 0 ? filters.triggerCategory : null;
    const filterOverallTone = filters?.overallTone?.length > 0 ? filters.overallTone : null;
    const filterMinGreyson = filters?.minGreyson?.length > 0 ? parseInt(filters.minGreyson[0]) : null;
    const filterMinTransformation = filters?.minTransformation?.length > 0 ? parseInt(filters.minTransformation[0]) : null;
    const filterMinVeridical = filters?.minVeridical?.length > 0 ? parseInt(filters.minVeridical[0]) : null;

    let filterIntensityMin = null;
    let filterIntensityMax = null;
    if (filters?.intensityBucket?.length > 0) {
        let min = 10;
        let max = 1;
        if (filters.intensityBucket.includes('Mild')) { min = Math.min(min, 1); max = Math.max(max, 3); }
        if (filters.intensityBucket.includes('Moderate')) { min = Math.min(min, 4); max = Math.max(max, 5); }
        if (filters.intensityBucket.includes('Deep')) { min = Math.min(min, 6); max = Math.max(max, 7); }
        if (filters.intensityBucket.includes('Profound')) { min = Math.min(min, 8); max = Math.max(max, 10); }
        if (min <= max) {
            filterIntensityMin = min;
            filterIntensityMax = max;
        }
    }

    // 4. Call RPC
    const offset = (page - 1) * perPage;

    const { data, error } = await supabase.rpc('search_punctuated_embeddings_filtered', {
        query_embedding: embedding,
        similarity_threshold: similarityThreshold,
        sort_column: sortColumn,
        sort_direction: sortDirection,
        page_limit: perPage,
        page_offset: offset,
        filter_experience_type: filterExperienceType,
        filter_trigger_category: filterTriggerCategory,
        filter_overall_tone: filterOverallTone,
        filter_intensity_min: filterIntensityMin,
        filter_intensity_max: filterIntensityMax,
        filter_greyson_min: filterMinGreyson,
        filter_transformation_min: filterMinTransformation,
        filter_veridical_min: filterMinVeridical
    });

    if (error) {
        throw error;
    }

    const hits = data.map((item: any) => ({
        document: {
            id: item.video_id,
            videoId: item.video_id,
            title: item.title,
            content: item.content,
            channelName: item.channelName,
            isNde: null,
            viewCount: item.viewCount,
            date: new Date(item.date).getTime() / 1000,
            thumbnailUrl: item.thumbnailUrl,
            url: item.url,
            start_time: item.start_time,
            analysis_nde_summary: item.analysis_nde_summary,
            similarity: item.similarity
        },
        highlights: []
    }));

    // 5. Fetch facet counts from Supabase (replaces Typesense facet fetch)
    const facetCounts = await fetchFacets(supabase);

    return NextResponse.json({
        found: 100, // Approx — semantic RPC doesn't return total count
        hits: hits,
        facet_counts: facetCounts,
        page: page
    });
}
