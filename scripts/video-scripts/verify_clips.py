#!/usr/bin/env python3
"""Re-check every clip in a clip CSV against nde_vids.raw_timestamped_subtitles.

For each row: re-pulls the line-level captions, finds the quote (case, punctuation and the
HTML entity &#39; ignored; bracketed editor notes stripped), and checks that
  1. the quote appears word-for-word in the captions, in order, with nothing missing;
  2. the in-point falls inside the caption line where the quote's first word appears
     (or up to 1.5 s before it), and the out-point is at or after the start of the line
     holding the last word.
Prints PASS/FAIL per row plus the caption lines between in and out for a human read.

Read-only (GET selects only). Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY.

    python3 -I scripts/video-scripts/verify_clips.py research/video-scripts/who-meets-you-clips.csv
"""
import csv, html, json, os, re, sys, urllib.request

U = os.environ['NEXT_PUBLIC_SUPABASE_URL']; K = os.environ['SUPABASE_SERVICE_KEY']
_cache = {}

def lines(vid):
    if vid not in _cache:
        req = urllib.request.Request(
            f"{U}/rest/v1/nde_vids?videoId=eq.{vid}&select=raw_timestamped_subtitles",
            headers={'apikey': K, 'Authorization': 'Bearer ' + K})
        rows = json.load(urllib.request.urlopen(req, timeout=180))
        rs = rows[0]['raw_timestamped_subtitles'] if rows else None
        rs = json.loads(rs) if isinstance(rs, str) else rs
        _cache[vid] = (rs or {}).get('data') or []
    return _cache[vid]

def words(s):
    s = html.unescape(s).lower().replace('’', "'")
    s = re.sub(r'\[[^\]]*\]', ' ', s)
    return re.findall(r"[a-z0-9']+", s)

def mmss(x): x = float(x); return f"{int(x//60)}:{x%60:05.2f}"

def check(row):
    data = lines(row['videoId'])
    if not data: return False, 'no captions', []
    i, o = float(row['in_sec']), float(row['out_sec'])
    # word stream with the caption line each word came from
    stream = []
    for li, ln in enumerate(data):
        for w in words(ln['text']): stream.append((w, li))
    q = words(row['verbatim_quote'])
    ws = [w for w, _ in stream]
    hits = [k for k in range(len(ws) - len(q) + 1) if ws[k:k+len(q)] == q]
    window = [ln for ln in data if i - 4 <= float(ln['start']) <= o]
    if not hits: return False, 'quote not found word-for-word in captions', window
    # choose the occurrence nearest the in-point
    k = min(hits, key=lambda k: abs(float(data[stream[k][1]]['start']) - i))
    first, last = data[stream[k][1]], data[stream[k+len(q)-1][1]]
    nxt = stream[k][1] + 1
    first_end = float(data[nxt]['start']) if nxt < len(data) else float(first['end'])
    problems = []
    if not (float(first['start']) - 1.5 <= i <= first_end + 0.5):
        problems.append(f"in {mmss(i)} outside first-word line {mmss(first['start'])}-{mmss(first_end)}")
    if o < float(last['start']):
        problems.append(f"out {mmss(o)} before last-word line start {mmss(last['start'])}")
    return (not problems), ('; '.join(problems) or f"quote found; first-word line {mmss(first['start'])}, last-word line {mmss(last['start'])}"), window

def main(path):
    rows = list(csv.DictReader(open(path, newline='')))
    ok = 0
    for r in rows:
        good, msg, window = check(r)
        ok += good
        print(f"[{'PASS' if good else 'FAIL'}] clip {r['clip']} {r['videoId']} {r['in_mmss']}-{r['out_mmss']}: {msg}")
        for ln in window:
            print(f"        {mmss(ln['start'])}  {html.unescape(ln['text'])}")
    print(f"\n{ok}/{len(rows)} rows pass")
    return ok == len(rows)

if __name__ == '__main__':
    sys.exit(0 if main(sys.argv[1]) else 1)
