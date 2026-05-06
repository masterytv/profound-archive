/**
 * Domain Configuration System
 * 
 * Central config for all domain verticals (NDE, UAP, future: PSY, OBE, PSI).
 * Polymorphic components consume this to swap colors, labels, routes, and data sources.
 * 
 * Adding a new domain: add an entry to DOMAIN_CONFIGS and update the Domain union type.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type Domain = 'nde' | 'uap';
export type UapTrack = 'encounters' | 'program';

export interface DomainConfig {
  domain: Domain;
  label: string;
  shortLabel: string;
  accentColor: string;
  accentColorHex: string;
  chatSystemPrompt: string;
  embeddingTable: string;
  videoTable: string;
  analysisTable: string;
  searchRpc: string;
  semanticSearchRpc: string;
  facetsRpc: string;
  routes: {
    home: string;
    search: string;
    chat: string;
    admin: string;
  };
  features: {
    triadAnalysis: boolean;
    knowledgeExtraction: boolean;
    contacteeProfiles: boolean;
    timeline: boolean;
  };
}

// ─── Config Map ──────────────────────────────────────────────────────────────

export const DOMAIN_CONFIGS: Record<Domain, DomainConfig> = {
  nde: {
    domain: 'nde',
    label: 'Near-Death Experiences',
    shortLabel: 'NDE',
    accentColor: 'blue',
    accentColorHex: '#3b82f6',
    chatSystemPrompt: `You are a compassionate, knowledgeable guide specializing in near-death experiences. 
You help users explore NDE accounts with sensitivity, curiosity, and respect.
Always cite specific videos with timestamps when available.
Never diagnose, pathologize, or dismiss experiencers' accounts.
If content is distressing, offer crisis resources.`,
    embeddingTable: 'nde_punctuated_embeddings',
    videoTable: 'nde_vids',
    analysisTable: 'nde_analysis',
    searchRpc: 'keyword_search_videos',
    semanticSearchRpc: 'search_punctuated_embeddings_filtered',
    facetsRpc: 'keyword_search_facets',
    routes: {
      home: '/',
      search: '/search3',
      chat: '/chat',
      admin: '/admin',
    },
    features: {
      triadAnalysis: true,
      knowledgeExtraction: false,
      contacteeProfiles: false,
      timeline: false,
    },
  },
  uap: {
    domain: 'uap',
    label: 'UFO & UAP',
    shortLabel: 'UAP',
    accentColor: 'violet',
    accentColorHex: '#8b5cf6',
    chatSystemPrompt: `You are a curious, rigorous UAP researcher helping users explore UFO and UAP contact accounts.
You maintain editorial neutrality: do not confirm or deny the reality of experiences.
Always cite specific videos with timestamps when available.
Flag distressing content with care resources.
Do not diagnose or pathologize experiencers.
Focus on consciousness-related experiences only.
Distinguish between first-person encounters (Tier 1) and program/disclosure research (Tier 2).`,
    embeddingTable: 'uap_punctuated_embeddings',
    videoTable: 'uap_vids',
    analysisTable: 'uap_analysis',
    searchRpc: 'keyword_search_uap_videos',
    semanticSearchRpc: 'search_uap_punctuated_embeddings',
    facetsRpc: 'uap_search_facets',
    routes: {
      home: '/uap',
      search: '/uap/search',
      chat: '/uap/chat',
      admin: '/admin/uap',
    },
    features: {
      triadAnalysis: true,
      knowledgeExtraction: true,
      contacteeProfiles: true,
      timeline: true,
    },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get config for a domain. Throws if domain is unknown.
 * Use this in components and API routes to get domain-specific config.
 */
export function getDomainConfig(domain: string): DomainConfig {
  const config = DOMAIN_CONFIGS[domain as Domain];
  if (!config) {
    throw new Error(`Unknown domain: "${domain}". Valid domains: ${Object.keys(DOMAIN_CONFIGS).join(', ')}`);
  }
  return config;
}

/**
 * Check if a string is a valid domain.
 */
export function isValidDomain(domain: string): domain is Domain {
  return domain in DOMAIN_CONFIGS;
}

/**
 * Get all configured domains.
 */
export function getAllDomains(): Domain[] {
  return Object.keys(DOMAIN_CONFIGS) as Domain[];
}
