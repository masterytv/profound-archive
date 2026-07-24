# The Map of the Afterlife — research pipeline

Produces `src/data/afterlife-map.json`, served at `/api/viz/afterlife-map` and rendered by
`/visualize/afterlife-map`.

The whole design follows one rule: **agents discover the vocabulary, code counts the prevalence.**
No percentage on the finished map was ever produced by a language model estimating one.

## Running it

```bash
node scratch/afterlife/00-dump-corpus.mjs      # pull corpus to disk (read-only on prod DB)
node scratch/afterlife/01-structured-stats.mjs # element prevalence + journey transition graph
node scratch/afterlife/03-mine-phrases.mjs     # full-corpus place-phrase mining
# Workflow: wf-discover.mjs   -> found/*.json      (12 researchers)
node scratch/afterlife/04-merge-verify.mjs     # verify every agent claim against the corpus
node scratch/afterlife/05-audit-packets.mjs    # blind audit packets
# Workflow: wf-audit.mjs      -> audit-out/*.json  (14 auditors + 2 reviewers)
node scratch/afterlife/06-build-map.mjs        # -> src/data/afterlife-map.json
node scratch/afterlife/07-corpus-bias.mjs      # standing bias report on the corpus itself
```

`snip.mjs` is the corpus exploration CLI the research agents use (`count`, `show`, `doc`, `sample`).
Sampling is seeded, so any agent asking the same question sees the same passages.

## Why each step exists

**People, not videos.** `07-corpus-bias.mjs` found that 57% of the corpus is repeat appearances —
one experiencer appears 35 times. Counting videos would let a few well-known voices vote over and
over. `06` collapses 6,176 accounts to **3,580 unique experiencers**; a person counts once for a
place if any of their tellings describe it, and carries their best cvNDE score.

**Two measurement methods, marked in the data as `method`.**

- `ai-extraction` (13 places) — the archive already holds a per-account judgement of the 15
  canonical NDE elements, made by reading each transcript whole. Where a place corresponds to one,
  its number comes from that. No correction needed; the interval is plain binomial.
- `pattern+audit` (the rest) — a researcher's regex selects candidates, then **auditors who did not
  propose the place** read 24 blindly-sampled matched passages and judge each one. The raw rate is
  multiplied by that measured precision.

The second method exists because the fine-grained places (a golden road, grass that is alive,
screens at the life review) have no pre-existing extraction. The first exists because regexes cannot
read negation — the audit rejected `deceased-relatives` precisely because experiencers so often say
they saw *no* relatives, which the pattern counted as a hit.

**Mean audited precision was 0.53.** Naive keyword counts were roughly double the truth. That single
number is the justification for the entire audit stage.

**Journey position is measured, not asserted.** Character offset is a poor clock (interviews open
with biography). Instead, within each account the places it mentions are ranked by first appearance,
and a place's position is its mean rank across every account mentioning it — 176 of 181 measured
this way, the rest fall back to the researcher's estimate.

**De-duplication is by matched-document overlap, not by name.** If two proposals select ~the same
accounts (Jaccard > 0.72) they are the same place whatever they were called; the loser's aliases and
quotes fold into the winner.

**Every quote is machine-verified.** `04-merge-verify.mjs` checks each quote appears verbatim in the
account it was attributed to. 802/802 passed on the discovery round; unverifiable quotes are dropped.

## Known limits (see also the in-app Method panel)

- **Precision was measured; recall was not.** Each figure is corrected downward for false positives
  but never upward for passages the pattern missed. Net bias per place is therefore unknown —
  treat numbers as floors with an unmeasured ceiling.
- **`c` is an estimated share, not a statistical confidence.** It is a rate of *mention* in a
  self-selected media corpus, not a rate of *experience* among people who came near death.
- **Selection cascade.** Survived → recalled → interpreted as an NDE → willing to say so publicly →
  found and booked by one of 59 channels (the largest is 10% of the corpus). None of that is random.
- **Interviewer effects.** A channel built on tunnels books tunnel stories. `the-other-side` is
  flagged in-data because hosts use the phrase as often as experiencers do.
- **3% of accounts are third-person retellings** rather than first-person testimony (`07`).
- Auditors proposed 133 tightened regexes; they are retained in `audit-out/` but **not applied**,
  because the measured precision belongs to the pattern it was measured on. Applying them needs a
  second audit round.

## Regenerating after a corpus change

Re-run `00`, then `04` onwards. Discovery (`wf-discover.mjs`) only needs re-running if you want new
places; the existing `found/*.json` are inputs, not caches.
