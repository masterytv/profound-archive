export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "12.2.3 (519615d)"
    }
    public: {
        Tables: {
            collections: {
                Row: {
                    created_at: string | null
                    description: string | null
                    id: number
                    name: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    id?: number
                    name: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    id?: number
                    name?: string
                    user_id?: string
                }
                Relationships: []
            }
            favorites: {
                Row: {
                    collection_id: number
                    content: string | null
                    created_at: string | null
                    id: number
                    start_time: number | null
                    user_id: string
                    video_id: string
                    video_thumbnail_url: string | null
                    video_title: string | null
                }
                Insert: {
                    collection_id: number
                    content?: string | null
                    created_at?: string | null
                    id?: number
                    start_time?: number | null
                    user_id: string
                    video_id: string
                    video_thumbnail_url?: string | null
                    video_title?: string | null
                }
                Update: {
                    collection_id?: number
                    content?: string | null
                    created_at?: string | null
                    id?: number
                    start_time?: number | null
                    user_id?: string
                    video_id?: string
                    video_thumbnail_url?: string | null
                    video_title?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "favorites_collection_id_fkey"
                        columns: ["collection_id"]
                        isOneToOne: false
                        referencedRelation: "collections"
                        referencedColumns: ["id"]
                    },
                ]
            }
            n8n_chat_histories: {
                Row: {
                    id: number
                    message: Json
                    session_id: string
                }
                Insert: {
                    id?: number
                    message: Json
                    session_id: string
                }
                Update: {
                    id?: number
                    message?: Json
                    session_id?: string
                }
                Relationships: []
            }
            nde_analysis: {
                Row: {
                    analysis_report_html: string | null
                    cleaned_transcript: string | null
                    greyson_breakdown: Json | null
                    intensity_level: string | null
                    meets_cutoff_criteria: boolean | null
                    meets_nde_criteria: boolean | null
                    nde_c_breakdown: Json | null
                    primary_phenomenology: string | null
                    scale_agreement: string | null
                    total_greyson_score: number | null
                    total_nde_c_score: number | null
                    video_id: string
                }
                Insert: {
                    analysis_report_html?: string | null
                    cleaned_transcript?: string | null
                    greyson_breakdown?: Json | null
                    intensity_level?: string | null
                    meets_cutoff_criteria?: boolean | null
                    meets_nde_criteria?: boolean | null
                    nde_c_breakdown?: Json | null
                    primary_phenomenology?: string | null
                    scale_agreement?: string | null
                    total_greyson_score?: number | null
                    total_nde_c_score?: number | null
                    video_id: string
                }
                Update: {
                    analysis_report_html?: string | null
                    cleaned_transcript?: string | null
                    greyson_breakdown?: Json | null
                    intensity_level?: string | null
                    meets_cutoff_criteria?: boolean | null
                    meets_nde_criteria?: boolean | null
                    nde_c_breakdown?: Json | null
                    primary_phenomenology?: string | null
                    scale_agreement?: string | null
                    total_greyson_score?: number | null
                    total_nde_c_score?: number | null
                    video_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "fk_video"
                        columns: ["video_id"]
                        isOneToOne: true
                        referencedRelation: "clear_nde_with_names"
                        referencedColumns: ["videoId"]
                    },
                    {
                        foreignKeyName: "fk_video"
                        columns: ["video_id"]
                        isOneToOne: true
                        referencedRelation: "nde_vids"
                        referencedColumns: ["videoId"]
                    },
                ]
            }
            nde_chat_logs: {
                Row: {
                    chat_page: string | null
                    created_at: string
                    id: number
                    message: string | null
                    metadata: Json | null
                    sender: string
                    session_id: string
                }
                Insert: {
                    chat_page?: string | null
                    created_at?: string
                    id?: number
                    message?: string | null
                    metadata?: Json | null
                    sender: string
                    session_id: string
                }
                Update: {
                    chat_page?: string | null
                    created_at?: string
                    id?: number
                    message?: string | null
                    metadata?: Json | null
                    sender?: string
                    session_id?: string
                }
                Relationships: []
            }
            nde_chatbot_chunks: {
                Row: {
                    content: string | null
                    embedding: string | null
                    id: number
                    metadata: Json | null
                    video_id: string | null
                }
                Insert: {
                    content?: string | null
                    embedding?: string | null
                    id?: number
                    metadata?: Json | null
                    video_id?: string | null
                }
                Update: {
                    content?: string | null
                    embedding?: string | null
                    id?: number
                    metadata?: Json | null
                    video_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "nde_chatbot_chunks_video_id_fkey"
                        columns: ["video_id"]
                        isOneToOne: false
                        referencedRelation: "clear_nde_with_names"
                        referencedColumns: ["videoId"]
                    },
                    {
                        foreignKeyName: "nde_chatbot_chunks_video_id_fkey"
                        columns: ["video_id"]
                        isOneToOne: false
                        referencedRelation: "nde_vids"
                        referencedColumns: ["videoId"]
                    },
                ]
            }
            nde_punctuated_embeddings: {
                Row: {
                    content: string | null
                    embedding: string | null
                    id: number
                    start_time: number | null
                    video_id: string | null
                }
                Insert: {
                    content?: string | null
                    embedding?: string | null
                    id?: number
                    start_time?: number | null
                    video_id?: string | null
                }
                Update: {
                    content?: string | null
                    embedding?: string | null
                    id?: number
                    start_time?: number | null
                    video_id?: string | null
                }
                Relationships: []
            }
            nde_vids: {
                Row: {
                    analysis_ai_model_used: string | null
                    analysis_generated_timestamp: string | null
                    analysis_human_reviewed: boolean | null
                    analysis_nde_summary: string | null
                    analysis_nde_tags: Json | null
                    analysis_researcher_notes: string | null
                    analysis_status: string | null
                    channelId: string | null
                    channelName: string | null
                    channelUrl: string | null
                    channelUsername: string | null
                    commentsCount: number | null
                    created_at: string
                    date: string | null
                    description: string | null
                    duration: string | null
                    embed_status: string
                    experiencerFullName: string | null
                    greyson_score: string | null
                    isNde: Database["public"]["Enums"]["is_nde_options"] | null
                    isNdeJustification: string | null
                    likes: number | null
                    location: string | null
                    nde_analysis_html: string | null
                    nde_c_score: string | null
                    numberOfSubscribers: number | null
                    raw_timestamped_punctuated: Json | null
                    raw_timestamped_subtitles: Json | null
                    raw_timestamped_subtitles_cleaned: Json | null
                    rvnde_details: Json | null
                    rvnde_level: string | null
                    rvnde_status: string | null
                    rvnde_summary_reason: string | null
                    rvnde_total_score: number | null
                    subtitles: string | null
                    subtitles_cleaned: string | null
                    subtitles_embedding: string | null
                    subtitles_punctuated: string | null
                    thumbnailUrl: string | null
                    timestamped_embedding_status: string | null
                    title: string | null
                    type: string | null
                    url: string | null
                    videoId: string
                    viewCount: number | null
                }
                Insert: {
                    analysis_ai_model_used?: string | null
                    analysis_generated_timestamp?: string | null
                    analysis_human_reviewed?: boolean | null
                    analysis_nde_summary?: string | null
                    analysis_nde_tags?: Json | null
                    analysis_researcher_notes?: string | null
                    analysis_status?: string | null
                    channelId?: string | null
                    channelName?: string | null
                    channelUrl?: string | null
                    channelUsername?: string | null
                    commentsCount?: number | null
                    created_at?: string
                    date?: string | null
                    description?: string | null
                    duration?: string | null
                    embed_status?: string
                    experiencerFullName?: string | null
                    greyson_score?: string | null
                    isNde?: Database["public"]["Enums"]["is_nde_options"] | null
                    isNdeJustification?: string | null
                    likes?: number | null
                    location?: string | null
                    nde_analysis_html?: string | null
                    nde_c_score?: string | null
                    numberOfSubscribers?: number | null
                    raw_timestamped_punctuated?: Json | null
                    raw_timestamped_subtitles?: Json | null
                    raw_timestamped_subtitles_cleaned?: Json | null
                    rvnde_details?: Json | null
                    rvnde_level?: string | null
                    rvnde_status?: string | null
                    rvnde_summary_reason?: string | null
                    rvnde_total_score?: number | null
                    subtitles?: string | null
                    subtitles_cleaned?: string | null
                    subtitles_embedding?: string | null
                    subtitles_punctuated?: string | null
                    thumbnailUrl?: string | null
                    timestamped_embedding_status?: string | null
                    title?: string | null
                    type?: string | null
                    url?: string | null
                    videoId: string
                    viewCount?: number | null
                }
                Update: {
                    analysis_ai_model_used?: string | null
                    analysis_generated_timestamp?: string | null
                    analysis_human_reviewed?: boolean | null
                    analysis_nde_summary?: string | null
                    analysis_nde_tags?: Json | null
                    analysis_researcher_notes?: string | null
                    analysis_status?: string | null
                    channelId?: string | null
                    channelName?: string | null
                    channelUrl?: string | null
                    channelUsername?: string | null
                    commentsCount?: number | null
                    created_at?: string
                    date?: string | null
                    description?: string | null
                    duration?: string | null
                    embed_status?: string
                    experiencerFullName?: string | null
                    greyson_score?: string | null
                    isNde?: Database["public"]["Enums"]["is_nde_options"] | null
                    isNdeJustification?: string | null
                    likes?: number | null
                    location?: string | null
                    nde_analysis_html?: string | null
                    nde_c_score?: string | null
                    numberOfSubscribers?: number | null
                    raw_timestamped_punctuated?: Json | null
                    raw_timestamped_subtitles?: Json | null
                    raw_timestamped_subtitles_cleaned?: Json | null
                    rvnde_details?: Json | null
                    rvnde_level?: string | null
                    rvnde_status?: string | null
                    rvnde_summary_reason?: string | null
                    rvnde_total_score?: number | null
                    subtitles?: string | null
                    subtitles_cleaned?: string | null
                    subtitles_embedding?: string | null
                    subtitles_punctuated?: string | null
                    thumbnailUrl?: string | null
                    timestamped_embedding_status?: string | null
                    title?: string | null
                    type?: string | null
                    url?: string | null
                    videoId?: string
                    viewCount?: number | null
                }
                Relationships: []
            }
            nps_feedback: {
                Row: {
                    country_code: string | null
                    created_at: string
                    feedback: string | null
                    id: string
                    path: string | null
                    score: number
                }
                Insert: {
                    country_code?: string | null
                    created_at?: string
                    feedback?: string | null
                    id?: string
                    path?: string | null
                    score: number
                }
                Update: {
                    country_code?: string | null
                    created_at?: string
                    feedback?: string | null
                    id?: string
                    path?: string | null
                    score?: number
                }
                Relationships: []
            }
            precog_trials: {
                Row: {
                    actual_result: string | null
                    ai_guess: string | null
                    experiment_id: string | null
                    id: string
                    is_control: boolean | null
                    is_correct: boolean | null
                    model_name: string | null
                    prompt_text: string | null
                    prompt_version: number | null
                    timestamp: string | null
                    trial_group: string | null
                }
                Insert: {
                    actual_result?: string | null
                    ai_guess?: string | null
                    experiment_id?: string | null
                    id?: string
                    is_control?: boolean | null
                    is_correct?: boolean | null
                    model_name?: string | null
                    prompt_text?: string | null
                    prompt_version?: number | null
                    timestamp?: string | null
                    trial_group?: string | null
                }
                Update: {
                    actual_result?: string | null
                    ai_guess?: string | null
                    experiment_id?: string | null
                    id?: string
                    is_control?: boolean | null
                    is_correct?: boolean | null
                    model_name?: string | null
                    prompt_text?: string | null
                    prompt_version?: number | null
                    timestamp?: string | null
                    trial_group?: string | null
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    full_name: string | null
                    id: string
                    is_banned: boolean | null
                    role: string
                }
                Insert: {
                    avatar_url?: string | null
                    full_name?: string | null
                    id: string
                    is_banned?: boolean | null
                    role?: string
                }
                Update: {
                    avatar_url?: string | null
                    full_name?: string | null
                    id?: string
                    is_banned?: boolean | null
                    role?: string
                }
                Relationships: []
            }
            saved_searches: {
                Row: {
                    created_at: string | null
                    id: number
                    search_name: string | null
                    search_term: string
                    search_type: string
                    similarity_threshold: number | null
                    sort_by: string
                    sort_direction: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: number
                    search_name?: string | null
                    search_term: string
                    search_type?: string
                    similarity_threshold?: number | null
                    sort_by?: string
                    sort_direction?: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: number
                    search_name?: string | null
                    search_term?: string
                    search_type?: string
                    similarity_threshold?: number | null
                    sort_by?: string
                    sort_direction?: string
                    user_id?: string
                }
                Relationships: []
            }
            search_logs: {
                Row: {
                    created_at: string
                    id: number
                    results_count: number | null
                    search_term: string | null
                    search_type: string | null
                    similarity_threshold: number | null
                    sort_column: string | null
                    sort_direction: string | null
                }
                Insert: {
                    created_at?: string
                    id?: number
                    results_count?: number | null
                    search_term?: string | null
                    search_type?: string | null
                    similarity_threshold?: number | null
                    sort_column?: string | null
                    sort_direction?: string | null
                }
                Update: {
                    created_at?: string
                    id?: number
                    results_count?: number | null
                    search_term?: string | null
                    search_type?: string | null
                    similarity_threshold?: number | null
                    sort_column?: string | null
                    sort_direction?: string | null
                }
                Relationships: []
            }
            uap_embeddings: {
                Row: {
                    content: string | null
                    embedding: string | null
                    id: number
                    start_time: number | null
                    video_id: string | null
                }
                Insert: {
                    content?: string | null
                    embedding?: string | null
                    id?: number
                    start_time?: number | null
                    video_id?: string | null
                }
                Update: {
                    content?: string | null
                    embedding?: string | null
                    id?: number
                    start_time?: number | null
                    video_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "uap_embeddings_video_id_fkey"
                        columns: ["video_id"]
                        isOneToOne: false
                        referencedRelation: "uap_vids"
                        referencedColumns: ["video_id"]
                    },
                ]
            }
            uap_vids: {
                Row: {
                    channel_id: string | null
                    channel_name: string | null
                    channel_url: string | null
                    channel_username: string | null
                    comments_count: number | null
                    created_at: string | null
                    date: string | null
                    description: string | null
                    duration: string | null
                    likes: number | null
                    location: string | null
                    raw_timestamped_punctuated: Json | null
                    raw_timestamped_subtitles: Json | null
                    subscriber_count: number | null
                    thumbnail_url: string | null
                    timestamped_embedding_status: string
                    timestamped_punctuation_status: string
                    title: string | null
                    type: string | null
                    url: string | null
                    video_id: string
                    view_count: number | null
                }
                Insert: {
                    channel_id?: string | null
                    channel_name?: string | null
                    channel_url?: string | null
                    channel_username?: string | null
                    comments_count?: number | null
                    created_at?: string | null
                    date?: string | null
                    description?: string | null
                    duration?: string | null
                    likes?: number | null
                    location?: string | null
                    raw_timestamped_punctuated?: Json | null
                    raw_timestamped_subtitles?: Json | null
                    subscriber_count?: number | null
                    thumbnail_url?: string | null
                    timestamped_embedding_status?: string
                    timestamped_punctuation_status?: string
                    title?: string | null
                    type?: string | null
                    url?: string | null
                    video_id: string
                    view_count?: number | null
                }
                Update: {
                    channel_id?: string | null
                    channel_name?: string | null
                    channel_url?: string | null
                    channel_username?: string | null
                    comments_count?: number | null
                    created_at?: string | null
                    date?: string | null
                    description?: string | null
                    duration?: string | null
                    likes?: number | null
                    location?: string | null
                    raw_timestamped_punctuated?: Json | null
                    raw_timestamped_subtitles?: Json | null
                    subscriber_count?: number | null
                    thumbnail_url?: string | null
                    timestamped_embedding_status?: string
                    timestamped_punctuation_status?: string
                    title?: string | null
                    type?: string | null
                    url?: string | null
                    video_id?: string
                    view_count?: number | null
                }
                Relationships: []
            }
        }
        Views: {
            clear_nde_with_names: {
                Row: {
                    channelName: string | null
                    channelUsername: string | null
                    created_at: string | null
                    date: string | null
                    description: string | null
                    experiencerFullName: string | null
                    isNde: Database["public"]["Enums"]["is_nde_options"] | null
                    isNdeJustification: string | null
                    subtitles: string | null
                    subtitles_embedding: string | null
                    title: string | null
                    url: string | null
                    videoId: string | null
                }
                Insert: {
                    channelName?: string | null
                    channelUsername?: string | null
                    created_at?: string | null
                    date?: string | null
                    description?: string | null
                    experiencerFullName?: string | null
                    isNde?: Database["public"]["Enums"]["is_nde_options"] | null
                    isNdeJustification?: string | null
                    subtitles?: string | null
                    subtitles_embedding?: string | null
                    title?: string | null
                    url?: string | null
                    videoId?: string | null
                }
                Update: {
                    channelName?: string | null
                    channelUsername?: string | null
                    created_at?: string | null
                    date?: string | null
                    description?: string | null
                    experiencerFullName?: string | null
                    isNde?: Database["public"]["Enums"]["is_nde_options"] | null
                    isNdeJustification?: string | null
                    subtitles?: string | null
                    subtitles_embedding?: string | null
                    title?: string | null
                    url?: string | null
                    videoId?: string | null
                }
                Relationships: []
            }
        }
        Functions: {
            analyze_term_in_clear_ndes: {
                Args: { p_search_term: string }
                Returns: {
                    percentage_with_term: number
                    total_clear_nde_videos: number
                    total_term_mentions: number
                    videos_mentioning_term: number
                }[]
            }
            clean_subtitle_data: { Args: { raw_data: Json }; Returns: Json }
            clean_subtitles: { Args: { raw_jsonb: Json }; Returns: Json }
            debug_reverse_search: {
                Args: { subtitle_id_to_search: number }
                Returns: {
                    content: string
                    similarity: number
                }[]
            }
            debug_search_concentration: {
                Args: { query_embedding: string }
                Returns: {
                    unique_video_count: number
                }[]
            }
            debug_search_subtitles: {
                Args: { query_embedding: string }
                Returns: {
                    content: string
                    similarity: number
                    start_time: number
                    title: string
                    video_id: string
                }[]
            }
            exact_phrase_search_punctuated: {
                Args: {
                    page_limit: number
                    page_offset: number
                    search_phrase: string
                    sort_column: string
                    sort_direction: string
                }
                Returns: {
                    analysis_nde_summary: string
                    channelName: string
                    content: string
                    date: string
                    start_time: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    video_id: string
                    viewCount: number
                }[]
            }
            exact_phrase_search_subtitles: {
                Args: {
                    page_limit: number
                    page_offset: number
                    search_phrase: string
                    sort_column: string
                    sort_direction: string
                }
                Returns: {
                    channelName: string
                    content: string
                    date: string
                    start_time: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    video_id: string
                    viewCount: number
                }[]
            }
            get_all_subtitles_text: { Args: { subtitles: Json }; Returns: string }
            get_complete_schema: { Args: never; Returns: Json }
            match_documents: {
                Args: { match_count: number; query_embedding: string }
                Returns: {
                    content: string
                    id: number
                    similarity: number
                    title: string
                    url: string
                    video_id: string
                }[]
            }
            match_nde_moments_semantic: {
                Args: {
                    p_match_threshold: number
                    p_page_number: number
                    p_page_size: number
                    query_embedding: string
                }
                Returns: {
                    commentsCount: number
                    date: string
                    likes: number
                    matching_subtitle: Json
                    similarity_score: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    viewCount: number
                }[]
            }
            nde_chatbot_match: {
                Args: { filter: Json; match_count: number; query_embedding: Json }
                Returns: {
                    content: string
                    embedding: string
                    id: number
                    metadata: Json
                    similarity: number
                    video_title: string
                    video_url: string
                }[]
            }
            populate_nde_vids_tsvector_batch: {
                Args: { p_batch_size?: number }
                Returns: number
            }
            search_moments_vector: {
                Args: {
                    match_count: number
                    match_threshold: number
                    query_embedding: string
                }
                Returns: {
                    commentsCount: number
                    content: string
                    date: string
                    likes: number
                    moment_id: number
                    similarity: number
                    start_time: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    video_id: string
                    viewCount: number
                }[]
            }
            search_nde_moments:
            | {
                Args: { p_initial_video_limit: number; p_search_text: string }
                Returns: {
                    matching_subtitle: Json
                    thumbnailUrl: string
                    title: string
                    url: string
                }[]
            }
            | {
                Args: {
                    p_page_limit: number
                    p_page_offset: number
                    p_search_text: string
                }
                Returns: {
                    matching_subtitle: Json
                    thumbnailUrl: string
                    title: string
                    total_count: number
                    url: string
                }[]
            }
            search_nde_moments_paginated: {
                Args: {
                    p_initial_video_limit: number
                    p_page_number: number
                    p_page_size: number
                    p_search_text: string
                    p_sort_by?: string
                    p_sort_direction?: string
                }
                Returns: {
                    commentsCount: number
                    date: string
                    likes: number
                    matching_subtitle: Json
                    thumbnailUrl: string
                    title: string
                    total_count: number
                    url: string
                    viewCount: number
                }[]
            }
            search_nde_moments_paginated_optimized: {
                Args: {
                    p_initial_video_limit: number
                    p_page_number: number
                    p_page_size: number
                    p_search_text: string
                    p_sort_by?: string
                    p_sort_direction?: string
                }
                Returns: {
                    commentsCount: number
                    date: string
                    likes: number
                    matching_subtitle: Json
                    thumbnailUrl: string
                    title: string
                    total_count: number
                    url: string
                    viewCount: number
                }[]
            }
            search_punctuated_embeddings: {
                Args: {
                    page_limit: number
                    page_offset: number
                    query_embedding: string
                    similarity_threshold: number
                    sort_column: string
                    sort_direction: string
                }
                Returns: {
                    analysis_nde_summary: string
                    channelName: string
                    content: string
                    date: string
                    similarity: number
                    start_time: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    video_id: string
                    viewCount: number
                }[]
            }
            search_video_subtitles: {
                Args: {
                    page_limit: number
                    page_offset: number
                    query_embedding: string
                    similarity_threshold: number
                    sort_column: string
                    sort_direction: string
                }
                Returns: {
                    channelName: string
                    content: string
                    date: string
                    similarity: number
                    start_time: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    video_id: string
                    viewCount: number
                }[]
            }
            search_video_subtitles_diversified: {
                Args: {
                    page_limit: number
                    page_offset: number
                    query_embedding: string
                    similarity_threshold: number
                    sort_column: string
                    sort_direction: string
                }
                Returns: {
                    channelName: string
                    content: string
                    date: string
                    similarity: number
                    start_time: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    video_id: string
                    viewCount: number
                }[]
            }
            search_video_subtitles_fast: {
                Args: {
                    page_limit: number
                    page_offset: number
                    query_embedding: string
                    similarity_threshold: number
                    sort_column: string
                    sort_direction: string
                }
                Returns: {
                    channelName: string
                    content: string
                    date: string
                    similarity: number
                    start_time: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    video_id: string
                    viewCount: number
                }[]
            }
            search_video_subtitles_hybrid: {
                Args: {
                    page_limit: number
                    page_offset: number
                    query_embedding: string
                    similarity_threshold: number
                    sort_column: string
                    sort_direction: string
                }
                Returns: {
                    channelName: string
                    content: string
                    date: string
                    similarity: number
                    start_time: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    video_id: string
                    viewCount: number
                }[]
            }
            search_video_subtitles_optimized: {
                Args: {
                    page_limit: number
                    page_offset: number
                    query_embedding: string
                    similarity_threshold: number
                    sort_column: string
                    sort_direction: string
                }
                Returns: {
                    channelName: string
                    content: string
                    date: string
                    similarity: number
                    start_time: number
                    thumbnailUrl: string
                    title: string
                    url: string
                    video_id: string
                    viewCount: number
                }[]
            }
            show_limit: { Args: never; Returns: number }
            show_trgm: { Args: { "": string }; Returns: string[] }
            uap_semantic_search:
            | {
                Args: { filter: Json; match_count: number; query_embedding: string }
                Returns: {
                    content: string
                    embedding: string
                    id: number
                    metadata: Json
                    similarity: number
                    video_title: string
                    video_url: string
                }[]
            }
            | {
                Args: { match_count: number; query_embedding: string }
                Returns: {
                    channel: string
                    content: string
                    id: number
                    similarity: number
                    start_time: number
                    thumbnail: string
                    video_title: string
                    video_url: string
                    views: number
                }[]
            }
        }
        Enums: {
            is_nde_options:
            | "clear_nde"
            | "possible_nde"
            | "not_nde"
            | "insufficient_info"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {
            is_nde_options: [
                "clear_nde",
                "possible_nde",
                "not_nde",
                "insufficient_info",
            ],
        },
    },
} as const
