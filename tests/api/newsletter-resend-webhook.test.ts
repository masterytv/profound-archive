/**
 * POST /api/email/resend-webhook: only a signed Resend event is acted on, and an unsubscribe from a broadcast
 * switches off every list that address is on in quiz_leads (the drips too).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({ verify: vi.fn(), update: vi.fn(), inArg: vi.fn() }));

vi.mock('@/lib/email/resend', () => ({ resend: { webhooks: { verify: h.verify } } }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: (v: unknown) => {
        h.update(v);
        return {
          in: (col: string, vals: string[]) => {
            h.inArg(col, vals);
            return { eq: () => ({ select: async () => ({ data: [{ id: 1 }, { id: 2 }], error: null }) }) };
          },
        };
      },
    })),
  })),
}));

import { POST } from '@/app/api/email/resend-webhook/route';

const req = () => new NextRequest('https://projectprofound.org/api/email/resend-webhook', { method: 'POST', body: '{}' });

describe('Resend webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test';
  });

  it('refuses an unsigned or forged event', async () => {
    h.verify.mockImplementation(() => { throw new Error('bad signature'); });
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(h.update).not.toHaveBeenCalled();
  });

  it('switches off every list for someone who unsubscribed from a broadcast', async () => {
    h.verify.mockReturnValue({ type: 'contact.updated', data: { email: 'Ann@Example.com', unsubscribed: true } });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(h.update).toHaveBeenCalledWith({ is_active: false });
    expect(h.inArg).toHaveBeenCalledWith('email', ['Ann@Example.com', 'ann@example.com']);
    expect(await res.json()).toMatchObject({ ok: true, lists: 2 });
  });

  it('ignores other events, and a contact who is still subscribed', async () => {
    h.verify.mockReturnValue({ type: 'contact.deleted', data: { email: 'a@b.c', unsubscribed: true } });
    expect((await POST(req())).status).toBe(200);
    h.verify.mockReturnValue({ type: 'contact.updated', data: { email: 'a@b.c', unsubscribed: false } });
    expect((await POST(req())).status).toBe(200);
    expect(h.update).not.toHaveBeenCalled();
  });

  it('does nothing until the secret is set', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    expect((await POST(req())).status).toBe(503);
  });
});
