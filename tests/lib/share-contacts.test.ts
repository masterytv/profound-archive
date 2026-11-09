import { describe, expect, it } from 'vitest';
import { csvRowToContact, gmailComposeUrl, parseCsv, contactSchema } from '@/lib/share/contacts';

// Sample rows in the format of the compiled channel contact list (public
// business contacts, illustrative values).
describe('channel contacts CSV import', () => {
    const csv = [
        'channel_name,vertical,youtube_url,subscribers,host_name,email,contact_form_url,website,other_handles,source_url,confidence,notes',
        'Example NDE Show,NDE,https://www.youtube.com/channel/UCQ9oy6n_1l-61YbJ_7mrEHQ,21.5K,Pat Host,host@example.com,,https://example.com,,YouTube About,high,"Guest submissions welcome, ""quoted"""',
        'Example UAP Show,UAP,https://www.youtube.com/channel/UCC6B4Y0oFACv9QBlf0ebBcg,843K,Sam Host,media@example.org; witnesses@example.org,,,,x,high,',
        'Example Big Show,UAP,https://www.youtube.com/channel/UCIFk2uvCNcEmZ77g0ESKLcQ,6.04M,Alex,partners@agency.example,,,,x,medium,Talent agency',
        'Example Both,NDE+UAP,https://www.youtube.com/@examplepod,280K,Jo,jo@example.net,,,,x,high,',
        ',NDE,not a url,1,,,,,,,,',
    ].join('\n');

    it('parses quoted fields and maps the compiled contact list columns', () => {
        const rows = parseCsv(csv);
        expect(rows).toHaveLength(5);
        expect(rows[0].notes).toBe('Guest submissions welcome, "quoted"');
        expect(csvRowToContact(rows[0])).toMatchObject({
            channel_id: 'UCQ9oy6n_1l-61YbJ_7mrEHQ',
            channel_type: 'nde',
            contact_name: 'Pat Host',
            contact_role: 'host',
            email: 'host@example.com',
        });
        expect(csvRowToContact(rows[1])!.email).toBe('media@example.org, witnesses@example.org');
        expect(csvRowToContact(rows[2])!.contact_role).toBe('agency');
        expect(csvRowToContact(rows[3])).toMatchObject({ channel_id: '@examplepod', channel_type: 'both' });
        expect(csvRowToContact(rows[4])).toBeNull();
    });

    it('produces rows the save schema accepts', () => {
        for (const r of parseCsv(csv).map(csvRowToContact).filter(Boolean)) {
            expect(contactSchema.safeParse(r).success).toBe(true);
        }
    });

    it('rejects an invalid email on save', () => {
        expect(contactSchema.safeParse({ channel_id: 'UCx', channel_name: 'X', email: 'not-an-email' }).success).toBe(false);
    });

    it('builds a Gmail compose link with the address in To', () => {
        const url = new URL(gmailComposeUrl('host@example.com', 'Hello'));
        expect(url.hostname).toBe('mail.google.com');
        expect(url.searchParams.get('view')).toBe('cm');
        expect(url.searchParams.get('to')).toBe('host@example.com');
        expect(url.searchParams.get('su')).toBe('Hello');
    });
});
