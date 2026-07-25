/**
 * Data contract for the Afterlife Map.
 *
 * Every `confidence` value is a MEASURED share of the 6,176-account clear-NDE corpus,
 * corrected by a sampled precision audit — never an estimate. See
 * `scratch/afterlife/` for the pipeline that produces `src/data/afterlife-map.json`.
 */

export type PlaceCategory =
  | 'threshold'
  | 'realm'
  | 'structure'
  | 'landscape'
  | 'boundary'
  | 'process'
  | 'being'
  | 'state';

/** Prevalence across cvNDE evidential strata. Values are 0–1 shares of that stratum. */
export interface Strata {
  all: number;
  cv13: number;
  cv18: number;
  cv23: number;
}

export interface Alias {
  term: string;
  /** The researcher's free-text label, shown as-is (e.g. "Christian/Muslim"). */
  tradition: string | null;
  /** Canonical tags parsed from `tradition` — what the lens control filters on. */
  traditionTags: string[];
  note: string | null;
}

export interface Quote {
  videoId: string;
  text: string;
  /** cvNDE evidential score, 7–28. */
  cvnde: number | null;
  speaker?: string | null;
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  /** Drives which lobe of the map this sits in — the dark realms branch away from the spine. */
  tone: 'radiant' | 'neutral' | 'distressing';
  /** Containing place — a meadow sits inside the wider green country. */
  parent: string | null;
  /** Set when `parent` was derived by measurement: share of this place's accounts that also
   *  describe the parent. Absent when the parent was assigned by the researcher. */
  containment?: number;
  description: string;
  aliases: Alias[];
  sensory: string[];
  /** Precision-corrected prevalence — what the map draws. */
  confidence: Strata;
  /** Uncorrected regex doc-match share, kept for transparency. */
  raw: Strata;
  /**
   * How the number was arrived at.
   * `ai-extraction` — every transcript was read whole and judged for this element, so no
   *   precision correction applies and the interval is a plain binomial one.
   * `pattern+audit` — a text pattern selected candidates, then a blind sample was judged to
   *   measure how often the pattern was right; the raw rate is scaled by that precision.
   */
  method: 'ai-extraction' | 'pattern+audit';
  /** Share of audited passages that genuinely described this place. 1 for `ai-extraction`. */
  precision: number;
  precisionN: number;
  /** 95% CI half-width on the corrected `confidence.all`, from the precision audit. */
  ci95: number;
  /** Matching document counts per stratum. */
  n: Strata;
  /** 0 = still at the body, 1 = back in the body. Measured from narrative position. */
  position: number;
  quotes: Quote[];
  notes: string | null;
}

export interface MapEdge {
  source: string;
  target: string;
  /** Share of sequenced accounts making this transition. */
  weight: number;
}

/** One sampled account's own route: place indices, in the order that person narrated them. */
export interface Thread {
  /** cvNDE score of the account this thread came from. */
  cv: number;
  /** Indices into `places`. */
  r: number[];
}

export interface AfterlifeMapData {
  /** Unique experiencers — the denominator for every confidence value. */
  corpusSize: number;
  /** Underlying recorded accounts, of which many are repeat appearances. */
  accountCount: number;
  strata: { all: number; cv13: number; cv18: number; cv23: number };
  places: Place[];
  edges: MapEdge[];
  threads: Thread[];
  generatedAt: string;
  /** Traditions present in the alias set, for the lens control. */
  traditions: string[];
}

export type StratumKey = keyof Strata;
