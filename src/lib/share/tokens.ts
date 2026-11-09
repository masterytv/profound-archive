import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** 256-bit random token, URL-safe. Only its hash is ever stored. */
export function newToken(): string {
    return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Constant-time compare of two hex hashes. */
export function sameHash(a: string, b: string): boolean {
    const ab = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Short random slug suffix (lowercase base36, 8 chars). */
export function randomSlugSuffix(): string {
    return BigInt('0x' + randomBytes(6).toString('hex')).toString(36).padStart(8, '0').slice(-8);
}
