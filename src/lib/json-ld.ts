/**
 * JSON-LD serialization for <script type="application/ld+json"> embeds
 * (IMPROVEMENT_PLAN S-10).
 *
 * Inside a <script> element the HTML parser ends the element at the first
 * "</script" regardless of JSON string boundaries, so any '<' from content
 * (titles, descriptions) must be escaped. The replacement '\u003c' is a
 * valid JSON escape that parses back to '<', so search engines read the
 * structured data unchanged.
 */
export function serializeJsonLd(data: unknown): string {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
