'use client';

/**
 * In-browser audio/video recorder.
 *
 * Flow (Tom, 2026-11-09): allowing the camera/microphone does NOT start
 * recording. The person sees a live preview (or a level meter for audio) and
 * presses Record when ready, can Pause / Resume, and Stop. Takes stay in this
 * browser tab until they press "Use this recording": discarded takes never
 * reach PP.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, Video, Square, RotateCcw, Check, Circle, Pause, Play } from 'lucide-react';
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

type State = 'off' | 'ready' | 'recording' | 'paused' | 'preview';

export default function Recorder({ kind, onUse }: { kind: 'audio' | 'video'; onUse: (r: RecordingResult) => void }) {
    const [state, setState] = useState<State>('off');
    const [error, setError] = useState<string | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [level, setLevel] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const resultRef = useRef<RecordingResult | null>(null);
    const liveRef = useRef<HTMLVideoElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const secondsRef = useRef(0);
    const previewUrlRef = useRef<string | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => () => {
        stopTimer();
        releaseDevices();
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    }, []);

    // Attach the live camera to the preview element whenever it is on screen.
    useEffect(() => {
        if (kind === 'video' && liveRef.current && streamRef.current && (state === 'ready' || state === 'recording' || state === 'paused')) {
            if (liveRef.current.srcObject !== streamRef.current) {
                liveRef.current.srcObject = streamRef.current;
                void liveRef.current.play().catch(() => undefined);
            }
        }
    }, [kind, state]);

    function stopTimer() {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    }

    function startTimer() {
        stopTimer();
        timerRef.current = setInterval(() => {
            secondsRef.current += 1;
            setSeconds(secondsRef.current);
        }, 1000);
    }

    function releaseDevices() {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        void audioCtxRef.current?.close().catch(() => undefined);
        audioCtxRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }

    /** A simple input-level meter so people can see the microphone works before recording. */
    function startLevelMeter(stream: MediaStream) {
        try {
            const ctx = new AudioContext();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            ctx.createMediaStreamSource(stream).connect(analyser);
            audioCtxRef.current = ctx;
            const data = new Uint8Array(analyser.fftSize);
            const tick = () => {
                analyser.getByteTimeDomainData(data);
                let peak = 0;
                for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
                setLevel(Math.min(1, peak / 64));
                rafRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch {
            /* the meter is optional */
        }
    }

    /** Step 1: ask for the camera/microphone and show a preview. Nothing is recorded yet. */
    async function turnOn() {
        setError(null);
        if (!pickMimeType(kind)) {
            setError('This browser cannot record. Please record with your phone or computer and upload the file instead.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia(
                kind === 'video' ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } } : { audio: true },
            );
            streamRef.current = stream;
            startLevelMeter(stream);
            setState('ready');
        } catch {
            setError(
                kind === 'video'
                    ? 'We could not use your camera and microphone. Please allow access in your browser (the camera icon in the address bar), or upload a file instead.'
                    : 'We could not use your microphone. Please allow access in your browser (the microphone icon in the address bar), or upload a file instead.',
            );
            releaseDevices();
        }
    }

    /** Step 2: the person is ready. */
    function record() {
        const stream = streamRef.current;
        const mimeType = pickMimeType(kind);
        if (!stream || !mimeType) return;
        const recorder = new MediaRecorder(stream, {
            mimeType,
            ...(kind === 'video' ? { videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 128_000 } : { audioBitsPerSecond: 96_000 }),
        });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            const mime = recorder.mimeType || mimeType;
            const blob = new Blob(chunksRef.current, { type: mime });
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = URL.createObjectURL(blob);
            setPreviewUrl(previewUrlRef.current);
            resultRef.current = { blob, mime, seconds: secondsRef.current };
            releaseDevices();
            setState('preview');
        };
        recorder.start(1000);
        recorderRef.current = recorder;
        secondsRef.current = 0;
        setSeconds(0);
        startTimer();
        setState('recording');
    }

    function pause() {
        if (recorderRef.current?.state === 'recording') {
            recorderRef.current.pause();
            stopTimer();
            setState('paused');
        }
    }

    function resume() {
        if (recorderRef.current?.state === 'paused') {
            recorderRef.current.resume();
            startTimer();
            setState('recording');
        }
    }

    function stop() {
        stopTimer();
        const r = recorderRef.current;
        if (r && (r.state === 'recording' || r.state === 'paused')) r.stop();
    }

    /** Throw the take away and go back to "ready" (asks for the devices again). */
    async function retake() {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
        setPreviewUrl(null);
        resultRef.current = null;
        setSeconds(0);
        await turnOn();
    }

    const live = state === 'ready' || state === 'recording' || state === 'paused';

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            {kind === 'video' && live && (
                <div className="relative">
                    <video ref={liveRef} muted playsInline className="w-full rounded-lg bg-black aspect-video -scale-x-100" />
                    {state === 'ready' && (
                        <span className="absolute top-3 left-3 rounded-full bg-black/60 text-white text-xs px-3 py-1">Preview: not recording yet</span>
                    )}
                </div>
            )}
            {kind === 'audio' && live && (
                <div className="space-y-1">
                    <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" aria-label="Microphone level">
                        <div className="h-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
                    </div>
                    {state === 'ready' && <p className="text-xs text-slate-500">Say something to check your microphone. Nothing is being recorded yet.</p>}
                </div>
            )}
            {state === 'preview' && previewUrl && (
                kind === 'video' ? (
                    <video src={previewUrl} controls playsInline className="w-full rounded-lg bg-black aspect-video" />
                ) : (
                    <audio src={previewUrl} controls className="w-full" />
                )
            )}

            <div className="flex flex-wrap items-center gap-3">
                {state === 'off' && (
                    <Button type="button" onClick={turnOn} className="gap-2">
                        {kind === 'video' ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {kind === 'video' ? 'Turn on camera and microphone' : 'Turn on microphone'}
                    </Button>
                )}
                {state === 'ready' && (
                    <>
                        <Button type="button" onClick={record} className="gap-2 bg-red-600 hover:bg-red-700">
                            <Circle className="h-4 w-4 fill-white" /> Record
                        </Button>
                        <span className="text-sm text-slate-500">Take your time. Press Record when you&apos;re ready.</span>
                    </>
                )}
                {(state === 'recording' || state === 'paused') && (
                    <>
                        {state === 'recording' ? (
                            <span className="flex items-center gap-2 text-red-600 font-medium">
                                <Circle className="h-3 w-3 fill-red-600 animate-pulse" /> Recording {fmt(seconds)}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 text-amber-600 font-medium">
                                <Pause className="h-4 w-4" /> Paused at {fmt(seconds)}
                            </span>
                        )}
                        {state === 'recording' ? (
                            <Button type="button" variant="outline" onClick={pause} className="gap-2">
                                <Pause className="h-4 w-4" /> Pause
                            </Button>
                        ) : (
                            <Button type="button" variant="outline" onClick={resume} className="gap-2">
                                <Play className="h-4 w-4" /> Resume
                            </Button>
                        )}
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
