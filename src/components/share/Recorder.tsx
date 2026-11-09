'use client';

/**
 * In-browser audio/video recorder. Takes stay in this browser tab until the
 * person presses "Use this recording" — discarded takes never reach PP.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, Video, Square, RotateCcw, Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VIDEO_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a', 'video/mp4'];
const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickMimeType(kind: 'audio' | 'video'): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    return (kind === 'video' ? VIDEO_TYPES : AUDIO_TYPES).find((t) => MediaRecorder.isTypeSupported(t));
}

function fmt(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface RecordingResult {
    blob: Blob;
    mime: string;
    seconds: number;
}

export default function Recorder({ kind, onUse }: { kind: 'audio' | 'video'; onUse: (r: RecordingResult) => void }) {
    const [state, setState] = useState<'idle' | 'recording' | 'preview'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const resultRef = useRef<RecordingResult | null>(null);
    const liveRef = useRef<HTMLVideoElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const secondsRef = useRef(0);
    const previewUrlRef = useRef<string | null>(null);

    useEffect(() => () => stopEverything(), []);

    function stopEverything() {
        if (timerRef.current) clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }

    async function start() {
        setError(null);
        const mimeType = pickMimeType(kind);
        if (!mimeType) {
            setError('This browser cannot record. Please record with your phone or computer and upload the file instead.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia(
                kind === 'video' ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } } : { audio: true },
            );
            streamRef.current = stream;
            if (kind === 'video' && liveRef.current) {
                liveRef.current.srcObject = stream;
                await liveRef.current.play().catch(() => undefined);
            }
            const recorder = new MediaRecorder(stream, {
                mimeType,
                ...(kind === 'video' ? { videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 128_000 } : { audioBitsPerSecond: 96_000 }),
            });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
            recorder.onstop = () => {
                const mime = recorder.mimeType || mimeType;
                const blob = new Blob(chunksRef.current, { type: mime });
                if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = URL.createObjectURL(blob);
                setPreviewUrl(previewUrlRef.current);
                resultRef.current = { blob, mime, seconds: secondsRef.current };
                stopEverything();
                setState('preview');
            };
            recorder.start(1000);
            recorderRef.current = recorder;
            secondsRef.current = 0;
            setSeconds(0);
            timerRef.current = setInterval(() => {
                secondsRef.current += 1;
                setSeconds(secondsRef.current);
            }, 1000);
            setState('recording');
        } catch {
            setError(kind === 'video' ? 'We could not use your camera and microphone. Please allow access, or upload a file instead.' : 'We could not use your microphone. Please allow access, or upload a file instead.');
            stopEverything();
        }
    }

    function stop() {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    }

    function retake() {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
        setPreviewUrl(null);
        resultRef.current = null;
        setSeconds(0);
        setState('idle');
    }

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            {kind === 'video' && (
                <video
                    ref={liveRef}
                    muted
                    playsInline
                    className={`w-full rounded-lg bg-black aspect-video ${state === 'recording' ? '' : 'hidden'}`}
                />
            )}
            {state === 'preview' && previewUrl && (
                kind === 'video' ? (
                    <video src={previewUrl} controls playsInline className="w-full rounded-lg bg-black aspect-video" />
                ) : (
                    <audio src={previewUrl} controls className="w-full" />
                )
            )}

            <div className="flex flex-wrap items-center gap-3">
                {state === 'idle' && (
                    <Button type="button" onClick={start} className="gap-2">
                        {kind === 'video' ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />} Start recording
                    </Button>
                )}
                {state === 'recording' && (
                    <>
                        <span className="flex items-center gap-2 text-red-600 font-medium">
                            <Circle className="h-3 w-3 fill-red-600 animate-pulse" /> Recording {fmt(seconds)}
                        </span>
                        <Button type="button" variant="outline" onClick={stop} className="gap-2">
                            <Square className="h-4 w-4" /> Stop
                        </Button>
                    </>
                )}
                {state === 'preview' && (
                    <>
                        <span className="text-sm text-slate-500">Take length {fmt(seconds)}. Nothing has been sent yet.</span>
                        <Button type="button" variant="outline" onClick={retake} className="gap-2">
                            <RotateCcw className="h-4 w-4" /> Delete and record again
                        </Button>
                        <Button type="button" onClick={() => resultRef.current && onUse(resultRef.current)} className="gap-2">
                            <Check className="h-4 w-4" /> Use this recording
                        </Button>
                    </>
                )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
