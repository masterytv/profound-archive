'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileText, Loader2, Mic, PenLine, Upload, Video, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Recorder, { type RecordingResult } from './Recorder';
import { uploadToStory, extensionFor, randomFileName } from './upload';
import {
    acceptAgreementAction,
    attachMediaAction,
    createDraftAction,
    submitStoryAction,
} from '@/app/share/actions';

export interface ChannelChoice {
    channel_id: string;
    name: string;
    vertical: 'nde' | 'uap';
}

type Method = 'type' | 'record-audio' | 'record-video' | 'upload';
type Step = 'agreement' | 'identity' | 'method' | 'details' | 'intros' | 'submit';

const EXPERIENCE_TYPES = [
    ['nde', 'Near-death experience (NDE)'],
    ['ste', 'Spiritually transformative experience (STE)'],
    ['uap', 'UAP / contact experience'],
    ['obe', 'Out-of-body experience (OBE)'],
    ['adc', 'After-death communication (ADC)'],
    ['other', 'Something else'],
] as const;

const AUDIO_EXT = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav'];
const VIDEO_EXT = ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-m4v'];
const TEXT_EXT = ['text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_MEDIA = 5 * 1024 * 1024 * 1024;
const MAX_TEXT_FILE = 10 * 1024 * 1024;

function kindForFile(file: File): 'audio' | 'video' | 'file' | null {
    const type = (file.type || '').split(';')[0];
    const name = file.name.toLowerCase();
    if (AUDIO_EXT.includes(type) || /\.(mp3|m4a|wav|ogg|aac)$/.test(name)) return 'audio';
    if (VIDEO_EXT.includes(type) || /\.(mp4|mov|m4v|webm)$/.test(name)) return 'video';
    if (TEXT_EXT.includes(type) || /\.(txt|md|pdf|docx)$/.test(name)) return 'file';
    return null;
}

function mimeForFile(file: File, kind: 'audio' | 'video' | 'file'): string {
    if (file.type) return file.type.split(';')[0];
    const ext = file.name.toLowerCase().split('.').pop();
    const map: Record<string, string> = {
        mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac',
        mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: kind === 'audio' ? 'audio/webm' : 'video/webm',
        txt: 'text/plain', md: 'text/markdown', pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return map[ext ?? ''] ?? 'application/octet-stream';
}

const box = 'rounded-xl border border-slate-200 dark:border-slate-700 p-4';
const input = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-base';
const label = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

export default function ShareWizard({ needsAgreement, channels, defaultName }: { needsAgreement: boolean; channels: ChannelChoice[]; defaultName: string }) {
    const router = useRouter();
    const steps: Step[] = needsAgreement
        ? ['agreement', 'identity', 'method', 'details', 'intros', 'submit']
        : ['identity', 'method', 'details', 'intros', 'submit'];
    const [stepIndex, setStepIndex] = useState(0);
    const step = steps[stepIndex];

    // Agreement
    const [ageOk, setAgeOk] = useState(false);
    const [agreed, setAgreed] = useState(false);

    // Identity
    const [mode, setMode] = useState<'named' | 'anonymous'>('named');
    const [displayName, setDisplayName] = useState(defaultName);
    const [shownName, setShownName] = useState('');

    // Method + content
    const [method, setMethod] = useState<Method | null>(null);
    const [text, setText] = useState('');
    const [recording, setRecording] = useState<RecordingResult | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    // Details
    const [experienceType, setExperienceType] = useState('nde');
    const [title, setTitle] = useState('');
    const [year, setYear] = useState('');
    const [country, setCountry] = useState('');
    const [region, setRegion] = useState('');
    const [language, setLanguage] = useState('en');
    const [appearance, setAppearance] = useState<'camera' | 'audio_only' | 'none'>('none');

    // Intros
    const [introMode, setIntroMode] = useState<'none' | 'all' | 'selected'>('none');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [channelQuery, setChannelQuery] = useState('');

    // Submit
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
    const fileKind = file ? kindForFile(file) : null;

    const mediaKind: 'text' | 'audio' | 'video' | 'file' | null =
        method === 'type' ? 'text' : method === 'record-audio' ? 'audio' : method === 'record-video' ? 'video' : method === 'upload' ? fileKind : null;

    const contentReady =
        (method === 'type' && words >= 5) ||
        ((method === 'record-audio' || method === 'record-video') && recording !== null) ||
        (method === 'upload' && file !== null && fileKind !== null && !fileError);

    const filteredChannels = useMemo(() => {
        const q = channelQuery.trim().toLowerCase();
        return q ? channels.filter((c) => c.name.toLowerCase().includes(q)) : channels;
    }, [channels, channelQuery]);

    function next() {
        setError(null);
        setStepIndex((i) => Math.min(i + 1, steps.length - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function back() {
        setError(null);
        setStepIndex((i) => Math.max(i - 1, 0));
    }

    async function acceptAgreement() {
        setBusy(true);
        const res = await acceptAgreementAction(ageOk, agreed);
        setBusy(false);
        if (!res.ok) return setError(res.error);
        next();
    }

    function chooseFile(f: File | null) {
        setFileError(null);
        setFile(f);
        if (!f) return;
        const kind = kindForFile(f);
        if (!kind) return setFileError('Please choose an audio file, a video file, or a .txt, .md, .pdf or .docx document.');
        if (kind === 'file' && f.size > MAX_TEXT_FILE) return setFileError('Documents can be up to 10 MB.');
        if (f.size > MAX_MEDIA) return setFileError('Files can be up to 5 GB.');
    }

    async function submit() {
        if (!mediaKind) return;
        setBusy(true);
        setError(null);
        try {
            const created = await createDraftAction({
                display_mode: mode,
                display_name: mode === 'named' ? displayName : shownName.trim() || null,
                experience_type: experienceType as 'nde',
                title: title || null,
                year_approx: year ? Number(year) : null,
                country: country || null,
                region: region || null,
                language,
                appearance_pref: appearance,
                media_kind: mediaKind,
                intro_mode: introMode,
                intro_channel_ids: introMode === 'selected' ? [...selected] : [],
                text: mediaKind === 'text' ? text : null,
            });
            if (!created.ok || !created.data) throw new Error(created.ok ? 'Could not save your story.' : created.error);
            const { storyId, uploadPrefix } = created.data;

            if (mediaKind !== 'text') {
                const blob: Blob = recording ? recording.blob : file!;
                const mime = recording ? recording.mime.split(';')[0] : mimeForFile(file!, mediaKind as 'audio' | 'video' | 'file');
                const objectName = `${uploadPrefix}${randomFileName(extensionFor(mime, file?.name ?? ''))}`;
                setProgress(0);
                await uploadToStory({ file: blob, objectName, contentType: mime, onProgress: setProgress }).promise;
                const attached = await attachMediaAction(storyId, objectName, mime);
                if (!attached.ok) throw new Error(attached.error);
            }

            const submitted = await submitStoryAction(storyId);
            if (!submitted.ok) throw new Error(submitted.error);
            router.push(`/share/my-stories/${storyId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Your story was not lost: please try again.');
            setBusy(false);
            setProgress(null);
        }
    }

    const stepTitle: Record<Step, string> = {
        agreement: 'Before you share',
        identity: 'Your name',
        method: 'How would you like to share?',
        details: 'A few details',
        intros: 'Introductions to channels',
        submit: 'Ready to share',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between text-sm text-slate-500">
                <span>
                    Step {stepIndex + 1} of {steps.length}
                </span>
                <div className="flex gap-1">
                    {steps.map((s, i) => (
                        <span key={s} className={`h-1.5 w-8 rounded-full ${i <= stepIndex ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                </div>
            </div>

            <h2 className="text-2xl font-serif">{stepTitle[step]}</h2>

            {step === 'agreement' && (
                <div className="space-y-4">
                    <div className={`${box} space-y-3 text-slate-700 dark:text-slate-300`}>
                        <p className="flex gap-2"><ShieldCheck className="h-5 w-5 text-indigo-500 shrink-0" /> <span><b>Sharing is public.</b> Your story will appear on projectprofound.org and on the Project Profound YouTube channel.</span></p>
                        <p>You can keep two things private: <b>your full name</b> and <b>your contact details</b>, which are never shown publicly.</p>
                        <p>Your story and any recording are stored on servers in the <b>United States</b>. You can edit your story or delete it completely at any time.</p>
                        <p>
                            Please read the full{' '}
                            <Link href="/share/agreement" target="_blank" className="text-indigo-600 underline">Experiencer Agreement</Link>{' '}
                            before continuing.
                        </p>
                    </div>
                    <label className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 h-5 w-5" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} />
                        <span>I am 18 or older.</span>
                    </label>
                    <label className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 h-5 w-5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                        <span>I have read and accept the Experiencer Agreement, and I understand that what I share will be public.</span>
                    </label>
                    <div className="flex justify-end">
                        <Button onClick={acceptAgreement} disabled={!ageOk || !agreed || busy} className="gap-2">
                            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 'identity' && (
                <div className="space-y-4">
                    <label className={`${box} flex gap-3 cursor-pointer ${mode === 'named' ? 'ring-2 ring-indigo-500' : ''}`}>
                        <input type="radio" name="mode" className="mt-1" checked={mode === 'named'} onChange={() => setMode('named')} />
                        <span>
                            <b>Share my full name</b>
                            <span className="block text-sm text-slate-500">Your name appears with your story and on your own experiencer page.</span>
                        </span>
                    </label>
                    <label className={`${box} flex gap-3 cursor-pointer ${mode === 'anonymous' ? 'ring-2 ring-indigo-500' : ''}`}>
                        <input type="radio" name="mode" className="mt-1" checked={mode === 'anonymous'} onChange={() => setMode('anonymous')} />
                        <span>
                            <b>Don&apos;t share my full name publicly</b>
                            <span className="block text-sm text-slate-500">You can show a first name, initials or a nickname instead, or nothing at all (&ldquo;Anonymous #&hellip;&rdquo;).</span>
                        </span>
                    </label>
                    {mode === 'named' ? (
                        <div>
                            <label className={label} htmlFor="displayName">Your full name</label>
                            <input id="displayName" className={input} value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Maria Lopez" />
                        </div>
                    ) : (
                        <div>
                            <label className={label} htmlFor="shownName">Name to show instead (optional)</label>
                            <input id="shownName" className={input} value={shownName} maxLength={80} onChange={(e) => setShownName(e.target.value)} placeholder="e.g. Maria, M.L., or leave blank" />
                        </div>
                    )}
                    <p className="text-sm text-slate-500 flex gap-2">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                            Your email and contact details are never shown publicly, whichever you choose.
                            {mode === 'anonymous' && ' If you share a video or a voice recording, it is published as recorded, so people may recognise your face or voice.'}
                        </span>
                    </p>
                </div>
            )}

            {step === 'method' && (
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {([
                            ['type', 'Write it', 'Type your story here.', PenLine],
                            ['record-audio', 'Record your voice', 'Speak into your microphone.', Mic],
                            ['record-video', 'Record a video', 'Use your camera.', Video],
                            ['upload', 'Upload a file', 'Audio, video or a document.', Upload],
                        ] as const).map(([value, name, hint, Icon]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => { setMethod(value as Method); setRecording(null); setFile(null); setFileError(null); }}
                                className={`${box} text-left hover:border-indigo-400 ${method === value ? 'ring-2 ring-indigo-500' : ''}`}
                            >
                                <Icon className="h-5 w-5 text-indigo-500 mb-2" />
                                <b className="block">{name}</b>
                                <span className="text-sm text-slate-500">{hint}</span>
                            </button>
                        ))}
                    </div>

                    {method === 'type' && (
                        <div className="space-y-2">
                            <p className="text-sm text-slate-500">Take your time. It may help to describe what was happening <b>before</b>, what you experienced <b>during</b>, and how it has affected you <b>after</b>. There is no minimum length.</p>
                            <textarea className={`${input} min-h-[320px] font-serif leading-relaxed`} value={text} onChange={(e) => setText(e.target.value)} placeholder="It began when…" />
                            <p className="text-xs text-slate-400 text-right">{words} words</p>
                        </div>
                    )}

                    {method === 'record-video' && (
                        <div className="space-y-3">
                            <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3 text-sm text-amber-900 dark:text-amber-200">
                                For recordings longer than a few minutes, recording with your phone&apos;s camera app and uploading the file is more reliable. Browser recordings can stop if the screen locks or you switch apps.
                            </p>
                            {recording ? <p className="text-sm text-emerald-700">Recording ready ({Math.round(recording.seconds / 60)} min). You can continue.</p> : null}
                            <Recorder kind="video" onUse={setRecording} />
                        </div>
                    )}
                    {method === 'record-audio' && (
                        <div className="space-y-3">
                            {recording ? <p className="text-sm text-emerald-700">Recording ready ({Math.round(recording.seconds / 60)} min). You can continue.</p> : null}
                            <Recorder kind="audio" onUse={setRecording} />
                        </div>
                    )}
                    {method === 'upload' && (
                        <div className={`${box} space-y-2`}>
                            <input
                                type="file"
                                accept="audio/*,video/*,.txt,.md,.pdf,.docx"
                                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
                            />
                            {file && !fileError && (
                                <p className="text-sm text-slate-500 flex gap-2 items-center">
                                    <FileText className="h-4 w-4" /> {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                </p>
                            )}
                            {fileError && <p className="text-sm text-red-600">{fileError}</p>}
                            <p className="text-xs text-slate-400">Audio and video up to 5 GB. Documents (.txt, .md, .pdf, .docx) up to 10 MB.</p>
                        </div>
                    )}
                </div>
            )}

            {step === 'details' && (
                <div className="space-y-4">
                    <div>
                        <label className={label} htmlFor="etype">What kind of experience was it?</label>
                        <select id="etype" className={input} value={experienceType} onChange={(e) => setExperienceType(e.target.value)}>
                            {EXPERIENCE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={label} htmlFor="title">Title (optional; we can suggest one)</label>
                        <input id="title" className={input} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className={label} htmlFor="year">Roughly what year? (optional)</label>
                            <input id="year" inputMode="numeric" className={input} value={year} maxLength={4} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 1998" />
                        </div>
                        <div>
                            <label className={label} htmlFor="language">Language</label>
                            <select id="language" className={input} value={language} onChange={(e) => setLanguage(e.target.value)}>
                                {[['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['pt', 'Portuguese'], ['it', 'Italian'], ['nl', 'Dutch'], ['auto', 'Other']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                        {mode === 'named' && (
                            <div>
                                <label className={label} htmlFor="country">Country (optional)</label>
                                <input id="country" className={input} value={country} maxLength={80} onChange={(e) => setCountry(e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label className={label} htmlFor="region">{mode === 'named' ? 'Region (optional)' : 'Part of the world (optional)'}</label>
                            <input id="region" className={input} value={region} maxLength={80} onChange={(e) => setRegion(e.target.value)} placeholder={mode === 'named' ? 'e.g. Pacific Northwest' : 'e.g. Western Europe'} />
                        </div>
                    </div>
                    {mode === 'anonymous' && (
                        <p className="text-sm text-slate-500">Tip: to keep your identity private, avoid naming people, towns, hospitals or employers in your story.</p>
                    )}
                </div>
            )}

            {step === 'intros' && (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300">
                        Project Profound works with YouTube channels that interview experiencers. If you&apos;re open to it, vetted channels can see a short summary of your story (never your contact details) and ask us to introduce you. You decide each time.
                    </p>
                    {(['none', 'all', 'selected'] as const).map((v) => (
                        <label key={v} className={`${box} flex gap-3 cursor-pointer ${introMode === v ? 'ring-2 ring-indigo-500' : ''}`}>
                            <input type="radio" name="intro" className="mt-1" checked={introMode === v} onChange={() => setIntroMode(v)} />
                            <span>
                                {v === 'none' && <b>No, thank you</b>}
                                {v === 'all' && <b>Yes, any channel Project Profound has vetted</b>}
                                {v === 'selected' && <b>Yes, but only channels I choose</b>}
                            </span>
                        </label>
                    ))}
                    {introMode !== 'none' && (
                        <div>
                            <label className={label}>Would you appear on camera?</label>
                            <select className={input} value={appearance} onChange={(e) => setAppearance(e.target.value as typeof appearance)}>
                                <option value="none">Not sure yet</option>
                                <option value="camera">Yes, on camera</option>
                                <option value="audio_only">Audio only</option>
                            </select>
                        </div>
                    )}
                    {introMode === 'selected' && (
                        <div className={`${box} space-y-2`}>
                            <input className={input} placeholder="Search channels" value={channelQuery} onChange={(e) => setChannelQuery(e.target.value)} />
                            <p className="text-xs text-slate-500">{selected.size} selected</p>
                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredChannels.map((c) => (
                                    <label key={c.channel_id} className="flex items-center gap-3 py-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(c.channel_id)}
                                            onChange={(e) => {
                                                const n = new Set(selected);
                                                if (e.target.checked) n.add(c.channel_id); else n.delete(c.channel_id);
                                                setSelected(n);
                                            }}
                                        />
                                        <span className="flex-1">{c.name}</span>
                                        <span className="text-xs uppercase text-slate-400">{c.vertical}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {step === 'submit' && (
                <div className="space-y-4">
                    <div className={`${box} space-y-2 text-slate-700 dark:text-slate-300`}>
                        <p><b>Shown as:</b> {mode === 'named' ? displayName : shownName.trim() || 'Anonymous #…'}</p>
                        <p><b>Shared by:</b> {mediaKind === 'text' ? 'writing' : mediaKind === 'file' ? `document (${file?.name})` : mediaKind === 'audio' ? 'audio' : 'video'}</p>
                        <p><b>Introductions:</b> {introMode === 'none' ? 'no' : introMode === 'all' ? 'any vetted channel' : `${selected.size} chosen channel(s)`}</p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Next, we {mediaKind === 'audio' || mediaKind === 'video' ? 'turn your recording into text, then ' : ''}suggest a few light edits (spelling, paragraphs, a title) for you to accept or reject. Your story is published when you finish reviewing.
                    </p>
                    {progress !== null && (
                        <div>
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Uploading… {Math.round(progress * 100)}%. Please keep this page open.</p>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <Button onClick={submit} disabled={busy} className="gap-2">
                            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Share my story
                        </Button>
                    </div>
                </div>
            )}

            {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 p-3 text-sm text-red-700">{error}</p>}

            {step !== 'agreement' && step !== 'submit' && (
                <div className="flex justify-between">
                    <Button variant="ghost" onClick={back} disabled={stepIndex === 0 || (needsAgreement && stepIndex === 1)} className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button
                        onClick={next}
                        disabled={
                            (step === 'identity' && mode === 'named' && !displayName.trim()) ||
                            (step === 'method' && !contentReady) ||
                            (step === 'intros' && introMode === 'selected' && selected.size === 0)
                        }
                        className="gap-2"
                    >
                        Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {step === 'submit' && !busy && (
                <Button variant="ghost" onClick={back} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
            )}
        </div>
    );
}
