# PRD: Share Your Experience (Project Profound)

**Status:** v0.3, **approved by Tom 2026-11-09** (gate skipped). Next phase: ARCHITECTURE (`ARCHITECTURE-SHARE-YOUR-EXPERIENCE.md`).
**Replaces:** `PRD-EXPERIENCE-REGISTRY.md` (v0.1), which is kept for reference only.
**Product:** Project Profound (projectprofound.org), a Type A product.
**Author:** Tom Wood, drafted with Claude.

> ✅ **Phase gate:** no DISCOVERY doc; Tom chose "skip gate" on 2026-11-09.

> 🔒 **Public repo.** No partner-internal material, and no channel-owner contact data, goes in this repo.

---

## 1. The idea in one paragraph

Experiencers (NDE, STE, UAP/contact and similar) sign in and share their story by **typing, recording audio or video in the browser, or uploading** a text, audio or video file. **Everything shared is public**, on the PP website and the PP YouTube channel. The only things a person can keep private are **their name** (by choosing Anonymous) and **their contact information**, which is never shown publicly. Separately, experiencers can opt in to being **introduced to YouTube channels** that PP has vetted. Channel owners get access by invitation only, and every contact goes through PP.

## 2. Principles

1. **Easy first.** Sharing should feel like leaving a voice note, not filling in a form.
2. **Public means public.** Sharing a story publishes it. We say so plainly, more than once.
3. **Name and contact are the only private things.** Contact info is never public, ever.
4. **PP is always in the middle.** Channels never get an experiencer's contact details directly in V1.
5. **Simplest thing that works.** No research platform, no identity vault, no consent matrix.

## 3. Users

| User | Wants |
|---|---|
| **Experiencer, named** | To be heard and credited; maybe get invited onto shows |
| **Experiencer, anonymous** | To share the story without anyone knowing it's them |
| **Channel member** (vetted YouTube channel owner) | To find guests with relevant experiences |
| **Admin** (Tom) | To keep the site safe, invite channels, remove problems fast |

## 4. Flow

```mermaid
flowchart TD
    A[/share] --> B[Sign in: Google or email link]
    B --> C[Confirm 18+ and accept the Experiencer Agreement]
    C --> D{Show my name?}
    D -->|Named| E{How do you want to share?}
    D -->|Anonymous| E2{How do you want to share?}
    E --> T[Type] & AU[Record or upload audio] & V[Record or upload video] & F[Upload a text file]
    E2 --> T2[Type] & AU2[Record or upload audio]
    T & AU & V & F & T2 & AU2 --> P[Preview: re-take or delete freely, nothing is stored until you submit]
    P --> I{Open to introductions from channels?}
    I -->|No| S[Submit]
    I -->|Yes: all channels or choose| S
    S --> X{Crisis detection}
    X -->|clear| W[Published on the website immediately]
    X -->|flagged| H[Held for admin review; support resources shown at once]
    H --> W
    W --> Y[Queued for the daily YouTube batch]
```

## 5. V1 features and acceptance criteria

### 5.1 Sign-in and agreement
- **F1. Sign-in required to share.** Reuse the existing Supabase Auth (Google and email link already exist in `src/app/login/page.tsx`). Give `/share` a calmer sign-in screen of its own.
- **F2. Age gate:** a "I am 18 or older" checkbox. *AC:* no one can submit without it.
- **F3. Experiencer Agreement**, versioned. We store which version each person accepted and when. Its required contents are in §7.

### 5.2 Identity
- **F4. Two choices: Named or Anonymous.**
  - *Named:* the display name appears on the website, YouTube and the channel directory.
  - *Anonymous:* shown as "Anonymous #NNN". A person can switch to Named later. Switching back to Anonymous takes down the named version.
- **F5. Contact information** (the account email, plus optional phone or website) is visible only to admins. *AC:* no public page, API response, directory view or export ever includes it, and a test proves this.
- **F6. Anonymous sharers use text or audio only.** Their real voice is transcribed and **never published**. PP publishes the text, plus a narrated version using a synthetic voice and AI imagery (reusing `src/lib/pipeline/experience-tts.ts` and `experience-image.ts`).

### 5.3 Sharing a story
- **F7. Four ways to share:** type; record audio in the browser; record video in the browser (Named only); upload text (`.txt .md .pdf .docx`, max about 10 MB), audio or video.
- **F8. Re-takes stay in the browser.** A recording stays on the person's device until they press "Use this one". Discarded takes never reach PP. *AC:* no upload request happens before that button is pressed.
- **F9. Long-video guidance.** When someone chooses browser video, the screen says: "For recordings longer than a few minutes, recording with your phone's camera app and uploading the file is more reliable."
- **F10. Direct upload to private storage.** Files go straight from the browser to a new **private** Supabase Storage bucket via resumable (TUS) upload (Uppy). They never pass through the Next.js server, which has a ~32 MB request cap. Uploaded text files are shown only as extracted text, never served as the original file.
- **F11. Transcription** of all audio and video (AssemblyAI). The transcript is published alongside the media and powers search and the directory summary.
- **F12. Basic story details:** experience type (NDE, STE, UAP/contact, other), rough year, country, language, a title, and optional "open to appearing on camera / audio only".

### 5.4 Publishing
- **F12a. Editor suggestions.** Once the text exists (typed, uploaded or transcribed), the latest Gemini Pro model suggests light edits (paragraphs, typos, a title), shown section by section. The experiencer accepts or rejects each one. Experiencers can edit their text again after publishing, which republishes it.
- **F13. Website: publish immediately** at `/experiences/[slug]`, tagged "Shared directly with Project Profound". Named stories also appear on the person's `/experiencer/[slug]` page.
- **F14. Crisis hold.** Run `src/lib/questions/crisis-detection.ts` on the final text. If it triggers, show support resources to the person at once and **set the story aside for editing**. Gemini drafts a version with crisis wording softened (e.g. "suicide"); an admin approves or adjusts it, then it publishes. Held stories never go to YouTube unedited. The person is told their story will appear after a check.
- **F15. YouTube: daily batch.** Published stories are queued and posted to the PP YouTube channel once a day, so a bad one can be pulled before upload.
- **F16. Removal.** The experiencer can delete their story from "My stories" at any time; this is a **full delete** of the media, transcript and text. Admins can remove any story. *AC:* website removal is immediate, and the YouTube video is removed within 24 hours.

### 5.5 Channel introductions
- **F17. Opt-in at submit:** "Open to introductions from channels?" No / Yes, all channels / Yes, these channels (searchable list of PP's channels).
- **F18. Invite-only channel access.** Tom talks to the channel owner first. Then, in `/admin`, he enters their email and links their channel(s), and the system sends a single-use invite link (expires in 7 days, works only for that email) that signs them in through the existing email-link sign-in and grants a `channel_member` role. Access can be revoked. A paid route can grant the same role later.
- **F19. Directory** for channel members only. Each entry shows: display name or "Anonymous #NNN", experience type, a 2–3 sentence summary, country (region only if anonymous), language, on-camera or audio-only preference, and a link to the public story. **No contact details.** Only experiencers who opted in to that channel appear.
- **F20. Introduction request.** A channel member clicks "Request an introduction" and adds a short note. PP emails the experiencer (via Resend, with open tracking). If they say yes, PP sends one email (from an @projectprofound.org address) to both people with each other's contact details, **and PP is then out of the loop**. If they say no, the channel is told politely, with no reason given. *AC:* the channel member never sees contact details unless the experiencer says yes.

### 5.6 Admin
- **F21. `/admin/stories`:** list, view, remove, release crisis holds, pull an item from the YouTube queue.
- **F22. `/admin/channels`:** send, resend and revoke invites; see introduction requests and their status.

## 6. Who sees what

| | Public (website + YouTube) | Channel members | Admins |
|---|---|---|---|
| Story text, transcript, media | ✅ (anonymous: text + synthetic narration only) | ✅ via public link | ✅ |
| Display name | Named only | Named only | ✅ |
| Contact info | ❌ never | ❌ unless the experiencer accepts an introduction | ✅ |
| Anonymous person's real voice recording | ❌ | ❌ | ✅ (see Q4) |

## 7. The Experiencer Agreement must say, in plain words

1. **Sharing is public.** Your story will appear on projectprofound.org **and the Project Profound YouTube channel**, and may be quoted in PP's other channels.
2. **What stays private:** your name if you choose Anonymous, and your contact details, always.
3. **Where your data is stored:** Supabase, in the **United States**, for all users worldwide. Name the outside services that process it: AssemblyAI (transcription), Google Gemini (editor suggestions, summaries), the image and narration services, YouTube, and Resend (email, including **open tracking on introduction emails**). Say whether each is used for training (no) and how long each keeps data.
4. **Your story may be described as health or spiritual experience**, which some laws treat as sensitive. You're choosing to make it public.
5. **Removal:** you can delete your story at any time. We take it off the website immediately and off YouTube within 24 hours. **We cannot recall copies others have already downloaded or reshared.**
6. **Introductions:** if you opt in, vetted channels can see your directory entry (no contact details) and ask PP for an introduction, which you can accept or decline.
7. **You're 18 or older**, and the story is your own experience.
8. **Licence:** you keep ownership, and grant PP a non-exclusive licence to publish, transcribe, lightly format, narrate (if anonymous) and post it.
9. **Agreement version and date**, and how we'll ask again if the terms change (for example, before sharing with new partners).

*Legal review: done in-house by Tom/PP before launch.*

## 8. Technical notes (for ARCHITECTURE)

- **Reuse:** Supabase Auth (Google + email link), `profiles.role`, Resend + templates (`src/lib/email/`), `crisis-detection.ts`, the narration and image pipeline, the embeddings pipeline (`text-embedding-3-small`) for public stories, and the async job pattern in `src/app/api/intake/`.
- **New:** a private storage bucket and its access rules, story tables, a `channel_member` role with a channel link, an invites table, an introductions table, a YouTube upload queue (YouTube Data API OAuth for the PP channel), and an agreement-version record.
- **Shared database:** staging and production share one Supabase database. Every new table, bucket and policy is a production change that Tom runs. During development, staging must not write real submissions; how to keep it from doing so is decided in ARCHITECTURE.
- **Cost (estimated 2026-11-09):** Supabase Storage + AssemblyAI ≈ $2/month at 50 submissions, ≈ $65–90/month at 1,000/month after a year. If costs grow, ask channels to support PP. Details: research notes (not in repo).
- **Browser recording:** detect format with `MediaRecorder.isTypeSupported()` (Safari < 18.4 is MP4 only); set the bitrate explicitly; iOS stops recording when the tab is backgrounded.

## 9. Later (not V1)

- **V1.5:** if the daily YouTube batch is too much to build in V1, it moves here; experiencers pitching channels directly; a paid channel subscription.
- **Later:** sharing with partner organisations (NDERF, IANDS, others), which needs **fresh consent** from earlier sharers; researcher datasets; multilingual UI; video for anonymous sharers.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Harmful or crisis content goes public instantly | Crisis hold (F14); daily YouTube batch (F15); fast admin removal (F21) |
| Anonymous person identifies themselves in their own text | Agreement and on-screen tip ("avoid names of people, places and hospitals"); admin removal |
| Third parties named or defamed | Admin removal; agreement terms |
| Channel members misuse the directory | Invite-only; revocable; no contact details; every introduction logged |
| Shared staging/production database | Tom runs all migrations; no real submissions on staging |
| Spam submissions | Sign-in required; rate limit per account |
| Storage cost growth | Monitor monthly; ask channels to support PP |

## 11. Decisions on the v0.2 open questions (2026-11-09)

1. **Legal:** PP does its own review. All countries accepted; the agreement says clearly that data, including video, is stored on US servers.
2. **URLs:** `/share` to submit; stories at `/experiences/[slug]`; named stories also listed on `/experiencer/[slug]`.
3. **Editing:** experiencers can edit their text after publishing.
4. **Deletion:** a full delete of the audio, video, transcript and text.
5. **Formatting:** Gemini Pro (latest) editor suggestions, accepted or rejected section by section (F12a).
6. **Synthetic narration:** a free or cheap option. Short Maker's approach (open-source Chatterbox on GitHub Actions) is the first candidate; the existing ElevenLabs code is the fallback. Decided in ARCHITECTURE.
7. **Crisis stories:** set aside for editing; AI drafts the softened version and an admin approves it (F14).
8. **Channel code of conduct:** yes.
9. **Introductions:** sent from an @projectprofound.org address; PP steps out after the introduction.
10. **Storage:** same database, new tables.
11. **Open tracking:** disclosed in the agreement.
