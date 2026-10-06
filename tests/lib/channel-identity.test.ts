import { describe, it, expect } from 'vitest';
import { diffChannelIdentities, youtubeChannelUrl } from '@/lib/scanner/channel-identity';

describe('diffChannelIdentities', () => {
    const stored = [
        { channel_id: 'UC_renamed', name: 'About Freedom Show', custom_url: '@aboutfreedomshow' },
        { channel_id: 'UC_same', name: 'Same Name', custom_url: '@samename' },
        { channel_id: 'UC_gone', name: 'Deleted Channel', custom_url: '@gone' },
        { channel_id: 'UC_handle_case', name: 'Case', custom_url: '@CaseOnly' },
    ];
    const current = new Map([
        ['UC_renamed', { title: 'Sergei Davidoff', customUrl: '@sergei_davidoff' }],
        ['UC_same', { title: 'Same Name', customUrl: '@samename' }],
        ['UC_handle_case', { title: 'Case', customUrl: '@caseonly' }],
    ]);

    it('reports only channels whose name or handle actually changed', () => {
        expect(diffChannelIdentities(stored, current)).toEqual([
            {
                channelId: 'UC_renamed',
                oldName: 'About Freedom Show',
                newName: 'Sergei Davidoff',
                oldHandle: '@aboutfreedomshow',
                newHandle: '@sergei_davidoff',
            },
        ]);
    });

    it('detects a handle-only change', () => {
        const changes = diffChannelIdentities(
            [{ channel_id: 'UC_x', name: 'X', custom_url: '@old' }],
            new Map([['UC_x', { title: 'X', customUrl: '@new' }]]),
        );
        expect(changes).toHaveLength(1);
        expect(changes[0].newHandle).toBe('@new');
    });
});

describe('youtubeChannelUrl', () => {
    it('builds the permanent channel-ID URL', () => {
        expect(youtubeChannelUrl('UCSrjs9KcP-Tg9wSKjsWS-jw')).toBe('https://www.youtube.com/channel/UCSrjs9KcP-Tg9wSKjsWS-jw');
    });
});
