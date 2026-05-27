# DISCOVERY: Content & Marketing Strategy

> Phase 0 | BMAD Discovery | Type A Development Project
> Date: 2026-05-27
> Context: 14 sprints of product built. Zero marketing. Time to drive traffic.

## Problem Statement

Project Profound has extraordinary substance — 7 immersive 3D visualizations, 2,000+ analyzed UAP videos, 500+ NDE videos, rich channel analytics, AI chat, semantic search — but near-zero organic traffic. We've been building in a vacuum. The product is ready to show off. Now we need to get it in front of people.

## What We Have (Marketing Assets Inventory)

### Unique, Shareable Content
| Asset | URL | Viral Potential |
|-------|-----|-----------------|
| 7 interactive 3D visualizations | `/visualize/*` | 🔥🔥🔥 — nothing like this exists |
| UAP Timeline Helix (350 years, 2,241 encounters) | `/visualize/uap-timeline` | 🔥🔥🔥 |
| Global Encounter Map (3D globe) | `/visualize/geography` | 🔥🔥🔥 |
| UAP Intelligence Network (people/programs/orgs graph) | `/visualize/uap-intelligence` | 🔥🔥 |
| Channel Constellation (scatter plot of 40+ channels) | `/visualize/channel-constellation` | 🔥🔥 |
| NDE Element Co-occurrence Network | `/visualize/nde-elements` | 🔥🔥 |
| Hynek Classification Space | `/visualize/hynek-space` | 🔥🔥 |
| UAP Phenomenology Network | `/visualize/uap-phenomenology` | 🔥🔥 |
| Channel Authority Scorecards (letter grades, radar charts) | `/uap/channels/[handle]` | 🔥🔥 — channel owners will share |
| OG image generation for channels | `/api/og/channel/[id]` | 🔥 — auto-generates social cards |
| Embeddable channel badges | `/api/badge/channel/[id]` | 🔥 — YouTube description embeds |
| AI-generated blog articles (NDE + UAP) | `/blog/*` | 🔥 — SEO long-tail |
| Cross-domain research page | `/research/cross-domain` | 🔥🔥 — unique academic angle |

### Infrastructure Already Built
- ✅ Newsletter system (NDE + UAP tracks, Resend integration)
- ✅ Email broadcast composer with campaign history
- ✅ Blog article generation pipeline (daily cron)
- ✅ OG image generation for social sharing
- ✅ Embeddable badge system
- ✅ JSON-LD structured data on all pages
- ✅ Sitemap with all dynamic routes

### What's Missing
- ❌ Social media accounts (Twitter/X, Reddit, YouTube, TikTok)
- ❌ Social sharing buttons on pages
- ❌ Screenshot/video capture of 3D visualizations for social posts
- ❌ Landing pages optimized for specific audiences
- ❌ Analytics (we can't measure what we don't track)
- ❌ Community (Discord, Reddit presence)
- ❌ Outreach to channel owners whose data we analyze

## Target Audiences

### Primary: UAP/UFO Community
- **Size:** Massive and growing. r/UFOs has 1.9M members. UAP Twitter is very active.
- **Why they'd care:** We have the most sophisticated analysis of UAP YouTube content anywhere. Channel scorecards, intelligence networks, encounter databases.
- **Hook:** "We analyzed 2,000+ UAP videos with AI and mapped the entire intelligence network"
- **Channels:** Reddit (r/UFOs, r/aliens, r/highstrangeness), Twitter/X, YouTube comments

### Secondary: NDE/Consciousness Community
- **Size:** Smaller but deeply engaged. r/NDE has 75K members. IANDS has strong community.
- **Why they'd care:** Searchable NDE archive, element co-occurrence analysis, AI chat grounded in real experiences
- **Hook:** "Search 500+ near-death experiences by what people saw, felt, and learned"
- **Channels:** Reddit (r/NDE, r/afterlife), IANDS forums, Facebook groups

### Tertiary: Data Visualization / Tech Community
- **Size:** Huge. r/dataisbeautiful has 22M members.
- **Why they'd care:** The 3D visualizations are genuinely impressive technical work
- **Hook:** "I built 7 interactive 3D data visualizations from 2,000+ UAP encounter reports"
- **Channels:** Reddit (r/dataisbeautiful, r/InternetIsBeautiful, r/webdev), Hacker News, Product Hunt

### Quaternary: Channel Owners
- **Size:** ~40 channels we analyze
- **Why they'd care:** Free analytics dashboard for their content. Authority grade. Competitive positioning.
- **Hook:** "We gave your channel an A+ Authority rating — here's your analytics page"
- **Channels:** Direct YouTube comments, email, Twitter DMs

## Strategy Options

### Option A: "Viral Viz Launch" (Recommended)
Focus on the visualizations as the viral hook. One big splash post, then sustained content.

**Week 1: Prepare**
- Create screen recordings / GIFs of each visualization
- Write compelling copy for each platform
- Set up Twitter/X account for Project Profound
- Add social sharing buttons to viz pages
- Add analytics (Vercel Analytics or Plausible)

**Week 2: Launch**
- Post to r/dataisbeautiful with the globe or timeline
- Post to r/UFOs with the intelligence network
- Post to r/NDE with the element network
- Cross-post to Twitter/X with video clips
- Submit to Hacker News and Product Hunt

**Week 3+: Sustain**
- Daily "UAP Fact" posts generated from our data
- Weekly newsletter with insights
- Direct outreach to channel owners (show them their scorecard)
- Blog SEO starts compounding

### Option B: "Channel Owner Outreach First"
Contact the 40 channel owners directly. Show them their free analytics page. Ask them to share with their audience.

**Pros:** Each channel owner has an existing audience (some with 100K+ subscribers). If even 5 share, that's significant traffic.
**Cons:** Slower. Requires manual effort per channel. Some may not respond.

### Option C: "SEO Grind"
Focus on blog content and long-tail keywords. Let organic search build over 3-6 months.

**Pros:** Sustainable, compounding.
**Cons:** Slow. Months before meaningful traffic.

## Open Questions

> [!IMPORTANT]
> 1. **Which platforms do you already have accounts on?** (Twitter/X, Reddit, YouTube, etc.)
> 2. **Are you comfortable being the face/voice?** Or should the brand be faceless?
> 3. **Budget for analytics?** Vercel Analytics ($0-25/mo) vs Plausible ($9/mo) vs free (Umami self-hosted)
> 4. **Which option resonates?** A (viral viz launch), B (channel outreach), C (SEO grind), or a mix?
> 5. **Any content you've already been creating?** (Twitter posts, Reddit comments, etc.)

## What We Can Build Right Now (Technical)

These are features that directly support marketing, buildable in 1-2 sprints:

1. **Social sharing buttons** on all viz pages + blog posts + channel pages
2. **"Fact of the Day" API** — endpoint that returns a random compelling data point for social posting
3. **Viz screenshot/recording tool** — capture stills of 3D visualizations for social media
4. **Analytics integration** — Vercel Analytics or Plausible
5. **Social meta optimization** — ensure every page has compelling OG cards
6. **Reddit-friendly embed pages** — lightweight versions of viz pages that load fast in Reddit's in-app browser
7. **"Share Your Channel Grade" flow** — one-click social sharing from channel pages

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Reddit self-promotion rules | Post removed | Use valuable-content-first framing, not "check out my site" |
| UAP community skepticism | Backlash | Lead with data and methodology, not hype |
| Channel owners upset about grades | Reputation damage | Transparent methodology page, opt-out option |
| Traffic spike crashes site | Lost opportunity | Verify Firebase App Hosting auto-scaling config |
| Content goes viral but product has bugs | First impressions | Do a QA pass on all viz pages before launch |
