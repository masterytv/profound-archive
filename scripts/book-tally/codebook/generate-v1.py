"""Generates codebook-v1.json from the approved tables in codebook-v1.md. Run from this folder: python3 generate-v1.py"""
import re, json, sys
md = open('codebook-v1.md').read()
def slug(label, used):
    words = re.sub(r'\(.*?\)', '', label).lower()
    words = re.sub(r"[^a-z0-9 ]+", ' ', words).split()
    stop = {'a','an','the','of','or','and','to','by','as','is','it','in','be','at','for','with','their','they','them'}
    core = [w for w in words if w not in stop] or words
    code = '_'.join(core[:4])[:40].strip('_')
    base, i = code, 2
    while code in used: code = f"{base}_{i}"; i += 1
    used.add(code); return code
def choices(text):
    used = set(); out = []
    for lab in [c.strip().rstrip('.') for c in text.split(' · ')]:
        if lab.lower() == 'other': continue  # "other" is added to every multiple-choice item by the prompt
        lab = lab[0].upper() + lab[1:]
        out.append({'code': slug(lab, used), 'label': lab})
    return out
def strip_md(t): return re.sub(r'\*\*|\*', '', t).strip()
def yn(coded, question):
    m = re.match(r'\*\*(.+?)\*\*\s*(.*)$', coded)
    if not m and coded.startswith('Yes = '):
        m = re.match(r'()(.*)$', coded)
    if m:
        ask, rest = (m.group(1).strip() or question), m.group(2)
        means = {k.lower(): v.strip().rstrip('.') for k, v in re.findall(r'(Yes|No|Mixed) = (.+?)(?=\. (?:Yes|No|Mixed|Not addressed) =|\.?$)', rest)}
        if not means.get('yes'): raise SystemExit(f'no yes-means in: {coded}')
        return {'ask': ask, 'yes_means': means.get('yes'), 'no_means': means.get('no'), 'mixed_means': means.get('mixed')}
    m = re.match(r'Yes means (.+?)\.?$', coded)
    if not m: raise SystemExit(f'cannot parse Y/N: {coded}')
    return {'ask': question, 'yes_means': m.group(1).strip().rstrip('.'), 'no_means': None, 'mixed_means': None}
facts, items, merged = [], [], {}
# facts
for code, txt in re.findall(r'^\| (F\d) \| (.+?) \|$', md, re.M):
    key = code.lower()
    if code == 'F0':
        m = re.match(r'\*\*(.+?)\*\* \(multiple choice\): (.+)$', txt)
        facts.append({'key': key, 'type': 'mc', 'ask': m.group(1) + '?', 'choices': choices(m.group(2))})
    else:
        facts.append({'key': key, 'type': 'yn', 'ask': 'Is this true of the experiencer: ' + txt.rstrip('.') + '?', 'yes_means': txt.rstrip('.'), 'no_means': None, 'mixed_means': None})
fact_codes = {f['key'] for f in facts}
f0 = {c['label'].lower(): c['code'] for c in facts[0]['choices']}
f0['violence'] = next(c for l, c in f0.items() if l.startswith('violence'))
def cond(typ):
    m = re.search(r'\((F\d)(?: = ([^)]+))?\)', typ)
    if not m: return None
    fk = m.group(1).lower(); val = m.group(2)
    if val:
        code = next((c for lab, c in f0.items() if lab.startswith(val.lower())), None)
        if not code: raise SystemExit(f'no F0 choice for {val}')
        return {'fact': fk, 'choice': code}
    return {'fact': fk}
rows = re.findall(r'^\| (\d+) \| (.+?) \| (.+?) \| (.+?) \| (\d+) \|$', md, re.M)
assert len(rows) == 81, len(rows)
for qid, question, typ, coded, n in rows:
    qid = int(qid); question = question.strip(); typ = typ.strip(); coded = coded.strip()
    base = {'question_id': qid, 'question': question, 'first_run_addressed': int(n)}
    if 'Merged into Q' in typ:
        merged[qid] = int(re.search(r'Merged into Q(\d+)', typ).group(1)); continue
    if qid == 2:
        a, b, c = re.match(r'\*\*2a\*\* Yes means (.+?)\. \*\*2b\*\* (.+?) (As remembered .+)$', coded).groups()
        items.append({**base, 'key': 'q2a', 'part': 'a', 'type': 'yn', 'ask': 'Did the experiencer recognize deceased loved ones?', 'yes_means': a, 'no_means': None, 'mixed_means': None})
        items.append({**base, 'key': 'q2b', 'part': 'b', 'type': 'mc', 'ask': 'How did deceased loved ones look?', 'choices': choices(c)})
        continue
    if qid == 54:
        a, b = re.match(r'\*\*54a\*\* What causes them\? (.+?)\. \*\*54b\*\* Yes means (.+?)\.?$', coded).groups()
        items.append({**base, 'key': 'q54a', 'part': 'a', 'type': 'mc', 'ask': 'What causes frightening or hellish NDEs?', 'choices': choices(a)})
        items.append({**base, 'key': 'q54b', 'part': 'b', 'type': 'yn', 'ask': 'Could a frightening or hellish NDE happen to anyone?', 'yes_means': b, 'no_means': None, 'mixed_means': None})
        continue
    it = {**base, 'key': f'q{qid}', 'part': None}
    if typ == 'MC':
        it.update({'type': 'mc', 'ask': question, 'choices': choices(coded)})
    else:
        it.update({'type': 'yn', **yn(coded, question)})
        c = cond(typ) or ({'fact': 'f0', 'choice': f0['violence']} if 'broken down by F0 = violence' in typ else None)
        if c: it['subgroup'] = c
        fix = {9: 'a loved one who has reincarnated can still be met again', 48: 'they were able to forgive themselves for what they saw'}
        if qid in fix: it['yes_means'] = fix[qid]
    items.append(it)
cb = {
  'version': 'codebook-v1',
  'approved': '2026-11-18',
  'max_choices': 3,
  'counts_as_answer': ("What the experiencer experienced, or learned from their NDE, whether during it or afterwards through the understanding or "
                       "connection it gave them, at any point in the account. Not: beliefs they say they held only before the NDE, things only an "
                       "interviewer or host says, or other people's accounts."),
  'facts': facts,
  'items': items,
  'merged': {f'q{k}': f'q{v}' for k, v in merged.items()},
}
json.dump(cb, open('codebook-v1.json', 'w'), indent=2, ensure_ascii=False); open('codebook-v1.json','a').write('\n')
import collections
print('items', len(items), collections.Counter(i['type'] for i in items), 'facts', len(facts), 'merged', cb['merged'], 'subgroups', sum(1 for i in items if i.get('subgroup')))
for i in items:
    if i['type']=='yn' and i['ask']!=i['question']: print(' reworded', i['key'], '|', i['ask'], '| yes=', i['yes_means'], '| no=', i['no_means'])
