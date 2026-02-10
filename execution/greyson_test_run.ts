
import dotenv from 'dotenv';
import path from 'path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

async function runTest() {
    console.log('Fetching videos...');
    // Fetch 3 videos with punctuated subtitles
    const { data: videos, error } = await supabase
        .from('nde_vids')
        .select('videoId, title, subtitles_punctuated')
        .not('subtitles_punctuated', 'is', null)
        .limit(3);

    if (error) {
        console.error('Error fetching videos:', error);
        return;
    }

    if (!videos || videos.length === 0) {
        console.log('No videos found with punctuated subtitles.');
        return;
    }

    console.log(`Found ${videos.length} videos. Running analysis...`);

    for (const video of videos) {
        console.log(`\n--- Analyzing Video: ${video.title} (${video.videoId}) ---`);

        if (!video.subtitles_punctuated) { // Should be filtered out by query but safe check
            console.log('Skipping due to missing subtitles.');
            continue;
        }

        // Truncate subtitles if too long (optional, but 4o-mini has 128k context so usually fine)
        const subtitles = video.subtitles_punctuated.slice(0, 100000);

        const systemPrompt = `You are an expert NDE researcher. valid the following NDE account using the Greyson NDE Scale.
The scale has 16 items across 4 categories. Each item is scored 0 (not present), 1 (mildly or ambiguously present), or 2 (definitely present).

The 4 categories and their items are:
1. Cognitive:
   - Time distortion (time seemed to speed up or slow down)
   - Thought speed (thoughts were speeded up)
   - Life review (scenes from the past came back)
   - Sudden understanding (suddenly seemed to understand everything)

2. Affective:
   - Peace/Pleasantness (feeling of peace or pleasantness)
   - Joy (feeling of joy)
   - Cosmic Unity (sense of harmony or unity with the universe)
   - Brilliant Light (saw or felt surrounded by a brilliant light)

3. Paranormal:
   - Enhanced Senses (senses were more vivid than usual)
   - ESP (seemed to be aware of things going on elsewhere)
   - Precognition (scenes from the future came to you)
   - Out of Body (felt separated from the body)

4. Transcendental:
   - Unearthly World (seemed to enter some other, unearthly world)
   - Mystical Being (seemed to encounter a mystical being or presence)
   - Spirits/Deceased (saw deceased or religious spirits)
   - Border/Point of no return (came to a border or point of no return)

Analyze the following account and provide a score for each item. Format your response as a JSON object strictly adhering to the schema below.

Input Text:
${subtitles}

Output JSON Schema:
{
  "total_score": number, // Sum of all 16 items
  "classification": string, // "Not NDE" (0-6), "Mild NDE" (7-12), "Moderate NDE" (13-20), "Deep NDE" (21-32)
  "breakdown": {
    "cognitive": {
      "time_distortion": { "score": 0|1|2, "reasoning": "string (brief quote or explanation)" },
      "thought_speed": { "score": 0|1|2, "reasoning": "string" },
      "life_review": { "score": 0|1|2, "reasoning": "string" },
      "sudden_understanding": { "score": 0|1|2, "reasoning": "string" }
    },
    "affective": {
      "peace_pleasantness": { "score": 0|1|2, "reasoning": "string" },
      "joy": { "score": 0|1|2, "reasoning": "string" },
      "cosmic_unity": { "score": 0|1|2, "reasoning": "string" },
      "brilliant_light": { "score": 0|1|2, "reasoning": "string" }
    },
    "paranormal": {
      "enhanced_senses": { "score": 0|1|2, "reasoning": "string" },
      "esp": { "score": 0|1|2, "reasoning": "string" },
      "precognition": { "score": 0|1|2, "reasoning": "string" },
      "out_of_body": { "score": 0|1|2, "reasoning": "string" }
    },
    "transcendental": {
      "unearthly_world": { "score": 0|1|2, "reasoning": "string" },
      "mystical_being": { "score": 0|1|2, "reasoning": "string" },
      "spirits_deceased": { "score": 0|1|2, "reasoning": "string" },
      "border_point_no_return": { "score": 0|1|2, "reasoning": "string" }
    }
  }
}`;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Analyze this NDE account." }
                ],
                response_format: { type: "json_object" },
                temperature: 0.2, // Low temperature for consistent scoring
            });

            const result = completion.choices[0].message.content;
            console.log('Result:', result);
        } catch (err) {
            console.error('Error analyzing video:', err);
        }
    }
}

runTest();
