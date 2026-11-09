'use client';

/**
 * Resumable (TUS) upload straight from the browser to the private
 * story-media bucket, using the signed-in user's own token. Files never pass
 * through the Next.js server (Cloud Run caps request bodies at ~32 MB).
 * Supabase requires 6 MB chunks for resumable uploads.
 */
import * as tus from 'tus-js-client';
import { createClient } from '@/lib/supabase/client';

export const MEDIA_BUCKET = 'story-media';

export function uploadToStory(args: {
    file: Blob;
    objectName: string;
    contentType: string;
    onProgress: (fraction: number) => void;
}): { promise: Promise<void>; abort: () => void } {
    const supabase = createClient();
    let upload: tus.Upload | null = null;

    const promise = new Promise<void>((resolve, reject) => {
        upload = new tus.Upload(args.file, {
            endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
            chunkSize: 6 * 1024 * 1024,
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: {
                bucketName: MEDIA_BUCKET,
                objectName: args.objectName,
                contentType: args.contentType,
                cacheControl: '3600',
            },
            headers: { 'x-upsert': 'false' },
            // Long uploads outlive an access token: fetch a fresh one per request.
            onBeforeRequest: async (req) => {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                if (token) req.setHeader('authorization', `Bearer ${token}`);
            },
            onError: (err) => reject(err),
            onProgress: (sent, total) => args.onProgress(total ? sent / total : 0),
            onSuccess: () => resolve(),
        });
        upload
            .findPreviousUploads()
            .then((previous) => {
                if (previous.length) upload!.resumeFromPreviousUpload(previous[0]);
                upload!.start();
            })
            .catch(reject);
    });

    return { promise, abort: () => void upload?.abort(true) };
}

export function extensionFor(mime: string, fallbackName = ''): string {
    const fromName = fallbackName.includes('.') ? fallbackName.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    if (fromName && fromName.length <= 5) return fromName;
    const base = mime.split(';')[0];
    const map: Record<string, string> = {
        'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a',
        'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'video/webm': 'webm', 'video/mp4': 'mp4',
        'video/quicktime': 'mov', 'video/x-m4v': 'm4v', 'text/plain': 'txt', 'text/markdown': 'md', 'application/pdf': 'pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    return map[base] ?? 'bin';
}

export function randomFileName(ext: string): string {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return `${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}.${ext}`;
}
