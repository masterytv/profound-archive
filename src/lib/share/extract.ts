/**
 * Extract plain text from an uploaded text file (.txt, .md, .pdf, .docx).
 * Only the extracted text is ever shown — the original file is never served.
 */
import { MAX_TEXT_CHARS } from './config';

export async function extractText(bytes: Uint8Array, mime: string, filename = ''): Promise<string> {
    const lower = filename.toLowerCase();
    let text: string;
    if (mime === 'application/pdf' || lower.endsWith('.pdf')) {
        assertMagic(bytes, [0x25, 0x50, 0x44, 0x46], 'PDF'); // %PDF
        const { extractText: pdfText, getDocumentProxy } = await import('unpdf');
        const pdf = await getDocumentProxy(bytes);
        const { text: pages } = await pdfText(pdf, { mergePages: true });
        text = Array.isArray(pages) ? pages.join('\n\n') : pages;
    } else if (mime.includes('wordprocessingml') || lower.endsWith('.docx')) {
        assertMagic(bytes, [0x50, 0x4b], 'DOCX'); // zip
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
        text = result.value;
    } else if (mime.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md')) {
        text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } else {
        throw new Error('Unsupported file type. Please upload .txt, .md, .pdf or .docx.');
    }
    return normalizeExtracted(text);
}

function assertMagic(bytes: Uint8Array, magic: number[], label: string) {
    if (!magic.every((b, i) => bytes[i] === b)) throw new Error(`That file doesn't look like a ${label}.`);
}

export function normalizeExtracted(text: string): string {
    return text
        .replace(/\u0000/g, '')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, MAX_TEXT_CHARS);
}
