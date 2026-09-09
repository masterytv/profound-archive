#!/usr/bin/env node
// digest.mjs — print compact, category-scoped views of the corpus-atlas JSONL pulls so a
// reader (human or model) can digest the cached Big Question answers, the blog, and the
// experiencer / contactee profiles one slice at a time instead of loading everything.
//
// Reads only scratch/corpus-atlas/*.jsonl (produced by pull.mjs). No network, no database,
// no writes. Node 22 built-ins only.
//
// Usage:
//   node scripts/corpus-atlas/digest.mjs <command> [options]
//
// Commands:
//   categories                       list curated question categories with counts
//   questions <category|all>         curated questions + cached synthesis, one block each
//   user-questions [--full]          user-submitted questions (+ synthesis when cached)
//   blog <domain/category|all>       blog posts (nde/guide, nde/story, nde/big-question, uap/big-question)
//   facts                            the UAP daily facts
//   themes [--by-type]               core_themes frequency over NDE experiencer profiles
//   profiles --top <views|transformation|greyson|veridical> [--n 40]
//   profiles --sample <n> [--seed 42]
//   profiles --repeat [--n 25]       experiencers with the most video_ids
//   profiles --slug <slug>[,<slug>]  full profile(s) including highlight_elements
//   uap [--n 30]                     contactee profile stats + top N by total_views
//
// Options:
//   --width <chars>   truncate long text fields (default 600 for syntheses, 260 for profiles)
//   --dir <path>      data directory (default scratch/corpus-atlas)

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  if (i === -1) return dflt;
  const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) return true;
  return v;
};
const dir = opt('--dir', 'scratch/corpus-atlas');
const load = (name) =>
  fs
    .readFileSync(path.join(dir, name), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

const clip = (s, n) => {
  if (s == null) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
const num = (v) => (v == null ? '-' : typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(1)) : v);

// Deterministic PRNG (mulberry32) so a --sample is reproducible.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paragraphsText(p) {
  if (Array.isArray(p)) return p.join(' ');
  if (typeof p === 'string') {
    try {
      const j = JSON.parse(p);
      if (Array.isArray(j)) return j.join(' ');
    } catch {}
    return p;
  }
  return '';
}

function cmdCategories() {
  const Q = load('nde_questions.jsonl');
  const m = new Map();
  for (const q of Q) {
    const k = q.category;
    if (!m.has(k)) m.set(k, { label: q.category_label, n: 0, minSort: q.sort_order });
    const e = m.get(k);
    e.n++;
    e.minSort = Math.min(e.minSort, q.sort_order ?? 0);
  }
  for (const [k, e] of [...m.entries()].sort((a, b) => a[1].minSort - b[1].minSort)) {
    console.log(`${k}\t${e.n}\t${e.label}`);
  }
}

function cmdQuestions() {
  const cat = args[1];
  if (!cat) throw new Error('questions needs a category or "all"');
  const width = Number(opt('--width', 600));
  const Q = load('nde_questions.jsonl');
  const S = load('question_synthesis.jsonl');
  const byQ = new Map(S.filter((s) => s.question_id).map((s) => [s.question_id, s]));
  const rows = Q.filter((q) => cat === 'all' || q.category === cat).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id,
  );
  for (const q of rows) {
    const s = byQ.get(q.id);
    console.log(`\n## [${q.id}] ${q.slug} (${q.category})`);
    console.log(`Q: ${q.consumer_question}`);
    if (!s) {
      console.log('(no cached synthesis)');
      continue;
    }
    console.log(`SHORT: ${clip(s.short_answer, 400)}`);
    console.log(`CITES(${(s.cited_video_ids || []).length}): ${(s.cited_video_ids || []).join(',')}`);
    console.log(`BODY: ${clip(paragraphsText(s.paragraphs), width)}`);
  }
  console.log(`\n(${rows.length} questions)`);
}

function cmdUserQuestions() {
  const width = Number(opt('--width', 600));
  const full = opt('--full', false);
  const U = load('user_questions.jsonl');
  const S = load('question_synthesis.jsonl');
  const byU = new Map(S.filter((s) => s.user_question_id).map((s) => [s.user_question_id, s]));
  for (const u of U.sort((a, b) => a.id - b.id)) {
    const s = byU.get(u.id);
    console.log(`\n## [u${u.id}] ${u.slug}${u.is_active ? '' : ' (inactive)'}`);
    console.log(`Q: ${u.question}`);
    if (!s) {
      console.log('(no cached synthesis)');
      if (full) console.log(`AI_QUERY: ${clip(u.ai_query, 240)}`);
      continue;
    }
    console.log(`SHORT: ${clip(s.short_answer, 400)}`);
    console.log(`CITES(${(s.cited_video_ids || []).length}): ${(s.cited_video_ids || []).join(',')}`);
    if (full) console.log(`BODY: ${clip(paragraphsText(s.paragraphs), width)}`);
  }
  console.log(`\n(${U.length} user questions, ${byU.size} with synthesis)`);
}

function cmdBlog() {
  const sel = args[1];
  if (!sel) throw new Error('blog needs domain/category or "all"');
  const width = Number(opt('--width', 300));
  const B = load('blog_posts.jsonl');
  const rows = B.filter((b) => sel === 'all' || `${b.domain}/${b.category}` === sel).sort((a, b) =>
    (a.published_at || '').localeCompare(b.published_at || ''),
  );
  for (const b of rows) {
    console.log(`\n- ${b.slug} | ${b.title}`);
    console.log(`  sub: ${clip(b.subtitle, 200)}`);
    const src = b.source_experiencer_slug ? `exp=${b.source_experiencer_slug}` : b.source_question_slug ? `q=${b.source_question_slug}` : 'src=-';
    console.log(`  ${src} | words=${b.word_count} | tags=${(b.tags || []).join(', ')} | vids=${(b.related_video_ids || []).length} | ${(b.published_at || '').slice(0, 10)}`);
    if (width > 0) console.log(`  lead: ${clip(b.lead_paragraph, width)}`);
  }
  console.log(`\n(${rows.length} posts)`);
}

function cmdFacts() {
  const F = load('uap_daily_facts.jsonl').sort((a, b) => (a.fact_date || '').localeCompare(b.fact_date || ''));
  for (const f of F) {
    console.log(`- [${f.fact_category}] n=${f.sample_size ?? '-'} ${f.fact_date}: ${clip(f.fact_text, 400)}`);
    console.log(`    data: ${clip(JSON.stringify(f.supporting_data), 300)}`);
  }
}

function cmdThemes() {
  const P = load('experiencer_profiles.jsonl');
  const byType = opt('--by-type', false);
  const n = Number(opt('--n', 40));
  const count = (rows) => {
    const m = new Map();
    for (const p of rows) for (const t of p.core_themes || []) m.set(t, (m.get(t) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const withThemes = P.filter((p) => (p.core_themes || []).length > 0);
  console.log(`profiles=${P.length} with_themes=${withThemes.length} distinct_themes=${count(P).length}`);
  console.log(`\nTOP ${n} THEMES (all):`);
  for (const [t, c] of count(P).slice(0, n)) console.log(`${c}\t${((100 * c) / withThemes.length).toFixed(1)}%\t${t}`);
  if (byType) {
    const types = new Map();
    for (const p of P) types.set(p.experience_type || 'null', (types.get(p.experience_type || 'null') || 0) + 1);
    for (const [ty, c] of [...types.entries()].sort((a, b) => b[1] - a[1])) {
      const rows = P.filter((p) => (p.experience_type || 'null') === ty);
      console.log(`\nTYPE ${ty} (${c} profiles) top 12:`);
      for (const [t, k] of count(rows).slice(0, 12)) console.log(`${k}\t${((100 * k) / rows.length).toFixed(1)}%\t${t}`);
    }
  }
}

function profileLine(p, width) {
  const themes = (p.core_themes || []).join('; ');
  return [
    `${p.full_name} [${p.slug}]`,
    `yr=${p.first_shared_year ?? '-'} type=${p.experience_type ?? '-'} trig=${p.trigger_category ?? '-'} vids=${(p.video_ids || []).length} views=${p.total_views ?? 0}`,
    `G=${num(p.avg_greyson_score)} V=${num(p.avg_veridical_score)} T=${num(p.avg_transformation_score)} label=${p.contribution_label ?? '-'}`,
    `themes: ${clip(themes, width)}`,
    `quote: ${clip(p.highlight_quote, 160)} (${p.highlight_quote_source ?? '-'})`,
  ].join('\n    ');
}

function cmdProfiles() {
  const P = load('experiencer_profiles.jsonl');
  const width = Number(opt('--width', 260));
  const n = Number(opt('--n', 40));
  const top = opt('--top', null);
  const sample = opt('--sample', null);
  const repeat = opt('--repeat', false);
  const slug = opt('--slug', null);
  let rows = [];
  if (top) {
    const key = { views: 'total_views', transformation: 'avg_transformation_score', greyson: 'avg_greyson_score', veridical: 'avg_veridical_score' }[top];
    if (!key) throw new Error('unknown --top ' + top);
    rows = P.filter((p) => p[key] != null).sort((a, b) => b[key] - a[key] || b.total_views - a.total_views).slice(0, n);
  } else if (sample) {
    const r = rng(Number(opt('--seed', 42)));
    const idx = P.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    rows = idx.slice(0, Number(sample)).map((i) => P[i]);
  } else if (repeat) {
    rows = [...P].sort((a, b) => (b.video_ids || []).length - (a.video_ids || []).length || b.total_views - a.total_views).slice(0, n);
  } else if (slug) {
    const want = new Set(String(slug).split(','));
    rows = P.filter((p) => want.has(p.slug));
    for (const p of rows) {
      console.log(`\n# ${profileLine(p, 1000)}`);
      console.log(`    videos: ${(p.video_ids || []).join(',')}`);
      console.log(`    channels: ${(p.channel_appearances || []).map((c) => `${c.name}(${c.video_count})`).join(', ')}`);
      for (const e of p.highlight_elements || []) console.log(`    - ${e.element_label || e.name} [${e.confidence ?? '-'}] ${clip(e.quote, 220)} <${e.video_id}>`);
    }
    return;
  } else {
    throw new Error('profiles needs --top, --sample, --repeat or --slug');
  }
  rows.forEach((p, i) => console.log(`\n${i + 1}. ${profileLine(p, width)}`));
}

function cmdUap() {
  const C = load('uap_contactee_profiles.jsonl');
  const n = Number(opt('--n', 30));
  const width = Number(opt('--width', 200));
  const tally = (key, f) => {
    const m = new Map();
    for (const c of C) {
      const v = f ? f(c) : c[key];
      for (const x of Array.isArray(v) ? (v.length ? v : ['(empty)']) : [v ?? '(null)']) m.set(x, (m.get(x) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  console.log(`contactees=${C.length} anonymous=${C.filter((c) => c.is_anonymous).length}`);
  const filled = (k) => C.filter((c) => c[k] != null && !(Array.isArray(c[k]) && c[k].length === 0)).length;
  for (const k of ['experience_type', 'entity_types', 'recurrence', 'core_themes', 'summary', 'highlight_quote', 'avg_evidence_score', 'avg_contact_depth', 'avg_transformation_score'])
    console.log(`filled ${k}: ${filled(k)}`);
  console.log('\nexperience_type:');
  for (const [k, v] of tally('experience_type').slice(0, 20)) console.log(`  ${v}\t${k}`);
  console.log('\nentity_types:');
  for (const [k, v] of tally('entity_types').slice(0, 20)) console.log(`  ${v}\t${k}`);
  console.log('\nrecurrence:');
  for (const [k, v] of tally('recurrence').slice(0, 10)) console.log(`  ${v}\t${k}`);
  console.log('\ncontribution_label:');
  for (const [k, v] of tally('contribution_label').slice(0, 15)) console.log(`  ${v}\t${k}`);
  console.log('\nvideo_count distribution:');
  for (const [k, v] of tally(null, (c) => String((c.video_ids || []).length)).sort((a, b) => Number(a[0]) - Number(b[0])).slice(0, 12)) console.log(`  ${k} vids: ${v}`);
  console.log('\nfirst_shared_year:');
  for (const [k, v] of tally('first_shared_year').sort((a, b) => String(a[0]).localeCompare(String(b[0])))) console.log(`  ${k}: ${v}`);
  console.log('\ntop core_themes (profiles with themes):');
  for (const [k, v] of tally('core_themes').filter(([k]) => k !== '(empty)').slice(0, 25)) console.log(`  ${v}\t${k}`);
  const line = (c) =>
    `${c.display_name} [${c.slug}] yr=${c.first_shared_year ?? '-'} type=${c.experience_type ?? '-'} ent=${(c.entity_types || []).join('/') || '-'} rec=${c.recurrence ?? '-'} vids=${(c.video_ids || []).length} views=${c.total_views ?? 0} E=${num(c.avg_evidence_score)} D=${num(c.avg_contact_depth)} T=${num(c.avg_transformation_score)} label=${c.contribution_label ?? '-'}\n    themes: ${clip((c.core_themes || []).join('; '), width)}\n    quote: ${clip(c.highlight_quote, 160)} (${c.highlight_quote_source ?? '-'})`;
  console.log(`\nTOP ${n} BY VIEWS:`);
  [...C].sort((a, b) => (b.total_views || 0) - (a.total_views || 0)).slice(0, n).forEach((c, i) => console.log(`${i + 1}. ${line(c)}`));
  console.log(`\nTOP ${n} BY VIDEO COUNT:`);
  [...C].sort((a, b) => (b.video_ids || []).length - (a.video_ids || []).length || (b.total_views || 0) - (a.total_views || 0)).slice(0, n).forEach((c, i) => console.log(`${i + 1}. ${line(c)}`));
  const scored = C.filter((c) => c.avg_evidence_score != null);
  console.log(`\nSCORED PROFILES: ${scored.length}; TOP ${Math.min(n, scored.length)} BY avg_contact_depth then evidence:`);
  [...scored].sort((a, b) => (b.avg_contact_depth || 0) - (a.avg_contact_depth || 0) || (b.avg_evidence_score || 0) - (a.avg_evidence_score || 0)).slice(0, n).forEach((c, i) => console.log(`${i + 1}. ${line(c)}`));
}

const commands = {
  categories: cmdCategories,
  questions: cmdQuestions,
  'user-questions': cmdUserQuestions,
  blog: cmdBlog,
  facts: cmdFacts,
  themes: cmdThemes,
  profiles: cmdProfiles,
  uap: cmdUap,
};

if (!cmd || cmd === '-h' || cmd === '--help' || !commands[cmd]) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(cmd && !commands[cmd] ? 1 : 0);
}
commands[cmd]();
