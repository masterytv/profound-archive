/**
 * ISO 3166-1 alpha-2 codes where prior consent is required before storing
 * analytics identifiers on a visitor's device: the EU-27, the wider EEA
 * (IS, LI, NO), and the UK (UK GDPR mirrors the EU rules).
 *
 * Why this file exists: the list is needed in two places that MUST stay in
 * sync — the Google Consent Mode regional defaults injected client-side
 * (consent-gated-scripts.tsx) and the /api/geo banner decision (server).
 * It lives here and nowhere else.
 *
 * Deliberately NOT included: CH — the Swiss nFADP does not require opt-in
 * consent for audience measurement.
 */
export const CONSENT_REQUIRED_REGIONS = [
  // EU-27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
  // EEA (non-EU)
  'IS', 'LI', 'NO',
  // United Kingdom
  'GB',
] as const
