// Small adapters so the route test can exercise pure helpers without re-mocking modules.
export { clipWords } from '@/lib/research/shortmaker/build-case';
import { mergeRankings, type Grouped } from '@/lib/research/shortmaker/search';

export function mergeRankingsForTest(): string[] {
    const g = (videoId: string): Grouped => ({ videoId, score: 0, moments: [] });
    return mergeRankings([g('y'), g('x')], [g('x'), g('z')]).map((r) => r.videoId);
}
