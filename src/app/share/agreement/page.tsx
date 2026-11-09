import type { Metadata } from 'next';
import Link from 'next/link';
import { AGREEMENT_VERSION } from '@/lib/share/config';

export const metadata: Metadata = {
    title: 'Experiencer Agreement | Project Profound',
    description: 'How Project Profound publishes, stores and protects the experiences people share.',
};

/**
 * The Experiencer Agreement (PRD §7). Changing the substance of this page
 * means bumping AGREEMENT_VERSION in src/lib/share/config.ts so everyone is
 * asked to accept the new version.
 */
export default function AgreementPage() {
    return (
        <article className="max-w-2xl mx-auto px-4 py-12 prose prose-slate dark:prose-invert">
            <p className="text-sm uppercase tracking-widest text-indigo-500 not-prose">Share your experience</p>
            <h1>Experiencer Agreement</h1>
            <p className="text-sm text-slate-500">Version {AGREEMENT_VERSION}</p>

            <h2>1. Sharing is public</h2>
            <p>
                When you share your experience with Project Profound, it is <strong>published</strong>: on projectprofound.org and on the
                Project Profound YouTube channel. We may also quote it on Project Profound&apos;s other channels (for example social media or
                newsletters), always crediting it the way you chose.
            </p>
            <p>If you share a video, the video itself is published, including your face and voice.</p>

            <h2>2. What stays private</h2>
            <ul>
                <li><strong>Your name</strong>, if you choose &ldquo;Keep me anonymous&rdquo;. Your story then appears as &ldquo;Anonymous #&hellip;&rdquo;.</li>
                <li><strong>Your contact details</strong> (your email address and anything else you add) are never shown publicly, in any case.</li>
                <li>If you share anonymously with your voice, <strong>your own voice is never published</strong>. We publish the text, and a version read aloud by a synthetic (computer-generated) voice, clearly labelled as such.</li>
            </ul>
            <p>Please avoid naming people, towns, hospitals or employers if you want to stay anonymous: we can&apos;t protect details you include in the story itself.</p>

            <h2>3. Where your data is stored and who processes it</h2>
            <p>
                Your story, any recording and your account are stored with Supabase on servers in the <strong>United States</strong>, whichever
                country you live in. These services process your story for us. None of them may use it to train their AI models:
            </p>
            <ul>
                <li><strong>AssemblyAI</strong> (USA) turns audio and video into text. We delete the copy on their side as soon as the text is ready.</li>
                <li><strong>Google Gemini</strong> suggests light edits (spelling, paragraphs, a title, a short summary) that you accept or reject, and helps us edit stories that mention self-harm before they are published.</li>
                <li><strong>fal.ai</strong> creates an illustration for stories shared without video. It receives a short description, not your story or your name.</li>
                <li>A <strong>synthetic voice</strong> reads stories shared in writing, and anonymous audio stories, aloud. This runs on our own build servers (GitHub).</li>
                <li><strong>YouTube</strong> (Google) hosts the published video version.</li>
                <li><strong>Resend</strong> sends our emails. Introduction emails record whether they were opened, so we can tell a channel when a request went unanswered.</li>
            </ul>
            <p>Your experience may reveal things about your health or your spiritual or religious beliefs, which some laws treat as sensitive. By sharing it publicly you choose to make that information public.</p>

            <h2>4. Editing and safety</h2>
            <p>
                Your original words are kept. Before publishing, we suggest light edits that you accept or reject one by one. If your story
                mentions suicide or self-harm, a member of our team gently edits that wording before the story appears, and we show you
                support resources straight away.
            </p>

            <h2>5. Changing your mind</h2>
            <p>
                You can edit your story, change whether your name is shown, or <strong>delete it completely</strong> at any time from
                <Link href="/share/my-stories"> My stories</Link>. Deleting removes your recording, transcript and text from our systems. It
                disappears from the website immediately and from YouTube within 24 hours.
            </p>
            <p>
                Because your story is public, we <strong>cannot recall copies that other people have already downloaded or shared</strong>
                before you deleted it.
            </p>

            <h2>6. Introductions to channels (optional)</h2>
            <p>
                If you say yes, YouTube channels that Project Profound has personally vetted can see a short summary of your story (never your
                contact details) and ask us to introduce you. We email you each request and you accept or decline. If you accept, we send one
                email to you both with each other&apos;s contact details, and Project Profound steps out from there.
            </p>

            <h2>7. You</h2>
            <p>You confirm that you are <strong>18 or older</strong> and that the experience you share is your own.</p>

            <h2>8. Your rights in your story</h2>
            <p>
                You keep ownership of your story. You give Project Profound a free, non-exclusive, worldwide licence to publish it, transcribe
                it, lightly format it, read it aloud with a synthetic voice, illustrate it, and post it on our website, our YouTube channel and
                our other channels, until you delete it.
            </p>

            <h2>9. Changes to this agreement</h2>
            <p>
                If we change this agreement, we&apos;ll ask you to accept the new version before you share again. We will never share your story
                with new partners (for example research organisations) without asking you first.
            </p>

            <p>Questions? Email <a href="mailto:hello@projectprofound.org">hello@projectprofound.org</a>.</p>
        </article>
    );
}
