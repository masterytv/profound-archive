# Project Profound corpus atlas: the statistical half

This document is the curated reading of the tables produced by `scripts/corpus-atlas/aggregate.mjs` from the 2026-09-08 JSONL pull of the database (`scratch/corpus-atlas/`). It is written for someone who has to generate book ideas from the archive without reading transcripts. Every number below comes from a table in `research/corpus-atlas/stats/tables.md` (table ids are given in brackets); the same tables are machine-readable in `stats/nde.json`, `stats/uap.json`, `stats/cross.json` and `stats/channels.json`. Top-25 lists with video ids live in `research/corpus-atlas/appendix-top-lists.md`.

Conventions: percentages are one decimal over the denominator stated ("n="). NDE statistics are restricted to confirmed NDEs (`isNde=clear_nde`, n=6304) joined to their `nde_analysis` row. Categorical values were trimmed, lowercased, and spaces or hyphens replaced with underscores; no categories were invented. Rows marked `analysis_failed` are excluded from numeric score tables. Where a field is null for a share of rows, that share is stated once and the table uses the non-null rows.

## 1. Corpus at a glance

**NDE side.** 6,304 confirmed NDE videos, all 6,304 with an `nde_analysis` row (`nde_analysis` has 6,822 rows; the other 518 belong to videos that were not classified `clear_nde` and are ignored throughout). Uploads run from 2011-06-22 to 2026-09-07 across 61 distinct channel names (54 distinct channel ids). Total views 427,152,469; median 6,983 views per video; mean 67,759. The AI analysis was written by two models: Grok 4 Fast (4,690 videos, 74.4%) and gpt-4o-mini (1,612, 25.6%), with 2 videos still pending [nde-glance].

Field coverage among the 6,304 [nde-coverage]: experience type, trigger, tone, intensity, journey type, entities and summary are 100% populated; Greyson total, Greyson breakdown, transformation score and domain analysis are 99.9% (6,295; 9 failed); core elements as a 15-element array 99.8% (6,289); phenomenology 99.8% (6,292); content-safety flags 99.8% (6,291); veridical (rvnde) score 100% (6,302). A non-empty journey sequence exists for 88.2% (5,559); the other 745 are `journey_valid=false` rows with empty sequences. `experiencerFullName` is filled for 89.8% (5,661). Upload date is present for 98.1% and `duration` for only 25.6% (1,614). Six `nde_analysis` columns are null on every row: `intensity_level`, `meets_nde_criteria`, `meets_cutoff_criteria`, `total_nde_c_score`, `nde_c_breakdown`, `primary_phenomenology`.

**UAP side.** 8,394 tier 1-2 videos: 3,045 on the `encounters` track (tier 1) and 5,349 on the `program` track (tier 2), from 80 distinct channels, uploaded 2006-11-25 to 2026-09-06. Total views 1,185,681,440; median 13,223.5; mean 141,388. There are 7,017 encounter rows (7,011 on tier 1-2 videos) spread over 4,004 videos (47.7% of the tier 1-2 set), and 7,607 `uap_video_stats` rows (7,591 in the tier 1-2 set). The knowledge base holds 831 events, 5,108 canonical persons, 1,824 organizations, 1,810 programs and 3,440 contactee profiles [uap-glance]. Coverage [uap-coverage]: summary 90.4%, content type 91.7%, source type 91.1%, experiencer name 46.1%, intake complete 90.3%. Always-null: `uap_vids.location`, `uap_encounters.vallee_type`, the encounter `segment_*_char` offsets, and `experience_type`, `recurrence` and `entity_types` on contactee profiles.

**Side by side** [cross-size, cross-year]: the UAP corpus is a third larger by count and nearly three times larger by views, but it is mostly not first-person (10.6% of typed videos are `first_person`; 10.6% of sourced videos are `direct_experiencer`), whereas every confirmed NDE video is a first-person account by construction. Both corpora are recent: 75.2% of dated NDE videos and 67.8% of UAP videos were uploaded in 2023 or later. Only one channel id appears in both domains [cross.json extra.channel_overlap].

## What the corpus already says about itself

> Condensed from `appendix-syntheses.md` section A, which digests the 147 cached Big Question answers, the 231 blog posts, and the experiencer profiles.

**Coverage of the 81 curated Big Questions.** Twelve categories, all about the human stakes of dying rather than the phenomenon: Seeing Our Loved Ones Again (9), Suicide and Tragic Death (8), Signs, Dreams and Messages (7), What Dying Actually Feels Like (7), The Life Review (7), What the Afterlife Is Like (7), and six each on Pets, Children and Pregnancy Loss, Hell and Judgment, Will I Still Be Me, God and Religion, Why We're Here. Written for the grieving and the frightened; nothing on evidence, veridical perception, the brain, blind or child experiencers, combat, or what an NDE does to a marriage or career. Every answer rests on at most 4 cited videos (283 distinct videos for the curated set, out of 6,304 clear-NDE videos); one video, joTJaIvMA2Q (Anne Bayford, The Other Side NDE), is cited in 10 answers. All 81 are flagged needs_refresh.

**Most confident, most repeated claims** (five or more answers each):

1. No one dies alone; someone, usually a grandmother or a pet, was chosen to wait for you (q1, q7, q20, q26, q41; u54, u61, u66, u75, u76, u103).
2. The moment of death is peaceful and painless even when violent or sudden; pain stays with the body (q25, q29, q37, q38, q39, q55, q75; u55, u58, u59, u64, u65, u83).
3. The life review is self-judgment inside unconditional love; you feel what you made others feel, and small kindnesses weigh most (q44 to q50, q52, q53; u72, u80).
4. You stay yourself, humor included, even while merging with something larger (q57, q59, q60; u40, u42, u56).
5. Belief does not matter, treatment of people does; the divine takes a form you will recognize (q63 to q68; u84).
6. Suicide and overdose meet compassion and regret, never damnation (q22, q23, q24, q28; u77, u82).
7. Pets are there, restored, and carry no blame (q10 to q15; u57, u62, u67).
8. Fear of death disappears afterward; the brain receives consciousness rather than producing it (q43, q62; u30, u47).

**Hedges and contradictions.** Hell: q51 says most report no literal hell and q54 puts distressing NDEs at 10 to 20 percent with a way out, while ten hell stories plus Angie Fenimore's "dark realm" (Howard Storm, Dominic, Jay, Ryan Cook's "seven levels of torment", Joel Brim's "hell's eternal torment", Karl Falken, Bridgette, Amir, both McDaniels) frame it as literal and sometimes eternal. Abusers waiting: q8 is confident about forgiveness; u51, the same question retrieved again, says the accounts never describe it. Suffering: q67 gives an answer ("muted extremes"); u85 says the answers do not translate back. Appearance of the dead: q2 and u74 both admit "exactly as they died" and "young again". Pre-birth planning (q21, q77, q81) sits beside u44 and u45 (mistakes allowed, plan flexible). Time is "does not exist" (u29), "runs slower" (q72) and "boredom requires time" (q71). The engine also refuses honestly: u32 (lying) and u78 admit it has nothing.

**What the user questions reveal.** Only about 30 of the 83 are real visitor questions; the rest are internal link anchor text (u51 to u85), UAP question slugs routed to the NDE engine (u68 to u71, u86 to u91), duplicates, and a captured hotline link (u102). The genuine ones ask what the curated set avoids: are NDEs real, memory distortion, residual brain activity (u18, u31, u47); blind people (u48); children (u39); angels (u33); karma, lying, mistakes (u28, u32, u44, u45); why accounts differ (u26); do Christians see Buddha (u20, u21, u24); aliens (u49); battlefields (u52); "I'm thinking of committing suicide, what will I find" (u23, u25, unanswered); and three times "what does it all mean" (u98 to u100, unanswered). Readers want evidence, edge cases and a summary; the curated set offers consolation.

**Blog coverage.** 231 posts: 81 NDE big-question essays mirroring the curated questions, 111 NDE stories, 4 NDE guides (all about evidence), 35 UAP big-question posts, and no UAP stories or guides. Stories cover 108 experiencer slugs, every profile above 1M views and 101 of the 144 above 500k; subjects are 100 NDE, 1 OBE, 1 SDE, mostly Bridge Builders (77), triggered by accident (25), medical crisis (17), illness (13), surgery (13), overdose (7), cardiac arrest (7). Nothing on ADC, STE, deathbed visions, combat, non-English experiencers, or anyone below 250k views. Duplicates: John Davis, "Kevin" (slug lee) and David Williamson have two stories each; Vincent/Vinney/Vinnie Tolman three under different slugs; Tony Cicoria/Sicoria, Jeff Olsen/Jeffrey Olson, Kathy/M.K. McDaniel two each; Anita Moorjani once under dean-radin.


## 2. NDE distributions

### 2.1 Experience type, trigger, tone, intensity, journey type

Experience type (n=6304) [nde-experience-type]: `nde` 90.5% (5,702), `obe` 2.8% (178), `sde` (shared death) 2.6% (166), `ste` (spiritually transformative) 2.1% (130), `adc` (after-death communication) 1.2% (75), `other` 0.6% (39), `analysis_failed` 0.2% (13), `meditation` 1. Confidence is 90 or 95 for 90.5% of videos [nde-experience-type-confidence].

Trigger category (n=6304) [nde-trigger]: accident 20.9%, unknown 17.3%, medical_crisis 13.1%, illness 10.9%, surgery 10.6%, cardiac_arrest 7.0%, near_drowning 5.5%, childbirth 3.6%, overdose 3.4%, other 2.7%, suicide_attempt 2.7%, allergic_reaction 0.8%, combat 0.7%, meditation 0.3%. A long tail of 18 values with fewer than 10 videos each (car_accident 9, child_death 8, childhood_abuse 4, fire 4, gunshot 4, and singletons such as lightning_strike, skydiving, electrocution, stroke) shows the classifier occasionally inventing sub-categories; these were kept as they appear.

Overall tone (n=6304) [nde-tone]: very_positive 64.4% (4,060), positive 27.1% (1,706), mixed 6.2% (392), very_negative 1.5% (97), neutral 0.8% (48), negative 1. Intensity (n=6304) [nde-intensity] is compressed at the top: 9 = 42.3%, 8 = 42.1%, 10 = 7.3%, 7 = 6.9%; everything at 6 or below is 1.4% (91 videos), including 20 values of -1 or 0 that look like failed scoring.

Journey type (n=6304) [nde-journey-type]: positive 79.4% (5,005), neutral 11.8% (744), mixed 4.7% (295), distressing 4.0% (250), analysis_failed 10. `journey_valid` is true for 91.2% [nde-journey-valid]. The "scale agreement" label [nde-scale-agreement] calls 85.8% Deep NDE, 10.4% Moderate, 2.2% Mild and 1.6% (102) Not NDE, even though every one of these videos was admitted as `clear_nde` upstream.

### 2.2 Greyson scale

Observed range 0-32, mean 26.16, median 29 (n=6295) [nde-greyson-values]. The distribution is a spike, not a bell: exactly 30 accounts for 49.2% (3,097 videos); 24 is next at 10.2%, then 20 (8.3%), 25 (7.2%), 27 (7.0%), 22 (5.0%). Only 7 videos score above 30 (six at 32, one at 31) and 94 score exactly 0.

| Greyson band | n | pct |
| --- | --- | --- |
| 24-32 | 5,018 | 79.7 |
| 16-23 | 982 | 15.6 |
| 8-15 | 194 | 3.1 |
| 0-7 | 101 | 1.6 |

[nde-greyson-bands, n=6295]

Item-level scores (0/1/2 per item, n about 6,290 per item) [nde-greyson-items] rank: sudden_understanding 1.90 (91.4% score 2), peace_pleasantness 1.89, thought_speed 1.80, unearthly_world 1.79, cosmic_unity 1.78, enhanced_senses 1.77, out_of_body 1.72, joy 1.65, mystical_being 1.59, esp 1.51, life_review 1.49, brilliant_light 1.49, border_point_no_return 1.47, time_distortion 1.46, then a sharp drop to spirits_deceased 0.95 (39.5% score 0) and precognition 0.64 (53.6% score 0). In other words, the two least-endorsed Greyson items are the two that make checkable claims about the world (meeting the dead, seeing the future).

### 2.3 Transformation score

Observed range 0-45, mean 28.87, median 30 (n=6295, 9 failed excluded) [nde-transformation-values]. Two spikes dominate: 30 (25.9%, 1,633) and 36 (25.8%, 1,621), followed by 24 (9.1%), 22 (6.1%), 38 (5.6%), 20 (5.4%). 190 videos (3.0%) score 0 ("No Transformation Discussed").

| Transformation band | n | pct |
| --- | --- | --- |
| 40-50 | 124 | 2.0 |
| 30-39 | 4,016 | 63.8 |
| 20-29 | 1,543 | 24.5 |
| 10-19 | 415 | 6.6 |
| 1-9 | 7 | 0.1 |
| 0 | 190 | 3.0 |

[nde-transformation-bands, n=6295]

Classification (n=6304) [nde-transformation-class]: Significant 45.0%, Major 39.0%, Moderate 11.8%, No Transformation Discussed 3.0%, Comprehensive Profound 0.8% (51), Minimal 0.3% (21). The classification is not a clean function of the score [nde-x-class-by-transformation-band]: in the 20-29 band 342 videos are Moderate and 1,201 Significant; in the 30-39 band 1,633 are Significant and 2,383 Major; in 40-50, 73 are Major and 51 Comprehensive. Breadth (domains affected, n=6295) [nde-transformation-breadth] is 8 for 45.2%, 7 for 27.1%, 6 for 20.0%; mean 6.97. The two models split the corpus almost identically on these scores (mean transformation 29.0 vs 28.6; share at exactly 30 = 25.8% vs 26.2%; share at 36 = 26.0% vs 25.0%), so the spikes are a property of the rubric, not of one model [nde-x-scores-by-model].

**Transformation domains ranked by mean score** (0-5 scale, mean over videos where the domain is present; n=6295 with domain analysis) [nde-transformation-domains]:

| Code | Domain | Present pct | Mean | pct >= 4 | Dominant direction |
| --- | --- | --- | --- | --- | --- |
| SA | Spiritual Awareness | 98.8 | 4.27 | 92.2 | up 6,030 |
| PD | Purpose, Meaning and Life Direction | 90.1 | 3.76 | 76.2 | up 5,475 |
| AD | Attitude Toward Death | 97.4 | 3.57 | 65.4 | down 5,893 (fear of death falls) |
| SI | Self-Perception and Identity | 99.9 | 3.39 | 54.9 | up 6,075 |
| CC | Compassion and Concern for Others | 99.4 | 3.17 | 41.1 | up 6,067 |
| VP | Values and Priorities | 87.0 | 3.08 | 28.1 | down 5,273 (materialism falls) |
| AL | Appreciation for Life | 100.0 | 2.87 | 26.7 | up 6,100 |
| PE | Psychic and Expanded Perception | 43.3 | 2.82 | 23.4 | up 2,042, new 486 |
| RO | Religious Orientation | 55.6 | 2.37 | 9.6 | shifted 2,675, mixed 302, up 286, down 42 |
| RS | Relationships and Social Dynamics | 27.5 | 1.96 | 0.4 | mixed 1,540 |

The free-text "dominant themes" (up to three per video, 18,315 mentions, 2,401 distinct strings after lowercasing) [nde-transformation-themes] are led by "spiritual awakening" 17.5%, then "empathy and compassion" 3.8%, "transformation of identity" 3.7%, "transformation of self" 3.3%, "spiritual growth" 2.6%, "spiritual connection" 1.9%, "life purpose" 1.7%; the tail is 45.5% of mentions.

### 2.4 Veridical (rvnde) score

Observed range 7-28, mean 11.21, median 10 (n=6302) [nde-rvnde-values]. The floor value 7 is the single most common score (25.5%, 1,606 videos) and 10 is next (18.1%); the score never reaches its nominal top. Bands [nde-rvnde-bands]: 0-9 = 40.3%, 10-14 = 40.1%, 15-19 = 11.9%, 20-24 = 6.5%, 25-32 = 1.1% (69 videos). Levels [nde-rvnde-level]: Low Evidential Strength 73.4%, Moderate 14.9%, High 8.8% (553), Exceptional 2.9% (185). The two scoring runs used different key names and, apparently, different scales for the seven criteria (for example medical_state_severity averages 2.97 under the c1..c7 schema used by Grok and 1.99 under the long-name schema used by gpt-4o-mini; mean rvnde by model is 11.9 vs 9.3), so criterion-level comparisons should stay within one schema [nde-rvnde-criteria, nde-x-scores-by-model].

### 2.5 The 15 core elements

n=6289 videos with a 15-element array [nde-core-elements]:

| Element | Present pct | Mean confidence |
| --- | --- | --- |
| feelings_of_peace | 93.0 | 84.5 |
| out_of_body | 83.7 | 87.7 |
| choice_to_return | 78.4 | 84.8 |
| otherworldly_realm | 74.8 | 80.5 |
| enhanced_senses | 74.1 | 75.8 |
| knowledge_download | 61.5 | 79.5 |
| cosmic_unity | 61.1 | 78.8 |
| bright_light | 60.4 | 82.6 |
| telepathy | 60.0 | 76.7 |
| time_distortion | 58.8 | 73.6 |
| being_of_light | 54.7 | 80.8 |
| life_review | 49.3 | 81.3 |
| deceased_relatives | 39.9 | 79.9 |
| border_boundary | 37.6 | 74.6 |
| tunnel | 23.9 | 80.6 |

The number of elements present per video peaks at 10 (11.4%) with a broad plateau from 8 to 13; 2.8% (177) have all fifteen and 1.0% (60) have none [nde-core-elements-count]. The rates are within 3 points of the site's cached `nde-elements` graph computed on 2026-05-26 over 5,031 experiences, so the corpus has grown by about 1,250 analyzed videos without changing shape [cross-nde-elements-cache-vs-now].

**Top 15 co-occurring pairs** (share of the 6,289 videos with both present; lift = P(both) / P(a)P(b)) [nde-core-element-pairs]: feelings_of_peace + out_of_body 79.8% (lift 1.02); choice_to_return + feelings_of_peace 75.2%; enhanced_senses + feelings_of_peace 71.7%; feelings_of_peace + otherworldly_realm 71.6%; choice_to_return + out_of_body 70.9% (1.08); otherworldly_realm + out_of_body 66.6%; enhanced_senses + out_of_body 66.4%; choice_to_return + otherworldly_realm 63.5%; enhanced_senses + otherworldly_realm 63.0% (1.14); choice_to_return + enhanced_senses 62.4%; cosmic_unity + feelings_of_peace 60.3%; feelings_of_peace + knowledge_download 59.9%; bright_light + feelings_of_peace 59.2%; feelings_of_peace + telepathy 58.1%; feelings_of_peace + time_distortion 57.1%. Because peace and OBE are near-universal, count-ranked pairs are uninformative; the pairs that actually travel together (highest lift among pairs with at least 200 videos) [nde-core-element-pairs-lift] are border_boundary + tunnel (lift 1.53, 13.7% of videos), bright_light + tunnel (1.38, 20.0%), being_of_light + border_boundary (1.33, 27.3%), being_of_light + bright_light (1.32, 43.7%), cosmic_unity + knowledge_download (1.31, 49.1%), life_review + tunnel (1.29), being_of_light + tunnel (1.28), knowledge_download + life_review (1.27, 38.7%). The classic "tunnel to light to being to border" script is real but minoritarian: the tunnel appears in under a quarter of accounts.

### 2.6 Entities and beings

Every confirmed video has an `entities` object; 5,901 (93.6%) list at least one being, and there are 12,135 entity encounters in total [nde-entity-count]: one being 35.1%, two 31.7%, three 17.4%, four 6.3%, five or more 2.9%, none 6.4%.

Entity types across all 12,135 encounters [nde-entity-types]: religious_figure 24.9%, deceased_relative 21.4%, unknown 14.3%, group 11.8%, angel 9.0%, guide 8.1%, being_of_light 4.0%, deceased_friend 3.2%, animal 1.6%, shadow_figure 0.6% (76), demon 0.3% (39), plus a tail of 29 rarely used labels (deceased_pet 11, demonic 6, guardian_angel 6, historical_figure 3, deity 3, living_relative 3, political_figure 2, scientist 2). By video [nde-entity-any-type, n=6304]: 39.2% of videos include at least one religious figure, 30.7% a deceased relative, 22.9% an unknown being, 21.8% a group, 16.2% an angel, 14.5% a guide, 7.5% a being of light, 5.3% a deceased friend, 2.7% an animal, 1.2% a shadow figure, 0.5% a demon. The dominant type per video (n=5677) [nde-entity-dominant] is religious_figure 32.4%, deceased_relative 16.7%, guide 10.6%, unknown 9.4%, angel 7.7%, group 7.0%, being_of_light 6.4%, none 6.3%.

How they communicate (n=12135) [nde-entity-communication]: verbal 32.7%, telepathy 24.7%, presence_only 18.2%, emotional 10.9%, not_stated 9.8%, none 1.0%, auditory 0.9%, gesture 0.5%. Emotional quality [nde-entity-emotion]: loving 64.0%, neutral 16.7%, peaceful 7.8%, authoritative 3.3%, frightening 2.9% (356), mixed 1.1%, stern 0.7%. Luminosity is unstated for 52.1% (not_stated plus not_described), radiant 34.9%, normal 6.1%, glowing 3.9%, dark 2.6% [nde-entity-luminosity]. Gender: male 35.1%, not stated 33.3%, female 19.0%, non_physical 11.1%, androgynous 1.0% [nde-entity-gender]; apparent age: not stated 50.4%, ageless 31.0%, young 8.3%, elderly 6.1%, middle_aged 3.4% [nde-entity-age].

### 2.7 Journey shapes

5,559 videos have a non-empty ordered `journey_sequence`; the journey vocabulary (118 distinct labels, dominated by 30) is separate from the 15 core elements [nde-journey-elements]. Sequences are usually 8-10 steps long (8 = 19.5%, 9 = 20.0%, 10 = 16.9%; range 2-12) [nde-journey-length].

Most common first element (n=5559) [nde-journey-first]: observing_body 46.0%, void_darkness 41.9%, bright_light 5.8%, tunnel 3.1%, everything else under 0.5%. Most common last element [nde-journey-last]: sudden_return 49.6%, return_unclear 21.5%, choice_to_return 17.1%, forced_return 10.4%. So the archive's modal story opens with either watching one's own body or entering darkness, and closes with an abrupt return; only 17.1% end on a chosen return and 10.4% on being sent back against their will.

Elements present anywhere in the sequence (share of the 5,559): choice_to_return 80.9%, peace_calm 60.0%, life_review 58.6%, void_darkness 57.3%, sudden_return 56.3%, observing_body 53.5%, knowledge_download 52.1%, being_of_light 50.9%, cosmic_unity 49.8%, bright_light 35.3%, otherworldly_realm 31.9%, love_unconditional 29.4%, forced_return 27.0%, deceased_relatives 26.5%, return_unclear 26.0%, beings_entities 23.0%, tunnel 18.0%, fear_distress 16.2%, future_visions 12.8%, joy_bliss 11.1%, telepathy 10.2%, celestial_music 9.7%, hellish_realm 4.4%, religious_figure 2.5%.

Top 10 three-step sequences (35,792 consecutive triples) [nde-journey-trigrams]: knowledge_download > choice_to_return > sudden_return (496); life_review > knowledge_download > choice_to_return (475); life_review > choice_to_return > sudden_return (361); cosmic_unity > choice_to_return > sudden_return (355); life_review > knowledge_download > cosmic_unity (328); knowledge_download > cosmic_unity > choice_to_return (321); choice_to_return > forced_return > sudden_return (297); being_of_light > life_review > knowledge_download (217); observing_body > peace_calm > deceased_relatives (215); cosmic_unity > life_review > choice_to_return (190). The strongest two-step transitions [nde-journey-bigrams] are choice_to_return > sudden_return (2,132), life_review > knowledge_download (1,100), observing_body > peace_calm (1,036), knowledge_download > choice_to_return (974) and void_darkness > fear_distress (389, the most common doorway into distress).

### 2.8 Phenomenology and emotion

n=6292 [nde-pheno-*]: the experience is rated "more real" than ordinary life in 95.1% of videos (surreal 0.9%, dreamlike 0.4%, equally_real 6 videos); vividness is 10/10 for 49.0% and 9/10 for 42.1%; thought speed is "timeless" 79.5% and "normal" 17.6%; memory "perfect_recall" 74.1% and "vivid" 21.8%; self-awareness "heightened" 97.4%; clarity "enhanced" 97.1%. Senses active: visual 95.8% (extraordinary 91.0%), kinesthetic 92.6% (81.9%), auditory 83.9% (60.3%), tactile 67.3% (38.8%), olfactory 9.1% (4.5%), gustatory 3.8% (1.4%) [nde-pheno-senses]. The emotional arc (n=6259 with a progression) opens in fear for 35.0% of videos (then confusion 9.4%, curiosity 4.9%, peace 4.4%, love 4.1%, joy 3.4%, pain 3.0%, panic 3.0%) [nde-pheno-emotion-first] and closes on determination 8.3%, gratitude 8.2%, peace 7.9%, hope 7.1%, joy 7.1%, acceptance 5.9%, relief 5.0%, love 4.5%, but also confusion 3.7% and sadness 2.8% [nde-pheno-emotion-last]. Across all 29,934 emotion steps, fear is the single most frequent emotion (10.8%), ahead of joy 8.5%, love 8.5% and peace 8.2% [nde-pheno-emotion-all].

### 2.9 Content safety

n=6291 [nde-safety-flags]: distressing_content 16.8% (1,058), medical_graphic 11.0% (691), suicide_related 6.9% (433), self_harm 4.3% (271), child_death 3.5% (222). Warning level: none 75.1%, moderate 12.1%, mild 11.9%, severe 0.9% (54) [nde-safety-warning]; `overall_safe` is false for 13.5% (848) [nde-safety-overall].

## 3. NDE cross-tabs

**Tone by trigger** (row %, n per row) [nde-x-tone-by-trigger]. Very-negative tone is rare everywhere but concentrates in overdose (5.2% of 212), suicide_attempt (4.7% of 169, plus the highest mixed share at 15.4%), combat (4.9% of 41), other (4.1%) and unknown (3.3% of 1,089); it is 0.2-0.5% for accident, surgery, cardiac arrest and near-drowning. Very-positive tone peaks for cardiac_arrest 75.0%, surgery 73.2%, medical_crisis 72.6%, near_drowning 71.8%, childbirth 70.4%, and is lowest for unknown 46.3%, other 48.8% and suicide_attempt 50.3%. The same pattern holds for distressing journeys [nde-x-journey-by-trigger]: overdose 13.7% and suicide_attempt 13.6% distressing versus 0.9-1.6% for childbirth, near-drowning, accident and surgery.

| Trigger (n) | very_positive % | positive % | mixed % | very_negative % | distressing journey % |
| --- | --- | --- | --- | --- | --- |
| accident (1,317) | 65.2 | 27.4 | 7.1 | 0.2 | 1.6 |
| unknown (1,089) | 46.3 | 39.7 | 7.2 | 3.3 | 5.3 |
| medical_crisis (825) | 72.6 | 21.2 | 5.0 | 1.1 | 4.0 |
| illness (684) | 69.2 | 23.7 | 5.1 | 1.6 | 5.0 |
| surgery (669) | 73.2 | 22.3 | 3.9 | 0.4 | 1.6 |
| cardiac_arrest (440) | 75.0 | 18.9 | 5.5 | 0.5 | 4.1 |
| near_drowning (344) | 71.8 | 23.0 | 4.4 | 0.3 | 1.2 |
| childbirth (226) | 70.4 | 22.1 | 6.6 | 0.9 | 0.9 |
| overdose (212) | 66.0 | 22.6 | 6.1 | 5.2 | 13.7 |
| suicide_attempt (169) | 50.3 | 29.6 | 15.4 | 4.7 | 13.6 |

**Mean scores by trigger** [nde-x-scores-by-trigger]: the `unknown` trigger group is the outlier on every scale (mean Greyson 22.5 vs 26.6-27.4 for the named medical triggers; transformation 24.7 vs 29-31; rvnde 9.1 vs 10.8-12.6; intensity 7.84 vs 8.4-8.7), which suggests that when the summary cannot name a cause the account is also thinner. Surgery (12.6), cardiac arrest (12.4) and near-drowning (12.3) have the highest mean veridical scores; allergic_reaction has the highest mean transformation (32.2, n=52).

**Transformation classification by Greyson band** (row %) [nde-x-transformation-by-greyson]:

| Greyson band (n) | None % | Minimal % | Moderate % | Significant % | Major % | Comprehensive % |
| --- | --- | --- | --- | --- | --- | --- |
| 0-7 (101) | 64.4 | 4.0 | 26.7 | 4.0 | 1.0 | 0.0 |
| 8-15 (194) | 19.1 | 2.1 | 34.0 | 36.6 | 8.2 | 0.0 |
| 16-23 (982) | 5.7 | 1.2 | 22.4 | 53.6 | 17.1 | 0.0 |
| 24-32 (5,018) | 0.6 | 0.0 | 8.6 | 44.5 | 45.3 | 1.0 |

Depth of experience and depth of aftermath rise together, but not in lockstep: 36.6% of the 8-15 band and 4.0% of the 0-7 band still reach Significant. Veridical level also climbs with Greyson band (Exceptional 1.0% in 0-7, 2.1% in 8-15, 1.4% in 16-23, 3.3% in 24-32; Low 94.1% falling to 70.7%) [nde-x-rvnde-by-greyson].

**Core elements by experience type** (% present; nde n=5702, obe 178, sde 166, ste 130, adc 75) [nde-x-elements-by-type]. The largest differences from the `nde` baseline [nde-x-elements-type-diffs] are all about the body and the return: adc out_of_body 12.0% vs 87.1% (-75.1 points), adc choice_to_return 13.3% vs 83.4% (-70.1), ste out_of_body 20.8% (-66.3), ste choice_to_return 25.4% (-58.0), adc deceased_relatives 96.0% vs 39.2% (+56.8), sde choice_to_return 30.1% (-53.3), adc bright_light 10.7% (-53.2), adc time_distortion 9.3% (-52.9). Shared-death experiences keep deceased relatives (71.1%) and telepathy (58.4%) but lose the tunnel (6.6%) and the border (10.2%); spiritually transformative experiences keep cosmic_unity (76.9%) and knowledge_download (71.5%) and lose the OBE. Feelings of peace is the one element that is stable across every type (82.0-94.1%).

**Tone by journey type** (row %) [nde-x-tone-by-journey]: positive journeys are 73.5% very_positive; neutral journeys 30.8% very_positive and 56.2% positive; mixed journeys 33.6% mixed; distressing journeys split 32.4% very_negative, 30.4% mixed, 28.4% very_positive and 8.8% positive. That last row matters: more than a third of accounts coded as distressing journeys end up with a positive or very positive overall tone, the "hell then rescue" arc.

**Intensity by transformation class** [nde-x-intensity-by-class]: mean intensity rises monotonically from 6.61 (No Transformation Discussed, n=190) through 6.95 (Minimal), 8.05 (Moderate), 8.42 (Significant), 8.74 (Major) to 9.43 (Comprehensive, n=51, 47.1% rated 10).

**Upload year** (n=6185 dated) [nde-x-year]: 2011-2019 together hold 239 videos; then 2020 = 284, 2021 = 415, 2022 = 595, 2023 = 1,361, 2024 = 1,509, 2025 = 1,153, 2026 (to September) = 629. Mean transformation drifts upward from 24.9 (2020) to 30.1 (2024) and 29.8 (2026); mean Greyson from 22.9 (2020) to 26.6 (2026); mean rvnde falls from 12.8 (2021) to 9.2 (2026), which tracks the change of scoring schema rather than the accounts. Median views collapse for recent uploads (2017-2019: 97,617-151,507; 2024: 9,177; 2026: 3,468), partly because the archive now ingests small channels and partly because new videos have not accumulated views.

**Top 15 channels** (n=6301 with channel name; 61 channels) [nde-x-channels-top15]:

| Channel | n | Mean Greyson | Mean transf. | Mean rvnde | Median views | very_positive % | Distressing journey % |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Life After Life NDE | 615 | 25.6 | 30.9 | 10.7 | 9,019 | 57.7 | 2.9 |
| AFINAL, O QUE SOMOS NOS? | 414 | 25.2 | 25.7 | 10.3 | 109,862 | 51.2 | 2.9 |
| NDE Radio with Lee Witting | 411 | 24.5 | 25.4 | 12.2 | 3,258 | 63.5 | 2.7 |
| Pegi Robinson - NDE TV | 395 | 25.8 | 29.1 | 12.1 | 2,031 | 59.7 | 3.8 |
| Love Covered Life Podcast | 327 | 25.5 | 28.0 | 10.5 | 10,195 | 63.9 | 2.4 |
| NDE Diary | 310 | 27.9 | 31.2 | 11.1 | 15,113 | 74.5 | 2.6 |
| IANDS | 303 | 23.8 | 27.3 | 11.3 | 5,438 | 55.1 | 2.0 |
| The Other Side NDE | 254 | 28.1 | 31.9 | 11.7 | 112,839.5 | 74.8 | 1.2 |
| Round Trip Death | 235 | 27.1 | 27.8 | 12.3 | 1,053 | 76.2 | 4.7 |
| Tia Renee | 221 | 27.0 | 31.3 | 12.1 | 3,391 | 69.2 | 1.4 |
| Tales Of Resilience | 219 | 26.9 | 33.1 | 10.1 | 2,787 | 65.3 | 3.7 |
| Beyond with Heather Tesch | 185 | 27.2 | 28.2 | 10.7 | 9,632 | 77.8 | 1.6 |
| Divine Encounters NDE | 169 | 28.2 | 31.4 | 9.6 | 3,486 | 70.4 | 0.6 |
| Touching The Afterlife | 168 | 23.6 | 28.6 | 8.9 | 60,285 | 45.2 | 47.0 |
| Crossing Over NDE | 136 | 27.2 | 32.8 | 11.3 | 4,183 | 63.2 | 1.5 |

Touching The Afterlife is the archive's hell channel: 47.0% of its 168 videos are distressing journeys against 0.6-4.7% everywhere else. The channels with big audiences and high transformation (The Other Side NDE, NDE Diary) are the "man dies, learns X" narrated-retelling format. The smaller-audience channels among the 61 [ch-nde-all] include the highest-scoring ones by mean transformation: Dorothy Shelton 36.3 (n=12, median 220,574 views), Anthony Chene production 35.5 (n=47, median 344,382 views), NDE Compilations 34.5 (n=61, 96.7% very_positive).

## 4. UAP distributions

### 4.1 Videos

Content type (n=7699 typed; 695 null) [uap-content-type]: interview 29.0%, research_analysis 20.0%, program_disclosure 14.1%, news_commentary 11.8%, first_person 10.6%, documentary_survey 5.8%, retold_encounter 4.7%, investigative_journalism 3.9%, retold_story 0.1%. The track split is exact [uap-x-content-by-track]: the encounters track (n=3045) is 72.9% interview and 26.8% first_person; the program track (n=4654 typed) is 33.0% research_analysis, 23.2% program_disclosure, 19.4% news_commentary, 9.6% documentary_survey, 7.8% retold_encounter, 6.5% investigative_journalism. Source type (n=7645) [uap-source-type]: research 35.8%, interview_with_experiencer 19.8%, narrator 14.8%, commentary 12.2%, direct_experiencer 10.6%, retold_encounter 6.9%.

Encounter count per video (n=8394) [uap-encounter-count]: 0 = 52.3%, 1 = 35.5%, 2 = 3.3%, 3 = 3.1%, 4 = 2.2%, 5 = 1.5%, 6-15 = 2.1%; `multi_encounter` is true for 12.2% (1,023) [uap-multi-encounter]. Publish year [uap-publish-year]: 2025 = 19.7%, 2024 = 17.3%, 2023 = 15.8%, 2026 (to September) = 15.0%, 2022 = 9.3%, 2021 = 7.4%, 2020 = 3.5%; everything before 2015 is 5.4%. Median views by year are highest for the small 2006-2014 cohorts (145,717-756,630) and 16,000-16,500 for 2024-2025 [uap-x-year]. Intake status is `complete` for 90.3%; the rest are no_captions 4.2%, caption_fetch_failed 2.1%, classifying 1.3%, geo_restricted 1.0% [uap-intake-status].

### 4.2 Encounters (n=7017)

Hynek type [uap-hynek]: CE3 (entity seen) 37.7% (2,644), CE1 (close sighting) 33.1% (2,326), not_stated 11.3%, CE4 (abduction) 5.6% (390), null 5.2%, NL (nocturnal light) 3.7%, CE2 (physical effects) 1.9% (134), CE5 (initiated contact) 1.5% (107). Vallee type is null on all 7,017 rows [uap-vallee]. Encounter-level source type [uap-encounter-source-type]: direct_experiencer 49.1%, retold_encounter 31.0%, interview_with_experiencer 20.0%.

Evidence score: 2,174 rows (31.0%) null; on the 4,843 scored, observed range 7-26, mean 12.53, median 12 [uap-evidence-values]. Bands [uap-evidence-bands]: 10-12 = 37.9%, 0-9 = 21.0%, 13-15 = 20.5%, 16-18 = 16.9%, 19-30 = 3.8% (183 encounters at 19 or above; 7 at the maximum 26).

Contact depth: 2,610 rows (37.2%) null; on the 4,407 scored, range 0-32, mean 14.07, median 12 [uap-contact-values]. The distribution is bimodal, with one mode at 7-9 and another at 29-32; bands [uap-contact-bands]: 1-8 = 24.6%, 25-32 = 21.6%, 17-24 = 20.6%, 9-16 = 19.5%, exactly 0 = 13.6%.

Transformation: 2,172 rows (31.0%) null; on the 4,845 scored, range 0-56, mean 7.63, median 0 [uap-transformation-values]. 61.3% score exactly 0; bands [uap-transformation-bands]: 10-19 = 14.4%, 20-29 = 8.8%, 30-60 = 8.7%, 1-9 = 6.8%. Only 2 encounters exceed 42.

Context fields (n=6552 with `encounter_context`; 465 null): reported to authorities 39.3% [uap-reported-authorities]; military witness 15.3% (1,002) [uap-military-witness]; reported in media 35.9% [uap-media-coverage]; total witnesses mentioned 0 = 13.9%, 1 = 24.1%, 2 = 26.4%, 3-5 = 30.0%, 6-10 = 2.4%, 11-100 = 2.3%, over 100 = 0.8% (53) [uap-witnesses]; named witnesses 0 = 32.8%, 1 = 22.2%, 2 = 25.9%, 3 = 13.5% [uap-named-witnesses]; at least one connected case 33.3% [uap-connected-cases]. Country [uap-country]: united_states 38.6%, not_stated 31.1%, brazil 7.8%, united_kingdom 4.9%, australia 4.9%, canada 2.4%, mexico 1.0%, italy 0.9%, then 87 further countries under 1% each.

Event decade [uap-event-decade] is unknown for 42.0% (plus 6.6% with no context at all); among the 3,604 with a numeric year: 1970s 632, 1990s 548, 1980s 427, 1960s 423, 2020s 395, 2010s 358, 2000s 325, 1950s 271, 1940s 165, 1900-1939 25, pre-1900 34, and one implausible year (10000). The corpus's centre of gravity for the events themselves is 1960-1999, even though the videos are from 2021-2026.

### 4.3 Video-level stats (n=7607)

Video tone [uap-video-tone]: investigative 50.4%, neutral 29.5%, experiential 16.6%, journalistic 2.2%, conspiratorial 0.6% (48), academic 0.6% (47). Dominant entity type [uap-dominant-entity]: null (no entity coded) 48.7%, none 18.0%, humanoid 13.6% (1,031), grey 5.9% (448), unknown 5.3%, light_being 2.4% (179), insectoid_other 1.5% (116), mantis 1.1% (83), reptilian 0.6% (47), tall_grey 0.5%, hybrid 0.3%, nordic 0.3%, shadow_entity 16, robotic 13, tall_white 13, blue_being 12, angelic 11, plus 37 rarer labels. Flag rates [uap-flags]: has_psi_content 54.0% (4,111), has_craft_observation 38.7%, has_biologics_claim 16.4% (1,248), has_crash_retrieval_claim 11.9% (906), has_under_oath_claims 2.2% (171). Intelligence value [uap-intelligence-value] sits at 8 for 56.2% and 7 for 31.0%; 9 = 6.0% (457), 10 = 4 videos, 5 or below 5.6%. Per-video counts [uap-count-fields]: persons mean 2.39 (91.6% of videos name at least one), claims 4.9, organizations 1.67, locations 2.09, technologies 0.89, psi mentions 0.85 (54.0% > 0), secrecy mechanisms 0.23 (22.2% > 0), legislative events 0.17 (15.8% > 0).

### 4.4 Knowledge base

Canonical persons (n=5108) by role [uap-kb-person-roles]: witness 35.0%, other 17.5%, investigator 13.0%, scientist 12.3%, military_official 7.0%, journalist 4.6%, program_manager 4.4%, legislator 2.8%, whistleblower 1.5% (76), contractor_employee 1.0%, gatekeeper 24, intelligence_officer 15. 77.4% are linked to a single video [uap-kb-person-linked-videos]; the most-linked are Richard Dolan 55, David Grusch 54, Jeremy Corbel(l) 39, Chris Leato (Lehto) 37, Ross Coulthart 31 and "Ross Kulart" 31 (same person, unmerged), George Knapp 30, Steven Greer 26 [uap-kb-top-persons]. Organizations (n=1824) [uap-kb-org-types]: research_institution 24.9%, government_agency 20.2%, other 16.1%, media_outlet 15.5%, military_branch 9.3%, defense_contractor 6.3%, congressional_body 2.5%, think_tank 2.2%; top by linked videos are the CIA 190, NASA 183, U.S. Air Force 113, MUFON 108 (plus "Mutual UFO Network" 82 and "MUON" 54, unmerged) [uap-kb-top-orgs]. Programs (n=1810) [uap-kb-program-types]: confirmed 54.5%, alleged 41.3%, disputed 2.5%, debunked 0.8% (15); Project Blue Book leads with 140 linked videos, then AATIP 60, UAP Task Force 43 [uap-kb-top-programs]. Events (n=831) [uap-kb-event-types] are 81.9% congressional and 16.4% unknown; only 14 rows are actual encounters (military_encounter 4, abduction 3, mass_sighting 3, crash_retrieval 2, contact 1, disclosure 1). By decade, 61.1% of events are in the 2020s and 22.3% undated [uap-kb-event-decades]; the most-linked event is the UAP Disclosure Act (2024, 77 videos), and the only non-congressional events in the top 20 are Roswell (1947, 23 videos), the Nimitz Tic Tac (2004, 10), Pascagoula (1973, 7) and Travis Walton (1975, 7) [uap-kb-top-events]. Contactee profiles (n=3440): 80.6% cover a single video; first-shared year is 2025 for 21.9%, 2023 for 18.9%, 2024 for 15.0% [uap-kb-contactee-year, uap-kb-contactee-videos]; the most covered names are "Unknown Experiencer" 59, Travis Walton 28, Kristen 28, Betty Hill 26, Bob Lazar 25, Robert Salas 22, Ryan Graves 21, Whitley Strieber 21, Barney Hill 20 [uap-kb-top-contactees].

### 4.5 Channels

Top 15 UAP channels by tier 1-2 count (n=8394; 80 channels) [uap-x-channels-top15]:

| Channel | n | Encounters track % | Mean max evidence | Mean max contact | Mean max transf. | Mean intel. value | Median views |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Brazil UFO | 682 | 38.7 | 12.5 | 13.4 | 13.8 | 6.90 | 681.5 |
| Eyes On Cinema | 578 | 76.8 | 15.7 | 16.8 | 16.0 | 7.68 | 19,276.5 |
| Richard Dolan Intelligent Disclosure | 518 | 16.6 | 11.5 | 15.8 | 19.2 | 7.83 | 34,734.5 |
| Preston Dennett | 517 | 61.5 | 11.3 | 19.5 | 18.7 | 7.34 | 8,261 |
| Mutual UFO Network (MUFON) | 405 | 24.9 | 13.6 | 13.7 | 17.1 | 7.17 | 3,616 |
| Lehto Files | 351 | 25.9 | 14.4 | 12.5 | 14.2 | 7.87 | 27,769.5 |
| Engaging The Phenomenon | 320 | 26.9 | 11.3 | 17.9 | 19.2 | 7.34 | 2,848.5 |
| UFO CENTRAL | 313 | 16.3 | 13.2 | 16.4 | 17.2 | 7.74 | 107,351 |
| JeffMara Podcast | 306 | 77.5 | 12.4 | 27.7 | 29.2 | 7.44 | 19,933 |
| Project Unity | 301 | 17.6 | 12.5 | 18.3 | 25.4 | 7.70 | 11,102 |
| Disclosure Team with Vinnie Adams | 285 | 30.2 | 12.7 | 14.4 | 15.1 | 7.91 | 3,319 |
| Unveiled | 242 | 3.3 | 10.6 | 8.0 | n/a | 6.37 | 25,973 |
| Dr. Steven Greer | 225 | 25.3 | 16.0 | 16.3 | 16.4 | 7.98 | 98,062 |
| Believe: Paranormal & UFO Podcast | 208 | 86.1 | 13.8 | 19.0 | 15.0 | 7.39 | 518 |
| NewsNation | 205 | 22.0 | 13.8 | 20.5 | 19.7 | 8.16 | 342,583 |

The channel scorecard [ch-uap-grade, ch-uap-archetype] grades 62 of 78 channels F, 14 D and 2 C (the C channels include Experiencer Interviews, n=167, 100% encounters track, mean max contact depth 30.3, the deepest in the archive). Primary archetypes: Interview Hub 20, Deep Intelligence 17, Documentary 15, News & Commentary 14, First Person Encounters 7.

## 5. UAP cross-tabs

**Hynek type by evidence band** (row %, scored encounters only) [uap-x-hynek-by-evidence]:

| Hynek (n) | 0-9 % | 10-12 % | 13-15 % | 16-18 % | 19-30 % | Mean evidence |
| --- | --- | --- | --- | --- | --- | --- |
| CE3 (1,933) | 12.3 | 43.3 | 20.1 | 19.6 | 4.8 | 13.1 |
| CE1 (1,662) | 9.8 | 38.0 | 29.0 | 19.6 | 3.6 | 13.3 |
| not_stated (418) | 77.3 | 18.7 | 3.3 | 0.7 | 0.0 | 8.8 |
| CE4 (295) | 13.9 | 44.7 | 18.6 | 21.7 | 1.0 | 12.8 |
| NL (160) | 36.3 | 49.4 | 10.0 | 4.4 | 0.0 | 10.6 |
| CE2 (97) | 1.0 | 16.5 | 24.7 | 28.9 | 28.9 | 16.4 |
| CE5 (94) | 54.3 | 40.4 | 4.3 | 1.1 | 0.0 | 9.7 |

Physical-effects cases (CE2) carry by far the strongest evidence (28.9% at 19 or above, mean 16.4); initiated-contact cases (CE5) the weakest (mean 9.7, 54.3% below 10). Entity cases (CE3) and abductions (CE4) sit in the middle with almost identical profiles.

**Hynek type by contact depth band** (row %) [uap-x-hynek-by-contact]:

| Hynek (n) | 0 % | 1-8 % | 9-16 % | 17-24 % | 25-32 % | Mean contact | Mean transformation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CE3 (1,789) | 5.8 | 4.5 | 16.4 | 37.0 | 36.3 | 20.4 | 10.8 |
| CE1 (1,411) | 1.6 | 52.8 | 32.9 | 11.5 | 1.2 | 9.3 | 3.4 |
| not_stated (409) | 73.8 | 24.0 | 1.7 | 0.5 | 0.0 | 1.0 | 1.6 |
| CE4 (292) | 1.7 | 2.7 | 5.1 | 13.7 | 76.7 | 26.7 | 21.4 |
| NL (152) | 18.4 | 68.4 | 10.5 | 2.0 | 0.7 | 4.3 | 3.0 |
| CE2 (85) | 2.4 | 15.3 | 52.9 | 29.4 | 0.0 | 13.3 | 3.7 |
| CE5 (88) | 8.0 | 9.1 | 18.2 | 15.9 | 48.9 | 20.3 | 22.3 |

Transformation is a property of contact, not of evidence: CE4 (mean 21.4) and CE5 (22.3) transform, CE2 (3.7) and CE1 (3.4) do not, even though CE2 is the best-evidenced category. CE5 is the one category that is simultaneously low-evidence and high-transformation.

**Dominant entity type by max transformation band** (video level, row %; "no score" = no scored encounter) [uap-x-entity-by-transformation]: among videos with a scored encounter, grey (n=448) has 25.2% in the 30-60 band and mean 24.4; light_being (179) 30.2% and 25.3; tall_grey (36) 30.6% and 25.8; hybrid (24) 37.5% and 27.1; nordic (24) 25.0% and 22.2; reptilian (47) 21.3% and 23.1; mantis (83) 14.5% and 21.4; humanoid (1,031) 10.1% and 20.7; unknown (402) 2.2% and 14.7; none (1,372) 2.2% and 14.9. Videos coded "none" or "unknown" are mostly unscored (73.0% and 60.9% "no score").

**Content type by max evidence band** [uap-x-content-by-evidence]: scored evidence exists almost only for interview (99.2% scored; 22.0% at 16-18, 5.0% at 19-30; mean 13.1) and first_person (99.5% scored; 23.0% at 16-18, 6.3% at 19-30; mean 13.8). Research_analysis, program_disclosure, news_commentary, documentary_survey, retold_encounter and investigative_journalism are 98.0-99.8% unscored, so evidence score is effectively an encounters-track measure.

**Psi content by max contact depth** [uap-x-psi-by-contact]: videos with psi content (n=4111) have mean max contact depth 21.6 and 21.4% at 25-32; videos without (n=3496) have mean 11.3 and 0.4% at 25-32. Psi mention and deep contact are close to the same set of videos.

Other cross-tabs worth knowing: by encounter source, interview_with_experiencer has the highest CE4 (7.7%) and CE5 (3.1%) shares while retold_encounter has the most not_stated (18.8%) [uap-x-hynek-by-source]; by decade, CE3 peaks in the 1970s (59.2%) and falls to 24.2% in the 2020s while CE1 rises to 59.5% and NL to 5.7%, and CE5 only appears at all from the 1990s (0.9%) and reaches 3.1% in the 2010s and 2020s [uap-x-hynek-by-decade]; neutral-tone videos have the deepest mean contact (22.1) and investigative videos the highest mean intelligence value (7.85) [uap-x-tone-scores].

## 6. Cross-domain comparison

The two domains were coded with different instruments (15 fixed NDE core elements and a journey vocabulary versus free-form UAP entity, effect and consciousness labels), so the rates below are indicative, not equivalent. The UAP column mixes this pull with the site's `viz_graph_cache` entries: `uap-phenomenology` (computed 2026-09-06 over 5,793 encounters) and `cross-domain` (generated 2026-09-06; nde_total 6,817, uap_total 3,974) [cross-phenomenology, cross-cache-*].

| Phenomenon | NDE rate (basis) | UAP rate (basis) |
| --- | --- | --- |
| Light | 60.4% bright_light (n=6289) | 3.7% light-being entity (n=5793 encounters); cache "luminous craft/entities" 69% |
| Beings / entities | 93.6% at least one entity (n=6304) | 63.2% dominant entity not "none" among videos with encounters (n=4010) |
| Telepathy | 60.0% telepathy element; 24.7% of 12,135 entity communications | 38.5% of 3,889 coded entity communications (cache) |
| Time distortion / missing time | 58.8% time_distortion (n=6289) | 8.7% missing_time (n=5793); cache "dilated time perception" 27% |
| Life review | 49.3% (n=6289) | not coded |
| Message / knowledge download | 61.5% knowledge_download (n=6289) | cache "noetic knowing" 40% |
| Fear during the experience | 16.2% journey fear_distress (n=5559); 4.4% hellish_realm; 1.5% very_negative tone | 24.1% of 5,839 coded entity emotions are fear; shock 6.8%; anxiety 2.8% |
| Peace / love | 93.0% feelings_of_peace (n=6289); 63.8% of entity emotions loving (cache) | 1.7% love+peace; awe 22.5%; curiosity 21.7% (n=5839, cache) |
| Lasting transformation, any | 97.0% score > 0 (n=6295) | 38.7% score > 0 (n=4845 scored encounters) |
| Lasting transformation, score >= 20 | 90.3% (n=6295) | 17.5% (n=4845) |
| Psi / expanded perception afterwards | 43.3% PE domain present (n=6295) | 54.0% has_psi_content (n=7607; any psi mention, not only aftereffect) |
| Out-of-body | 83.7% (n=6289) | cache "kinesthetic displacement" 9% |
| Paralysis | cache "inability to move/speak" 15% | 1.5% paralysis effect (n=5793); cache 1% |

The cache's own overlap ranking [cross-cache-overlap] puts Entity Encounter (NDE 55% vs UAP 62%), Telepathic Communication (25% vs 36%), Ontological Shock (65% vs 48%), Knowledge Download (61% vs 40%) and Altered Consciousness (74% vs 81%) at the top, and Feelings of Peace/Love (93% vs 2%) at the bottom. The entity-type dimension [cross-cache-entity_types_encountered] has zero overlap in the top categories: religious figures, deceased relatives, groups, guides and animals appear only in NDEs; humanoids, greys and mantids only in UAP; "unknown" (NDE 14.4%, UAP 18.9%) and light beings (4.1% vs 5.8%) are the shared minority. The emotional-quality dimension [cross-cache-emotional_quality] is the starkest contrast in the archive: love 63.8% vs 1.0%, fear 3.0% vs 24.1%, awe 0.0% vs 22.5%, curiosity 0.0% vs 21.7%.

## 7. Outliers and edges

Counts and the top five of each list; ids open at youtube.com/watch?v=ID. Full top-25s with summaries are in `appendix-top-lists.md`.

**NDE by transformation** (6,295 scored; 124 at 40 or above). bw3IfMcy7bo and B_Xd2Gg279c (NDE Compilations, 45 each), uZ93ppC1Frc (NDE Compilations, 44), npuP7AxBBMs (HeavenIsReal, 43, Greyson 32, a 10-year-old's anaphylaxis account), 1FD5lReqe64 (Jeff Olsen, Anthony Chene, 43, 1,776,139 views). Why it matters: three of the top three are compilation videos, so the scorer rewards breadth of aftermath across many voices; the single-experiencer ceiling is 43.

**NDE by Greyson** (3,104 at 30 or above; 7 above 30). MRp0AVgsTQU (NDE Compilations, 32), npuP7AxBBMs (32), fFnigf-rlXU (Yvonne Sneeden, two-time NDEr, Hawaiian IANDS, 32, rvnde 15), kdYRNYSQOl4 (HeavenIsReal audiobook, 32), INlz6VyG-A8 (NDE Compilations, 32). Why: the scale saturates; "top Greyson" is a tie among 3,097 videos at 30 and is not a useful selector on its own.

**NDE by veridical score** (185 Exceptional; 69 at 25 or above). sAjRH6nL5Gc "Texts During Her NDE" (Round Trip Death, 28, the archive maximum, 1,879 views), XLJ4V7O6KhI (Shaman Oaks, 27, 2,961,400 views), RCQkIutaqgs (Penny Wittbrodt, Anthony Chene, 27, 1,755,506 views), Oediqi3PkUk (Coming Home, 27, 1,348,652 views), O0A0Fr1-AN8 (forensic detective, NDE Diary, 27, 1,224,774 views). Why: the evidence-heavy accounts are also the mass-audience ones; four of the top five have over a million views.

**NDE by views.** a8jcNBVWJyE (Prioritize Your Life, 25,316,444), A1onYxA8wiY (Shaman Oaks, 12,819,034), DRc430cTkQk (Dorothy Shelton, 5,862,741), EJSUAmR-I1o (The Other Side NDE, 5,471,920), LvnHIC8Csdg (The Other Side NDE, 4,291,529). All five score Greyson 30; transformation 22-36. Why: audience size is not driven by depth scores; the two biggest are "pronounced dead for 20 minutes" and "we have it completely backwards" framings.

**Distressing NDEs** (266 videos with very_negative tone or a distressing journey; 97 very_negative, 250 distressing). gAJShDqxM1E (Chicago gang member, Touching The Afterlife, intensity 10, 1,268,760 views), 78QEtegZ90g (R. Cook, 865,302), h1uEl6Fi9sQ (Joel, hell then Jesus, tone very_positive, 843,018), nG2rKPe34YA (nurse, demons, 701,736), XZ_AXQIom3Y (a Christian in hell, 462,505). Why: the distressing corpus is small, one channel supplies the top of it, and it draws large audiences; note the third entry is a distressing journey with a very positive tone.

**Repeat experiencers** (806 exact names on 2+ confirmed videos, 406 on 3+, of 2,437 two-word names). Peter Panagore 35 videos, Howard Storm 26, David Ditchfield 21, Eben Alexander 19, Ingrid Honkala 19, then Bill Letson 18, David Bennett 18, Peter Anthony 18. Why: about a fifth of named experiencers are serial guests, so "one experiencer, many tellings" comparisons are possible at scale. Separately, 468 summaries mention a second or multiple NDEs (regex heuristic); the top by Greyson are fFnigf-rlXU, O0A0Fr1-AN8, 0m5BQWiM--o (Nadia McCaffrey), Q5ahiz7RXDs (struck by lightning), GF0dRebTv7c.

**High transformation with low Greyson** (14 videos with transformation >= 35 and Greyson <= 15; only 1 with Greyson <= 7; 60 with transformation >= 30 and Greyson <= 15). hPP0j88nCfU (Greyson 0, transformation 36, an `ste` about grief and a neighbour's kindness), k07QDNt0Hys (Greyson 10, very_negative tone, eight-day coma), TTDNl010QuA (ste, Greyson 12), gh6Ou14tc8I (Johnnie Davis, nde, Greyson 12), NQ0vT1XDUhI (ste, Greyson 12). Why: transformation without a deep NDE is rare in this archive and, where it exists, it is mostly non-NDE experience types or distressing accounts.

**Child experiencers** (623 heuristic matches: 351 with a parsed age of 12 or under, 272 phrase-only; ages cluster at 12 = 70, 8 = 62, 5 = 53, 10 = 44). jtd4JEjFDiA (age 2, Shaman Oaks, 119,951 views), sIFW7-Wt1Ys (Ann Frances Ellis, age 2), hDhYK1ipR4M (age 2), WlTNtWh6QLE (age 2), BP_gBSipfDY (Ricci Enriquez, age 2). Why: roughly a tenth of the corpus may be childhood NDEs retold by adults, a population no coded field currently isolates; expect false positives from ages that belong to other people in the summary.

**UAP by evidence** (183 at 19 or above; 7 at 26). 0anEeY30Zig (Betty Hill interview, Eyes On Cinema, evidence 26, contact 32), olvys5aDx_I (Army radar technician Jeremy Weeks, Area52, 810,461 views), _EIBtsag8Sc (2010 nuclear-sites press conference, Robert Salas), vf7xZ5vMMfk (Coyne helicopter case, 1973), R6qOppJ3PBk (Salas, Malmstrom 1967, CE2). Why: the top-evidence tier is military witnesses and archival footage, four of five on one channel.

**UAP by contact depth** (952 at 25-32; 146 at the maximum 32). 0anEeY30Zig (Betty Hill, 32), tYU_tr5K5ws (Larry Warren, Bentwaters, Dr. Steven Greer, 389,958 views), ejo8PdPLIa8 (Eric Mitchell, Good Trouble Show), NVX9U6qw5Uc (Debra Jordan-Kauble, "Intruders"), VtmTxovDhq8 (Herbert Schirmer, Area52, 438,703 views). Why: deepest contact is the abduction canon plus new experiencer interviews, mostly CE3-coded rather than CE4.

**UAP by transformation** (423 at 30 or above; max 56). ygwd7IwGhYg (Alley, "Near-Death Experiencers" series on Tom Vernon UAP, 56, CE5, 107 views), 3baDgB1LB18 (Kegan Gill, fastest naval ejection, NDE plus UAP, Merged Podcast, 49), SeTp-Zw3UTM (Carrie Kohan, JeffMara, 42), g7iHrL5C90Y (Nancy Thames, Experiencer Interviews, 42), B2K4_uEteZU (Gloria Hass, 41). Why: the two highest-transformation UAP encounters in the archive are explicitly NDE-plus-UAP hybrids.

**UAP by views.** BEWz4SXfyCQ (Joe Rogan with Bob Lazar and Jeremy Corbell, 66,407,345), zNZHTlRFD6E (Ancient Aliens, HISTORY, 38,536,329), dPrYVmYkL5w (8 News Now radar swarm, 14,719,260), JuYYsmQ2ulI (BuzzFeed Unsolved abductions, 14,006,397), vZBRMcUkqNA (The Why Files, Anunnaki, 13,839,547). Why: mass audience is entertainment and news framing, none of it first-person.

**Multi-encounter videos** (1,023 with 2 or more encounters). uHoqGEb21EU (Italy 1954 witnesses, Weird World, 15 encounters), Nyiu2ZB_p-c (Kecksburg, UFO CENTRAL, 14, 264,035 views), B3HWsWhpxvs (Sci-Fi Central, 14), IRxyXJVE_xU (Somewhere in the Skies megasode, 14), Y74d1WFA-io (Saucer Life, 14). Why: these are anthology or case-file formats; they are where many small witnesses live.

**Under-oath claims** (171 videos). kRO5jOa06Qw (David Grusch with Jesse Michels, intelligence value 10, 3,027,391 views), 4DrcG7VGgQU (Greer National Press Club 2017, 10), LElDrPFmXZk (Grusch on Inquiry, 10), kZle-PYmoQE (Greer on Redacted, 9, 2,870,464 views), UVPs-2DfN_o (NewsNation Reality Check, 9). Why: a small, high-view, disclosure-politics cluster; useful for a "what was actually said under oath" chapter.

**CE-4 / CE-5 by contact depth** (497 encounters; 390 CE4, 107 CE5). B2K4_uEteZU (Gloria Hass), oRtdJLmKSwY (Kristi Pederson), r-7zJ5Upeb4 (Lorraine McAdam, JeffMara), Y0NggbHjUX4 (Niara Terela Isley), wQY-dgTMEQI (Kendra Jonas), all at contact depth 32 with transformation 38-41, four of five on Experiencer Interviews. Why: the abduction/contact material with the deepest coding is concentrated on one small channel (median 1,202 views).

**Earliest-dated encounters** (3,603 with a numeric year; 34 before 1900). Plutarch year 66 (CuiqL65aCcM, Unveiled), Timoleon's fleet 343 (eKZ2U3lkJ9o), a 1440 sighting (1pO1LUf3N4A), and Korea 1600 and 1609 (kWatMe0MQz8, Richard Dolan). Why: pre-1900 material is historical anecdote retold by channels, never a witness; the knowledge-base `uap_events` table's earliest rows (1939 expedition funding, the 1947 National Security Act, Executive Order 092447) are legislative, not phenomenal [appendix earliest events].

## 8. Gaps and questions the numbers raise

- Greyson is saturated: 49.2% of confirmed NDEs score exactly 30 and 79.7% are in the 24-32 band, while the classic paper-and-pencil scale usually places far fewer accounts that high. Either the archive is pre-selected for deep NDEs (plausible: 85.8% are labelled Deep NDE) or the AI scorer is generous. Any book chapter that ranks by Greyson needs a second axis.
- Transformation has two modes (30 and 36) that appear equally under both models, and the classification bands overlap (a score of 30 is "Significant" 1,633 times, a 36 is "Major"). The score is rubric-shaped, not experience-shaped; use the domain-level scores instead.
- Veridical scoring never uses its floor honestly: 7 is the floor and the most common value (25.5%), and the two model runs used different key names and scales, so the 2025-2026 uploads look less evidential (mean 9.2-10.0) than 2021-2023 (11.9-12.8) for reasons that have nothing to do with the accounts.
- 1,089 videos (17.3%) have an unknown trigger and 304 `nde_analysis` rows have null type, tone and trigger (all outside the confirmed set). The unknown-trigger group scores lower on every scale; it is either thinner material or under-analysed.
- Only 250 distressing journeys (4.0%) and 97 very-negative tones (1.5%) exist, and one channel (Touching The Afterlife, 47.0% distressing) supplies most of the top of that list. The archive's picture of hellish NDEs is a single channel's editorial line.
- Fear is the most common emotion in the emotional progressions (10.8% of steps; the opening emotion in 35.0% of videos), yet only 1.5% of videos are very negative overall. The corpus is full of fear that resolves; the resolution mechanism (void_darkness > fear_distress is the common doorway, 389 transitions) is not a coded field.
- Precognition (Greyson item mean 0.64) and future_visions (12.8% of journeys) are the least-endorsed transcendental claims, while "sudden understanding" is the most (91.4% score 2). A "what they claim to know versus what they claim to foresee" split is available and unexploited.
- Entity typing is coarse: 14.3% of entity encounters are "unknown", luminosity is unstated for 52.1%, gender for 33.3%, age for 50.4%. Religious figures (39.2% of videos) are not split into Jesus, Mary, Buddha or "a Christ-like being" in any structured field.
- Every one of the 15 core elements sits between 23.9% and 93.0%, and the element count per video is a wide plateau; there is no natural "type" clustering visible in co-occurrence (lift rarely exceeds 1.3). Any typology of NDE kinds will have to come from journey sequences or free text, not from the element flags.
- Only 25.6% of NDE videos have a duration and 10.2% lack an experiencer name; the repeat-experiencer analysis is exact-string and splits spelling variants.
- On the UAP side, 31.0% of encounters lack an evidence score, 37.2% lack contact depth, 42.0% lack an event year, 11.3% are `not_stated` Hynek and Vallee type is never populated. The "program" track (63.7% of videos) is essentially unscored on every encounter scale, so evidence and contact statistics describe the encounters track only.
- Contact depth is bimodal (modes near 7-9 and 29-32) while transformation is 61.3% zero: the archive contains a large "deep contact, no aftermath" population (CE3 mean contact 20.4 but mean transformation 10.8) that contradicts the NDE pattern where depth and aftermath rise together.
- The UAP entity population in 2020s events shifts from CE3 (24.2%) toward CE1 sightings (59.5%) and nocturnal lights (5.7%): the modern corpus is craft-heavy and being-light, the 1970s corpus the reverse.
- Knowledge-base entity resolution is incomplete (Ross Coulthart and "Ross Kulart", MUFON and "Mutual UFO Network" and "MUON", Chris Lehto as "Chris Leato"), 81.9% of `uap_events` are congressional rows and only 14 are phenomenal events, and contactee profiles carry null experience type, recurrence and entity types. Person- or event-centred chapters need a manual merge pass first.
- The cross-domain emotional contrast (love 63.8% of NDE entity encounters vs 1.0% of UAP; fear 3.0% vs 24.1%) is the single strongest quantitative statement the archive can make about the two phenomena, but it rests on the site cache's coding, which this pull could not recompute because the UAP `*_breakdown` fields were excluded.

## 9. Where to look next

- `research/corpus-atlas/stats/tables.md`: every table cited above, with denominators, plus the ones not discussed (all 61 NDE channels, all 80 UAP channels with grades, Greyson item detail, criterion-level veridical scores, entity gender and age, per-decade Hynek, per-year UAP stats).
- `research/corpus-atlas/stats/nde.json`, `uap.json`, `cross.json`, `channels.json`: the same tables as JSON (`tables.<id>`), plus `extra` (observed ranges, heuristic counts, the full core-element pair list) and `top_lists`.
- `research/corpus-atlas/appendix-top-lists.md`: the 18 top-25 lists with video ids, channels, years, views, scores and 220-character summaries.
- `research/corpus-atlas/appendix-syntheses.md` and `appendix-experiencers.md` (written by the other agent): the qualitative half, question syntheses and experiencer profiles.
- `scripts/corpus-atlas/retrieve.mjs`: semantic search over the transcript embeddings (`--domain nde|uap`, `--source moments|chunks`) for pulling evidence passages once a candidate theme is chosen; phrase the query the way an experiencer would tell it.
- `scripts/corpus-atlas/aggregate.mjs`: re-run after a fresh `pull.mjs` to refresh every number here; `scripts/corpus-atlas/README.md` documents both.
