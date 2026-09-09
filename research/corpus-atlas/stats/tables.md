# Corpus atlas: every computed table

Generated 2026-09-08T14:43:21.892Z by `scripts/corpus-atlas/aggregate.mjs` from `scratch/corpus-atlas/*.jsonl` (pulled 2026-09-08T14:26:14.531Z). Percentages are one decimal over the denominator stated in each caption. Categorical values are trimmed, lowercased, and spaces/hyphens become underscores unless a caption says otherwise. Machine-readable copies: `stats/nde.json`, `stats/uap.json`, `stats/cross.json`, `stats/channels.json` (same table ids).

## Contents

- **nde**: nde-coverage, nde-glance, nde-experience-type, nde-experience-type-confidence, nde-trigger, nde-tone, nde-intensity, nde-journey-type, nde-journey-valid, nde-scale-agreement, nde-transformation-class, nde-rvnde-level, nde-greyson-values, nde-greyson-bands, nde-greyson-items, nde-transformation-values, nde-transformation-bands, nde-transformation-breadth, nde-transformation-domains, nde-transformation-themes, nde-rvnde-values, nde-rvnde-bands, nde-rvnde-criteria, nde-core-elements, nde-core-elements-count, nde-core-element-pairs, nde-core-element-pairs-lift, nde-entity-types, nde-entity-dominant, nde-entity-any-type, nde-entity-count, nde-entity-communication, nde-entity-emotion, nde-entity-luminosity, nde-entity-gender, nde-entity-age, nde-journey-elements, nde-journey-first, nde-journey-last, nde-journey-length, nde-journey-bigrams, nde-journey-trigrams, nde-pheno-reality, nde-pheno-vividness, nde-pheno-thought-speed, nde-pheno-memory, nde-pheno-self-awareness, nde-pheno-clarity, nde-pheno-senses, nde-pheno-emotion-first, nde-pheno-emotion-last, nde-pheno-emotion-all, nde-safety-flags, nde-safety-warning, nde-safety-overall, nde-x-tone-by-trigger, nde-x-transformation-by-greyson, nde-x-class-by-transformation-band, nde-x-elements-by-type, nde-x-elements-type-diffs, nde-x-tone-by-journey, nde-x-intensity-by-class, nde-x-year, nde-x-channels-top15, nde-x-scores-by-trigger, nde-x-scores-by-model, nde-x-tone-by-type, nde-x-rvnde-by-greyson, nde-x-journey-by-trigger, nde-x-domains-by-tone, nde-child-ages
- **uap**: uap-coverage, uap-glance, uap-content-type, uap-track, uap-source-type, uap-publish-year, uap-encounter-count, uap-multi-encounter, uap-intake-status, uap-x-content-by-track, uap-hynek, uap-encounter-source-type, uap-vallee, uap-evidence-values, uap-evidence-bands, uap-contact-values, uap-contact-bands, uap-transformation-values, uap-transformation-bands, uap-event-decade, uap-reported-authorities, uap-military-witness, uap-media-coverage, uap-witnesses, uap-named-witnesses, uap-connected-cases, uap-country, uap-video-tone, uap-dominant-entity, uap-intelligence-value, uap-flags, uap-count-fields, uap-psi-mentions, uap-kb-person-roles, uap-kb-person-linked-videos, uap-kb-org-types, uap-kb-program-types, uap-kb-event-types, uap-kb-event-decades, uap-kb-contactee-year, uap-kb-contactee-videos, uap-kb-top-persons, uap-kb-top-orgs, uap-kb-top-programs, uap-kb-top-events, uap-kb-top-contactees, uap-x-channels-top15, uap-x-hynek-by-evidence, uap-x-hynek-by-contact, uap-x-entity-by-transformation, uap-x-content-by-evidence, uap-x-psi-by-contact, uap-x-hynek-by-source, uap-x-hynek-by-decade, uap-x-tone-scores, uap-x-year
- **cross**: cross-phenomenology, cross-cache-overlap, cross-cache-entity_types_encountered, cross-cache-communication_methods, cross-cache-emotional_quality, cross-year, cross-size, cross-nde-elements-cache-vs-now
- **channels**: ch-nde-country, ch-uap-grade, ch-uap-archetype, ch-uap-cadence, ch-uap-personality, ch-nde-all, ch-uap-all, ch-nde-meta

## NDE tables

### nde-coverage: Field coverage among confirmed NDE videos

_Denominator: confirmed NDE videos (isNde=clear_nde), n=6304. Always-null columns in nde_analysis: intensity_level, meets_nde_criteria, meets_cutoff_criteria, total_nde_c_score, nde_c_breakdown, primary_phenomenology._

| field | non-null count | pct of confirmed | note |
| --- | --- | --- | --- |
| nde_vids rows (isNde=clear_nde) | 6,304 | 100.0 | denominator for this table |
| nde_analysis row present | 6,304 | 100.0 | nde_analysis has 6822 rows in total; 518 belong to non-confirmed videos and are excluded from every NDE table |
| analysis_nde_summary | 6,302 | 100.0 |  |
| experience_type | 6,304 | 100.0 |  |
| trigger_category | 6,304 | 100.0 |  |
| overall_tone | 6,304 | 100.0 |  |
| intensity_rating | 6,304 | 100.0 |  |
| total_greyson_score | 6,295 | 99.9 |  |
| greyson_breakdown | 6,295 | 99.9 |  |
| transformation_score (not analysis_failed) | 6,295 | 99.9 |  |
| transformation_breakdown.domain_analysis | 6,295 | 99.9 |  |
| journey_sequence (non-null) | 6,304 | 100.0 |  |
| journey_sequence (non-empty) | 5,559 | 88.2 | empty arrays are journey_valid=false rows |
| journey_nde_type | 6,304 | 100.0 |  |
| core_elements (15-element array) | 6,289 | 99.8 | object-shaped rows are analysis errors |
| phenomenology (with reality_comparison) | 6,292 | 99.8 |  |
| entities.encounters | 6,304 | 100.0 |  |
| content_safety.flags | 6,291 | 99.8 |  |
| scale_agreement | 6,295 | 99.9 |  |
| rvnde_total_score (nde_vids) | 6,302 | 100.0 |  |
| rvnde_details (nde_vids) | 6,302 | 100.0 | two schemas: c1_..c7_ keys (Grok 4 Fast rows) and long-name keys (gpt-4o-mini rows) |
| experiencerFullName (nde_vids) | 5,661 | 89.8 |  |
| upload date | 6,185 | 98.1 |  |
| viewCount > 0 | 6,159 | 97.7 |  |
| duration (nde_vids) | 1,614 | 25.6 |  |

### nde-glance: Corpus at a glance (NDE)

_n=6304 confirmed NDE videos_

| metric | value |
| --- | --- |
| confirmed NDE videos | 6,304 |
| with nde_analysis row | 6,304 |
| distinct channels (channelName) | 61 |
| earliest upload | 2011-06-22T19:22:14+00:00 |
| latest upload | 2026-09-07T11:30:04+00:00 |
| total views | 427,152,469 |
| median views | 6,983 |
| mean views | 67,759 |
| analysis model split | Grok 4 Fast=4690; gpt-4o-mini=1612; null=2 |

### nde-experience-type: Experience type

_Confirmed NDE videos with non-null experience_type; n=6304. lowercased and trimmed_

| value | count | pct |
| --- | --- | --- |
| nde | 5,702 | 90.5 |
| obe | 178 | 2.8 |
| sde | 166 | 2.6 |
| ste | 130 | 2.1 |
| adc | 75 | 1.2 |
| other | 39 | 0.6 |
| analysis_failed | 13 | 0.2 |
| meditation | 1 | 0.0 |

### nde-experience-type-confidence: Experience type confidence

_Confirmed NDE videos with non-null experience_type_confidence; n=6304_

| value | count | pct |
| --- | --- | --- |
| 0 | 39 | 0.6 |
| 50 | 13 | 0.2 |
| 70 | 7 | 0.1 |
| 75 | 4 | 0.1 |
| 80 | 312 | 4.9 |
| 85 | 174 | 2.8 |
| 90 | 2,374 | 37.7 |
| 95 | 3,326 | 52.8 |
| 100 | 55 | 0.9 |

### nde-trigger: Trigger category

_Confirmed NDE videos with non-null trigger_category; n=6304. normalized: lowercase, spaces and hyphens to underscores (so "car accident" and "car_accident" merge)_

| value | count | pct |
| --- | --- | --- |
| accident | 1,317 | 20.9 |
| unknown | 1,089 | 17.3 |
| medical_crisis | 825 | 13.1 |
| illness | 684 | 10.9 |
| surgery | 669 | 10.6 |
| cardiac_arrest | 440 | 7.0 |
| near_drowning | 344 | 5.5 |
| childbirth | 226 | 3.6 |
| overdose | 212 | 3.4 |
| other | 172 | 2.7 |
| suicide_attempt | 169 | 2.7 |
| allergic_reaction | 52 | 0.8 |
| combat | 41 | 0.7 |
| meditation | 17 | 0.3 |
| car_accident | 9 | 0.1 |
| child_death | 8 | 0.1 |
| childhood_abuse | 4 | 0.1 |
| fire | 4 | 0.1 |
| gunshot | 4 | 0.1 |
| sde | 3 | 0.0 |
| childhood | 2 | 0.0 |
| choking | 2 | 0.0 |
| trauma | 2 | 0.0 |
| burn_injury | 1 | 0.0 |
| chemotherapy | 1 | 0.0 |
| electrocution | 1 | 0.0 |
| lightning_strike | 1 | 0.0 |
| motorcycle_accident | 1 | 0.0 |
| skydiving | 1 | 0.0 |
| spiritual_crisis | 1 | 0.0 |
| spontaneous | 1 | 0.0 |
| stroke | 1 | 0.0 |

### nde-tone: Overall tone

_Confirmed NDE videos with non-null overall_tone; n=6304_

| value | count | pct |
| --- | --- | --- |
| very_positive | 4,060 | 64.4 |
| positive | 1,706 | 27.1 |
| mixed | 392 | 6.2 |
| very_negative | 97 | 1.5 |
| neutral | 48 | 0.8 |
| negative | 1 | 0.0 |

### nde-intensity: Intensity rating (raw values)

_Confirmed NDE videos with non-null intensity_rating; n=6304. values -1 and 0 look like failed scoring rather than real ratings_

| value | count | pct |
| --- | --- | --- |
| -1 | 13 | 0.2 |
| 0 | 7 | 0.1 |
| 1 | 13 | 0.2 |
| 2 | 2 | 0.0 |
| 3 | 2 | 0.0 |
| 5 | 26 | 0.4 |
| 6 | 27 | 0.4 |
| 7 | 432 | 6.9 |
| 8 | 2,656 | 42.1 |
| 9 | 2,667 | 42.3 |
| 10 | 459 | 7.3 |

### nde-journey-type: Journey NDE type

_Confirmed NDE videos with non-null journey_nde_type; n=6304_

| value | count | pct |
| --- | --- | --- |
| positive | 5,005 | 79.4 |
| neutral | 744 | 11.8 |
| mixed | 295 | 4.7 |
| distressing | 250 | 4.0 |
| analysis_failed | 10 | 0.2 |

### nde-journey-valid: Journey valid flag

_Confirmed NDE videos with non-null journey_valid; n=6304_

| value | count | pct |
| --- | --- | --- |
| true | 5,748 | 91.2 |
| false | 556 | 8.8 |

### nde-scale-agreement: Scale agreement label

_Confirmed NDE videos with non-null scale_agreement; n=6295_

| value | count | pct |
| --- | --- | --- |
| Deep NDE | 5,404 | 85.8 |
| Moderate NDE | 653 | 10.4 |
| Mild NDE | 136 | 2.2 |
| Not NDE | 102 | 1.6 |

### nde-transformation-class: Transformation classification

_Confirmed NDE videos with non-null transformation_classification; n=6304_

| value | count | pct |
| --- | --- | --- |
| Significant Transformation | 2,834 | 45.0 |
| Major Transformation | 2,456 | 39.0 |
| Moderate Transformation | 743 | 11.8 |
| No Transformation Discussed | 190 | 3.0 |
| Comprehensive Profound Transformation | 51 | 0.8 |
| Minimal Transformation | 21 | 0.3 |
| analysis_failed | 9 | 0.1 |

### nde-rvnde-level: Veridical (rvnde) level

_Confirmed NDE videos with non-null rvnde_level; n=6302_

| value | count | pct |
| --- | --- | --- |
| Low Evidential Strength | 4,628 | 73.4 |
| Moderate Evidential Strength | 936 | 14.9 |
| High Evidential Strength | 553 | 8.8 |
| Exceptional Evidential Strength | 185 | 2.9 |

### nde-greyson-values: Greyson total score (raw values)

_Confirmed NDE videos with non-null total_greyson_score; observed range 0-32, mean 26.16, median 29; n=6295_

| value | count | pct |
| --- | --- | --- |
| 0 | 94 | 1.5 |
| 4 | 2 | 0.0 |
| 6 | 3 | 0.0 |
| 7 | 2 | 0.0 |
| 8 | 9 | 0.1 |
| 9 | 1 | 0.0 |
| 10 | 31 | 0.5 |
| 12 | 84 | 1.3 |
| 14 | 31 | 0.5 |
| 15 | 38 | 0.6 |
| 16 | 18 | 0.3 |
| 17 | 8 | 0.1 |
| 18 | 44 | 0.7 |
| 19 | 2 | 0.0 |
| 20 | 524 | 8.3 |
| 21 | 69 | 1.1 |
| 22 | 313 | 5.0 |
| 23 | 4 | 0.1 |
| 24 | 643 | 10.2 |
| 25 | 452 | 7.2 |
| 26 | 191 | 3.0 |
| 27 | 440 | 7.0 |
| 28 | 108 | 1.7 |
| 29 | 80 | 1.3 |
| 30 | 3,097 | 49.2 |
| 31 | 1 | 0.0 |
| 32 | 6 | 0.1 |

### nde-greyson-bands: Greyson total score bands

_Confirmed NDE videos with non-null total_greyson_score; observed range 0-32; n=6295_

| value | count | pct |
| --- | --- | --- |
| 24-32 | 5,018 | 79.7 |
| 16-23 | 982 | 15.6 |
| 8-15 | 194 | 3.1 |
| 0-7 | 101 | 1.6 |

### nde-greyson-items: Greyson items: mean score and share scoring 2 (max)

_Confirmed NDE videos with greyson_breakdown; per-item n shown (items are scored 0/1/2). 27 mis-nested item objects skipped._

| item | n | mean score | pct score=2 | pct score=1 | pct score=0 |
| --- | --- | --- | --- | --- | --- |
| cognitive.sudden_understanding | 6,294 | 1.9 | 91.4 | 6.7 | 1.9 |
| affective.peace_pleasantness | 6,292 | 1.89 | 91.9 | 5.0 | 3.1 |
| cognitive.thought_speed | 6,295 | 1.8 | 82.7 | 14.9 | 2.4 |
| transcendental.unearthly_world | 6,285 | 1.79 | 83.5 | 11.9 | 4.6 |
| affective.cosmic_unity | 6,292 | 1.78 | 81.5 | 14.6 | 3.8 |
| paranormal.enhanced_senses | 6,291 | 1.77 | 79.6 | 17.5 | 2.8 |
| paranormal.out_of_body | 6,285 | 1.72 | 80.4 | 11.6 | 8.0 |
| affective.joy | 6,292 | 1.65 | 70.4 | 24.4 | 5.1 |
| transcendental.mystical_being | 6,283 | 1.59 | 72.1 | 14.8 | 13.1 |
| paranormal.esp | 6,288 | 1.51 | 57.4 | 35.8 | 6.8 |
| cognitive.life_review | 6,295 | 1.49 | 56.9 | 35.0 | 8.1 |
| affective.brilliant_light | 6,291 | 1.49 | 61.9 | 24.8 | 13.3 |
| transcendental.border_point_no_return | 6,283 | 1.47 | 54.5 | 37.8 | 7.7 |
| cognitive.time_distortion | 6,295 | 1.46 | 51.8 | 42.7 | 5.4 |
| transcendental.spirits_deceased | 6,283 | 0.95 | 34.2 | 26.2 | 39.5 |
| paranormal.precognition | 6,286 | 0.64 | 17.7 | 28.7 | 53.6 |

### nde-transformation-values: Transformation score (raw values)

_Confirmed NDE videos with transformation score (analysis_failed excluded); observed range 0-45, mean 28.87, median 30; n=6295_

| value | count | pct |
| --- | --- | --- |
| 0 | 190 | 3.0 |
| 3 | 1 | 0.0 |
| 4 | 2 | 0.0 |
| 8 | 4 | 0.1 |
| 10 | 14 | 0.2 |
| 12 | 115 | 1.8 |
| 14 | 27 | 0.4 |
| 15 | 59 | 0.9 |
| 16 | 17 | 0.3 |
| 18 | 182 | 2.9 |
| 19 | 1 | 0.0 |
| 20 | 342 | 5.4 |
| 21 | 4 | 0.1 |
| 22 | 384 | 6.1 |
| 23 | 3 | 0.0 |
| 24 | 570 | 9.1 |
| 25 | 74 | 1.2 |
| 26 | 5 | 0.1 |
| 27 | 98 | 1.6 |
| 28 | 26 | 0.4 |
| 29 | 37 | 0.6 |
| 30 | 1,633 | 25.9 |
| 31 | 17 | 0.3 |
| 32 | 71 | 1.1 |
| 34 | 207 | 3.3 |
| 35 | 58 | 0.9 |
| 36 | 1,621 | 25.8 |
| 37 | 55 | 0.9 |
| 38 | 351 | 5.6 |
| 39 | 3 | 0.0 |
| 40 | 73 | 1.2 |
| 41 | 18 | 0.3 |
| 42 | 15 | 0.2 |
| 43 | 15 | 0.2 |
| 44 | 1 | 0.0 |
| 45 | 2 | 0.0 |

### nde-transformation-bands: Transformation score bands

_Confirmed NDE videos with transformation score (analysis_failed excluded); n=6295_

| value | count | pct |
| --- | --- | --- |
| 30-39 | 4,016 | 63.8 |
| 20-29 | 1,543 | 24.5 |
| 10-19 | 415 | 6.6 |
| 0 | 190 | 3.0 |
| 40-50 | 124 | 2.0 |
| 1-9 | 7 | 0.1 |

### nde-transformation-breadth: Transformation breadth (number of domains affected)

_Confirmed NDE videos with quantitative_metrics; mean 6.97; n=6295_

| value | count | pct |
| --- | --- | --- |
| 0 | 190 | 3.0 |
| 1 | 2 | 0.0 |
| 2 | 8 | 0.1 |
| 3 | 9 | 0.1 |
| 4 | 66 | 1.0 |
| 5 | 148 | 2.4 |
| 6 | 1,258 | 20.0 |
| 7 | 1,706 | 27.1 |
| 8 | 2,847 | 45.2 |
| 9 | 46 | 0.7 |
| 10 | 15 | 0.2 |

### nde-transformation-domains: Transformation domains ranked by mean score

_Confirmed NDE videos with domain_analysis, n=6295; "present" = domain appears in the breakdown; mean over present rows (0-5 scale)_

| code | domain | present n | present pct | mean score | pct score>=4 | direction split |
| --- | --- | --- | --- | --- | --- | --- |
| SA | Spiritual Awareness | 6,222 | 98.8 | 4.27 | 92.2 | up=6030; n/a=189; new=3 |
| PD | Purpose, Meaning & Life Direction | 5,669 | 90.1 | 3.76 | 76.2 | up=5475; n/a=192; mixed=2 |
| AD | Attitude Toward Death | 6,133 | 97.4 | 3.57 | 65.4 | down=5893; n/a=192; up=40; mixed=8 |
| SI | Self-Perception & Identity | 6,289 | 99.9 | 3.39 | 54.9 | up=6075; n/a=190; mixed=10; shifted=10; down=4 |
| CC | Compassion & Concern for Others | 6,259 | 99.4 | 3.17 | 41.1 | up=6067; n/a=192 |
| VP | Values & Priorities | 5,475 | 87.0 | 3.08 | 28.1 | down=5273; n/a=192; up=8; mixed=1; shifted=1 |
| AL | Appreciation for Life | 6,292 | 100.0 | 2.87 | 26.7 | up=6100; n/a=192 |
| PE | Psychic & Expanded Perception | 2,727 | 43.3 | 2.82 | 23.4 | up=2042; new=486; n/a=193; mixed=5; down=1 |
| RO | Religious Orientation | 3,497 | 55.6 | 2.37 | 9.6 | shifted=2675; mixed=302; up=286; n/a=192; down=42 |
| RS | Relationships & Social Dynamics | 1,733 | 27.5 | 1.96 | 0.4 | mixed=1540; n/a=192; up=1 |

### nde-transformation-themes: Dominant transformation themes (free text, lowercased)

_Theme mentions across confirmed NDE videos (up to 3 per video); n=18315_

| value | count | pct |
| --- | --- | --- |
| spiritual awakening | 3,201 | 17.5 |
| empathy and compassion | 703 | 3.8 |
| transformation of identity | 677 | 3.7 |
| transformation of self | 607 | 3.3 |
| spiritual growth | 468 | 2.6 |
| spiritual connection | 347 | 1.9 |
| life purpose | 303 | 1.7 |
| transformation of values | 276 | 1.5 |
| increased compassion | 272 | 1.5 |
| interconnectedness | 260 | 1.4 |
| compassion for others | 256 | 1.4 |
| love and compassion | 225 | 1.2 |
| connection to the divine | 209 | 1.1 |
| love and connection | 191 | 1.0 |
| connection to others | 178 | 1.0 |
| transformation through suffering | 165 | 0.9 |
| transformation through adversity | 142 | 0.8 |
| purpose and service | 136 | 0.7 |
| self-discovery | 136 | 0.7 |
| service to others | 134 | 0.7 |
| empathy and service | 131 | 0.7 |
| unconditional love | 131 | 0.7 |
| increased spiritual awareness | 120 | 0.7 |
| desire to help others | 116 | 0.6 |
| healing and transformation | 108 | 0.6 |
| empowerment | 100 | 0.5 |
| purpose and meaning | 99 | 0.5 |
| transformation through trauma | 99 | 0.5 |
| gratitude for life | 93 | 0.5 |
| spiritual awareness | 92 | 0.5 |
| (other, 2371 values) | 8,340 | 45.5 |

### nde-rvnde-values: Veridical (rvnde) total score (raw values)

_Confirmed NDE videos with rvnde_total_score; observed range 7-28, mean 11.21, median 10; n=6302_

| value | count | pct |
| --- | --- | --- |
| 7 | 1,606 | 25.5 |
| 8 | 396 | 6.3 |
| 9 | 539 | 8.6 |
| 10 | 1,142 | 18.1 |
| 11 | 573 | 9.1 |
| 12 | 372 | 5.9 |
| 13 | 255 | 4.0 |
| 14 | 185 | 2.9 |
| 15 | 196 | 3.1 |
| 16 | 156 | 2.5 |
| 17 | 144 | 2.3 |
| 18 | 139 | 2.2 |
| 19 | 118 | 1.9 |
| 20 | 117 | 1.9 |
| 21 | 80 | 1.3 |
| 22 | 98 | 1.6 |
| 23 | 84 | 1.3 |
| 24 | 33 | 0.5 |
| 25 | 29 | 0.5 |
| 26 | 24 | 0.4 |
| 27 | 15 | 0.2 |
| 28 | 1 | 0.0 |

### nde-rvnde-bands: Veridical (rvnde) score bands

_Confirmed NDE videos with rvnde_total_score; n=6302_

| value | count | pct |
| --- | --- | --- |
| 0-9 | 2,541 | 40.3 |
| 10-14 | 2,527 | 40.1 |
| 15-19 | 753 | 11.9 |
| 20-24 | 412 | 6.5 |
| 25-32 | 69 | 1.1 |

### nde-rvnde-criteria: Veridical criteria mean scores by scoring schema

_Confirmed NDE videos with rvnde_details; criteria mapped to one name set (c1..c7 = long names). Two model runs used different key names and, apparently, different scales; compare within a schema only._

| criterion | schema | n | mean | min | max |
| --- | --- | --- | --- | --- | --- |
| verified_perception_weight | c1..c7 (Grok) | 4,690 | 1.29 | 1 | 4 |
| verified_perception_weight | long names (gpt-4o-mini) | 1,612 | 1.17 | 1 | 4 |
| temporal_precedence | c1..c7 (Grok) | 4,690 | 1.41 | 1 | 4 |
| temporal_precedence | long names (gpt-4o-mini) | 1,612 | 1.15 | 1 | 4 |
| specificity_precision | c1..c7 (Grok) | 4,690 | 1.65 | 1 | 4 |
| specificity_precision | long names (gpt-4o-mini) | 1,612 | 1.23 | 1 | 4 |
| verification_quality | c1..c7 (Grok) | 4,690 | 1.45 | 1 | 4 |
| verification_quality | long names (gpt-4o-mini) | 1,612 | 1.21 | 1 | 4 |
| medical_state_severity | c1..c7 (Grok) | 4,690 | 2.97 | 1 | 4 |
| medical_state_severity | long names (gpt-4o-mini) | 1,612 | 1.99 | 1 | 4 |
| unpredictability | c1..c7 (Grok) | 4,690 | 1.56 | 1 | 4 |
| unpredictability | long names (gpt-4o-mini) | 1,612 | 1.29 | 1 | 4 |
| perceptual_access_impossibility | c1..c7 (Grok) | 4,690 | 1.63 | 1 | 4 |
| perceptual_access_impossibility | long names (gpt-4o-mini) | 1,612 | 1.25 | 1 | 4 |

### nde-core-elements: The 15 core NDE elements by frequency

_Confirmed NDE videos with a 15-element core_elements array, n=6289_

| element | present n | present pct | mean confidence when present |
| --- | --- | --- | --- |
| feelings_of_peace | 5,851 | 93.0 | 84.5 |
| out_of_body | 5,263 | 83.7 | 87.7 |
| choice_to_return | 4,929 | 78.4 | 84.8 |
| otherworldly_realm | 4,705 | 74.8 | 80.5 |
| enhanced_senses | 4,662 | 74.1 | 75.8 |
| knowledge_download | 3,869 | 61.5 | 79.5 |
| cosmic_unity | 3,843 | 61.1 | 78.8 |
| bright_light | 3,800 | 60.4 | 82.6 |
| telepathy | 3,774 | 60.0 | 76.7 |
| time_distortion | 3,700 | 58.8 | 73.6 |
| being_of_light | 3,437 | 54.7 | 80.8 |
| life_review | 3,101 | 49.3 | 81.3 |
| deceased_relatives | 2,509 | 39.9 | 79.9 |
| border_boundary | 2,365 | 37.6 | 74.6 |
| tunnel | 1,500 | 23.9 | 80.6 |

### nde-core-elements-count: Number of core elements present per video

_Confirmed NDE videos with core_elements, n=6289_

| value | count | pct |
| --- | --- | --- |
| 0 | 60 | 1.0 |
| 1 | 77 | 1.2 |
| 2 | 154 | 2.4 |
| 3 | 199 | 3.2 |
| 4 | 245 | 3.9 |
| 5 | 339 | 5.4 |
| 6 | 388 | 6.2 |
| 7 | 467 | 7.4 |
| 8 | 546 | 8.7 |
| 9 | 614 | 9.8 |
| 10 | 715 | 11.4 |
| 11 | 657 | 10.4 |
| 12 | 697 | 11.1 |
| 13 | 592 | 9.4 |
| 14 | 362 | 5.8 |
| 15 | 177 | 2.8 |

### nde-core-element-pairs: Top co-occurring core element pairs

_Confirmed NDE videos with core_elements, n=6289; lift = P(both) / (P(a) P(b)); top 25 by count_

| pair | both present n | pct of videos | lift |
| --- | --- | --- | --- |
| feelings_of_peace + out_of_body | 5,018 | 79.8 | 1.02 |
| choice_to_return + feelings_of_peace | 4,732 | 75.2 | 1.03 |
| enhanced_senses + feelings_of_peace | 4,507 | 71.7 | 1.04 |
| feelings_of_peace + otherworldly_realm | 4,502 | 71.6 | 1.03 |
| choice_to_return + out_of_body | 4,459 | 70.9 | 1.08 |
| otherworldly_realm + out_of_body | 4,191 | 66.6 | 1.06 |
| enhanced_senses + out_of_body | 4,173 | 66.4 | 1.07 |
| choice_to_return + otherworldly_realm | 3,994 | 63.5 | 1.08 |
| enhanced_senses + otherworldly_realm | 3,960 | 63.0 | 1.14 |
| choice_to_return + enhanced_senses | 3,927 | 62.4 | 1.07 |
| cosmic_unity + feelings_of_peace | 3,795 | 60.3 | 1.06 |
| feelings_of_peace + knowledge_download | 3,765 | 59.9 | 1.05 |
| bright_light + feelings_of_peace | 3,724 | 59.2 | 1.05 |
| feelings_of_peace + telepathy | 3,654 | 58.1 | 1.04 |
| feelings_of_peace + time_distortion | 3,590 | 57.1 | 1.04 |
| cosmic_unity + out_of_body | 3,443 | 54.7 | 1.07 |
| knowledge_download + out_of_body | 3,437 | 54.7 | 1.06 |
| bright_light + out_of_body | 3,427 | 54.5 | 1.08 |
| out_of_body + time_distortion | 3,383 | 53.8 | 1.09 |
| out_of_body + telepathy | 3,381 | 53.8 | 1.07 |
| knowledge_download + otherworldly_realm | 3,375 | 53.7 | 1.17 |
| being_of_light + feelings_of_peace | 3,374 | 53.6 | 1.06 |
| bright_light + choice_to_return | 3,321 | 52.8 | 1.12 |
| enhanced_senses + knowledge_download | 3,307 | 52.6 | 1.15 |
| choice_to_return + knowledge_download | 3,299 | 52.5 | 1.09 |

### nde-core-element-pairs-lift: Core element pairs with highest lift (count >= 200)

_Confirmed NDE videos with core_elements, n=6289_

| pair | both present n | pct of videos | lift |
| --- | --- | --- | --- |
| border_boundary + tunnel | 861 | 13.7 | 1.53 |
| bright_light + tunnel | 1,255 | 20.0 | 1.38 |
| being_of_light + border_boundary | 1,716 | 27.3 | 1.33 |
| being_of_light + bright_light | 2,751 | 43.7 | 1.32 |
| cosmic_unity + knowledge_download | 3,087 | 49.1 | 1.31 |
| life_review + tunnel | 954 | 15.2 | 1.29 |
| being_of_light + tunnel | 1,053 | 16.7 | 1.28 |
| knowledge_download + life_review | 2,431 | 38.7 | 1.27 |
| border_boundary + bright_light | 1,794 | 28.5 | 1.26 |
| border_boundary + life_review | 1,472 | 23.4 | 1.26 |
| time_distortion + tunnel | 1,109 | 17.6 | 1.26 |
| border_boundary + choice_to_return | 2,319 | 36.9 | 1.25 |
| being_of_light + life_review | 2,121 | 33.7 | 1.25 |
| border_boundary + deceased_relatives | 1,156 | 18.4 | 1.23 |
| being_of_light + telepathy | 2,524 | 40.1 | 1.22 |

### nde-entity-types: Entity types across all entity encounters

_Entity encounters listed under entities.encounters in confirmed NDE videos (6304 videos); n=12135. normalized: lowercase, spaces to underscores_

| value | count | pct |
| --- | --- | --- |
| religious_figure | 3,020 | 24.9 |
| deceased_relative | 2,596 | 21.4 |
| unknown | 1,734 | 14.3 |
| group | 1,430 | 11.8 |
| angel | 1,096 | 9.0 |
| guide | 987 | 8.1 |
| being_of_light | 486 | 4.0 |
| deceased_friend | 394 | 3.2 |
| animal | 193 | 1.6 |
| shadow_figure | 76 | 0.6 |
| demon | 39 | 0.3 |
| guardian | 16 | 0.1 |
| deceased_pet | 11 | 0.1 |
| demonic | 6 | 0.0 |
| guardian_angel | 6 | 0.0 |
| unidentified | 6 | 0.0 |
| demonic_figure | 4 | 0.0 |
| angels | 3 | 0.0 |
| deity | 3 | 0.0 |
| historical_figure | 3 | 0.0 |
| living_relative | 3 | 0.0 |
| living_friend | 2 | 0.0 |
| none | 2 | 0.0 |
| political_figure | 2 | 0.0 |
| scientist | 2 | 0.0 |
| (other, 14 values) | 15 | 0.1 |

### nde-entity-dominant: Dominant entity type per video

_Confirmed NDE videos with entities.dominant_entity_type; n=5677_

| value | count | pct |
| --- | --- | --- |
| religious_figure | 1,842 | 32.4 |
| deceased_relative | 947 | 16.7 |
| guide | 602 | 10.6 |
| unknown | 532 | 9.4 |
| angel | 437 | 7.7 |
| group | 397 | 7.0 |
| being_of_light | 364 | 6.4 |
| none | 360 | 6.3 |
| deceased_friend | 103 | 1.8 |
| animal | 27 | 0.5 |
| demon | 22 | 0.4 |
| shadow_figure | 16 | 0.3 |
| guardian | 9 | 0.2 |
| demonic | 5 | 0.1 |
| guardian_angel | 4 | 0.1 |
| deceased_pet | 3 | 0.1 |
| angels | 2 | 0.0 |
| demonic_figure | 1 | 0.0 |
| earth_bound_spirit | 1 | 0.0 |
| ghost | 1 | 0.0 |
| (other, 2 values) | 2 | 0.0 |

### nde-entity-any-type: Share of videos with at least one entity of each type

_Confirmed NDE videos with entities.encounters, n=6304; a video counts once per type; top 15 types_

| entity type | videos | pct of videos |
| --- | --- | --- |
| religious_figure | 2,474 | 39.2 |
| deceased_relative | 1,934 | 30.7 |
| unknown | 1,442 | 22.9 |
| group | 1,375 | 21.8 |
| angel | 1,023 | 16.2 |
| guide | 917 | 14.5 |
| being_of_light | 475 | 7.5 |
| deceased_friend | 337 | 5.3 |
| animal | 172 | 2.7 |
| shadow_figure | 76 | 1.2 |
| demon | 31 | 0.5 |
| guardian | 10 | 0.2 |
| guardian_angel | 6 | 0.1 |
| demonic | 5 | 0.1 |
| unidentified | 5 | 0.1 |

### nde-entity-count: Entities per video (length of entities.encounters)

_Confirmed NDE videos with entities.encounters; n=6304_

| value | count | pct |
| --- | --- | --- |
| 0 | 403 | 6.4 |
| 1 | 2,215 | 35.1 |
| 2 | 2,001 | 31.7 |
| 3 | 1,099 | 17.4 |
| 4 | 400 | 6.3 |
| 5 | 132 | 2.1 |
| 6 | 33 | 0.5 |
| 7 | 12 | 0.2 |
| 8 | 3 | 0.0 |
| 9 | 5 | 0.1 |
| 10 | 1 | 0.0 |

### nde-entity-communication: Entity communication method

_Entity encounters; n=12135. normalized; "not stated" and "not_stated" merged_

| value | count | pct |
| --- | --- | --- |
| verbal | 3,963 | 32.7 |
| telepathy | 3,003 | 24.7 |
| presence_only | 2,203 | 18.2 |
| emotional | 1,318 | 10.9 |
| not_stated | 1,190 | 9.8 |
| none | 127 | 1.0 |
| auditory | 110 | 0.9 |
| gesture | 64 | 0.5 |
| thought | 29 | 0.2 |
| non_verbal | 19 | 0.2 |
| mental | 6 | 0.0 |
| singing | 6 | 0.0 |
| (other, 64 values) | 97 | 0.8 |

### nde-entity-emotion: Entity emotional quality

_Entity encounters; n=12135_

| value | count | pct |
| --- | --- | --- |
| loving | 7,765 | 64.0 |
| neutral | 2,022 | 16.7 |
| peaceful | 946 | 7.8 |
| authoritative | 400 | 3.3 |
| frightening | 356 | 2.9 |
| mixed | 136 | 1.1 |
| joyful | 88 | 0.7 |
| stern | 87 | 0.7 |
| playful | 62 | 0.5 |
| supportive | 48 | 0.4 |
| calm | 25 | 0.2 |
| concerned | 16 | 0.1 |
| (other, 77 values) | 184 | 1.5 |

### nde-entity-luminosity: Entity luminosity

_Entity encounters; n=12135_

| value | count | pct |
| --- | --- | --- |
| not_stated | 5,964 | 49.1 |
| radiant | 4,233 | 34.9 |
| normal | 741 | 6.1 |
| glowing | 470 | 3.9 |
| not_described | 366 | 3.0 |
| dark | 316 | 2.6 |
| bright | 5 | 0.0 |
| brilliant_light | 3 | 0.0 |
| (other, 31 values) | 37 | 0.3 |

### nde-entity-gender: Entity gender

_Entity encounters; n=12135_

| value | count | pct |
| --- | --- | --- |
| male | 4,260 | 35.1 |
| not_stated | 4,044 | 33.3 |
| female | 2,307 | 19.0 |
| non_physical | 1,350 | 11.1 |
| androgynous | 124 | 1.0 |
| mixed | 39 | 0.3 |
| male_and_female | 10 | 0.1 |
| null | 1 | 0.0 |

### nde-entity-age: Entity apparent age

_Entity encounters; n=12135_

| value | count | pct |
| --- | --- | --- |
| not_stated | 6,115 | 50.4 |
| ageless | 3,759 | 31.0 |
| young | 1,005 | 8.3 |
| elderly | 738 | 6.1 |
| middle_aged | 411 | 3.4 |
| younger | 13 | 0.1 |
| mixed | 9 | 0.1 |
| toddler | 8 | 0.1 |
| (other, 39 values) | 77 | 0.6 |

### nde-journey-elements: Journey elements (share of videos whose sequence contains the element)

_Confirmed NDE videos with a non-empty journey_sequence, n=5559; journey elements are a separate vocabulary from the 15 core elements; top 30 of 118 distinct values_

| element | videos | pct of videos |
| --- | --- | --- |
| choice_to_return | 4,495 | 80.9 |
| peace_calm | 3,335 | 60.0 |
| life_review | 3,255 | 58.6 |
| void_darkness | 3,185 | 57.3 |
| sudden_return | 3,132 | 56.3 |
| observing_body | 2,975 | 53.5 |
| knowledge_download | 2,896 | 52.1 |
| being_of_light | 2,828 | 50.9 |
| cosmic_unity | 2,767 | 49.8 |
| bright_light | 1,962 | 35.3 |
| otherworldly_realm | 1,771 | 31.9 |
| love_unconditional | 1,633 | 29.4 |
| forced_return | 1,501 | 27.0 |
| deceased_relatives | 1,472 | 26.5 |
| return_unclear | 1,446 | 26.0 |
| beings_entities | 1,279 | 23.0 |
| tunnel | 1,002 | 18.0 |
| fear_distress | 900 | 16.2 |
| future_visions | 709 | 12.8 |
| joy_bliss | 617 | 11.1 |
| telepathy | 569 | 10.2 |
| celestial_music | 540 | 9.7 |
| enhanced_senses | 525 | 9.4 |
| unknown_presence | 425 | 7.6 |
| border_boundary | 375 | 6.7 |
| nature_landscapes | 261 | 4.7 |
| hellish_realm | 245 | 4.4 |
| time_distortion | 244 | 4.4 |
| religious_figure | 140 | 2.5 |
| cities_structures | 43 | 0.8 |

### nde-journey-first: Most common first journey element

_Non-empty journey sequences, n=5559_

| value | count | pct |
| --- | --- | --- |
| observing_body | 2,555 | 46.0 |
| void_darkness | 2,328 | 41.9 |
| bright_light | 322 | 5.8 |
| tunnel | 173 | 3.1 |
| life_review | 26 | 0.5 |
| fear_distress | 24 | 0.4 |
| deceased_relatives | 18 | 0.3 |
| otherworldly_realm | 18 | 0.3 |
| hellish_realm | 10 | 0.2 |
| peace_calm | 10 | 0.2 |
| being_of_light | 9 | 0.2 |
| unknown_presence | 9 | 0.2 |
| (other, 37 values) | 57 | 1.0 |

### nde-journey-last: Most common last journey element

_Non-empty journey sequences, n=5559_

| value | count | pct |
| --- | --- | --- |
| sudden_return | 2,758 | 49.6 |
| return_unclear | 1,194 | 21.5 |
| choice_to_return | 951 | 17.1 |
| forced_return | 576 | 10.4 |
| border_boundary | 17 | 0.3 |
| life_review | 12 | 0.2 |
| peace_calm | 11 | 0.2 |
| love_unconditional | 6 | 0.1 |
| knowledge_download | 5 | 0.1 |
| observing_body | 5 | 0.1 |
| unknown_presence | 4 | 0.1 |
| cosmic_unity | 3 | 0.1 |
| (other, 12 values) | 17 | 0.3 |

### nde-journey-length: Journey sequence length

_Non-empty journey sequences, n=5559_

| value | count | pct |
| --- | --- | --- |
| 2 | 1 | 0.0 |
| 3 | 10 | 0.2 |
| 4 | 39 | 0.7 |
| 5 | 137 | 2.5 |
| 6 | 610 | 11.0 |
| 7 | 928 | 16.7 |
| 8 | 1,085 | 19.5 |
| 9 | 1,110 | 20.0 |
| 10 | 941 | 16.9 |
| 11 | 575 | 10.3 |
| 12 | 123 | 2.2 |

### nde-journey-bigrams: Top two-step transitions

_Consecutive element pairs across non-empty journey sequences (5559 videos); n=41351_

| value | count | pct |
| --- | --- | --- |
| choice_to_return > sudden_return | 2,132 | 5.2 |
| life_review > knowledge_download | 1,100 | 2.7 |
| observing_body > peace_calm | 1,036 | 2.5 |
| knowledge_download > choice_to_return | 974 | 2.4 |
| life_review > choice_to_return | 812 | 2.0 |
| void_darkness > peace_calm | 811 | 2.0 |
| cosmic_unity > choice_to_return | 756 | 1.8 |
| knowledge_download > cosmic_unity | 720 | 1.7 |
| choice_to_return > forced_return | 689 | 1.7 |
| peace_calm > being_of_light | 652 | 1.6 |
| observing_body > void_darkness | 602 | 1.5 |
| choice_to_return > return_unclear | 554 | 1.3 |
| void_darkness > bright_light | 551 | 1.3 |
| forced_return > sudden_return | 539 | 1.3 |
| being_of_light > cosmic_unity | 519 | 1.3 |
| cosmic_unity > life_review | 511 | 1.2 |
| bright_light > peace_calm | 510 | 1.2 |
| cosmic_unity > knowledge_download | 485 | 1.2 |
| being_of_light > life_review | 447 | 1.1 |
| void_darkness > fear_distress | 389 | 0.9 |
| (other, 907 values) | 26,562 | 64.2 |

### nde-journey-trigrams: Top three-step sequences

_Consecutive element triples across non-empty journey sequences (5559 videos); n=35792_

| value | count | pct |
| --- | --- | --- |
| knowledge_download > choice_to_return > sudden_return | 496 | 1.4 |
| life_review > knowledge_download > choice_to_return | 475 | 1.3 |
| life_review > choice_to_return > sudden_return | 361 | 1.0 |
| cosmic_unity > choice_to_return > sudden_return | 355 | 1.0 |
| life_review > knowledge_download > cosmic_unity | 328 | 0.9 |
| knowledge_download > cosmic_unity > choice_to_return | 321 | 0.9 |
| choice_to_return > forced_return > sudden_return | 297 | 0.8 |
| being_of_light > life_review > knowledge_download | 217 | 0.6 |
| observing_body > peace_calm > deceased_relatives | 215 | 0.6 |
| cosmic_unity > life_review > choice_to_return | 190 | 0.5 |
| void_darkness > peace_calm > being_of_light | 187 | 0.5 |
| cosmic_unity > knowledge_download > choice_to_return | 185 | 0.5 |
| observing_body > peace_calm > being_of_light | 185 | 0.5 |
| future_visions > choice_to_return > sudden_return | 182 | 0.5 |
| cosmic_unity > life_review > knowledge_download | 172 | 0.5 |
| being_of_light > cosmic_unity > life_review | 164 | 0.5 |
| being_of_light > choice_to_return > sudden_return | 162 | 0.5 |
| knowledge_download > life_review > choice_to_return | 162 | 0.5 |
| void_darkness > bright_light > peace_calm | 157 | 0.4 |
| knowledge_download > choice_to_return > forced_return | 140 | 0.4 |
| (other, 5864 values) | 30,841 | 86.2 |

### nde-pheno-reality: Reality comparison

_Confirmed NDE videos with phenomenology, n=6292_

| value | count | pct |
| --- | --- | --- |
| more_real | 5,985 | 95.1 |
| not_stated | 220 | 3.5 |
| surreal | 55 | 0.9 |
| dreamlike | 26 | 0.4 |
| equally_real | 6 | 0.1 |

### nde-pheno-vividness: Vividness rating

_Confirmed NDE videos with phenomenology, n=6292_

| value | count | pct |
| --- | --- | --- |
| 0 | 25 | 0.4 |
| 1 | 10 | 0.2 |
| 3 | 1 | 0.0 |
| 5 | 28 | 0.4 |
| 6 | 8 | 0.1 |
| 7 | 59 | 0.9 |
| 8 | 430 | 6.8 |
| 9 | 2,648 | 42.1 |
| 10 | 3,083 | 49.0 |

### nde-pheno-thought-speed: Altered cognition: thought speed

_n=6292_

| value | count | pct |
| --- | --- | --- |
| timeless | 4,999 | 79.5 |
| normal | 1,110 | 17.6 |
| faster | 125 | 2.0 |
| not_stated | 53 | 0.8 |
| slower | 5 | 0.1 |

### nde-pheno-memory: Altered cognition: memory quality

_n=6292_

| value | count | pct |
| --- | --- | --- |
| perfect_recall | 4,664 | 74.1 |
| vivid | 1,372 | 21.8 |
| fragmentary | 139 | 2.2 |
| not_stated | 69 | 1.1 |
| partial | 48 | 0.8 |

### nde-pheno-self-awareness: Altered cognition: self awareness

_n=6292_

| value | count | pct |
| --- | --- | --- |
| heightened | 6,129 | 97.4 |
| not_stated | 50 | 0.8 |
| dissolved | 46 | 0.7 |
| diminished | 36 | 0.6 |
| normal | 31 | 0.5 |

### nde-pheno-clarity: Altered cognition: thought clarity

_n=6292_

| value | count | pct |
| --- | --- | --- |
| enhanced | 6,109 | 97.1 |
| normal | 73 | 1.2 |
| diminished | 61 | 1.0 |
| not_stated | 49 | 0.8 |

### nde-pheno-senses: Sensory modalities active and extraordinary

_Confirmed NDE videos with phenomenology, n=6292_

| modality | active n | active pct | extraordinary n | extraordinary pct |
| --- | --- | --- | --- | --- |
| visual | 6,030 | 95.8 | 5,723 | 91.0 |
| auditory | 5,278 | 83.9 | 3,792 | 60.3 |
| tactile | 4,236 | 67.3 | 2,442 | 38.8 |
| kinesthetic | 5,824 | 92.6 | 5,153 | 81.9 |
| olfactory | 570 | 9.1 | 280 | 4.5 |
| gustatory | 237 | 3.8 | 89 | 1.4 |

### nde-pheno-emotion-first: First emotion in emotional_progression

_Videos with non-empty emotional_progression, n=6259_

| value | count | pct |
| --- | --- | --- |
| fear | 2,192 | 35.0 |
| confusion | 591 | 9.4 |
| curiosity | 307 | 4.9 |
| peace | 274 | 4.4 |
| love | 259 | 4.1 |
| joy | 214 | 3.4 |
| pain | 190 | 3.0 |
| panic | 185 | 3.0 |
| calm | 159 | 2.5 |
| awe | 103 | 1.6 |
| shock | 81 | 1.3 |
| grief | 80 | 1.3 |
| (other, 257 values) | 1,624 | 25.9 |

### nde-pheno-emotion-last: Last emotion in emotional_progression

_Videos with non-empty emotional_progression, n=6259_

| value | count | pct |
| --- | --- | --- |
| determination | 519 | 8.3 |
| gratitude | 516 | 8.2 |
| peace | 492 | 7.9 |
| hope | 445 | 7.1 |
| joy | 444 | 7.1 |
| acceptance | 367 | 5.9 |
| relief | 312 | 5.0 |
| love | 283 | 4.5 |
| confusion | 231 | 3.7 |
| sadness | 177 | 2.8 |
| curiosity | 126 | 2.0 |
| empowerment | 108 | 1.7 |
| (other, 308 values) | 2,239 | 35.8 |

### nde-pheno-emotion-all: All emotions mentioned in emotional_progression

_Emotion steps across confirmed NDE videos; n=29934_

| value | count | pct |
| --- | --- | --- |
| fear | 3,241 | 10.8 |
| joy | 2,548 | 8.5 |
| love | 2,531 | 8.5 |
| peace | 2,450 | 8.2 |
| confusion | 1,728 | 5.8 |
| curiosity | 1,152 | 3.8 |
| relief | 924 | 3.1 |
| hope | 883 | 2.9 |
| determination | 811 | 2.7 |
| gratitude | 773 | 2.6 |
| sadness | 772 | 2.6 |
| acceptance | 713 | 2.4 |
| awe | 598 | 2.0 |
| calm | 496 | 1.7 |
| wonder | 493 | 1.6 |
| pain | 398 | 1.3 |
| comfort | 354 | 1.2 |
| panic | 352 | 1.2 |
| longing | 314 | 1.0 |
| despair | 268 | 0.9 |
| bliss | 267 | 0.9 |
| grief | 259 | 0.9 |
| excitement | 256 | 0.9 |
| anger | 254 | 0.8 |
| shock | 239 | 0.8 |
| (other, 596 values) | 6,860 | 22.9 |

### nde-safety-flags: Content safety flag rates

_Confirmed NDE videos with content_safety.flags, n=6291_

| flag | true n | pct |
| --- | --- | --- |
| self_harm | 271 | 4.3 |
| suicide_related | 433 | 6.9 |
| child_death | 222 | 3.5 |
| medical_graphic | 691 | 11.0 |
| distressing_content | 1,058 | 16.8 |

### nde-safety-warning: Content safety warning level

_n=6291_

| value | count | pct |
| --- | --- | --- |
| none | 4,727 | 75.1 |
| moderate | 759 | 12.1 |
| mild | 751 | 11.9 |
| severe | 54 | 0.9 |

### nde-safety-overall: Content safety overall_safe

_n=6291_

| value | count | pct |
| --- | --- | --- |
| true | 5,443 | 86.5 |
| false | 848 | 13.5 |

### nde-x-tone-by-trigger: Tone by trigger category (row %)

_Confirmed NDE videos with both fields; top 14 trigger categories; row n stated per row_

| trigger | n | very_positive % | positive % | mixed % | neutral % | negative % | very_negative % |
| --- | --- | --- | --- | --- | --- | --- | --- |
| accident | 1,317 | 65.2 | 27.4 | 7.1 | 0.1 | 0.0 | 0.2 |
| unknown | 1,089 | 46.3 | 39.7 | 7.2 | 3.6 | 0.0 | 3.3 |
| medical_crisis | 825 | 72.6 | 21.2 | 5.0 | 0.1 | 0.0 | 1.1 |
| illness | 684 | 69.2 | 23.7 | 5.1 | 0.3 | 0.1 | 1.6 |
| surgery | 669 | 73.2 | 22.3 | 3.9 | 0.1 | 0.0 | 0.4 |
| cardiac_arrest | 440 | 75.0 | 18.9 | 5.5 | 0.2 | 0.0 | 0.5 |
| near_drowning | 344 | 71.8 | 23.0 | 4.4 | 0.6 | 0.0 | 0.3 |
| childbirth | 226 | 70.4 | 22.1 | 6.6 | 0.0 | 0.0 | 0.9 |
| overdose | 212 | 66.0 | 22.6 | 6.1 | 0.0 | 0.0 | 5.2 |
| other | 172 | 48.8 | 38.4 | 8.7 | 0.0 | 0.0 | 4.1 |
| suicide_attempt | 169 | 50.3 | 29.6 | 15.4 | 0.0 | 0.0 | 4.7 |
| allergic_reaction | 52 | 57.7 | 38.5 | 3.8 | 0.0 | 0.0 | 0.0 |
| combat | 41 | 61.0 | 26.8 | 4.9 | 2.4 | 0.0 | 4.9 |
| meditation | 17 | 82.4 | 17.6 | 0.0 | 0.0 | 0.0 | 0.0 |

### nde-x-transformation-by-greyson: Transformation classification by Greyson band (row %)

_Confirmed NDE videos with Greyson and transformation scores_

| Greyson band | n | No Transformation Discussed % | Minimal Transformation % | Moderate Transformation % | Significant Transformation % | Major Transformation % | Comprehensive Profound Transformation % |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0-7 | 101 | 64.4 | 4.0 | 26.7 | 4.0 | 1.0 | 0.0 |
| 8-15 | 194 | 19.1 | 2.1 | 34.0 | 36.6 | 8.2 | 0.0 |
| 16-23 | 982 | 5.7 | 1.2 | 22.4 | 53.6 | 17.1 | 0.0 |
| 24-32 | 5,018 | 0.6 | 0.0 | 8.6 | 44.5 | 45.3 | 1.0 |

### nde-x-class-by-transformation-band: Transformation classification by transformation score band (counts)

_Confirmed NDE videos with transformation score; shows the thresholds the classifier used_

| score band | n | No Transformation Discussed | Minimal Transformation | Moderate Transformation | Significant Transformation | Major Transformation | Comprehensive Profound Transformation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 190 | 190 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| 1-9 | 7 | 0 (0.0%) | 7 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| 10-19 | 415 | 0 (0.0%) | 14 (3.4%) | 401 (96.6%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| 20-29 | 1,543 | 0 (0.0%) | 0 (0.0%) | 342 (22.2%) | 1201 (77.8%) | 0 (0.0%) | 0 (0.0%) |
| 30-39 | 4,016 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 1633 (40.7%) | 2383 (59.3%) | 0 (0.0%) |
| 40-50 | 124 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 73 (58.9%) | 51 (41.1%) |

### nde-x-elements-by-type: Core element presence by experience type (%)

_Confirmed NDE videos with core_elements; column n: nde=5702, obe=178, sde=166, ste=130, adc=75_

| element | nde % | obe % | sde % | ste % | adc % |
| --- | --- | --- | --- | --- | --- |
| out_of_body | 87.1 | 100.0 | 47.0 | 20.8 | 12.0 |
| tunnel | 25.8 | 8.4 | 6.6 | 1.5 | 0.0 |
| bright_light | 63.9 | 26.4 | 31.9 | 36.2 | 10.7 |
| deceased_relatives | 39.2 | 30.9 | 71.1 | 19.2 | 96.0 |
| life_review | 52.5 | 16.3 | 21.7 | 23.1 | 10.7 |
| being_of_light | 58.0 | 22.5 | 19.9 | 35.4 | 10.7 |
| border_boundary | 40.7 | 10.1 | 10.2 | 4.6 | 2.7 |
| feelings_of_peace | 94.1 | 82.0 | 88.6 | 93.8 | 90.7 |
| cosmic_unity | 62.5 | 52.8 | 42.2 | 76.9 | 18.7 |
| time_distortion | 62.2 | 32.0 | 28.9 | 30.0 | 9.3 |
| enhanced_senses | 76.3 | 65.7 | 54.2 | 53.1 | 46.7 |
| telepathy | 61.0 | 52.2 | 58.4 | 39.2 | 70.7 |
| otherworldly_realm | 76.9 | 68.0 | 54.2 | 57.7 | 41.3 |
| knowledge_download | 63.4 | 51.1 | 30.1 | 71.5 | 28.0 |
| choice_to_return | 83.4 | 44.4 | 30.1 | 25.4 | 13.3 |

### nde-x-elements-type-diffs: Largest core element differences vs nde type

_Percentage point difference (type rate minus nde rate); top 15 by absolute difference; types with n>=40_

| type | element | type pct | nde pct | diff (pts) |
| --- | --- | --- | --- | --- |
| adc | out_of_body | 12.0 | 87.1 | -75.1 |
| adc | choice_to_return | 13.3 | 83.4 | -70.1 |
| ste | out_of_body | 20.8 | 87.1 | -66.3 |
| ste | choice_to_return | 25.4 | 83.4 | -58 |
| adc | deceased_relatives | 96.0 | 39.2 | 56.8 |
| sde | choice_to_return | 30.1 | 83.4 | -53.3 |
| adc | bright_light | 10.7 | 63.9 | -53.2 |
| adc | time_distortion | 9.3 | 62.2 | -52.9 |
| adc | being_of_light | 10.7 | 58.0 | -47.3 |
| adc | cosmic_unity | 18.7 | 62.5 | -43.8 |
| adc | life_review | 10.7 | 52.5 | -41.8 |
| sde | out_of_body | 47.0 | 87.1 | -40.1 |
| obe | choice_to_return | 44.4 | 83.4 | -39 |
| sde | being_of_light | 19.9 | 58.0 | -38.1 |
| adc | border_boundary | 2.7 | 40.7 | -38 |

### nde-x-tone-by-journey: Tone by journey type (row %)

_Confirmed NDE videos with both fields_

| journey type | n | very_positive % | positive % | mixed % | neutral % | negative % | very_negative % |
| --- | --- | --- | --- | --- | --- | --- | --- |
| positive | 5,005 | 73.5 | 23.0 | 3.3 | 0.2 | 0.0 | 0.0 |
| neutral | 744 | 30.8 | 56.2 | 7.1 | 4.0 | 0.1 | 1.7 |
| mixed | 295 | 27.5 | 38.0 | 33.6 | 0.0 | 0.0 | 1.0 |
| distressing | 250 | 28.4 | 8.8 | 30.4 | 0.0 | 0.0 | 32.4 |

### nde-x-intensity-by-class: Intensity by transformation classification (row %)

_Confirmed NDE videos with intensity and transformation_

| classification | n | <=4 % | 5-6 % | 7 % | 8 % | 9 % | 10 % | mean intensity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| No Transformation Discussed | 190 | 12.6 | 13.2 | 30.0 | 33.2 | 8.4 | 2.6 | 6.61 |
| Minimal Transformation | 21 | 0.0 | 28.6 | 33.3 | 38.1 | 0.0 | 0.0 | 6.95 |
| Moderate Transformation | 743 | 0.0 | 2.7 | 18.8 | 51.0 | 24.9 | 2.6 | 8.05 |
| Significant Transformation | 2,834 | 0.0 | 0.1 | 6.9 | 49.5 | 38.1 | 5.4 | 8.42 |
| Major Transformation | 2,456 | 0.1 | 0.0 | 1.3 | 32.7 | 55.4 | 10.5 | 8.74 |
| Comprehensive Profound Transformation | 51 | 0.0 | 0.0 | 0.0 | 3.9 | 49.0 | 47.1 | 9.43 |

### nde-x-year: Upload year: count and mean scores

_Confirmed NDE videos with an upload date, n=6185_

| year | n | mean transformation | mean Greyson | mean rvnde | median views |
| --- | --- | --- | --- | --- | --- |
| 2011 | 28 | 17 | 21.6 | 8.9 | 1,976 |
| 2012 | 11 | 21.5 | 21.2 | 12.3 | 45,449 |
| 2013 | 25 | 22.9 | 24.7 | 12.9 | 34,799 |
| 2014 | 9 | 27.8 | 26.3 | 9.3 | 65,071 |
| 2015 | 17 | 29.4 | 23.8 | 11.6 | 35,529 |
| 2016 | 25 | 24.4 | 21.3 | 11.8 | 30,318 |
| 2017 | 30 | 24.6 | 24.4 | 13.9 | 112,567 |
| 2018 | 39 | 24.1 | 24.5 | 11.3 | 151,507 |
| 2019 | 55 | 28.5 | 25.9 | 12.5 | 97,617 |
| 2020 | 284 | 24.9 | 22.9 | 11.8 | 3544.5 |
| 2021 | 415 | 27.6 | 25.7 | 12.8 | 11,565 |
| 2022 | 595 | 28.5 | 26.1 | 11.9 | 6,507 |
| 2023 | 1,361 | 28.4 | 26.5 | 11.9 | 5,458 |
| 2024 | 1,509 | 30.1 | 26.7 | 11.4 | 9,177 |
| 2025 | 1,153 | 29.9 | 26.3 | 10 | 7,218 |
| 2026 | 629 | 29.8 | 26.6 | 9.2 | 3,468 |

### nde-x-channels-top15: Top 15 channels by confirmed NDE count with mean scores

_Confirmed NDE videos with channelName, n=6301; 61 channels in total_

| channel | n | mean Greyson | mean transformation | mean rvnde | median views | pct very_positive | pct distressing journey |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Life After Life NDE | 615 | 25.6 | 30.9 | 10.7 | 9,019 | 57.7 | 2.9 |
| AFINAL, O QUE SOMOS NÓS? / AFTER ALL, WHAT ARE WE? | 414 | 25.2 | 25.7 | 10.3 | 109,862 | 51.2 | 2.9 |
| NDE Radio with Lee Witting | 411 | 24.5 | 25.4 | 12.2 | 3,258 | 63.5 | 2.7 |
| Pegi Robinson - NDE TV | 395 | 25.8 | 29.1 | 12.1 | 2,031 | 59.7 | 3.8 |
| Love Covered Life Podcast | 327 | 25.5 | 28 | 10.5 | 10,195 | 63.9 | 2.4 |
| NDE Diary | 310 | 27.9 | 31.2 | 11.1 | 15,113 | 74.5 | 2.6 |
| IANDS | 303 | 23.8 | 27.3 | 11.3 | 5,438 | 55.1 | 2.0 |
| The Other Side NDE | 254 | 28.1 | 31.9 | 11.7 | 112839.5 | 74.8 | 1.2 |
| Round Trip Death | 235 | 27.1 | 27.8 | 12.3 | 1,053 | 76.2 | 4.7 |
| Tia Renee | 221 | 27 | 31.3 | 12.1 | 3,391 | 69.2 | 1.4 |
| Tales Of Resilience | 219 | 26.9 | 33.1 | 10.1 | 2,787 | 65.3 | 3.7 |
| Beyond with Heather Tesch | 185 | 27.2 | 28.2 | 10.7 | 9,632 | 77.8 | 1.6 |
| Divine Encounters NDE | 169 | 28.2 | 31.4 | 9.6 | 3,486 | 70.4 | 0.6 |
| Touching The Afterlife | 168 | 23.6 | 28.6 | 8.9 | 60,285 | 45.2 | 47.0 |
| Crossing Over NDE | 136 | 27.2 | 32.8 | 11.3 | 4,183 | 63.2 | 1.5 |

### nde-x-scores-by-trigger: Mean scores by trigger category

_Confirmed NDE videos with trigger_category; categories with n>=40_

| trigger | n | mean Greyson | mean transformation | mean rvnde | mean intensity |
| --- | --- | --- | --- | --- | --- |
| accident | 1,317 | 27.2 | 30.1 | 11.3 | 8.55 |
| unknown | 1,089 | 22.5 | 24.7 | 9.1 | 7.84 |
| medical_crisis | 825 | 27.4 | 30.2 | 12 | 8.64 |
| illness | 684 | 26.6 | 29.6 | 11.5 | 8.53 |
| surgery | 669 | 27.4 | 29.3 | 12.6 | 8.55 |
| cardiac_arrest | 440 | 27 | 29.5 | 12.4 | 8.69 |
| near_drowning | 344 | 26.6 | 27.7 | 12.3 | 8.43 |
| childbirth | 226 | 27.2 | 30.2 | 11.7 | 8.54 |
| overdose | 212 | 27.3 | 30.9 | 10.8 | 8.73 |
| other | 172 | 23.6 | 28.8 | 9.4 | 8.3 |
| suicide_attempt | 169 | 26 | 30.1 | 10 | 8.46 |
| allergic_reaction | 52 | 26.7 | 32.2 | 12.2 | 8.5 |
| combat | 41 | 26.4 | 29.1 | 11 | 8.54 |

### nde-x-scores-by-model: Mean scores by analysis model (nde_vids.analysis_ai_model_used)

_Confirmed NDE videos, n=6304; the model that wrote the summary and (by timestamp) the analysis row_

| model | n | mean Greyson | pct Greyson=30 | mean transformation | pct transformation=30 | pct transformation=36 | mean rvnde | mean intensity | pct very_positive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grok 4 Fast | 4,690 | 26.2 | 49.5 | 29 | 25.8 | 26.0 | 11.9 | 8.44 | 65.2 |
| gpt-4o-mini | 1,612 | 26.2 | 48.3 | 28.6 | 26.2 | 25.0 | 9.3 | 8.41 | 62.1 |
| null | 2 | 28.5 | 50.0 | 37 | 0.0 | 50.0 | 7 | 8 | 100.0 |

### nde-x-tone-by-type: Tone by experience type (row %)

_Confirmed NDE videos with both fields; types with n>=40_

| experience type | n | very_positive % | positive % | mixed % | neutral % | negative % | very_negative % |
| --- | --- | --- | --- | --- | --- | --- | --- |
| nde | 5,702 | 67.8 | 24.2 | 6.2 | 0.2 | 0.0 | 1.6 |
| obe | 178 | 26.4 | 64.6 | 8.4 | 0.0 | 0.0 | 0.6 |
| sde | 166 | 39.2 | 49.4 | 10.8 | 0.6 | 0.0 | 0.0 |
| ste | 130 | 48.5 | 48.5 | 2.3 | 0.8 | 0.0 | 0.0 |
| adc | 75 | 26.7 | 69.3 | 2.7 | 1.3 | 0.0 | 0.0 |

### nde-x-rvnde-by-greyson: Veridical level by Greyson band (row %)

_Confirmed NDE videos with both scores_

| Greyson band | n | Low Evidential Strength % | Moderate Evidential Strength % | High Evidential Strength % | Exceptional Evidential Strength % |
| --- | --- | --- | --- | --- | --- |
| 0-7 | 101 | 94.1 | 1.0 | 4.0 | 1.0 |
| 8-15 | 193 | 88.1 | 4.7 | 5.2 | 2.1 |
| 16-23 | 982 | 82.0 | 11.1 | 5.5 | 1.4 |
| 24-32 | 5,017 | 70.7 | 16.3 | 9.7 | 3.3 |

### nde-x-journey-by-trigger: Journey type by trigger category (row %)

_Confirmed NDE videos with both fields; top 14 triggers_

| trigger | n | positive % | neutral % | mixed % | distressing % |
| --- | --- | --- | --- | --- | --- |
| accident | 1,317 | 87.6 | 5.2 | 5.5 | 1.6 |
| unknown | 1,089 | 56.7 | 33.6 | 3.5 | 5.3 |
| medical_crisis | 825 | 84.7 | 7.2 | 4.1 | 4.0 |
| illness | 684 | 80.6 | 8.6 | 5.8 | 5.0 |
| surgery | 669 | 88.8 | 4.5 | 5.1 | 1.6 |
| cardiac_arrest | 440 | 86.4 | 6.6 | 3.0 | 4.1 |
| near_drowning | 344 | 86.3 | 7.8 | 4.4 | 1.2 |
| childbirth | 226 | 88.1 | 6.2 | 4.9 | 0.9 |
| overdose | 212 | 75.9 | 2.8 | 7.5 | 13.7 |
| other | 172 | 63.4 | 27.9 | 2.3 | 6.4 |
| suicide_attempt | 169 | 69.8 | 7.7 | 8.9 | 13.6 |
| allergic_reaction | 52 | 94.2 | 3.8 | 1.9 | 0.0 |
| combat | 41 | 78.0 | 14.6 | 2.4 | 4.9 |
| meditation | 17 | 58.8 | 41.2 | 0.0 | 0.0 |

### nde-x-domains-by-tone: Mean transformation domain score by tone

_Confirmed NDE videos with domain_analysis and tone; mean over videos where the domain is present_

| tone | AD | AL | CC | PD | RO | SA | SI | VP | PE | RS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| very_positive | 3.8 | 3.1 | 3.3 | 3.9 | 2.5 | 4.5 | 3.6 | 3.2 | 2.9 | 2.1 |
| positive | 3.3 | 2.6 | 2.9 | 3.6 | 2.1 | 4 | 3.1 | 2.9 | 2.8 | 1.8 |
| mixed | 3.3 | 2.5 | 2.9 | 3.6 | 2.3 | 4 | 3.2 | 2.9 | 2.7 | 1.9 |
| neutral | 0.6 | 0.6 | 0.7 | 0.7 | 0.2 | 1 | 0.8 | 0.6 | 0.2 | 0 |
| negative | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| very_negative | 2.9 | 2 | 2.4 | 3.1 | 2.6 | 3.6 | 2.9 | 2.7 | 1.2 | 1 |

### nde-child-ages: Child experiencer heuristic: parsed age at NDE (<=12) or phrase-only match

_Confirmed NDE videos whose summary or trigger_description matched the child heuristic, n=623. HEURISTIC: regex over AI summaries, not a coded field._

| value | count | pct |
| --- | --- | --- |
| phrase only | 272 | 43.7 |
| 12 | 70 | 11.2 |
| 8 | 62 | 10.0 |
| 5 | 53 | 8.5 |
| 10 | 44 | 7.1 |
| 7 | 36 | 5.8 |
| 11 | 27 | 4.3 |
| 9 | 17 | 2.7 |
| 6 | 14 | 2.2 |
| 3 | 11 | 1.8 |
| 4 | 11 | 1.8 |
| 2 | 6 | 1.0 |

## UAP tables

### uap-coverage: Field coverage among tier 1-2 UAP videos

_Denominator: uap_vids with tier in (1,2), n=8394. Always-null columns: uap_vids.location, uap_encounters.vallee_type, uap_encounters.segment_start_char/segment_end_char, uap_contactee_profiles.experience_type/recurrence (entity_types is always an empty array)._

| field | non-null count | pct | note |
| --- | --- | --- | --- |
| uap_vids rows (tier 1-2) | 8,394 | 100.0 | denominator |
| analysis_uap_summary | 7,592 | 90.4 |  |
| content_type | 7,699 | 91.7 |  |
| source_type | 7,645 | 91.1 |  |
| experiencer_name | 3,873 | 46.1 |  |
| encounter_count > 0 | 4,005 | 47.7 |  |
| uap_video_stats row | 7,591 | 90.4 | 7607 stats rows in total; 16 not in tier 1-2 set |
| has >=1 uap_encounters row | 4,004 | 47.7 | 7017 encounter rows in total; 6 belong to videos outside the tier 1-2 pull |
| view_count non-null | 8,386 | 99.9 |  |
| intake_status = complete | 7,580 | 90.3 |  |

### uap-glance: Corpus at a glance (UAP)

_n=8394 tier 1-2 UAP videos_

| metric | value |
| --- | --- |
| tier 1-2 videos | 8,394 |
| tier 1 (encounters track) | 3,045 |
| tier 2 (program track) | 5,349 |
| distinct channels | 80 |
| earliest upload | 2006-11-25T20:50:42+00:00 |
| latest upload | 2026-09-06T22:29:10+00:00 |
| encounter rows (all) | 7,017 |
| encounter rows on tier 1-2 videos | 7,011 |
| videos with >=1 encounter row | 4,004 |
| video_stats rows | 7,607 |
| total views | 1,185,681,440 |
| median views | 13223.5 |
| mean views | 141388.2 |
| knowledge base: events / persons / orgs / programs / contactee profiles | 831 / 5108 / 1824 / 1810 / 3440 |

### uap-content-type: Content type

_Tier 1-2 videos with non-null content_type; n=7699_

| value | count | pct |
| --- | --- | --- |
| interview | 2,236 | 29.0 |
| research_analysis | 1,537 | 20.0 |
| program_disclosure | 1,082 | 14.1 |
| news_commentary | 905 | 11.8 |
| first_person | 816 | 10.6 |
| documentary_survey | 446 | 5.8 |
| retold_encounter | 365 | 4.7 |
| investigative_journalism | 301 | 3.9 |
| retold_story | 11 | 0.1 |

### uap-track: Track

_Tier 1-2 videos; n=8394_

| value | count | pct |
| --- | --- | --- |
| program | 5,349 | 63.7 |
| encounters | 3,045 | 36.3 |

### uap-source-type: Source type (video level)

_Tier 1-2 videos with non-null source_type; n=7645_

| value | count | pct |
| --- | --- | --- |
| research | 2,734 | 35.8 |
| interview_with_experiencer | 1,510 | 19.8 |
| narrator | 1,135 | 14.8 |
| commentary | 930 | 12.2 |
| direct_experiencer | 812 | 10.6 |
| retold_encounter | 524 | 6.9 |

### uap-publish-year: Video publish year

_Tier 1-2 videos; n=8394_

| value | count | pct |
| --- | --- | --- |
| 2006 | 4 | 0.0 |
| 2007 | 4 | 0.0 |
| 2008 | 3 | 0.0 |
| 2009 | 18 | 0.2 |
| 2010 | 90 | 1.1 |
| 2011 | 62 | 0.7 |
| 2012 | 33 | 0.4 |
| 2013 | 81 | 1.0 |
| 2014 | 32 | 0.4 |
| 2015 | 144 | 1.7 |
| 2016 | 112 | 1.3 |
| 2017 | 35 | 0.4 |
| 2018 | 152 | 1.8 |
| 2019 | 236 | 2.8 |
| 2020 | 296 | 3.5 |
| 2021 | 621 | 7.4 |
| 2022 | 782 | 9.3 |
| 2023 | 1,324 | 15.8 |
| 2024 | 1,454 | 17.3 |
| 2025 | 1,655 | 19.7 |
| 2026 | 1,256 | 15.0 |

### uap-encounter-count: Encounter count per video

_Tier 1-2 videos; n=8394_

| value | count | pct |
| --- | --- | --- |
| 0 | 4,389 | 52.3 |
| 1 | 2,982 | 35.5 |
| 2 | 277 | 3.3 |
| 3 | 263 | 3.1 |
| 4 | 181 | 2.2 |
| 5 | 123 | 1.5 |
| 6 | 73 | 0.9 |
| 7 | 34 | 0.4 |
| 8 | 32 | 0.4 |
| 9 | 18 | 0.2 |
| 10 | 7 | 0.1 |
| 11 | 7 | 0.1 |
| 12 | 2 | 0.0 |
| 13 | 1 | 0.0 |
| 14 | 4 | 0.0 |
| 15 | 1 | 0.0 |

### uap-multi-encounter: Multi-encounter flag

_Tier 1-2 videos; n=8394_

| value | count | pct |
| --- | --- | --- |
| false | 7,371 | 87.8 |
| true | 1,023 | 12.2 |

### uap-intake-status: Intake status

_Tier 1-2 videos; n=8394_

| value | count | pct |
| --- | --- | --- |
| complete | 7,580 | 90.3 |
| no_captions | 352 | 4.2 |
| caption_fetch_failed | 174 | 2.1 |
| classifying | 113 | 1.3 |
| geo_restricted | 83 | 1.0 |
| deferred_tier2 | 71 | 0.8 |
| members_only | 8 | 0.1 |
| punctuated | 5 | 0.1 |
| embedding | 4 | 0.0 |
| null | 2 | 0.0 |
| drm_protected | 1 | 0.0 |
| out_of_scope | 1 | 0.0 |

### uap-x-content-by-track: Content type by track (row %)

_Tier 1-2 videos with content_type_

| track | n | interview % | research_analysis % | program_disclosure % | news_commentary % | first_person % | documentary_survey % | retold_encounter % | investigative_journalism % | retold_story % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| encounters | 3,045 | 72.9 | 0.0 | 0.0 | 0.0 | 26.8 | 0.0 | 0.0 | 0.0 | 0.3 |
| program | 4,654 | 0.3 | 33.0 | 23.2 | 19.4 | 0.0 | 9.6 | 7.8 | 6.5 | 0.0 |

### uap-hynek: Hynek type

_All uap_encounters rows, n=7017 (null shown as "null")_

| value | count | pct |
| --- | --- | --- |
| CE3 | 2,644 | 37.7 |
| CE1 | 2,326 | 33.1 |
| not_stated | 794 | 11.3 |
| CE4 | 390 | 5.6 |
| null | 363 | 5.2 |
| NL | 259 | 3.7 |
| CE2 | 134 | 1.9 |
| CE5 | 107 | 1.5 |

### uap-encounter-source-type: Source type (encounter level)

_All uap_encounters rows; n=7017_

| value | count | pct |
| --- | --- | --- |
| direct_experiencer | 3,444 | 49.1 |
| retold_encounter | 2,172 | 31.0 |
| interview_with_experiencer | 1,401 | 20.0 |

### uap-vallee: Vallee type

_uap_encounters.vallee_type_

| value | count | pct |
| --- | --- | --- |
| null (field never populated) | 7,017 | 100.0 |

### uap-evidence-values: Evidence score (raw values)

_Encounters with non-null evidence_score (2174 null, 31.0%); observed range 7-26, mean 12.53, median 12; n=4843_

| value | count | pct |
| --- | --- | --- |
| 7 | 211 | 4.4 |
| 8 | 227 | 4.7 |
| 9 | 578 | 11.9 |
| 10 | 615 | 12.7 |
| 11 | 586 | 12.1 |
| 12 | 635 | 13.1 |
| 13 | 105 | 2.2 |
| 14 | 282 | 5.8 |
| 15 | 604 | 12.5 |
| 16 | 272 | 5.6 |
| 17 | 394 | 8.1 |
| 18 | 151 | 3.1 |
| 19 | 30 | 0.6 |
| 20 | 94 | 1.9 |
| 21 | 7 | 0.1 |
| 22 | 14 | 0.3 |
| 23 | 9 | 0.2 |
| 24 | 15 | 0.3 |
| 25 | 7 | 0.1 |
| 26 | 7 | 0.1 |

### uap-evidence-bands: Evidence score bands

_Encounters with non-null evidence_score; n=4843_

| value | count | pct |
| --- | --- | --- |
| 10-12 | 1,836 | 37.9 |
| 0-9 | 1,016 | 21.0 |
| 13-15 | 991 | 20.5 |
| 16-18 | 817 | 16.9 |
| 19-30 | 183 | 3.8 |

### uap-contact-values: Contact depth score (raw values)

_Encounters with non-null contact_depth_score (2610 null, 37.2%); observed range 0-32, mean 14.07, median 12; n=4407_

| value | count | pct |
| --- | --- | --- |
| 0 | 601 | 13.6 |
| 1 | 90 | 2.0 |
| 2 | 77 | 1.7 |
| 3 | 89 | 2.0 |
| 4 | 136 | 3.1 |
| 5 | 144 | 3.3 |
| 6 | 135 | 3.1 |
| 7 | 229 | 5.2 |
| 8 | 185 | 4.2 |
| 9 | 203 | 4.6 |
| 10 | 136 | 3.1 |
| 11 | 104 | 2.4 |
| 12 | 107 | 2.4 |
| 13 | 82 | 1.9 |
| 14 | 92 | 2.1 |
| 15 | 69 | 1.6 |
| 16 | 66 | 1.5 |
| 17 | 94 | 2.1 |
| 18 | 112 | 2.5 |
| 19 | 113 | 2.6 |
| 20 | 116 | 2.6 |
| 21 | 141 | 3.2 |
| 22 | 114 | 2.6 |
| 23 | 117 | 2.7 |
| 24 | 103 | 2.3 |
| 25 | 104 | 2.4 |
| 26 | 85 | 1.9 |
| 27 | 70 | 1.6 |
| 28 | 100 | 2.3 |
| 29 | 142 | 3.2 |
| 30 | 198 | 4.5 |
| 31 | 107 | 2.4 |
| 32 | 146 | 3.3 |

### uap-contact-bands: Contact depth bands

_Encounters with non-null contact_depth_score; n=4407_

| value | count | pct |
| --- | --- | --- |
| 1-8 | 1,085 | 24.6 |
| 25-32 | 952 | 21.6 |
| 17-24 | 910 | 20.6 |
| 9-16 | 859 | 19.5 |
| 0 | 601 | 13.6 |

### uap-transformation-values: Encounter transformation score (raw values)

_Encounters with non-null transformation_score (2172 null, 31.0%); observed range 0-56, mean 7.63, median 0; n=4845_

| value | count | pct |
| --- | --- | --- |
| 0 | 2,968 | 61.3 |
| 1 | 22 | 0.5 |
| 2 | 1 | 0.0 |
| 3 | 2 | 0.0 |
| 4 | 1 | 0.0 |
| 5 | 11 | 0.2 |
| 6 | 39 | 0.8 |
| 7 | 55 | 1.1 |
| 8 | 115 | 2.4 |
| 9 | 82 | 1.7 |
| 10 | 102 | 2.1 |
| 11 | 36 | 0.7 |
| 12 | 77 | 1.6 |
| 13 | 70 | 1.4 |
| 14 | 86 | 1.8 |
| 15 | 93 | 1.9 |
| 16 | 93 | 1.9 |
| 17 | 52 | 1.1 |
| 18 | 66 | 1.4 |
| 19 | 25 | 0.5 |
| 20 | 43 | 0.9 |
| 21 | 33 | 0.7 |
| 22 | 43 | 0.9 |
| 23 | 51 | 1.1 |
| 24 | 58 | 1.2 |
| 25 | 45 | 0.9 |
| 26 | 46 | 0.9 |
| 27 | 40 | 0.8 |
| 28 | 32 | 0.7 |
| 29 | 34 | 0.7 |
| 30 | 52 | 1.1 |
| 31 | 50 | 1.0 |
| 32 | 56 | 1.2 |
| 33 | 60 | 1.2 |
| 34 | 50 | 1.0 |
| 35 | 35 | 0.7 |
| 36 | 43 | 0.9 |
| 37 | 27 | 0.6 |
| 38 | 27 | 0.6 |
| 39 | 11 | 0.2 |
| 40 | 6 | 0.1 |
| 41 | 3 | 0.1 |
| 42 | 2 | 0.0 |
| 49 | 1 | 0.0 |
| 56 | 1 | 0.0 |

### uap-transformation-bands: Encounter transformation bands

_Encounters with non-null transformation_score; n=4845_

| value | count | pct |
| --- | --- | --- |
| 0 | 2,968 | 61.3 |
| 10-19 | 700 | 14.4 |
| 20-29 | 425 | 8.8 |
| 30-60 | 424 | 8.8 |
| 1-9 | 328 | 6.8 |

### uap-event-decade: Encounter event decade (encounter_context.event_year)

_All uap_encounters rows, n=7017; 3413 have no numeric event_year and are shown as "unknown" or "no encounter_context"_

| value | count | pct |
| --- | --- | --- |
| unknown | 2,948 | 42.0 |
| 1970s | 632 | 9.0 |
| 1990s | 548 | 7.8 |
| no encounter_context | 465 | 6.6 |
| 1980s | 427 | 6.1 |
| 1960s | 423 | 6.0 |
| 2020s | 395 | 5.6 |
| 2010s | 358 | 5.1 |
| 2000s | 325 | 4.6 |
| 1950s | 271 | 3.9 |
| 1940s | 165 | 2.4 |
| pre-1900 | 34 | 0.5 |
| 1900-1939 | 25 | 0.4 |
| implausible (>2030) | 1 | 0.0 |

### uap-reported-authorities: Reported to authorities

_Encounters with encounter_context, n=6552_

| value | count | pct |
| --- | --- | --- |
| false | 3,975 | 60.7 |
| true | 2,577 | 39.3 |

### uap-military-witness: Military witness

_Encounters with encounter_context, n=6552_

| value | count | pct |
| --- | --- | --- |
| false | 5,550 | 84.7 |
| true | 1,002 | 15.3 |

### uap-media-coverage: Reported in media

_Encounters with media_coverage, n=6552_

| value | count | pct |
| --- | --- | --- |
| false | 4,193 | 64.0 |
| true | 2,354 | 35.9 |
| null | 5 | 0.1 |

### uap-witnesses: Total witnesses mentioned (bands)

_Encounters with numeric total_witnesses_mentioned, n=6552_

| value | count | pct |
| --- | --- | --- |
| 3-5 | 1,967 | 30.0 |
| 2 | 1,733 | 26.4 |
| 1 | 1,581 | 24.1 |
| 0 | 913 | 13.9 |
| 6-10 | 154 | 2.4 |
| 11-100 | 151 | 2.3 |
| >100 | 53 | 0.8 |

### uap-named-witnesses: Named witnesses per encounter (capped at 5)

_Encounters with encounter_context; n=6552_

| value | count | pct |
| --- | --- | --- |
| 0 | 2,146 | 32.8 |
| 1 | 1,456 | 22.2 |
| 2 | 1,699 | 25.9 |
| 3 | 883 | 13.5 |
| 4 | 201 | 3.1 |
| 5 | 167 | 2.5 |

### uap-connected-cases: Connected cases per encounter (capped at 4)

_Encounters with encounter_context; n=6552_

| value | count | pct |
| --- | --- | --- |
| 0 | 4,368 | 66.7 |
| 1 | 1,546 | 23.6 |
| 2 | 469 | 7.2 |
| 3 | 110 | 1.7 |
| 4 | 59 | 0.9 |

### uap-country: Encounter country (encounter_context.location.country)

_Encounters with encounter_context, n=6552_

| value | count | pct |
| --- | --- | --- |
| united_states | 2,532 | 38.6 |
| not_stated | 2,035 | 31.1 |
| brazil | 510 | 7.8 |
| united_kingdom | 321 | 4.9 |
| australia | 318 | 4.9 |
| canada | 155 | 2.4 |
| mexico | 65 | 1.0 |
| italy | 60 | 0.9 |
| france | 39 | 0.6 |
| russia | 27 | 0.4 |
| argentina | 26 | 0.4 |
| puerto_rico | 25 | 0.4 |
| spain | 25 | 0.4 |
| new_zealand | 23 | 0.4 |
| norway | 22 | 0.3 |
| peru | 22 | 0.3 |
| zimbabwe | 19 | 0.3 |
| iran | 18 | 0.3 |
| sweden | 18 | 0.3 |
| antarctica | 16 | 0.2 |
| finland | 16 | 0.2 |
| germany | 16 | 0.2 |
| japan | 16 | 0.2 |
| chile | 15 | 0.2 |
| netherlands | 12 | 0.2 |
| (other, 69 values) | 201 | 3.1 |

### uap-video-tone: Video tone

_uap_video_stats rows, n=7607_

| value | count | pct |
| --- | --- | --- |
| investigative | 3,834 | 50.4 |
| neutral | 2,245 | 29.5 |
| experiential | 1,259 | 16.6 |
| journalistic | 165 | 2.2 |
| conspiratorial | 48 | 0.6 |
| academic | 47 | 0.6 |
| editorial | 5 | 0.1 |
| emotional | 4 | 0.1 |

### uap-dominant-entity: Dominant entity type (video level)

_uap_video_stats rows, n=7607; null = no entity coded (usually no encounter)_

| value | count | pct |
| --- | --- | --- |
| null | 3,701 | 48.7 |
| none | 1,372 | 18.0 |
| humanoid | 1,031 | 13.6 |
| grey | 448 | 5.9 |
| unknown | 402 | 5.3 |
| light_being | 179 | 2.4 |
| insectoid_other | 116 | 1.5 |
| mantis | 83 | 1.1 |
| reptilian | 47 | 0.6 |
| tall_grey | 36 | 0.5 |
| hybrid | 24 | 0.3 |
| nordic | 24 | 0.3 |
| shadow_entity | 16 | 0.2 |
| robotic | 13 | 0.2 |
| tall_white | 13 | 0.2 |
| blue_being | 12 | 0.2 |
| angelic | 11 | 0.1 |
| extraterrestrial | 7 | 0.1 |
| hooded_cloaked | 7 | 0.1 |
| arcturian | 6 | 0.1 |
| (other, 35 values) | 59 | 0.8 |

### uap-intelligence-value: Intelligence value

_uap_video_stats rows, n=7607_

| value | count | pct |
| --- | --- | --- |
| 1 | 10 | 0.1 |
| 2 | 4 | 0.1 |
| 3 | 14 | 0.2 |
| 4 | 1 | 0.0 |
| 5 | 397 | 5.2 |
| 6 | 91 | 1.2 |
| 7 | 2,356 | 31.0 |
| 8 | 4,273 | 56.2 |
| 9 | 457 | 6.0 |
| 10 | 4 | 0.1 |

### uap-flags: has_* flag rates

_uap_video_stats rows, n=7607_

| flag | true n | pct |
| --- | --- | --- |
| has_psi_content | 4,111 | 54.0 |
| has_craft_observation | 2,943 | 38.7 |
| has_biologics_claim | 1,248 | 16.4 |
| has_crash_retrieval_claim | 906 | 11.9 |
| has_under_oath_claims | 171 | 2.2 |

### uap-count-fields: Entity count fields: mean and share > 0

_uap_video_stats rows, n=7607_

| field | mean | median | pct > 0 | max |
| --- | --- | --- | --- | --- |
| persons_count | 2.39 | 2 | 91.6 | 19 |
| organizations_count | 1.67 | 2 | 77.8 | 12 |
| programs_count | 0.69 | 1 | 56.6 | 8 |
| claims_count | 4.9 | 5 | 93.7 | 88 |
| locations_count | 2.09 | 2 | 79.8 | 20 |
| technologies_count | 0.89 | 1 | 55.3 | 7 |
| psi_mentions_count | 0.85 | 1 | 54.0 | 5 |
| legislative_events_count | 0.17 | 0 | 15.8 | 4 |
| secrecy_mechanisms_count | 0.23 | 0 | 22.2 | 3 |

### uap-psi-mentions: Psi mentions count per video

_uap_video_stats rows, n=7607_

| value | count | pct |
| --- | --- | --- |
| 0 | 3,496 | 46.0 |
| 1 | 2,292 | 30.1 |
| 2 | 1,322 | 17.4 |
| 3 | 432 | 5.7 |
| 4 | 58 | 0.8 |
| 5 | 7 | 0.1 |

### uap-kb-person-roles: Canonical persons by role

_uap_canonical_persons, n=5108_

| value | count | pct |
| --- | --- | --- |
| witness | 1,789 | 35.0 |
| other | 895 | 17.5 |
| investigator | 663 | 13.0 |
| scientist | 629 | 12.3 |
| military_official | 359 | 7.0 |
| journalist | 237 | 4.6 |
| program_manager | 227 | 4.4 |
| legislator | 142 | 2.8 |
| whistleblower | 76 | 1.5 |
| contractor_employee | 52 | 1.0 |
| gatekeeper | 24 | 0.5 |
| intelligence_officer | 15 | 0.3 |

### uap-kb-person-linked-videos: Canonical persons by linked video count (capped at 10)

_uap_canonical_persons, n=5108_

| value | count | pct |
| --- | --- | --- |
| 1 | 3,953 | 77.4 |
| 2 | 617 | 12.1 |
| 3 | 202 | 4.0 |
| 4 | 95 | 1.9 |
| 5 | 77 | 1.5 |
| 6 | 48 | 0.9 |
| 7 | 22 | 0.4 |
| 8 | 18 | 0.4 |
| 9 | 11 | 0.2 |
| 10 | 65 | 1.3 |

### uap-kb-org-types: Canonical organizations by type

_uap_canonical_orgs, n=1824_

| value | count | pct |
| --- | --- | --- |
| research_institution | 455 | 24.9 |
| government_agency | 368 | 20.2 |
| other | 294 | 16.1 |
| media_outlet | 283 | 15.5 |
| military_branch | 170 | 9.3 |
| defense_contractor | 115 | 6.3 |
| congressional_body | 46 | 2.5 |
| think_tank | 40 | 2.2 |
| null | 35 | 1.9 |
| oversight_body | 15 | 0.8 |
| ffrdc | 2 | 0.1 |
| private_equity | 1 | 0.1 |

### uap-kb-program-types: Canonical programs by type

_uap_canonical_programs, n=1810_

| value | count | pct |
| --- | --- | --- |
| confirmed | 987 | 54.5 |
| alleged | 747 | 41.3 |
| disputed | 45 | 2.5 |
| null | 16 | 0.9 |
| debunked | 15 | 0.8 |

### uap-kb-event-types: Events by type

_uap_events, n=831_

| value | count | pct |
| --- | --- | --- |
| congressional | 681 | 81.9 |
| unknown | 136 | 16.4 |
| military_encounter | 4 | 0.5 |
| abduction | 3 | 0.4 |
| mass_sighting | 3 | 0.4 |
| crash_retrieval | 2 | 0.2 |
| contact | 1 | 0.1 |
| disclosure | 1 | 0.1 |

### uap-kb-event-decades: Events by decade (uap_events.year)

_uap_events, n=831_

| value | count | pct |
| --- | --- | --- |
| 2020s | 508 | 61.1 |
| unknown | 185 | 22.3 |
| 2000s | 40 | 4.8 |
| 2010s | 26 | 3.1 |
| 1960s | 16 | 1.9 |
| 1970s | 16 | 1.9 |
| 1990s | 16 | 1.9 |
| 1980s | 11 | 1.3 |
| 1950s | 7 | 0.8 |
| 1940s | 5 | 0.6 |
| 1900-1939 | 1 | 0.1 |

### uap-kb-contactee-year: Contactee profiles by first_shared_year

_uap_contactee_profiles, n=3440_

| value | count | pct |
| --- | --- | --- |
| 2008 | 1 | 0.0 |
| 2009 | 3 | 0.1 |
| 2010 | 33 | 1.0 |
| 2011 | 40 | 1.2 |
| 2012 | 13 | 0.4 |
| 2013 | 59 | 1.7 |
| 2014 | 26 | 0.8 |
| 2015 | 33 | 1.0 |
| 2016 | 21 | 0.6 |
| 2017 | 17 | 0.5 |
| 2018 | 42 | 1.2 |
| 2019 | 72 | 2.1 |
| 2020 | 106 | 3.1 |
| 2021 | 264 | 7.7 |
| 2022 | 425 | 12.4 |
| 2023 | 650 | 18.9 |
| 2024 | 515 | 15.0 |
| 2025 | 755 | 21.9 |
| 2026 | 365 | 10.6 |

### uap-kb-contactee-videos: Contactee profiles by video count (capped at 10)

_uap_contactee_profiles, n=3440_

| value | count | pct |
| --- | --- | --- |
| 1 | 2,774 | 80.6 |
| 2 | 386 | 11.2 |
| 3 | 136 | 4.0 |
| 4 | 55 | 1.6 |
| 5 | 34 | 1.0 |
| 6 | 12 | 0.3 |
| 7 | 7 | 0.2 |
| 8 | 8 | 0.2 |
| 9 | 5 | 0.1 |
| 10 | 23 | 0.7 |

### uap-kb-top-persons: Top 20 canonical persons by linked videos

_uap_canonical_persons, n=5108_

| person | role | linked videos |
| --- | --- | --- |
| Richard Dolan | investigator | 55 |
| David Grusch | whistleblower | 54 |
| Jeremy Corbel | investigator | 39 |
| Chris Leato | investigator | 37 |
| Ross Coulthart | journalist | 31 |
| Ross Kulart | journalist | 31 |
| George Knapp | journalist | 30 |
| Steven Greer | investigator | 26 |
| Kade Moyer | other | 25 |
| Christopher Mellon | other | 25 |
| Preston Dennett | investigator | 22 |
| Robert Salas | witness | 21 |
| Stephen Bassett | whistleblower | 20 |
| Lou Elizondo | whistleblower | 20 |
| David Fravor | witness | 19 |
| Bryce Zabel | journalist | 18 |
| Marc D'antonio | scientist | 17 |
| Danny Sheehan | investigator | 16 |
| Avi Loeb | scientist | 16 |
| Jan Harzan | program_manager | 15 |

### uap-kb-top-orgs: Top 20 canonical organizations by linked videos

_uap_canonical_orgs, n=1824_

| organization | type | linked videos |
| --- | --- | --- |
| Central Intelligence Agency | government_agency | 190 |
| NASA |  | 183 |
| U.S. Air Force |  | 113 |
| MUFON | research_institution | 108 |
| Mutual UFO Network | research_institution | 82 |
| Arrow | government_agency | 73 |
| FBI |  | 68 |
| US Navy | military_branch | 65 |
| Project Blue Book | government_agency | 62 |
| US Congress | congressional_body | 55 |
| MUON | other | 54 |
| Department of Defense |  | 53 |
| Defense Intelligence Agency | military_branch | 42 |
| Lockheed Martin |  | 39 |
| Unveiled | media_outlet | 38 |
| All Domain Anomaly Resolution Office | government_agency | 36 |
| To The Stars Academy | other | 35 |
| Pentagon | government_agency | 35 |
| Brasil UFO | media_outlet | 34 |
| National Security Agency | government_agency | 30 |

### uap-kb-top-programs: Top 20 canonical programs by linked videos

_uap_canonical_programs, n=1810_

| program | type | linked videos |
| --- | --- | --- |
| Project Blue Book |  | 140 |
| Advanced Aerospace Threat Identification Program | confirmed | 60 |
| UAP Task Force |  | 43 |
| UAP Research | confirmed | 40 |
| UFO Investigation Program | confirmed | 38 |
| UAP Research Program | confirmed | 30 |
| CE5 Initiative | confirmed | 24 |
| UAP Investigations | confirmed | 24 |
| CE5 | confirmed | 24 |
| Hybridization Program |  | 23 |
| Reverse Engineering Program | confirmed | 19 |
| UFO Abduction Research | alleged | 18 |
| OSAP | confirmed | 18 |
| Шаг Харбор инцидент | alleged | 18 |
| Remote Viewing Program |  | 18 |
| Roswell Incident | confirmed | 18 |
| UAP Disclosure Act | alleged | 17 |
| CE5 Protocols | alleged | 17 |
| Crash Retrieval Program | alleged | 16 |
| Project Grudge | confirmed | 16 |

### uap-kb-top-events: Top 20 events by linked videos

_uap_events, n=831_

| event | type | year | linked videos |
| --- | --- | --- | --- |
| UAP Disclosure Act | congressional | 2024 | 77 |
| Congressional Hearing on UAPs | congressional | 2023 | 36 |
| UAP Hearing | congressional | 2023 | 28 |
| National Defense Authorization Act | congressional | 2023 | 27 |
| Congressional Hearing on UAP | congressional | 2023 | 23 |
| Roswell Incident | crash_retrieval | 1947 | 23 |
| Schumer Amendment | congressional |  | 21 |
| UAP Congressional Hearing | congressional | 2022 | 19 |
| Congressional Hearings on UAPs | congressional | 2021 | 15 |
| Congressional hearing on UFOs | congressional | 2023 | 14 |
| UAP Disclosure Act of 2023 | congressional | 2023 | 11 |
| National Defense Authorization Act (NDAA) | congressional |  | 10 |
| USS Nimitz Tic Tac Encounter | military_encounter | 2004 | 10 |
| Congressional UAP Hearing | congressional | 2024 | 9 |
| Gillibrand Amendment | congressional | 2021 | 8 |
| 2023 Congressional UAP Hearing | congressional | 2023 | 8 |
| Pascagoula Abduction | abduction | 1973 | 7 |
| Travis Walton Abduction | abduction | 1975 | 7 |
| House Oversight Committee Hearing | congressional | 2023 | 7 |
| Funding for AATIP | congressional | 2008 | 6 |

### uap-kb-top-contactees: Top 20 contactee profiles by video count

_uap_contactee_profiles, n=3440_

| contactee | videos | avg evidence | avg contact depth | avg transformation | first shared |
| --- | --- | --- | --- | --- | --- |
| Unknown Experiencer | 59 | 9.6 | 5.7 | 1 | 2011 |
| Travis Walton | 28 | 13.1 | 18.3 | 7.4 | 2011 |
| Kristen | 28 |  |  |  | 2025 |
| Betty Hill | 26 | 12.3 | 19.3 | 8.7 | 2011 |
| Bob Lazar | 25 | 14.3 | 16.2 | 2.3 | 2011 |
| Robert Salas | 22 | 14.5 | 20.5 | 9 | 2013 |
| Ryan Graves | 21 | 11.8 | 6 | 3.3 | 2021 |
| Whitley Strieber | 21 | 11 | 18.3 | 13.8 | 2020 |
| Barney Hill | 20 | 14 | 29 | 13 | 2018 |
| Dolly Safran | 19 | 8.6 | 11.2 | 8.1 | 2022 |
| Chris Bledsoe | 18 | 12.3 | 24.4 | 15.1 | 2019 |
| Kenneth Arnold | 18 | 10.3 | 8.1 | 0 | 2010 |
| Lonnie Zamora | 18 | 9.7 | 11 | 0 | 2015 |
| Calvin Parker | 17 | 11.3 | 25.5 | 13.3 | 2019 |
| David Fravor | 17 | 10.5 | 6 | 0 | 2018 |
| Michael Herrera | 17 |  |  |  | 2023 |
| Charles Halt | 15 | 17.3 | 21 | 10 | 2010 |
| Mario Woods | 15 | 14 | 16.6 | 11.8 | 2023 |
| Charles Hickson | 14 | 15 | 23 | 13 | 2021 |
| Gordon Cooper | 12 | 10.8 | 11.8 | 0 | 2013 |

### uap-x-channels-top15: Top 15 UAP channels by tier 1-2 video count with mean scores

_Tier 1-2 videos, n=8394; 80 channels; means use uap_video_stats max_* scores where present_

| channel | n | pct encounters track | mean max evidence | mean max contact depth | mean max transformation | mean intelligence value | median views | pct first_person |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Brazil UFO | 682 | 38.7 | 12.5 | 13.4 | 13.8 | 6.9 | 681.5 | 18.0 |
| Eyes On Cinema | 578 | 76.8 | 15.7 | 16.8 | 16 | 7.68 | 19276.5 | 31.0 |
| Richard Dolan Intelligent Disclosure  | 518 | 16.6 | 11.5 | 15.8 | 19.2 | 7.83 | 34734.5 | 0.6 |
| Preston Dennett | 517 | 61.5 | 11.3 | 19.5 | 18.7 | 7.34 | 8,261 | 0.6 |
| Mutual UFO Network (MUFON) | 405 | 24.9 | 13.6 | 13.7 | 17.1 | 7.17 | 3,616 | 9.1 |
| Lehto Files | 351 | 25.9 | 14.4 | 12.5 | 14.2 | 7.87 | 27769.5 | 1.4 |
| Engaging The Phenomenon | 320 | 26.9 | 11.3 | 17.9 | 19.2 | 7.34 | 2848.5 | 10.6 |
| UFO CENTRAL | 313 | 16.3 | 13.2 | 16.4 | 17.2 | 7.74 | 107,351 | 3.2 |
| JeffMara Podcast | 306 | 77.5 | 12.4 | 27.7 | 29.2 | 7.44 | 19,933 | 19.9 |
| Project Unity | 301 | 17.6 | 12.5 | 18.3 | 25.4 | 7.7 | 11,102 | 10.0 |
| Disclosure Team with Vinnie Adams  | 285 | 30.2 | 12.7 | 14.4 | 15.1 | 7.91 | 3,319 | 0.4 |
| Unveiled | 242 | 3.3 | 10.6 | 8 |  | 6.37 | 25,973 | 0.0 |
| Dr. Steven Greer | 225 | 25.3 | 16 | 16.3 | 16.4 | 7.98 | 98,062 | 20.0 |
| Believe: Paranormal & UFO Podcast | 208 | 86.1 | 13.8 | 19 | 15 | 7.39 | 518 | 25.0 |
| NewsNation | 205 | 22.0 | 13.8 | 20.5 | 19.7 | 8.16 | 342,583 | 0.0 |

### uap-x-hynek-by-evidence: Hynek type by evidence band (row %)

_Encounters with hynek_type and evidence_score_

| Hynek | n | 0-9 % | 10-12 % | 13-15 % | 16-18 % | 19-30 % | mean evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CE3 | 1,933 | 12.3 | 43.3 | 20.1 | 19.6 | 4.8 | 13.1 |
| CE1 | 1,662 | 9.8 | 38.0 | 29.0 | 19.6 | 3.6 | 13.3 |
| not_stated | 418 | 77.3 | 18.7 | 3.3 | 0.7 | 0.0 | 8.8 |
| CE4 | 295 | 13.9 | 44.7 | 18.6 | 21.7 | 1.0 | 12.8 |
| NL | 160 | 36.3 | 49.4 | 10.0 | 4.4 | 0.0 | 10.6 |
| CE2 | 97 | 1.0 | 16.5 | 24.7 | 28.9 | 28.9 | 16.4 |
| CE5 | 94 | 54.3 | 40.4 | 4.3 | 1.1 | 0.0 | 9.7 |

### uap-x-hynek-by-contact: Hynek type by contact depth band (row %)

_Encounters with hynek_type and contact_depth_score_

| Hynek | n | 0 % | 1-8 % | 9-16 % | 17-24 % | 25-32 % | mean contact depth | mean transformation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CE3 | 1,789 | 5.8 | 4.5 | 16.4 | 37.0 | 36.3 | 20.4 | 10.8 |
| CE1 | 1,411 | 1.6 | 52.8 | 32.9 | 11.5 | 1.2 | 9.3 | 3.4 |
| not_stated | 409 | 73.8 | 24.0 | 1.7 | 0.5 | 0.0 | 1 | 1.6 |
| CE4 | 292 | 1.7 | 2.7 | 5.1 | 13.7 | 76.7 | 26.7 | 21.4 |
| NL | 152 | 18.4 | 68.4 | 10.5 | 2.0 | 0.7 | 4.3 | 3 |
| CE2 | 85 | 2.4 | 15.3 | 52.9 | 29.4 | 0.0 | 13.3 | 3.7 |
| CE5 | 88 | 8.0 | 9.1 | 18.2 | 15.9 | 48.9 | 20.3 | 22.3 |

### uap-x-entity-by-transformation: Dominant entity type by max transformation band (row %)

_uap_video_stats rows with a dominant_entity_type; top 12 entity types; "no score" = max_transformation_score null_

| entity type | n | 0 % | 1-9 % | 10-19 % | 20-29 % | 30-60 % | no score % | mean max transformation (scored) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| none | 1,372 | 0.0 | 8.0 | 12.6 | 4.2 | 2.3 | 73.0 | 14.9 |
| humanoid | 1,031 | 0.0 | 6.2 | 13.6 | 9.3 | 10.1 | 60.8 | 20.7 |
| grey | 448 | 0.0 | 4.0 | 18.5 | 20.1 | 25.2 | 32.1 | 24.4 |
| unknown | 402 | 0.0 | 10.4 | 20.4 | 6.0 | 2.2 | 60.9 | 14.7 |
| light_being | 179 | 0.0 | 5.6 | 14.0 | 17.9 | 30.2 | 32.4 | 25.3 |
| insectoid_other | 116 | 0.0 | 21.6 | 26.7 | 19.8 | 6.0 | 25.9 | 16 |
| mantis | 83 | 0.0 | 4.8 | 27.7 | 22.9 | 14.5 | 30.1 | 21.4 |
| reptilian | 47 | 0.0 | 6.4 | 21.3 | 12.8 | 21.3 | 38.3 | 23.1 |
| tall_grey | 36 | 0.0 | 5.6 | 16.7 | 38.9 | 30.6 | 8.3 | 25.8 |
| hybrid | 24 | 0.0 | 4.2 | 8.3 | 8.3 | 37.5 | 41.7 | 27.1 |
| nordic | 24 | 0.0 | 8.3 | 25.0 | 12.5 | 25.0 | 29.2 | 22.2 |
| shadow_entity | 16 | 0.0 | 12.5 | 37.5 | 12.5 | 12.5 | 25.0 | 17.6 |

### uap-x-content-by-evidence: Content type by max evidence band (row %)

_Tier 1-2 videos with content_type; "no score" = no encounter scored_

| content type | n | 0-9 % | 10-12 % | 13-15 % | 16-18 % | 19-30 % | no score % | mean max evidence (scored) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| interview | 2,236 | 16.1 | 35.9 | 20.2 | 22.0 | 5.0 | 0.8 | 13.1 |
| research_analysis | 1,537 | 0.3 | 0.7 | 0.1 | 0.1 | 0.0 | 98.9 | 10.6 |
| program_disclosure | 1,082 | 0.2 | 0.0 | 0.0 | 0.0 | 0.0 | 99.8 | 7.5 |
| news_commentary | 905 | 0.4 | 0.2 | 0.1 | 0.1 | 0.0 | 99.1 | 10.5 |
| first_person | 816 | 10.5 | 31.6 | 28.1 | 23.0 | 6.3 | 0.5 | 13.8 |
| documentary_survey | 446 | 0.2 | 1.3 | 0.4 | 0.0 | 0.0 | 98.0 | 11.2 |
| retold_encounter | 365 | 0.0 | 0.5 | 0.0 | 0.3 | 0.0 | 99.2 | 13.3 |
| investigative_journalism | 301 | 0.3 | 1.0 | 0.0 | 0.0 | 0.0 | 98.7 | 10.5 |
| retold_story | 11 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 100.0 |  |

### uap-x-psi-by-contact: Psi content by max contact depth band (row %)

_uap_video_stats rows, n=7607_

| has_psi_content | n | 0 % | 1-8 % | 9-16 % | 17-24 % | 25-32 % | no score % | mean max contact depth (scored) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| true | 4,111 | 0.0 | 4.7 | 8.0 | 13.7 | 21.4 | 52.2 | 21.6 |
| false | 3,496 | 0.0 | 8.4 | 7.4 | 4.1 | 0.4 | 79.7 | 11.3 |

### uap-x-hynek-by-source: Hynek type by encounter source type (row %)

_Encounters with hynek_type_

| source type | n | CE3 % | CE1 % | not_stated % | CE4 % | NL % | CE2 % | CE5 % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| direct_experiencer | 3,291 | 40.4 | 38.3 | 8.4 | 5.7 | 3.6 | 1.9 | 1.6 |
| retold_encounter | 1,993 | 35.7 | 33.3 | 18.8 | 4.8 | 5.0 | 1.9 | 0.7 |
| interview_with_experiencer | 1,370 | 44.1 | 29.2 | 10.4 | 7.7 | 3.0 | 2.6 | 3.1 |

### uap-x-hynek-by-decade: Hynek type by event decade (row %)

_Encounters with hynek_type and a numeric event_year_

| decade | n | CE3 % | CE1 % | not_stated % | CE4 % | NL % | CE2 % | CE5 % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1900-1939 | 24 | 66.7 | 20.8 | 4.2 | 4.2 | 4.2 | 0.0 | 0.0 |
| 1940s | 149 | 38.3 | 34.2 | 24.2 | 1.3 | 2.0 | 0.0 | 0.0 |
| 1950s | 268 | 51.1 | 34.0 | 6.7 | 3.7 | 1.5 | 3.0 | 0.0 |
| 1960s | 416 | 53.1 | 31.5 | 5.5 | 5.5 | 0.7 | 3.4 | 0.2 |
| 1970s | 622 | 59.2 | 23.6 | 4.8 | 8.5 | 1.3 | 2.4 | 0.2 |
| 1980s | 421 | 52.3 | 24.7 | 5.9 | 9.3 | 2.1 | 5.7 | 0.0 |
| 1990s | 537 | 49.3 | 36.1 | 3.9 | 6.3 | 2.0 | 1.3 | 0.9 |
| 2000s | 320 | 37.5 | 48.8 | 3.4 | 5.0 | 1.6 | 2.8 | 0.9 |
| 2010s | 356 | 42.1 | 40.7 | 3.4 | 7.3 | 2.5 | 0.8 | 3.1 |
| 2020s | 385 | 24.2 | 59.5 | 3.9 | 3.4 | 5.7 | 0.3 | 3.1 |
| implausible (>2030) | 1 | 0.0 | 100.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| pre-1900 | 31 | 25.8 | 54.8 | 9.7 | 3.2 | 3.2 | 3.2 | 0.0 |

### uap-x-tone-scores: Mean scores by video tone

_uap_video_stats rows, n=7607_

| tone | n | mean intelligence value | mean max evidence | mean max contact depth |
| --- | --- | --- | --- | --- |
| investigative | 3,834 | 7.85 | 13.5 | 16.1 |
| neutral | 2,245 | 7.28 | 13.1 | 22.1 |
| experiential | 1,259 | 7.18 | 13.2 | 18.7 |
| journalistic | 165 | 7.36 | 13.3 | 11.4 |
| conspiratorial | 48 | 6.67 | 8.5 | 21 |
| academic | 47 | 7.28 | 7 | 15 |
| editorial | 5 | 4.6 |  |  |
| emotional | 4 | 5.5 |  |  |

### uap-x-year: Publish year: count, median views, mean encounter count, share encounters track

_Tier 1-2 videos, n=8394_

| year | n | median views | mean encounter count | pct encounters track |
| --- | --- | --- | --- | --- |
| 2006 | 4 | 756,630 | 0 | 0.0 |
| 2007 | 4 | 261871.5 | 0 | 0.0 |
| 2008 | 3 | 14,660 | 0.33 | 33.3 |
| 2009 | 18 | 18268.5 | 0.5 | 33.3 |
| 2010 | 90 | 55048.5 | 0.51 | 12.2 |
| 2011 | 62 | 187871.5 | 0.85 | 19.4 |
| 2012 | 33 | 165,120 | 0.61 | 15.2 |
| 2013 | 81 | 205,415 | 1 | 51.9 |
| 2014 | 32 | 145,717 | 1.41 | 28.1 |
| 2015 | 144 | 8,544 | 0.56 | 17.4 |
| 2016 | 112 | 20,945 | 0.57 | 17.0 |
| 2017 | 35 | 7,233 | 0.97 | 40.0 |
| 2018 | 152 | 21889.5 | 0.63 | 24.3 |
| 2019 | 236 | 23,447 | 0.5 | 32.6 |
| 2020 | 296 | 5,774 | 0.71 | 30.1 |
| 2021 | 621 | 3,263 | 0.87 | 46.1 |
| 2022 | 782 | 11,297 | 0.85 | 42.7 |
| 2023 | 1,324 | 14039.5 | 0.88 | 39.4 |
| 2024 | 1,454 | 16,539 | 0.81 | 33.7 |
| 2025 | 1,655 | 16397.5 | 1 | 41.0 |
| 2026 | 1,256 | 6,155 | 0.76 | 31.0 |

## CROSS tables

### cross-phenomenology: Cross-domain phenomenology comparison

_NDE side computed from confirmed NDE videos in this pull; UAP side mixes uap_video_stats/uap_encounters (this pull) with the site's viz_graph_cache (uap-phenomenology computed 2026-09-06T05:04:16.826Z over 5793 encounters; cross-domain computed 2026-09-06T05:04:24.476Z). CAVEAT: the two domains use different coding schemes (15 fixed NDE core elements vs free-form UAP entity/effect coding), so rates are indicative, not equivalent._

| phenomenon | NDE rate | NDE basis | UAP rate | UAP basis |
| --- | --- | --- | --- | --- |
| Light (bright light / luminous phenomena) | 60.4% (n=6289) | core element bright_light | 3.7% light-being entity (n=5793); cache "luminous craft/entities" 69% | uap-phenomenology node entity:light_being; cross-domain cache overlapping_phenomena |
| Beings / entities encountered | 93.6% (n=6304) | entities.encounters non-empty | 63.2% (n=4010 videos with encounters) | uap_video_stats.dominant_entity_type not none among videos with encounter_count>0 |
| Telepathic communication | 60.0% of videos (core element); 24.7% of entity encounters (n=12135) | core element telepathy; entities.encounters.communication_method | 38.5% of coded entity communications (n=3889) | cross-domain cache Communication Methods dimension |
| Time distortion / missing time | 58.8% (n=6289) | core element time_distortion | 8.7% missing_time effect (n=5793); cache "dilated time perception" 27% | uap-phenomenology node effect:missing_time; cross-domain cache |
| Life review | 49.3% (n=6289) | core element life_review | not coded | no UAP equivalent |
| Message / knowledge download | 61.5% (n=6289) | core element knowledge_download | cache "noetic knowing" 40% | cross-domain cache overlapping_phenomena (denominator not stated in cache) |
| Fear during the experience | 16.2% journey has fear_distress (n=5559); 1.5% very_negative tone (n=6304); 4.4% hellish_realm | journey_sequence elements; overall_tone | 24.1% of coded entity emotional qualities are fear (n=5839); anxiety 2.8%; shock 6.8% | cross-domain cache Emotional Quality dimension |
| Peace / love | 93.0% feelings_of_peace (n=6289) | core element feelings_of_peace | 1.7% love+peace (n=5839); awe 22.5%; curiosity 21.7% | cross-domain cache Emotional Quality dimension |
| Lasting transformation (any) | 97.0% transformation_score > 0 (n=6295) | nde_analysis.transformation_score | 38.7% transformation_score > 0 (n=4845 scored encounters; 2172 null) | uap_encounters.transformation_score |
| Lasting transformation (score >= 20) | 90.3% (n=6295) | Significant or higher | 17.5% (n=4845) | encounter score >= 20; scales are not equivalent |
| Psi / expanded perception afterwards | 43.3% PE domain present (n=6295) | transformation domain PE | 54.0% has_psi_content (n=7607) | uap_video_stats.has_psi_content (video mentions psi at all, not necessarily aftereffect) |
| Out-of-body sensation | 83.7% (n=6289) | core element out_of_body | cache "kinesthetic displacement" 9% | cross-domain cache |
| Paralysis | cache "inability to move/speak" 15% | cross-domain cache | 1.5% paralysis effect (n=5793); cache 1% | uap-phenomenology node effect:paralysis |

### cross-cache-overlap: Site cache: overlapping phenomena (viz_graph_cache cross-domain)

_Copied from viz_graph_cache viz_id=cross-domain, generated 2026-09-06T05:04:24.476Z; nde_total=6817, uap_total=3974. Percent denominators are the cache's own and are not restated here._

| phenomenon | NDE pct | NDE label | UAP pct | UAP label | significance |
| --- | --- | --- | --- | --- | --- |
| Entity Encounter | 55.0 | Being of light / guide | 62.0 | Non-human intelligence | 97 |
| Telepathic Communication | 25.0 | Entity telepathy | 36.0 | Entity telepathy | 95 |
| Ontological Shock | 65.0 | Reality reassessment post-NDE | 48.0 | Ontological shock rating | 93 |
| Knowledge Download | 61.0 | Knowledge download (core element) | 40.0 | Noetic knowing | 92 |
| Altered Consciousness | 74.0 | Enhanced senses (core element) | 81.0 | Trance/altered state | 91 |
| Time Distortion | 59.0 | Time distortion (core element) | 27.0 | Dilated time perception | 90 |
| Bright Light Phenomena | 61.0 | Bright light (core element) | 69.0 | Luminous craft/entities | 88 |
| Out-of-Body Experience | 84.0 | OBE (core element) | 9.0 | Kinesthetic displacement | 85 |
| Paralysis/Immobility | 15.0 | Inability to move/speak | 1.0 | Witness paralysis | 80 |
| Feelings of Peace/Love | 93.0 | Feelings of peace (core element) | 2.0 | Love/peace emotion | 75 |

### cross-cache-entity_types_encountered: Site cache: Entity Types Encountered

_viz_graph_cache cross-domain dimension; nde_n=12562, uap_n=4123_

| category | NDE n | NDE pct | UAP n | UAP pct |
| --- | --- | --- | --- | --- |
| Religious Figure | 3,145 | 25.0 | 0 | 0.0 |
| Deceased Relative | 2,682 | 21.4 | 0 | 0.0 |
| Unknown | 1,803 | 14.4 | 780 | 18.9 |
| Humanoid | 0 | 0.0 | 1,731 | 42.0 |
| Group | 1,455 | 11.6 | 0 | 0.0 |
| Angel | 1,145 | 9.1 | 15 | 0.4 |
| Guide | 1,025 | 8.2 | 0 | 0.0 |
| Light Being | 512 | 4.1 | 241 | 5.8 |
| Grey | 0 | 0.0 | 644 | 15.6 |
| Deceased Friend | 413 | 3.3 | 0 | 0.0 |
| Animal | 209 | 1.7 | 0 | 0.0 |
| Mantis | 0 | 0.0 | 147 | 3.6 |

### cross-cache-communication_methods: Site cache: Communication Methods

_viz_graph_cache cross-domain dimension; nde_n=11300, uap_n=3889_

| category | NDE n | NDE pct | UAP n | UAP pct |
| --- | --- | --- | --- | --- |
| Telepathy | 3,179 | 28.1 | 1,498 | 38.5 |
| Verbal | 4,227 | 37.4 | 429 | 11.0 |
| Presence | 2,276 | 20.1 | 52 | 1.3 |
| Emotional | 1,359 | 12.0 | 61 | 1.6 |
| Gesture | 92 | 0.8 | 18 | 0.5 |
| Vision | 20 | 0.2 | 0 | 0.0 |
| Technological | 0 | 0.0 | 8 | 0.2 |
| Vibrational | 6 | 0.1 | 0 | 0.0 |
| Other | 4 | 0.0 | 0 | 0.0 |
| Voice | 1 | 0.0 | 0 | 0.0 |

### cross-cache-emotional_quality: Site cache: Emotional Quality

_viz_graph_cache cross-domain dimension; nde_n=12562, uap_n=5839_

| category | NDE n | NDE pct | UAP n | UAP pct |
| --- | --- | --- | --- | --- |
| Love | 8,018 | 63.8 | 57 | 1.0 |
| Peace | 1,010 | 8.0 | 44 | 0.8 |
| Joy | 157 | 1.2 | 57 | 1.0 |
| Compassion | 106 | 0.8 | 11 | 0.2 |
| Awe | 2 | 0.0 | 1,312 | 22.5 |
| Excitement | 3 | 0.0 | 384 | 6.6 |
| Curiosity | 3 | 0.0 | 1,266 | 21.7 |
| Neutral | 2,121 | 16.9 | 1 | 0.0 |
| Authority | 526 | 4.2 | 97 | 1.7 |
| Shock | 1 | 0.0 | 397 | 6.8 |
| Anxiety | 19 | 0.2 | 162 | 2.8 |
| Fear | 373 | 3.0 | 1,407 | 24.1 |

### cross-year: Upload year by domain

_NDE n=6185 dated confirmed videos; UAP n=8394 tier 1-2 videos_

| year | NDE n | NDE pct | UAP n | UAP pct |
| --- | --- | --- | --- | --- |
| 2006 | 0 | 0.0 | 4 | 0.0 |
| 2007 | 0 | 0.0 | 4 | 0.0 |
| 2008 | 0 | 0.0 | 3 | 0.0 |
| 2009 | 0 | 0.0 | 18 | 0.2 |
| 2010 | 0 | 0.0 | 90 | 1.1 |
| 2011 | 28 | 0.5 | 62 | 0.7 |
| 2012 | 11 | 0.2 | 33 | 0.4 |
| 2013 | 25 | 0.4 | 81 | 1.0 |
| 2014 | 9 | 0.1 | 32 | 0.4 |
| 2015 | 17 | 0.3 | 144 | 1.7 |
| 2016 | 25 | 0.4 | 112 | 1.3 |
| 2017 | 30 | 0.5 | 35 | 0.4 |
| 2018 | 39 | 0.6 | 152 | 1.8 |
| 2019 | 55 | 0.9 | 236 | 2.8 |
| 2020 | 284 | 4.6 | 296 | 3.5 |
| 2021 | 415 | 6.7 | 621 | 7.4 |
| 2022 | 595 | 9.6 | 782 | 9.3 |
| 2023 | 1,361 | 22.0 | 1,324 | 15.8 |
| 2024 | 1,509 | 24.4 | 1,454 | 17.3 |
| 2025 | 1,153 | 18.6 | 1,655 | 19.7 |
| 2026 | 629 | 10.2 | 1,256 | 15.0 |

### cross-size: Domain size side by side

_From this pull_

| metric | NDE | UAP |
| --- | --- | --- |
| videos | 6,304 | 8,394 |
| distinct channels | 61 | 80 |
| median views | 6,983 | 13223.5 |
| mean views | 67,759 | 141388.2 |
| total views | 427,152,469 | 1,185,681,440 |
| share of videos with >= 100k views | 12.5% | 16.0% |
| first-person share | n/a (every confirmed NDE video is a first-person account by construction of the isNde filter) | 10.6% content_type=first_person; 10.6% source_type=direct_experiencer |
| per-item analysis units | 6304 nde_analysis rows (1 per video) | 7017 uap_encounters rows (0-15 per video) |

### cross-nde-elements-cache-vs-now: NDE core element rates: site cache vs this pull

_Cache viz_id=nde-elements computed 2026-05-26 17:22:34.979277+00 over 5031 experiences; this pull n=6289 confirmed NDE videos with core_elements_

| element | cache pct | this pull pct | diff (pts) |
| --- | --- | --- | --- |
| out_of_body | 85.0 | 83.7 | -1.3 |
| tunnel | 25.0 | 23.9 | -1.1 |
| bright_light | 63.0 | 60.4 | -2.6 |
| deceased_relatives | 41.0 | 39.9 | -1.1 |
| life_review | 52.0 | 49.3 | -2.7 |
| being_of_light | 57.0 | 54.7 | -2.3 |
| border_boundary | 38.0 | 37.6 | -0.4 |
| feelings_of_peace | 94.0 | 93.0 | -1 |
| cosmic_unity | 60.0 | 61.1 | 1.1 |
| time_distortion | 60.0 | 58.8 | -1.2 |
| enhanced_senses | 75.0 | 74.1 | -0.9 |
| telepathy | 60.0 | 60.0 | 0 |
| otherworldly_realm | 75.0 | 74.8 | -0.2 |
| knowledge_download | 61.0 | 61.5 | 0.5 |
| choice_to_return | 80.0 | 78.4 | -1.6 |

## CHANNELS tables

### ch-nde-country: NDE channels (channels table) by country

_channels rows, n=55_

| value | count | pct |
| --- | --- | --- |
| US | 33 | 60.0 |
| null | 11 | 20.0 |
| CA | 3 | 5.5 |
| FR | 2 | 3.6 |
| GB | 2 | 3.6 |
| AT | 1 | 1.8 |
| BR | 1 | 1.8 |
| CH | 1 | 1.8 |
| NL | 1 | 1.8 |

### ch-uap-grade: UAP channel letter grade

_uap_channel_scores rows, n=78_

| value | count | pct |
| --- | --- | --- |
| F | 62 | 79.5 |
| D | 14 | 17.9 |
| C | 2 | 2.6 |

### ch-uap-archetype: UAP channel primary archetype

_uap_channel_scores rows, n=78_

| value | count | pct |
| --- | --- | --- |
| Interview Hub | 20 | 25.6 |
| Deep Intelligence | 17 | 21.8 |
| Documentary | 15 | 19.2 |
| News & Commentary | 14 | 17.9 |
| First Person Encounters | 7 | 9.0 |
| null | 5 | 6.4 |

### ch-uap-cadence: UAP channel posting cadence

_uap_channel_scores rows, n=78_

| value | count | pct |
| --- | --- | --- |
| biweekly | 61 | 78.2 |
| weekly | 15 | 19.2 |
| prolific | 2 | 2.6 |

### ch-uap-personality: UAP channel personality code

_uap_channel_scores rows, n=78_

| value | count | pct |
| --- | --- | --- |
| EDN | 17 | 21.8 |
| IDA | 16 | 20.5 |
| EBN | 11 | 14.1 |
| EDA | 10 | 12.8 |
| IDN | 10 | 12.8 |
| IBN | 8 | 10.3 |
| EBA | 4 | 5.1 |
| IBA | 2 | 2.6 |

### ch-nde-all: All NDE channels by confirmed NDE count

_From nde_vids; n=61 channels_

| channel | n | mean Greyson | mean transformation | mean rvnde | median views | pct very_positive | pct distressing journey |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Life After Life NDE | 615 | 25.6 | 30.9 | 10.7 | 9,019 | 57.7 | 2.9 |
| AFINAL, O QUE SOMOS NÓS? / AFTER ALL, WHAT ARE WE? | 414 | 25.2 | 25.7 | 10.3 | 109,862 | 51.2 | 2.9 |
| NDE Radio with Lee Witting | 411 | 24.5 | 25.4 | 12.2 | 3,258 | 63.5 | 2.7 |
| Pegi Robinson - NDE TV | 395 | 25.8 | 29.1 | 12.1 | 2,031 | 59.7 | 3.8 |
| Love Covered Life Podcast | 327 | 25.5 | 28 | 10.5 | 10,195 | 63.9 | 2.4 |
| NDE Diary | 310 | 27.9 | 31.2 | 11.1 | 15,113 | 74.5 | 2.6 |
| IANDS | 303 | 23.8 | 27.3 | 11.3 | 5,438 | 55.1 | 2.0 |
| The Other Side NDE | 254 | 28.1 | 31.9 | 11.7 | 112839.5 | 74.8 | 1.2 |
| Round Trip Death | 235 | 27.1 | 27.8 | 12.3 | 1,053 | 76.2 | 4.7 |
| Tia Renee | 221 | 27 | 31.3 | 12.1 | 3,391 | 69.2 | 1.4 |
| Tales Of Resilience | 219 | 26.9 | 33.1 | 10.1 | 2,787 | 65.3 | 3.7 |
| Beyond with Heather Tesch | 185 | 27.2 | 28.2 | 10.7 | 9,632 | 77.8 | 1.6 |
| Divine Encounters NDE | 169 | 28.2 | 31.4 | 9.6 | 3,486 | 70.4 | 0.6 |
| Touching The Afterlife | 168 | 23.6 | 28.6 | 8.9 | 60,285 | 45.2 | 47.0 |
| Crossing Over NDE | 136 | 27.2 | 32.8 | 11.3 | 4,183 | 63.2 | 1.5 |
| Heaven Awaits | 128 | 27.1 | 25.7 | 11 | 5607.5 | 60.2 | 5.5 |
| Passion Harvest Podcast | 110 | 26.1 | 27.6 | 11.5 | 5491.5 | 71.8 | 3.6 |
| Thanatos TV EN | 102 | 25.7 | 30.3 | 11.3 | 27850.5 | 45.1 | 2.0 |
| Spirit Travels | 101 | 28.2 | 26.7 | 13.3 | 728 | 66.3 | 4.0 |
| HeavenIsReal | 94 | 28.2 | 29 | 12.7 | 176.5 | 68.1 | 2.1 |
| T&H - Afterlife | 89 | 29.3 | 33.2 | 11.5 | 34,581 | 91.0 | 0.0 |
| Afterlife Experiences | 88 | 25.6 | 27.6 | 11.8 | 25061.5 | 29.5 | 1.1 |
| Beyond the Veil | 80 | 29.4 | 33.2 | 11.7 | 12521.5 | 83.8 | 5.0 |
| Afterlife Atlas | 80 | 25.7 | 20.1 | 12.4 | 795.5 | 52.5 | 6.3 |
| Logical-NDE | 75 | 26 | 29.2 | 11.9 | 2,255 | 64.0 | 9.3 |
| Real Near Death Experience Stories | 74 | 25.7 | 24.3 | 12 | 120 | 75.7 | 5.4 |
| Imagine Heaven Podcast with John Burke | 64 | 26.7 | 23.1 | 10.1 | 28256.5 | 81.3 | 10.9 |
| About Freedom Show | 64 | 27.3 | 31.8 | 12.1 | 6406.5 | 81.3 | 3.1 |
| NDE Compilations | 61 | 29.7 | 34.5 | 11 | 5,380 | 96.7 | 0.0 |
| Confessions EMI-NDE | 58 | 27.9 | 30.8 | 9.6 | 65 | 79.3 | 0.0 |
| Shaman Oaks | 50 | 27.3 | 31.3 | 12.5 | 361,361 | 68.0 | 2.0 |
| CT-IANDS - Near Death Experience Support (NDE) | 49 | 24.4 | 27.1 | 11.5 | 135 | 61.2 | 0.0 |
| NDE Accounts - Afterlife Stories | 48 | 25.3 | 20.5 | 12 | 57059.5 | 52.1 | 2.1 |
| Anthony Chene production | 47 | 27.9 | 35.5 | 13.7 | 344,382 | 80.9 | 2.1 |
| Prioritize Your Life | 45 | 20.2 | 25 | 11.2 | 9,320 | 53.3 | 0.0 |
| Outstanding Near-Death Experiences | 44 | 19 | 19.3 | 10.7 | 799 | 45.5 | 2.3 |
| Hawaiian IANDS | 43 | 24 | 29 | 10.5 | 287 | 58.1 | 0.0 |
| Life & Beyond | 39 | 27.2 | 33 | 9.8 | 21,251 | 69.2 | 0.0 |
| Coming Home | 37 | 26.9 | 33.3 | 13.2 | 776,291 | 86.5 | 0.0 |
| IANDS Northern Virginia - NDE Interviews | 33 | 26.2 | 25.8 | 10.9 | 506 | 69.7 | 3.0 |
| NDE Video | 31 | 24.3 | 27.7 | 11.5 | 20,440 | 58.1 | 0.0 |
| Lamplighter | 30 | 26.8 | 31.3 | 11.2 | 1,281 | 80.0 | 6.7 |
| NewHeaven NewEarth | 23 | 23.8 | 25.8 | 11.9 | 24,281 | 78.3 | 4.3 |
| Near Death Experiences | 21 | 21.9 | 15.9 | 8.2 | 891 | 52.4 | 0.0 |
| Loss and Found Podcast | 16 | 24.7 | 30.4 | 9.6 | 340.5 | 68.8 | 0.0 |
| NDEs and the Afterlife | 13 | 27.2 | 24.8 | 10.5 | 1,612 | 84.6 | 0.0 |
| Near-Death Experiences | 12 | 26.8 | 29.5 | 14.7 | 13759.5 | 50.0 | 16.7 |
| Dorothy Shelton | 12 | 29.3 | 36.3 | 10.3 | 220,574 | 83.3 | 0.0 |
| Not the End NDE | 11 | 25.6 | 29.9 | 10.4 | 1,855 | 63.6 | 0.0 |
| Heaven Is Real | 11 | 27.7 | 27.6 | 11.5 | 25 | 36.4 | 0.0 |
| Lamplighter NDE | 11 | 25.3 | 27.1 | 8.5 | 392 | 72.7 | 18.2 |
| All That Is | 10 | 27.3 | 29.2 | 8.6 | 1,734 | 60.0 | 0.0 |
| Waking Up To Heaven  | 7 | 27.4 | 34 | 11 | 1,843 | 85.7 | 0.0 |
| The Paradigm Experience | 7 | 29 | 32.6 | 16.3 | 6,259 | 85.7 | 0.0 |
| Near Death Experience Podcast | 6 | 27.5 | 18 | 12.3 | 2,377 | 66.7 | 0.0 |
| shaman oaks | 6 | 25 | 24.7 | 8.8 | 53745.5 | 33.3 | 0.0 |
| Realization Lab | 2 | 30 | 33 | 7 | 23607.5 | 100.0 | 0.0 |
| JeffMara Podcast | 2 | 30 | 33 | 7 | 21077.5 | 100.0 | 0.0 |
| Eternal Mind | 2 | 30 | 36 | 15 | 118.5 | 100.0 | 0.0 |
| Muslim NDE | 2 | 22 | 15 | 11 | 0 | 50.0 | 0.0 |
| T&H Afterlife | 1 | 29 | 36 | 7 | 4,776 | 0.0 | 0.0 |

### ch-uap-all: All UAP channels by tier 1-2 video count

_From uap_vids joined to uap_channel_scores by channel name/id; n=80 channels_

| channel | n | pct encounters track | mean max evidence | mean max contact depth | mean max transformation | mean intelligence value | median views | grade | archetype | subscribers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Brazil UFO | 682 | 38.7 | 12.5 | 13.4 | 13.8 | 6.9 | 681.5 | F | News & Commentary | 20,400 |
| Eyes On Cinema | 578 | 76.8 | 15.7 | 16.8 | 16 | 7.68 | 19276.5 | F | Interview Hub | 233,000 |
| Richard Dolan Intelligent Disclosure  | 518 | 16.6 | 11.5 | 15.8 | 19.2 | 7.83 | 34734.5 | F | Deep Intelligence | 193,000 |
| Preston Dennett | 517 | 61.5 | 11.3 | 19.5 | 18.7 | 7.34 | 8,261 | F | Interview Hub | 53,000 |
| Mutual UFO Network (MUFON) | 405 | 24.9 | 13.6 | 13.7 | 17.1 | 7.17 | 3,616 | F | Deep Intelligence | 98,800 |
| Lehto Files | 351 | 25.9 | 14.4 | 12.5 | 14.2 | 7.87 | 27769.5 | F | Deep Intelligence | 119,000 |
| Engaging The Phenomenon | 320 | 26.9 | 11.3 | 17.9 | 19.2 | 7.34 | 2848.5 | F | Deep Intelligence | 28,100 |
| UFO CENTRAL | 313 | 16.3 | 13.2 | 16.4 | 17.2 | 7.74 | 107,351 | F | Documentary | 540,000 |
| JeffMara Podcast | 306 | 77.5 | 12.4 | 27.7 | 29.2 | 7.44 | 19,933 | D | Interview Hub | 269,000 |
| Project Unity | 301 | 17.6 | 12.5 | 18.3 | 25.4 | 7.7 | 11,102 | D | Deep Intelligence | 156,000 |
| Disclosure Team with Vinnie Adams  | 285 | 30.2 | 12.7 | 14.4 | 15.1 | 7.91 | 3,319 | F | Deep Intelligence | 23,700 |
| Unveiled | 242 | 3.3 | 10.6 | 8 |  | 6.37 | 25,973 | F | Deep Intelligence | 976,000 |
| Dr. Steven Greer | 225 | 25.3 | 16 | 16.3 | 16.4 | 7.98 | 98,062 | F | News & Commentary | 827,000 |
| Believe: Paranormal & UFO Podcast | 208 | 86.1 | 13.8 | 19 | 15 | 7.39 | 518 | D | Interview Hub | 3,400 |
| NewsNation | 205 | 22.0 | 13.8 | 20.5 | 19.7 | 8.16 | 342,583 | F | News & Commentary | 2,690,000 |
| Jeremy Corbell | 201 | 16.4 | 14.7 | 14.5 | 16.7 | 8.01 | 100,617 | F | Deep Intelligence | 397,000 |
| Weird World | 199 | 31.7 | 15.5 | 20 | 18.4 | 7.57 | 22,874 | F | Documentary | 720,000 |
| Sci-Fi Central | 172 | 27.3 | 13.4 | 15.8 | 20.2 | 7.5 | 10,796 | F | Documentary | 1,390,000 |
| Experiencer Interviews | 167 | 100.0 | 13.6 | 30.3 | 29.4 | 7.81 | 1,202 | C | Interview Hub | 3,480 |
| The Good Trouble Show with Matt Ford | 153 | 9.8 | 13.7 | 20.8 | 22.1 | 8.16 | 11,973 | F | News & Commentary | 139,000 |
| Stellar Productions | 142 | 4.9 | 11 | 17.5 | 16 | 7.87 | 16008.5 | F | News & Commentary | 69,400 |
| Tom Vernon UAP | 134 | 29.9 | 12.3 | 17.9 | 23 | 7.83 | 358 | F | Interview Hub | 3,500 |
| THAT ONE TIME I WAS ABDUCTED BY ALIENS | 113 | 30.1 | 10.5 | 17.7 | 22.2 | 6.75 | 212 | F | News & Commentary | 1,210 |
| HauntTV | 104 | 0.0 |  |  |  | 8 | 65936.5 | D | Documentary | 200,000 |
| Jesse Michels | 98 | 35.7 | 14.9 | 22.4 | 16.8 | 8.15 | 451,134 | F | Deep Intelligence | 615,000 |
| UFO Congress | 92 | 31.5 | 15.1 | 22 | 22.9 | 7.77 | 69 | D | Deep Intelligence | 4,430 |
| Area52 | 91 | 64.8 | 14 | 20.6 | 17.2 | 7.96 | 395,402 | F | Interview Hub | 516,000 |
| Mantis Encounters | 83 | 77.1 | 11.8 | 26.3 | 19.7 | 7.19 | 2,052 | D | First Person Encounters | 8,140 |
| The UnXplained Zone | 80 | 17.5 | 13.5 | 6.7 | 8.7 | 7.28 | 12517.5 | F | Interview Hub | 553,000 |
| DMAX UK | 77 | 0.0 |  |  |  |  | 25,173 | F |  | 545,000 |
| 8 News Now - Las Vegas | 68 | 2.9 | 15.5 | 7 |  | 7.82 | 151840.5 | F | Deep Intelligence | 443,000 |
| UAP Gerb | 62 | 8.1 | 14.2 | 14 | 14 | 8.21 | 51,927 | F | News & Commentary | 120,000 |
| The Why Files | 62 | 17.7 | 12.1 | 22.3 | 17.5 | 7.85 | 3761280.5 | F | Documentary | 5,840,000 |
| Saucer Life | 53 | 11.3 | 11.3 | 23.8 | 11 | 6.77 | 195 | F | Documentary | 732 |
| Podcast UFO Live Shows | 50 | 74.0 | 14.9 | 13.9 | 10.5 | 7.46 | 1,337 | F | Interview Hub | 37,400 |
| Travel Channel | 47 | 70.2 | 14.7 | 17.9 | 15.3 | 7.23 | 41,589 | F | Interview Hub | 868,000 |
| DiscoveryChannelInd | 47 | 0.0 |  |  |  |  | 66,573 | F |  | 1,520,000 |
| Somes Mist | 46 | 82.6 | 10.8 | 17.4 | 21 | 6.2 | 116.5 | F | First Person Encounters | 726 |
| Redacted | 44 | 9.1 | 8.8 | 29 | 24 | 7.8 | 262,377 | F | News & Commentary | 2,880,000 |
| Somewhere in the Skies w/ Ryan Sprague | 43 | 97.7 | 13.7 | 16.9 | 13.8 | 7.86 | 1,602 | F | First Person Encounters | 21,900 |
| Absolute Documentaries | 42 | 14.3 | 12.3 | 19 | 32 | 7.8 | 21,243 | F | Documentary | 554,000 |
| Inquiry with Kelly Chase | 40 | 35.0 | 9.9 | 16.7 | 20.1 | 7.98 | 3634.5 | F | Deep Intelligence | 12,900 |
| TruthSeekah & Arien | 38 | 65.8 | 9.2 | 20.8 | 19.7 | 7.05 | 1697.5 | F | Interview Hub | 132,000 |
| Discovery UK | 36 | 0.0 |  |  |  |  | 34404.5 | F |  | 4,900,000 |
| SpaceRip | 35 | 2.9 | 18 | 13 |  | 7.83 | 46,491 | F | Documentary | 1,000,000 |
| Dr Steven Greer Disclosure | 33 | 9.1 | 13 | 25.3 | 16.3 | 7.88 | 4,913 | F | News & Commentary | 25,700 |
| Patterns Tell Stories | 31 | 3.2 | 7 |  | 8 | 7.87 | 263 | F | News & Commentary | 2,150 |
| Secret Origins | 30 | 10.0 | 8.3 | 5 |  | 7.2 | 127044.5 | F | Documentary | 565,000 |
| European UFOs | 23 | 39.1 | 13.6 | 18.6 | 12 | 7.57 | 80 | F | Deep Intelligence | 43 |
| HISTORY | 22 | 45.5 | 16 | 13.3 | 14.5 | 8.06 | 224,053 | F | Interview Hub | 15,300,000 |
| Mike Clelland | 20 | 55.0 | 9.3 | 22.6 | 29 | 7.16 | 508.5 | D | Interview Hub | 3,230 |
| Merged Podcast | 20 | 35.0 | 18 | 8.3 | 19.8 | 7.85 | 101,998 | F | Deep Intelligence | 56,100 |
| Camp Gagnon | 16 | 25.0 | 14 | 20 | 22 | 7.88 | 91942.5 | D | Documentary | 514,000 |
| Saucers, Spooks and Kooks | 15 | 20.0 | 11 | 18 |  | 6.9 | 77 | F | News & Commentary | 1,170 |
| Cosmic+ | 15 | 100.0 | 14.1 | 14.4 | 19.9 | 7.73 | 6,253 | F | Interview Hub | 2,540 |
| Disclosure Team | 12 | 8.3 | 9 | 3 | 9 | 8 | 970 |  |  |  |
| J. Horton Films | 11 | 54.5 | 12 | 14.8 | 18 | 7.82 | 57,412 | F | First Person Encounters | 40,000 |
| ParanormalTV | 11 | 100.0 | 13.8 | 14.3 | 20 | 8.09 | 37,545 | F | Interview Hub | 25,600 |
| National Geographic | 9 | 66.7 | 16.3 | 9 | 8.5 | 8.56 | 4,592,303 | F | Interview Hub | 26,100,000 |
| IRONCLAD | 9 | 11.1 | 18 | 11 |  | 8.4 | 19,898 | F | News & Commentary | 379,000 |
| Motech | 9 | 44.4 | 15 | 16.5 | 13 | 7.78 | 40,223 | F | Documentary | 275,000 |
| The Archivist's Journal | 7 | 28.6 | 9 | 7.5 |  | 8.43 | 31,759 | F | Deep Intelligence | 10,500 |
| Cosmosis [Formerly The UFO Rabbit Hole] | 3 | 33.3 |  |  |  |  | 3,324 |  |  |  |
| Tony Topping UFOs & Alien Encounters | 2 | 100.0 | 9.5 | 24.5 | 14 | 8 | 708.5 | D | First Person Encounters | 2,960 |
| YouTube Movies | 2 | 0.0 |  |  |  |  |  | F |  | 346,000 |
| PowerfulJRE | 2 | 100.0 | 13 | 17.5 |  | 8 | 36611844.5 | F | Interview Hub | 20,900,000 |
| Danny Jones | 2 | 50.0 | 18 | 25 | 30 | 8.5 | 331,926 | D | First Person Encounters | 1,230,000 |
| Quirk Zone | 2 | 0.0 |  |  |  | 7.5 | 2,493 | F | Documentary | 20,600 |
| SKYWATCHER | 2 | 50.0 | 17 | 20 | 13 | 8 | 630726.5 | F | Deep Intelligence | 120,000 |
| Soft White Underbelly | 1 | 100.0 | 11 | 26 | 22 | 8 | 602,104 | D | First Person Encounters | 6,900,000 |
| Fox News | 1 | 0.0 |  |  |  | 7 | 449,081 | F | News & Commentary | 15,300,000 |
| UAP Files Podcast 🛸 | 1 | 100.0 | 12 | 26 | 25 | 7 | 8,317 | D | Interview Hub | 49,800 |
| UFO CHRONICLES PODCAST | 1 | 0.0 |  |  |  |  | 0 | F |  | 270 |
| BuzzFeed Unsolved Network | 1 | 0.0 |  |  |  | 7 | 14,006,397 | F | Documentary | 5,350,000 |
| Jesse Michels Clips | 1 | 0.0 |  |  |  | 8 | 1,305 | D | Deep Intelligence | 82,700 |
| Voices of the Past | 1 | 0.0 | 14 | 12 |  | 5 | 1,314,828 | F | Documentary | 1,090,000 |
| My Dark Path | 1 | 0.0 |  |  |  | 8 | 291,178 | D | Documentary | 11,900 |
| The CE-5 Initiative | 1 | 0.0 |  |  |  | 9 | 2,615 | C | News & Commentary | 1,990 |
| Wrinkled Brain | 1 | 100.0 | 9 | 3 |  | 7 | 1,260 | F | Interview Hub | 277 |
| Contact Redacted | 1 | 100.0 | 12 | 27 |  | 8 | 11,356 | F | Interview Hub | 11,400 |

### ch-nde-meta: NDE channels table (metadata)

_channels rows, n=55_

| name | country | subscribers | total videos | total views | scanner enabled | hidden |
| --- | --- | --- | --- | --- | --- | --- |
| NBC Sports | US | 5,300,000 | 46,617 | 5,265,635,591 | false | false |
| The Other Side NDE | US | 518,000 | 405 | 85,381,284 | true | false |
| shaman oaks | US | 500,000 | 83 | 62,812,506 | true | false |
| AFINAL, O QUE SOMOS NÓS? / AFTER ALL, WHAT ARE WE? | BR | 464,000 | 702 | 70,737,940 | true | false |
| Coming Home | US | 431,000 | 215 | 50,390,475 | true | false |
| Dorothy Shelton | GB | 294,000 | 38 | 12,833,366 | true | false |
| Anthony Chene production | US | 266,000 | 96 | 37,727,421 | true | false |
| JeffMara Podcast | US | 260,000 | 2,019 | 60,646,313 | false | false |
| Touching The Afterlife | US | 222,000 | 205 | 26,825,898 | true | false |
| Heaven Awaits | US | 216,000 | 113 | 801,153 | true | false |
| Prioritize Your Life | US | 214,000 | 220 | 33,268,204 | true | false |
| AI News & Strategy Daily \| Nate B Jones |  | 206,000 | 788 | 11,016,951 | false | false |
| Life After Life NDE | US | 185,000 | 878 | 24,701,673 | false | true |
| Love Covered Life Podcast |  | 129,000 | 707 | 15,910,082 | true | false |
| The Paradigm Experience | US | 104,000 | 174 | 15,218,377 | false | false |
| NDE Accounts - Afterlife Stories | CA | 103,000 | 58 | 9,169,605 | true | false |
| NDE Diary | US | 96,000 | 295 | 14,822,408 | true | false |
| T&H - Afterlife | CA | 94,800 | 89 | 9,180,364 | true | false |
| Beyond with Heather Tesch | US | 77,700 | 720 | 8,113,041 | true | false |
| Imagine Heaven Podcast with John Burke |  | 71,300 | 138 | 4,269,815 | true | false |
| IANDS | US | 70,300 | 422 | 9,124,977 | true | false |
| Beyond the Veil | US | 68,400 | 61 | 6,236,094 | true | false |
| Afterlife TV with Bob Olson |  | 62,100 | 158 | 7,481,979 | false | false |
| Life & Beyond | GB | 56,600 | 36 | 4,225,814 | true | false |
| Thanatos TV EN | AT | 53,700 | 305 | 9,627,695 | true | false |
| Logical-NDE | US | 41,600 | 77 | 704,538 | true | false |
| Passion Harvest Podcast |  | 41,200 | 426 | 4,034,494 | true | false |
| Afterlife Experiences | CH | 30,500 | 107 | 4,404,828 | true | false |
| About Freedom Show | US | 29,900 | 102 | 2,771,151 | true | false |
| Tales Of Resilience | NL | 28,400 | 200 | 3,427,746 | true | false |
| Crossing Over NDE | US | 25,100 | 181 | 2,705,539 | true | false |
| Divine Encounters NDE | US | 21,900 | 186 | 1,909,730 | true | false |
| Pegi Robinson - NDE TV | US | 21,400 | 458 | 3,916,669 | true | false |
| Tia Renee |  | 19,300 | 730 | 2,308,409 | true | false |
| NDE Video | US | 17,000 | 39 | 1,796,871 | true | false |
| NDE Radio with Lee Witting | US | 14,400 | 644 | 2,745,422 | true | false |
| Round Trip Death | US | 11,100 | 219 | 907,233 | true | false |
| Confessions EMI-NDE | FR | 10,700 | 174 | 190,914 | true | false |
| NewHeaven NewEarth |  | 9,140 | 32 | 1,630,004 | true | false |
| Afterlife Atlas | US | 9,040 | 105 | 390,571 | true | false |
| Spirit Travels | CA | 5,920 | 162 | 290,107 | true | false |
| NDE Compilations |  | 4,950 | 68 | 562,350 | true | false |
| Lamplighter NDE |  | 4,940 | 101 | 430,895 | true | false |
| Realization Lab |  | 3,260 | 113 | 111,806 | false | false |
| Near-Death Experiences | FR | 3,050 | 14 | 672,242 | true | false |
| Loss and Found Podcast | US | 2,590 | 78 | 228,020 | true | false |
| NDEs and the Afterlife | US | 2,430 | 15 | 298,952 | true | false |
| Heaven Is Real | US | 1,900 | 108 | 77,402 | true | false |
| IANDS Northern Virginia - NDE Interviews | US | 1,310 | 39 | 89,147 | true | false |
| Hawaiian IANDS | US | 1,280 | 59 | 103,011 | true | false |
| Outstanding Near-Death Experiences | US | 1,250 | 52 | 83,214 | true | false |
| Near Death Experiences |  | 834 | 28 | 166,234 | true | false |
| Real Near Death Experience Stories | US | 511 | 78 | 16,439 | true | false |
| Waking Up To Heaven  | US | 499 | 172 | 93,915 | false | false |
| CT-IANDS - Near Death Experience Support (NDE) | US | 356 | 62 | 23,475 | true | false |
