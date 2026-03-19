/**
 * Markdown to HTML — zero-dependency server utility.
 *
 * Handles the patterns Claude generates in blog articles:
 * - ## H2, ### H3 headings
 * - **bold**, *italic*
 * - > blockquotes
 * - [text](url) links
 * - Horizontal rules ---
 * - Unordered lists (- item)
 * - Ordered lists (1. item)
 * - Inline code `code`
 * - Paragraphs (double newline separated)
 *
 * Not a full Markdown spec — purpose-built for pipeline output.
 * If more complex MDX is needed, install `marked` once npm permissions are resolved.
 */

export function markdownToHtml(md: string): string {
    if (!md) return '';

    let html = md
        // Normalize Windows line endings
        .replace(/\r\n/g, '\n');

    // ── Security: Escape raw HTML tags to prevent XSS ─────────────────────────
    // Strip script/style tags and their content entirely
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
    // Strip dangerous self-closing or unclosed tags (iframe, object, embed, form, input)
    html = html.replace(/<\/?(script|iframe|object|embed|form|input|textarea|button|select|applet|meta|link|base)\b[^>]*\/?>/gi, '');
    // Strip event handler attributes from any remaining HTML (onerror, onclick, onload, etc.)
    html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

    // ── Block-level elements (process before inline) ──────────────────────────

    // Headings: ## H2, ### H3, #### H4
    html = html
        .replace(/^#### (.+)$/gm, '<h4 class="text-lg font-bold mt-6 mb-2">$1</h4>')
        .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold mt-8 mb-3">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');

    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr class="border-slate-200 dark:border-white/10 my-8" />');

    // Blockquotes (multi-line support)
    html = html.replace(
        /^((?:> .+\n?)+)/gm,
        (match) => {
            const content = match
                .split('\n')
                .filter(Boolean)
                .map(line => line.replace(/^> ?/, ''))
                .join(' ');
            return `<blockquote class="border-l-4 border-blue-500/40 pl-5 py-2 bg-blue-50/30 dark:bg-blue-500/10 rounded-r-lg my-6 text-slate-600 dark:text-slate-300 italic">${content}</blockquote>`;
        }
    );

    // Unordered lists
    html = html.replace(
        /^((?:[-*+] .+\n?)+)/gm,
        (match) => {
            const items = match
                .trim()
                .split('\n')
                .filter(Boolean)
                .map(item => `<li class="ml-4">${item.replace(/^[-*+] /, '')}</li>`)
                .join('\n');
            return `<ul class="list-disc pl-5 my-4 space-y-1.5 text-slate-700 dark:text-slate-300">${items}</ul>`;
        }
    );

    // Ordered lists
    html = html.replace(
        /^((?:\d+\. .+\n?)+)/gm,
        (match) => {
            const items = match
                .trim()
                .split('\n')
                .filter(Boolean)
                .map(item => `<li class="ml-4">${item.replace(/^\d+\. /, '')}</li>`)
                .join('\n');
            return `<ol class="list-decimal pl-5 my-4 space-y-1.5 text-slate-700 dark:text-slate-300">${items}</ol>`;
        }
    );

    // ── Inline elements ───────────────────────────────────────────────────────

    // Inline code (before bold/italic to avoid conflicts)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800 dark:text-slate-200">$1</code>');

    // Images ![alt](url) — MUST come before links to avoid matching as broken link with stray `!`
    html = html.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        (_match, alt, url) => {
            const caption = alt && alt.trim()
                ? `<figcaption class="text-center text-sm text-slate-500 dark:text-slate-400 mt-3 italic">${alt}</figcaption>`
                : '';
            return `<figure class="my-8"><img src="${url}" alt="${alt || ''}" class="rounded-xl w-full shadow-md" loading="lazy" />${caption}</figure>`;
        }
    );

    // Links [text](url) — MUST come before bold/italic to protect underscores in URLs
    // Internal links (starting with /) stay in same tab; external links open in new tab
    html = html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_match, text, url) => {
            const isInternal = url.startsWith('/');
            if (isInternal) {
                return `<a href="${url}" class="text-blue-600 dark:text-blue-400 hover:underline">${text}</a>`;
            }
            return `<a href="${url}" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
    );

    // Bold + italic combined ***
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // Bold **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 dark:text-slate-100 font-semibold">$1</strong>');

    // Italic *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Italic _text_ — only match when underscores are at word boundaries (not inside URLs/IDs)
    html = html.replace(/(?<![\/\w])_([^_]+)_(?![\/\w])/g, '<em>$1</em>');

    // ── Paragraphs ────────────────────────────────────────────────────────────

    // Split into blocks by double newline, wrap non-tagged blocks in <p>
    const blocks = html.split(/\n\n+/);
    const wrapped = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        // Already a block-level element — don't wrap
        if (/^<(h[1-6]|ul|ol|blockquote|hr|figure|div|table|pre)/.test(trimmed)) return trimmed;
        // Single newlines within a paragraph become spaces
        return `<p class="leading-relaxed text-slate-700 dark:text-slate-300 my-4">${trimmed.replace(/\n/g, ' ')}</p>`;
    });

    return wrapped.filter(Boolean).join('\n');
}
