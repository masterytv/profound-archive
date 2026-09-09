/**
 * One-off data correction: Dr. Chase Skylar DeMayo (Sept 2026).
 *
 * Chase emailed asking us to fix his profile (https://projectprofound.org/experiencer/chase-skyler-deo):
 *   - name: "Dr. Chase Skylar DeMayo" (the caption said "Chase Skyler Deo")
 *   - URL: /experiencer/chase-skylar-demayo, with the old URL redirecting
 *   - trigger: cardiac arrest during medical care (not surgery), Langley AFB, Virginia
 *   - date/age: April 1, 2008, age 20
 *   - review the summary, transcript quotes, and the Life Review / Choice to Return labels
 *
 * The audit found THREE duplicate profiles for him (ids 20, 130, 2005) and ten videos
 * of his in nde_vids, four of them linked to no profile. This script:
 *   1. nde_vids (10 videos): experiencerFullName -> display name; fixes the name in the
 *      summaries, caption transcripts and NDE justification; fixes his age (20) and, where a
 *      summary said "knee surgery", the trigger wording; appends a dated researcher note.
 *   2. nde_analysis (10 videos): trigger_category -> cardiac_arrest; life_review and
 *      choice_to_return marked not present (he describes seeing himself as a young child and
 *      being told to return, not a life review or a choice offered); the Greyson life-review
 *      item set to 0 with the total adjusted; journey steps relabelled; fingerprint vectors
 *      updated where present.
 *   3. nde_chatbot_chunks / nde_punctuated_embeddings: name fixed in chunk text (the FTS
 *      search_vector is trigger-maintained; embeddings are left as-is).
 *   4. blog_posts #85: source_experiencer_slug -> chase-skylar-demayo; age 19 -> 20 in
 *      editorial text (his own quoted words are untouched); "early 2008" -> April 1, 2008.
 *   5. experiencer_profiles: profile 130 (slug chase-skylar-demayo) becomes the single
 *      profile with all ten videos, the display name, a corrected summary and his website;
 *      profiles 20 and 2005 are unpublished and emptied (kept as slug placeholders so the
 *      intake sync cannot recreate them). next.config.ts redirects the retired slugs.
 *
 * Afterwards, regenerate the merged profile's derived fields:
 *   npx tsx scripts/regenerate-experiencer-profile.ts 130
 * (or press the admin "refresh" button on the profile page).
 *
 * Usage:
 *   node scripts/fix-chase-demayo-profile.mjs            # dry run — prints every planned change
 *   APPLY=1 node scripts/fix-chase-demayo-profile.mjs    # write to the database
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)
 * from the environment, falling back to .env.local. Writes a JSON backup of every row it
 * touches (before values) next to this file: scripts/.fix-chase-demayo-backup-<mode>.json.
 * Safe to re-run: every change is idempotent.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── env ────────────────────────────────────────────────────────────────────
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function q(p) {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: HEADERS });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { status: r.status, body: t }; }
}
async function patch(p, body) {
  const r = await fetch(`${URL_}/rest/v1/${p}`, {
    method: 'PATCH',
    headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (r.status !== 204 && r.status !== 200) throw new Error(`PATCH ${p} -> ${r.status} ${await r.text()}`);
}

// ── constants ──────────────────────────────────────────────────────────────
const APPLY = process.env.APPLY === '1';
const IDS = ['CmY-Oa1kOHU', '7qKrXhpFxo4', 'A_OKVbTFLIg', 'Uk6ZUikZ-K0', 'OsMqrwiKwc8', 'bmG4atiklV4', 'QLZB64hBV0U', 'id41lQur0Do', 'LehwS6Gznz0', 'bmVkvTXZL6k'];
const DISPLAY_NAME = 'Dr. Chase Skylar DeMayo';
const KEEP = 130;            // slug chase-skylar-demayo
const DUPES = [20, 2005];    // slugs chase-demayo, chase-skyler-deo
const NOTE_DATE = '2026-09-09';
const NOW = new Date().toISOString();
const log = (...a) => console.log(...a);
const backup = { created_at: NOW, mode: APPLY ? 'apply' : 'dry-run', experiencer_profiles: [], nde_vids: [], nde_analysis: [], nde_chatbot_chunks: [], nde_punctuated_embeddings: [], blog_posts: [] };

// ── name / spelling fixes (case-preserving) ────────────────────────────────
function caseLike(src, repl) {
  if (src === src.toLowerCase()) return repl.toLowerCase();
  if (src === src.toUpperCase()) return repl.toUpperCase();
  return repl;
}
function fixNames(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/Skyler/gi, (m) => caseLike(m, 'Skylar'))
    .replace(/\b(Skylar )(Deo|DeMaio|Dimeo)\b/gi, (m, a, b) => a + caseLike(b, 'DeMayo'))
    .replace(/\b(DeMaio|Dimeo)\b/gi, (m) => caseLike(m, 'DeMayo'))
    .replace(/chaseedo\.com/gi, (m) => caseLike(m, 'chasedemayo.com'))
    .replace(/ChaseDeo\.com/g, 'ChaseDeMayo.com');
}
/** Strings, or JSON values containing strings (jsonb columns). */
function fixAny(v) {
  if (v == null) return v;
  if (typeof v === 'string') return fixNames(v);
  const s = JSON.stringify(v);
  const f = fixNames(s);
  return f === s ? v : JSON.parse(f);
}
function fixAge(s) {
  return typeof s === 'string'
    ? s.replace(/\b(18|19)-year-old\b/g, '20-year-old').replace(/\ban 20-year-old\b/g, 'a 20-year-old')
    : s;
}
const BAD = /Skyler|DeMaio|Dimeo|Skylar Deo|chaseedo|ChaseDeo\.com/i;

// Per-video summary corrections beyond name/age (the rest of each summary is left as generated).
const SUMMARY_EDITS = {
  bmG4atiklV4: (s) => {
    const paras = s.split('\n\n');
    paras[0] = 'Chase Skylar DeMayo was in training as a U.S. Air Force SERE (Survival, Evasion, Resistance and Escape) instructor when a training accident injured both knees. The knee surgery was not a success and the Air Force began the medical retirement process. On April 1, 2008, when he was 20 years old, his supervisor found him unconscious on his dorm room floor and he was taken to the Langley Air Force Base hospital in Virginia. Tests showed nothing wrong until, after a nurse adjusted his IV, air traveled up his arm toward his heart and he went into cardiac arrest, flatlining as staff prepared him for a chest x-ray.';
    return paras.join('\n\n').replace('He woke up in an off-base hospital with no pain.', 'He woke up in an off-base hospital in Hampton, Virginia, with no pain.');
  },
  OsMqrwiKwc8: (s) => s.replace('after a knee surgery complication', 'following cardiac arrest during medical care at Langley Air Force Base'),
  LehwS6Gznz0: (s) => s.replace(/\bIn 2008, he suffered cardiac arrest/, 'On April 1, 2008, he suffered cardiac arrest'),
};
const TRIGGER_DESC = 'Cardiac arrest from an air embolism during hospital care at Langley Air Force Base, Virginia, on April 1, 2008, while serving in the U.S. Air Force.';
const TRIGGER_FIX_DESC = new Set(['bmG4atiklV4', 'OsMqrwiKwc8', 'Uk6ZUikZ-K0']); // the three that said "surgery"
const LR_REASON = "Not scored: he describes seeing himself as a young child playing in the garden and being reminded of how he used to be, not scenes from his past returning to him. Corrected after the experiencer's review.";
const RESEARCHER_NOTE = `${NOTE_DATE}: Corrected at the experiencer's request (email from Dr. Chase Skylar DeMayo): name spelling fixed in experiencer name, summary and transcript (auto-captions had "Skyler Deo"/"DeMaio"/"Dimeo"); trigger set to cardiac_arrest (not surgery); NDE date April 1, 2008 at age 20, Langley AFB. Life Review and Choice to Return marked not present in core elements (he describes seeing himself as a young child and being told to return, not a review of life events or a choice offered); Greyson life-review item set to 0.`;

// ── 1. nde_vids ────────────────────────────────────────────────────────────
const vidCols = 'videoId,experiencerFullName,analysis_nde_summary,isNdeJustification,subtitles_punctuated,subtitles_cleaned,subtitles,raw_timestamped_punctuated,raw_timestamped_subtitles,raw_timestamped_subtitles_cleaned,nde_analysis_html,analysis_researcher_notes';
const vids = await q(`nde_vids?videoId=in.(${IDS.join(',')})&select=${vidCols}`);
if (!Array.isArray(vids) || vids.length !== IDS.length) throw new Error('nde_vids fetch: ' + JSON.stringify(vids).slice(0, 300));
for (const v of vids) {
  const { subtitles_punctuated, subtitles_cleaned, subtitles, raw_timestamped_punctuated, raw_timestamped_subtitles, raw_timestamped_subtitles_cleaned, ...small } = v;
  backup.nde_vids.push({ ...small, _transcript_name_contexts: [subtitles_punctuated, subtitles_cleaned, subtitles].map((t) => (String(t || '').match(/.{0,30}(Skyler|DeMaio|Dimeo|chaseedo|ChaseDeo).{0,30}/gi) || [])) });
  const u = {};
  if (v.experiencerFullName !== DISPLAY_NAME) u.experiencerFullName = DISPLAY_NAME;
  for (const k of ['subtitles_punctuated', 'subtitles_cleaned', 'subtitles', 'raw_timestamped_punctuated', 'raw_timestamped_subtitles', 'raw_timestamped_subtitles_cleaned', 'isNdeJustification', 'nde_analysis_html']) {
    const f = fixAny(v[k]);
    if (JSON.stringify(f) !== JSON.stringify(v[k])) u[k] = f;
  }
  let sum = fixAge(fixNames(v.analysis_nde_summary || ''));
  if (SUMMARY_EDITS[v.videoId]) sum = SUMMARY_EDITS[v.videoId](sum);
  if (sum !== v.analysis_nde_summary) u.analysis_nde_summary = sum;
  if (!(v.analysis_researcher_notes || '').includes(RESEARCHER_NOTE)) {
    u.analysis_researcher_notes = v.analysis_researcher_notes ? `${v.analysis_researcher_notes}\n\n${RESEARCHER_NOTE}` : RESEARCHER_NOTE;
  }
  log(`\n[nde_vids ${v.videoId}] ${Object.keys(u).length ? Object.keys(u).join(', ') : 'no change'}`);
  if (u.analysis_nde_summary) log(`  summary → ${u.analysis_nde_summary.slice(0, 220)}…`);
  for (const k of ['subtitles_punctuated', 'subtitles_cleaned', 'subtitles']) if (u[k] && BAD.test(u[k])) log(`  WARNING: ${k} still contains a misspelling`);
  if (APPLY && Object.keys(u).length) await patch(`nde_vids?videoId=eq.${v.videoId}`, u);
}

// ── 2. nde_analysis ────────────────────────────────────────────────────────
const an = await q(`nde_analysis?video_id=in.(${IDS.join(',')})&select=video_id,trigger_category,trigger_description,core_elements,greyson_breakdown,total_greyson_score,journey_sequence,experience_fingerprint,analysis_report_html`);
if (!Array.isArray(an) || an.length !== IDS.length) throw new Error('nde_analysis fetch: ' + JSON.stringify(an).slice(0, 300));
for (const a of an) {
  backup.nde_analysis.push(a);
  const u = {};
  if (a.trigger_category !== 'cardiac_arrest') u.trigger_category = 'cardiac_arrest';
  if (TRIGGER_FIX_DESC.has(a.video_id)) { if (a.trigger_description !== TRIGGER_DESC) u.trigger_description = TRIGGER_DESC; }
  else { const d = fixNames(a.trigger_description); if (d !== a.trigger_description) u.trigger_description = d; }

  const ce = (a.core_elements || []).map((e) => (e.name === 'life_review' || e.name === 'choice_to_return') ? { ...e, present: false, confidence: 0, quote: '' } : e);
  if (JSON.stringify(ce) !== JSON.stringify(a.core_elements)) u.core_elements = ce;

  const gb = JSON.parse(JSON.stringify(a.greyson_breakdown || {}));
  const lr = gb?.cognitive?.life_review;
  if (lr && Number(lr.score) > 0) {
    gb.cognitive.life_review = { score: 0, reasoning: LR_REASON };
    u.greyson_breakdown = gb;
    u.total_greyson_score = (a.total_greyson_score ?? 0) - Number(lr.score);
  }

  const js = (a.journey_sequence || []).slice().sort((x, y) => x.order - y.order);
  const hasLaterReturn = (i) => js.slice(i + 1).some((s) => s.element === 'return' || s.element === 'sudden_return');
  const out = [];
  js.forEach((s, i) => {
    if (s.element === 'life_review') {
      // Two of these steps are him watching the medical team; the rest are the "younger self" scene.
      if (/nurses|doctors|watching me die|facial expressions/i.test(s.excerpt || '')) out.push({ ...s, element: 'observing_body' });
      return; // "younger self" scene — no matching taxonomy element; drop the step
    }
    if (s.element === 'choice_to_return') {
      if (hasLaterReturn(i)) return; // the literal "back in my body" step already follows
      out.push({ ...s, element: 'return' });
      return;
    }
    out.push(s);
  });
  const renum = out.map((s, i) => ({ ...s, order: i + 1 }));
  if (JSON.stringify(renum) !== JSON.stringify(js)) u.journey_sequence = renum;

  // 27-dim fingerprint: index 4 = life_review, index 14 = choice_to_return (src/lib/ai/fingerprint.ts)
  if (a.experience_fingerprint) {
    const vec = JSON.parse(a.experience_fingerprint);
    if (vec[4] !== 0 || vec[14] !== 0) { vec[4] = 0; vec[14] = 0; u.experience_fingerprint = JSON.stringify(vec); }
  }
  const html = fixNames(a.analysis_report_html);
  if (html && html !== a.analysis_report_html) u.analysis_report_html = html;

  log(`\n[nde_analysis ${a.video_id}] ${Object.keys(u).length ? Object.keys(u).join(', ') : 'no change'}  greyson ${a.total_greyson_score}→${u.total_greyson_score ?? a.total_greyson_score}`);
  if (u.journey_sequence) log(`  journey: ${js.map((s) => s.element).join(' > ')}\n        → ${renum.map((s) => s.element).join(' > ')}`);
  if (APPLY && Object.keys(u).length) await patch(`nde_analysis?video_id=eq.${a.video_id}`, u);
}

// ── 3. chunk tables ────────────────────────────────────────────────────────
const filt = 'or=(content.ilike.*Skyler*,content.ilike.*DeMaio*,content.ilike.*Dimeo*,content.ilike.*chaseedo*,content.ilike.*ChaseDeo*)';
for (const t of ['nde_chatbot_chunks', 'nde_punctuated_embeddings']) {
  const rows = await q(`${t}?video_id=in.(${IDS.join(',')})&${filt}&select=id,video_id,content&limit=5000`);
  if (!Array.isArray(rows)) throw new Error(t + ' ' + JSON.stringify(rows).slice(0, 200));
  log(`\n[${t}] ${rows.length} chunk(s) to fix`);
  for (const r of rows) {
    backup[t].push(r);
    const c = fixNames(r.content);
    if (c !== r.content && APPLY) await patch(`${t}?id=eq.${r.id}`, { content: c });
  }
}

// ── 4. blog post ───────────────────────────────────────────────────────────
const bp = (await q('blog_posts?id=eq.85&select=id,slug,subtitle,lead_paragraph,body_mdx,seo_description,source_experiencer_slug'))[0];
if (bp) {
  backup.blog_posts.push(bp);
  const fixBlog = (s) => typeof s === 'string' ? s
    .replace(/\bat 19\b/g, 'at 20').replace(/\b19 years old\b/g, '20 years old').replace(/\bA 19-year-old man\b/g, 'A 20-year-old man').replace(/\bHe was 19,/g, 'He was 20,')
    .replace(/One morning in early 2008/g, 'On the morning of April 1, 2008') : s;
  const bu = {};
  if (bp.source_experiencer_slug !== 'chase-skylar-demayo') bu.source_experiencer_slug = 'chase-skylar-demayo';
  for (const k of ['subtitle', 'lead_paragraph', 'body_mdx', 'seo_description']) { const f = fixBlog(bp[k]); if (f !== bp[k]) bu[k] = f; }
  log(`\n[blog_posts 85 ${bp.slug}] ${Object.keys(bu).length ? Object.keys(bu).join(', ') : 'no change'}`);
  if (APPLY && Object.keys(bu).length) await patch('blog_posts?id=eq.85', { ...bu, updated_at: NOW });
}

// ── 5. experiencer profiles ────────────────────────────────────────────────
const profs = await q(`experiencer_profiles?id=in.(${[KEEP, ...DUPES].join(',')})&select=*`);
if (!Array.isArray(profs) || !profs.find((p) => p.id === KEEP)) throw new Error('profiles fetch: ' + JSON.stringify(profs).slice(0, 300));
backup.experiencer_profiles = profs;
const byViews = await q(`nde_vids?videoId=in.(${IDS.join(',')})&select=videoId,viewCount&order=viewCount.desc`);
const orderedIds = byViews.map((v) => v.videoId);
const SUMMARY = 'Dr. Chase Skylar DeMayo was 20 years old and serving in the U.S. Air Force at Langley Air Force Base, Virginia, when, on April 1, 2008, he went into cardiac arrest during medical care. After being found unconscious in his dorm room, he was hospitalized on base, and an air embolism from his IV stopped his heart as staff prepared him for a chest x-ray. He describes leaving his body in a wave of blissful light, arriving in a vivid garden, watching himself as a happy young boy, and meeting a figure he immediately knew as Jesus, who reminded him that life is meant for spreading light, love, and laughter. Told he had to go back, he agreed, and woke in an off-base hospital in Hampton, Virginia. He returned with heightened intuition and a lasting commitment to joy, healing, and lifelong learning.';
const keep = profs.find((p) => p.id === KEEP);
const keepU = { full_name: DISPLAY_NAME, video_ids: orderedIds, summary: SUMMARY, social_links: { ...(keep.social_links || {}), website: 'https://chasedemayo.com' }, updated_at: NOW };
log(`\n[experiencer_profiles ${KEEP} ${keep.slug}] full_name "${keep.full_name}" → "${DISPLAY_NAME}"; video_ids ${(keep.video_ids || []).length} → ${orderedIds.length}; summary + website set`);
if (APPLY) await patch(`experiencer_profiles?id=eq.${KEEP}`, keepU);
for (const id of DUPES) {
  const p = profs.find((x) => x.id === id);
  if (!p) { log(`[experiencer_profiles ${id}] not found — skipped`); continue; }
  if (p.published_at === null && (p.video_ids || []).length === 0) { log(`[experiencer_profiles ${id} ${p.slug}] already merged`); continue; }
  const du = { published_at: null, video_ids: [], summary: `Merged into experiencer profile #${KEEP} (chase-skylar-demayo) on ${NOTE_DATE} — duplicate of Dr. Chase Skylar DeMayo. Original video_ids: ${(p.video_ids || []).join(', ')}.`, updated_at: NOW };
  log(`[experiencer_profiles ${id} ${p.slug}] unpublish; clear video_ids (${(p.video_ids || []).join(', ')})`);
  if (APPLY) await patch(`experiencer_profiles?id=eq.${id}`, du);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const backupPath = path.join(here, `.fix-chase-demayo-backup-${APPLY ? 'applied' : 'dryrun'}.json`);
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 1));
log(`\n${APPLY ? 'APPLIED' : 'DRY RUN (set APPLY=1 to write)'} — backup of original rows: ${backupPath}`);
if (APPLY) log(`Next: npx tsx scripts/regenerate-experiencer-profile.ts ${KEEP}`);
