# Channel Scoring System

> Defines the formulas used to compute channel-level scores for the Channel Focus Chart,
> Universe Map, Rankings, and Personality Code.

## Data Sources

| Source | Table | Key Fields | Coverage |
|---|---|---|---|
| Intelligence Value | `uap_video_stats` | `intelligence_value` (0-30) | 2,189 videos |
| Evidence Score | `uap_encounters` | `evidence_score` (7-28) | 1,632 encounters |
| Contact Depth | `uap_encounters` | `contact_depth_score` (0-32) | 1,524 encounters |
| Transformation | `uap_encounters` | `transformation_score` (0-60) | 1,634 encounters |
| Content Type | `uap_vids` | `content_type` enum | All Tier 1+2 |
| Engagement | `uap_vids` | `view_count`, `comments_count`, `likes` | All Tier 1+2 |
| Entity Data | `uap_video_stats` | `persons_count`, `programs_count`, `dominant_entity_type` | 2,189 videos |
| Cross-entity | `uap_canonical_*` | `linked_video_ids` arrays | Fully linked |

---

## Axis 1: Intelligence Value (Y-axis on Universe Map)

**Definition:** How analytically deep and information-rich is this channel's content?

**Formula:** Average of per-video `intelligence_value` from `uap_video_stats`, normalized 0-100.

```sql
-- Per-channel Intelligence Value
SELECT
  v.channel_id,
  ROUND(AVG(s.intelligence_value) / 30.0 * 100, 1) AS intelligence_value_norm
FROM uap_vids v
JOIN uap_video_stats s ON v.video_id = s.video_id
WHERE v.tier IN (1, 2) AND v.channel_id IS NOT NULL
GROUP BY v.channel_id;
```

**Why this works:** `intelligence_value` is already a computed field that factors in claims density, programs mentioned, evidence quality, and analytical depth. Normalizing to 0-100 makes it readable.

---

## Axis 2: Speaker Credibility (X-axis on Universe Map)

**Definition:** How credible and well-sourced are the speakers and content on this channel?

**Formula:** Weighted composite of three signals, normalized 0-100:

1. **Source Diversity (40%)** — How many unique persons of interest appear (from `uap_video_stats.persons_count`). More diverse sourcing = more credible.
2. **Evidence Quality (40%)** — Average evidence_score from `uap_encounters` for this channel's videos. Higher evidence = more credible sources.
3. **Program Depth (20%)** — Average programs mentioned per video. Channels discussing specific government programs tend to have more substantive sources.

```sql
-- Per-channel Speaker Credibility
WITH channel_agg AS (
  SELECT
    v.channel_id,
    AVG(s.persons_count) AS avg_persons,
    AVG(s.programs_count) AS avg_programs,
    COUNT(DISTINCT v.experiencer_name) FILTER (WHERE v.experiencer_name IS NOT NULL) AS unique_experiencers
  FROM uap_vids v
  JOIN uap_video_stats s ON v.video_id = s.video_id
  WHERE v.tier IN (1, 2) AND v.channel_id IS NOT NULL
  GROUP BY v.channel_id
),
channel_evidence AS (
  SELECT
    v.channel_id,
    AVG(e.evidence_score) AS avg_evidence
  FROM uap_vids v
  JOIN uap_encounters e ON v.video_id = e.video_id
  WHERE v.tier IN (1, 2) AND v.channel_id IS NOT NULL AND e.evidence_score IS NOT NULL
  GROUP BY v.channel_id
)
SELECT
  ca.channel_id,
  ROUND(
    (
      -- Source diversity: avg persons per video, capped at 10, normalized
      LEAST(ca.avg_persons / 10.0, 1.0) * 40 +
      -- Evidence quality: avg evidence score (7-28) normalized to 0-40
      COALESCE((ce.avg_evidence - 7.0) / 21.0, 0.5) * 40 +
      -- Program depth: avg programs per video, capped at 5, normalized
      LEAST(ca.avg_programs / 5.0, 1.0) * 20
    ),
    1
  ) AS credibility_score_norm
FROM channel_agg ca
LEFT JOIN channel_evidence ce ON ca.channel_id = ce.channel_id;
```

---

## Channel Focus Chart: 4-Axis Diamond

The chart splits into two groups:

**Research Elements (Right side):**

| Axis | Source | Normalization |
|---|---|---|
| Intelligence Value | `uap_video_stats.intelligence_value` avg | 0-30 -> 0-100 |
| Speaker Credibility | Composite (see above) | 0-100 |

**Encounter Elements (Left side):**

| Axis | Source | Normalization |
|---|---|---|
| Encounter Depth | `uap_encounters.contact_depth_score` avg | 0-32 -> 0-100 |
| Impact | `uap_encounters.transformation_score` avg | 0-60 -> 0-100 |

### Encounter Score & Research Score

Composite ratios normalized against the archive average:

```sql
-- Raw encounter = (encounter_depth + impact_score) / 2 per channel
-- Raw research  = (intelligence_value + credibility_score) / 2 per channel
-- encounter_score = raw_encounter / AVG(raw_encounter across all channels)
-- research_score  = raw_research  / AVG(raw_research  across all channels)
```

- `1.0×` = archive average
- `2.0×` = twice the average (strong in that domain)
- `0.5×` = half the average (weak in that domain)

Channel Focus label:
| Ratio (E/R) | Label |
|---|---|
| > 1.5 | Encounter-Focused |
| 1.1 - 1.5 | Encounter-Leaning |
| 0.9 - 1.1 | Balanced |
| 0.67 - 0.9 | Research-Leaning |
| < 0.67 | Research-Focused |

## Channel Archetype Classification

Computed from `content_type` distribution per channel:

| Archetype | Dominant Content Types |
|---|---|
| Deep Intelligence | research_analysis >= 30% OR investigative_journalism >= 15% |
| First Person Encounters | first_person >= 30% |
| Documentary | documentary_survey >= 20% OR retold_encounter >= 25% |
| News & Commentary | news_commentary >= 20% OR program_disclosure >= 40% |
| Interview Hub | interview >= 40% |
| Advocacy & Disclosure | program_disclosure >= 30% AND first_person >= 15% |

**Primary:** Highest-scoring archetype by content_type percentage match.
**Secondary/Tertiary:** Next two highest.

---

## Channel Personality Code (3-letter)

| Dimension | Option A | Option B | Threshold |
|---|---|---|---|
| Content Focus | **I**(ntelligence) | **E**(ncounters) | I if research_analysis + program_disclosure + investigative > first_person + interview |
| Style | **D**(eep-dive) | **B**(readth) | D if avg video duration > 30 min |
| Tone | **A**(nalytical) | **N**(arrative) | A if avg intelligence_value > median across all channels |

---

## Rankings

| Metric | Source | Computation |
|---|---|---|
| Archive Rank | `uap_vids` count per channel | RANK() OVER (ORDER BY count DESC) |
| Views Rank | `uap_vids` sum(view_count) | RANK() OVER (ORDER BY sum DESC) |
| Engagement Rate | avg(comments_count / view_count) | vs archive avg |
| Volume Intensity | count / months_active | videos per month |
| Views-per-Video | sum(view_count) / count | vs archive avg |

**Badge Tiers:** Top 5 (green), Top 10 (blue), Top 25 (bronze), no badge (below 25)

---

## Diversity Index (Shannon)

```
H = -SUM(p_i * ln(p_i))
```

Where `p_i` is the proportion of each content_type in the channel's archive. Higher H = more diverse. Normalize to 0-1 by dividing by ln(N) where N = number of distinct content types in the entire archive.

---

## Guest Prominence Index (GPI)

**Definition:** Composite metric measuring the caliber of guests/persons of interest featured on a channel per year.

**Formula:**
```
normalized_cred = (avg_credibility_score / 85) × 100
normalized_mentions = ln(avg_mentions + 1) / ln(max_mentions + 1) × 100

GPI = normalized_cred × 0.6 + normalized_mentions × 0.4
```

- `avg_credibility_score` is per-person from `uap_canonical_persons.avg_credibility_score` (0–85 range)
- `total_mentions` is cross-archive count from `uap_canonical_persons.total_mentions`
- If no credibility data exists for that year's guests, GPI falls back to 100% normalized_mentions
- Log normalization prevents high-mention outliers (Elizondo, Grusch) from dominating

**Data Sources:** `uap_canonical_persons.avg_credibility_score`, `uap_canonical_persons.total_mentions`, `uap_canonical_persons.linked_video_ids`, `uap_vids.date`

---

## Score History (Trajectory Tracking)

**Table:** `uap_channel_score_history`

Monthly snapshots of `uap_channel_scores` for trajectory visualization.

| Column | Type | Description |
|---|---|---|
| channel_id | TEXT | FK to uap_channels |
| snapshot_month | DATE | First of month (e.g. 2026-05-01) |
| intelligence_value | NUMERIC(5,1) | Y-axis score at that month |
| credibility_score | NUMERIC(5,1) | X-axis score at that month |
| encounter_depth | NUMERIC(5,1) | Encounter depth at snapshot |
| impact_score | NUMERIC(5,1) | Impact score at snapshot |
| authority_score | NUMERIC(5,1) | Composite authority |
| letter_grade | TEXT | Grade at snapshot |

**Cron:** `POST /api/cron/channel-score-snapshot` — runs 1st of each month via GHA.
**Trajectory arrows:** Compare current position to 12-month-ago snapshot. Green arrow = improvement, gray = decline. Only rendered if movement ≥2 units on either axis.

---

## Automated Recomputation

Scores are recomputed weekly via pg_cron:

| Schedule | Job | Endpoint |
|---|---|---|
| **Sundays 5:00 UTC** | Entity Normalization | `POST /api/cron/normalize-entities` |
| **Sundays 5:30 UTC** | Channel Score Recomputation | `POST /api/cron/recompute-channel-scores` |

**Entity normalization runs first** so channel scores are computed against deduplicated data.

**Implementation:** `src/lib/pipeline/compute-channel-scores.ts` (scores), `src/lib/pipeline/normalize-entities.ts` (entities).

**pg_cron triggers:** `trigger_recompute_channel_scores()`, `trigger_normalize_entities()` — use Vault secrets `uap_processor_url` + `uap_processor_cron_secret`.
