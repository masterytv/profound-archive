/**
 * Font configuration for OG image generation.
 *
 * Production approach: Satori uses the system font stack (system-ui,
 * sans-serif) by default when no custom fonts are provided.
 * This avoids the need to fetch fonts at runtime from Google Fonts,
 * which can fail in sandboxed environments.
 *
 * The channel OG route (already in production) uses this same approach
 * and renders well across all social platforms.
 *
 * TODO: For pixel-perfect brand fonts (Crimson Pro + Inter), bundle
 * TTF files locally in src/lib/og/fonts/ and load via import.meta.url.
 * This requires the user to download the font files manually.
 */

/**
 * Returns undefined — signals to ImageResponse to use system fonts.
 * This matches the working channel OG route pattern.
 *
 * When custom fonts are needed, this function will return the fonts
 * array for ImageResponse options.
 */
export async function getOgFontConfig(): Promise<undefined> {
  // System fonts render well for OG images. The channel OG route
  // in production uses this same approach successfully.
  return undefined;
}
