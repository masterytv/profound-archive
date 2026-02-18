/**
 * enrich-channels.ts
 * 
 * Fetches channel metadata (avatar, banner, description, country, stats)
 * from YouTube Data API v3 and upserts into the Supabase `channels` table.
 *
 * Usage: npx tsx scripts/enrich-channels.ts
 * Requires: YOUTUBE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
config({ path: '.env.local' })

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY in .env.local')
if (!SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
if (!SUPABASE_SERVICE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface YouTubeChannel {
    id: string
    snippet?: {
        title: string
        description: string
        customUrl?: string
        publishedAt: string
        country?: string
        thumbnails?: {
            high?: { url: string }
            medium?: { url: string }
            default?: { url: string }
        }
    }
    brandingSettings?: {
        image?: {
            bannerExternalUrl?: string
        }
    }
    statistics?: {
        subscriberCount?: string
        videoCount?: string
        viewCount?: string
    }
}

// Batch fetch channel details from YouTube API (max 50 per call)
async function fetchYouTubeChannels(channelIds: string[]): Promise<YouTubeChannel[]> {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels')
    url.searchParams.set('part', 'snippet,brandingSettings,statistics')
    url.searchParams.set('id', channelIds.join(','))
    url.searchParams.set('key', YOUTUBE_API_KEY!)

    const response = await fetch(url.toString())
    if (!response.ok) {
        const body = await response.text()
        throw new Error(`YouTube API error ${response.status}: ${body}`)
    }

    const data = await response.json()
    return data.items || []
}

async function main() {
    console.log('🔍 Fetching unique channel IDs from nde_vids...')

    // Get all unique channelIds
    const { data: rows, error } = await supabase
        .from('nde_vids')
        .select('channelId')
        .not('channelId', 'is', null)
        .eq('isNde', 'clear_nde')

    if (error) throw new Error(`Supabase query error: ${error.message}`)

    const uniqueIds = [...new Set(rows?.map((r) => r.channelId).filter(Boolean))] as string[]
    console.log(`📊 Found ${uniqueIds.length} unique channels`)

    // Batch into groups of 50
    const batches: string[][] = []
    for (let i = 0; i < uniqueIds.length; i += 50) {
        batches.push(uniqueIds.slice(i, i + 50))
    }

    let totalUpserted = 0
    let totalFailed = 0

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        console.log(`\n🎬 Batch ${i + 1}/${batches.length}: Fetching ${batch.length} channels from YouTube API...`)

        try {
            const channels = await fetchYouTubeChannels(batch)
            console.log(`   ✅ YouTube returned ${channels.length} channels`)

            // Track which IDs were found
            const foundIds = new Set(channels.map((c) => c.id))
            const missing = batch.filter((id) => !foundIds.has(id))
            if (missing.length > 0) {
                console.log(`   ⚠️  ${missing.length} channels not found on YouTube: ${missing.join(', ')}`)
            }

            // Upsert each channel
            for (const ch of channels) {
                const avatar =
                    ch.snippet?.thumbnails?.high?.url ||
                    ch.snippet?.thumbnails?.medium?.url ||
                    ch.snippet?.thumbnails?.default?.url ||
                    null

                const record = {
                    channel_id: ch.id,
                    name: ch.snippet?.title || 'Unknown',
                    description: ch.snippet?.description || null,
                    avatar_url: avatar,
                    banner_url: ch.brandingSettings?.image?.bannerExternalUrl || null,
                    custom_url: ch.snippet?.customUrl || null,
                    country: ch.snippet?.country || null,
                    subscriber_count: ch.statistics?.subscriberCount
                        ? parseInt(ch.statistics.subscriberCount, 10)
                        : 0,
                    total_video_count: ch.statistics?.videoCount
                        ? parseInt(ch.statistics.videoCount, 10)
                        : 0,
                    total_view_count: ch.statistics?.viewCount
                        ? parseInt(ch.statistics.viewCount, 10)
                        : 0,
                    published_at: ch.snippet?.publishedAt || null,
                    fetched_at: new Date().toISOString(),
                }

                const { error: upsertError } = await supabase
                    .from('channels')
                    .upsert(record, { onConflict: 'channel_id' })

                if (upsertError) {
                    console.error(`   ❌ Failed to upsert ${ch.id}: ${upsertError.message}`)
                    totalFailed++
                } else {
                    totalUpserted++
                }
            }
        } catch (err) {
            console.error(`   ❌ Batch ${i + 1} failed:`, err)
            totalFailed += batch.length
        }

        // Small delay between batches to be polite
        if (i < batches.length - 1) {
            await new Promise((r) => setTimeout(r, 500))
        }
    }

    console.log(`\n✨ Done! ${totalUpserted} channels enriched, ${totalFailed} failed.`)

    // Show a sample
    const { data: sample } = await supabase
        .from('channels')
        .select('channel_id, name, avatar_url, country, subscriber_count')
        .order('subscriber_count', { ascending: false })
        .limit(5)

    if (sample && sample.length > 0) {
        console.log('\n📋 Top 5 channels by subscribers:')
        sample.forEach((ch, i) => {
            console.log(
                `   ${i + 1}. ${ch.name} (${ch.subscriber_count?.toLocaleString()} subs) — ${ch.country || 'N/A'} — avatar: ${ch.avatar_url ? '✅' : '❌'}`
            )
        })
    }
}

main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})
