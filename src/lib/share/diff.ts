/**
 * Word-level diff for showing "what you wrote" vs "editor's suggestion".
 * Plain LCS over whitespace-separated tokens; sections are short (≈200 words),
 * so O(n·m) is fine. Whitespace is kept attached to the preceding word.
 */
export interface DiffPart {
    text: string;
    kind: 'same' | 'added' | 'removed';
}

function tokens(s: string): string[] {
    return s.match(/\S+\s*/g) ?? [];
}

export function wordDiff(before: string, after: string): DiffPart[] {
    const a = tokens(before);
    const b = tokens(after);
    const norm = (t: string) => t.trim();
    const n = a.length;
    const m = b.length;
    const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            lcs[i][j] = norm(a[i]) === norm(b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }
    const out: DiffPart[] = [];
    const push = (text: string, kind: DiffPart['kind']) => {
        const last = out[out.length - 1];
        if (last && last.kind === kind) last.text += text;
        else out.push({ text, kind });
    };
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (norm(a[i]) === norm(b[j])) {
            push(b[j], 'same');
            i++;
            j++;
        } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
            push(a[i++], 'removed');
        } else {
            push(b[j++], 'added');
        }
    }
    while (i < n) push(a[i++], 'removed');
    while (j < m) push(b[j++], 'added');
    return out;
}
