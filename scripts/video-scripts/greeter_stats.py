#!/usr/bin/env python3
"""Reproduce every on-screen number in research/video-scripts/who-meets-you-script.md.

Read-only: issues only GET selects against PostgREST. Needs NEXT_PUBLIC_SUPABASE_URL and
SUPABASE_SERVICE_KEY in the environment (never printed). Python 3 standard library only.

    python3 -I scripts/video-scripts/greeter_stats.py

Definitions (all over confirmed NDE videos, nde_vids.isNde = 'clear_nde', joined to nde_analysis):
  - "met a being": nde_analysis.entities.encounters has at least one element
  - "met a relative": at least one encounter with entity_type = 'deceased_relative'
  - relationship: regex over that encounter's free-text `identity` field (see REL below);
    a video counts once per relationship however many encounters match
  - "go back" message: regex GOBACK over message_quote + message_summary of a relative encounter
  - "loving": emotional_quality = 'loving' over all deceased_relative encounters
  - experiencer dedupe: distinct nde_vids.experiencerFullName (lower-cased); unnamed videos count once each
"""
import json, os, re, sys, urllib.request

U = os.environ['NEXT_PUBLIC_SUPABASE_URL']; K = os.environ['SUPABASE_SERVICE_KEY']

def get_all(path):
    out, off = [], 0
    while True:
        req = urllib.request.Request(f"{U}/rest/v1/{path}", headers={
            'apikey': K, 'Authorization': 'Bearer ' + K, 'Range': f'{off}-{off+999}'})
        rows = json.load(urllib.request.urlopen(req, timeout=180))
        out += rows
        if len(rows) < 1000: return out
        off += 1000

def J(x): return json.loads(x) if isinstance(x, str) else (x or {})

REL = [
    ('grandparent', r'grand ?(m(other|a|om)|f(ather|a)|parent|pa\b|ma\b|dad)|granny|nana|nanna|abuel|vov[oó]|av[oó]|bubbe|oma\b|opa\b'),
    ('mother', r'(?<!grand)(?<!step)\b(mother|mom|mum|mama|mommy)\b(?!-in-law)'),
    ('father', r'(?<!grand)(?<!step)\b(father|dad|daddy)\b(?!-in-law)'),
    ('sibling', r'brother|sister'),
    ('aunt/uncle', r'\baunt|uncle'),
    ('spouse/partner', r'husband|wife|spouse|fianc|partner'),
    ('son/daughter', r'\bson\b|daughter|\bsons\b|children|child\b'),
]
GRANDMOTHER = re.compile(r'grand ?m(other|a|om)|grandma|granny|nana|nanna|abuela|bubbe|oma\b')
GOBACK = re.compile(r"go back|not (yet )?your time|wasn't (my|your) time|not time|return|send (you|me) back|"
                    r"sent (me|you) back|have to go|must go|stay here|can't stay|cannot stay", re.I)

vids = get_all('nde_vids?isNde=eq.clear_nde&select=videoId,experiencerFullName&order=videoId')
name = {v['videoId']: (v.get('experiencerFullName') or '').strip().lower() for v in vids}
an = [a for a in get_all('nde_analysis?select=video_id,entities&order=video_id') if a['video_id'] in name]

being, rel_v, gm_v, goback_v = set(), set(), set(), set()
by_rel = {k: set() for k, _ in REL}
rel_enc = loving = 0
for a in an:
    encs = J(a['entities']).get('encounters') or []
    if encs: being.add(a['video_id'])
    for e in encs:
        if (e.get('entity_type') or '').lower() != 'deceased_relative': continue
        rel_v.add(a['video_id']); rel_enc += 1
        loving += (e.get('emotional_quality') or '').lower() == 'loving'
        idn = (e.get('identity') or '').lower()
        if GRANDMOTHER.search(idn): gm_v.add(a['video_id'])
        for k, rx in REL:
            if re.search(rx, idn): by_rel[k].add(a['video_id'])
        if GOBACK.search(' '.join([e.get('message_quote') or '', e.get('message_summary') or ''])):
            goback_v.add(a['video_id'])

def people(s):
    named = {name[v] for v in s if name[v]}
    return len(named) + sum(1 for v in s if not name[v])

N = len(an)
print(f"GFX-1  confirmed NDE videos with analysis ........ {N:,}")
print(f"GFX-1  met at least one being .................... {len(being):,} ({100*len(being)/N:.1f}%)")
print(f"GFX-1  met a deceased relative ................... {len(rel_v):,} ({100*len(rel_v)/N:.1f}%)")
print(f"GFX-1  ...distinct experiencers (dedupe by name) . {people(rel_v):,}")
print("GFX-2  relationship of the relative (videos):")
for k, _ in REL:
    print(f"         {k:15s} {len(by_rel[k]):5,}")
print(f"GFX-2  grandmother alone ......................... {len(gm_v):,}")
print(f"GFX-3  relative's message = go back / not your time {len(goback_v):,} ({100*len(goback_v)/len(rel_v):.1f}% of relative videos)")
print(f"GFX-4  relative encounters coded loving .......... {loving:,} of {rel_enc:,} ({100*loving/rel_enc:.1f}%)")
