# Project Profound video topics: research and ranking

Prepared 2026-11-03 for Tom (projectprofound.org). Phase 1 of the video brief: 26 researched topics, scored and ranked, with the archive evidence behind each one. The production script for the #1 topic is in `who-meets-you-script.md` in this folder; its verified clip list is `who-meets-you-clips.csv`.

## How this was researched

- **Corpus map.** Read `research/corpus-atlas/README.md`, `ATLAS-stats.md`, `ATLAS-narrative.md`, `appendix-top-lists.md`, `appendix-syntheses.md` and `appendix-experiencers.md` first.
- **Fresh pull.** A read-only PostgREST pull on 2026-11-03 found **6,454 confirmed NDE videos** (`nde_vids.isNde = clear_nde`), up from 6,304 in the atlas (2026-09-08). Every count below that cites `nde_analysis` fields uses that pull. Counts marked "ATLAS-stats" are from the 2026-09-08 atlas.
- **Semantic search.** `scripts/corpus-atlas/retrieve.mjs` with 2-3 first-person phrasings per topic, `--k 200 --min-sim 0.50 --source moments`, deduplicated by (video, start time) and filtered to confirmed NDE videos. **Limitation found:** the RPC returns at most about 40 hits per query whatever `--k` is set to (k=50, 200 and 500 all returned 39 hits for the same query), because the HNSW index search stops at its default candidate list. So the semantic counts are a floor and look similar across topics (57-104 moments). Use them to show a pattern exists, never as prevalence.
- **Prevalence.** For scale claims I used structured fields in `nde_analysis` (core elements, entities, journey sequences, content-safety flags) and exact-phrase counts through the existing `exact_phrase_search_punctuated` RPC (Postgres `phraseto_tsquery`, English stop words dropped, so only content-word phrases are quoted).
- **Market research.** YouTube search (order by views, published since 2025-11) for each topic, comments on the two biggest breakout videos, and web searches on deathbed-vision research and "Peak in Darien" cases. View counts below were read on 2026-11-03.
- **Voice.** Read Tom's Drive docs "Writing Style and Identity", "Book Outline and Key Ideas/Stories", the origin-story essay, and the existing Video Scripts / YouTube Channel folders (notably "Video Series Ideas" and "5 Minute NDE"). Nothing from them is quoted here.

Scoring: each topic gets 1-10 on Demand, Archive strength, Emotional pull, Shareability, Uniqueness and Production ease. Weighted total = 0.25 D + 0.20 A + 0.20 E + 0.15 S + 0.10 U + 0.10 P (demand and evidence count most, because a video nobody searches for or that the archive cannot back is a bad bet either way).

Clip links open at the moment found by search. Quotes in this document are the punctuated transcript sentence nearest that timestamp (`nde_punctuated_embeddings`); they are candidates. Only the clips in the script's verification table have been re-checked against the line-level captions and confirmed public.

## Market snapshot (what is breaking out now)

| Video | Views (2026-11-03) | What it tells us |
| --- | --- | --- |
| [The Deathbed Doctor: Weeks Before Death, Patients Start Having Visions (The Diary Of A CEO, 2026-10-19)](https://www.youtube.com/watch?v=GlaSnROMqRY) | 4,584,038 | Deathbed visions are the hottest adjacent topic right now. Top comments are first-hand "my mother saw her mother" stories with thousands of likes. |
| [What Nobody Tells You About Death \| The Living Feel It Too (The Why Files, 2026-03-27)](https://www.youtube.com/watch?v=xauvaJ1kTBo) | 1,990,856 | Shared-death experiences reached a mainstream mystery channel. |
| [What Happens After Death? \| Does Aatma really Exist? (Dhruv Rathee, 2026-07-19)](https://www.youtube.com/watch?v=fFMcolWgD3w) | 15,200,678 | Mass-market "what happens after death" explainers reach tens of millions. |
| [What you'll see when you die (The Opening, 2026-05-15)](https://www.youtube.com/watch?v=KJg1-FCweWI) | 2,617,798 | Generic "what you'll see" titles still work. |
| [A Nurse's Near-Death Experience: A Life Review That Changed Everything (Coming Home, 2026-01-29)](https://www.youtube.com/watch?v=Qbvs1ncHcwo) | 1,728,944 | Long, calm, single-experiencer interviews about the life review do 1M+. |
| [What happens when you die? John Burke has studied 1,500 people who died and came back (Nicholas John, 2025-07-30)](https://www.youtube.com/watch?v=MtEVHv3i5Ec) | 1,381,963 | "Someone studied 1,500 / 2,000 / 5,000 NDEs" is a proven title shape. Project Profound can say 6,454. |
| [ИИ дал ответ ЕСТЬ ЛИ ЖИЗНЬ ПОСЛЕ СМЕРТИ ("AI gave the answer: is there life after death", НОМОС-6, 2026-09-01)](https://www.youtube.com/watch?v=TqIjyNMkzJg) | 478,831 | "AI analysed life after death" pulls 300k-480k on Russian channels; the English equivalent is under-served (a 2026-01 English video with this title has 287 views). |
| [Sharon Stone Saw the Afterlife: 5 Alien Orbs Told Her to Stay (Dr. Mayim Bialik, 2026-09-08)](https://www.youtube.com/watch?v=7hsvA4-zWAI) | 2,265,866 | NDE + "alien" crossover pulls 2M+. |
| [She Died for Four Days... and Her Dead Dog Was Already Waiting (NDE Journey, 2026-03-16)](https://www.youtube.com/watch?v=GtokV_O3s0Y) | 490,202 | Pets-waiting niche is real (490k). |

What commenters ask for, from the DOAC and Coming Home comment threads: confirmation that a specific person was met ("I hope she experienced this"), whether the dying are alone, a second chance after a "messed up" life, and (from a VA chaplain with 1,322 likes) more on chaplains and hospice staff. What they argue about: whether it is the brain, whether hell is real, and whether Christians and others see the same thing.

Gaps no single-testimony channel can fill: counts across thousands of accounts ("1,972 of 6,454"), the cases that break the pattern, and cross-searching NDE and UAP testimony together.

## Ranked summary

| Rank | Topic | D | A | E | S | U | P | Weighted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Who Comes to Meet You When You Die | 9 | 10 | 10 | 9 | 9 | 8 | **9.30** |
| 2 | The Life Review: Feeling What You Made Them Feel | 9 | 9 | 9 | 8 | 7 | 8 | **8.55** |
| 3 | "What Did You Learn?" The Question They're Asked | 8 | 8 | 9 | 9 | 8 | 8 | **8.35** |
| 4 | "It's Not Your Time": Who Decides You Come Back | 8 | 9 | 8 | 7 | 6 | 9 | **7.95** |
| 5 | What Children See When They Die | 8 | 7 | 9 | 8 | 7 | 6 | **7.70** |
| 6 | "Dying Doesn't Hurt": Why They Lost the Fear of Death | 7 | 9 | 8 | 7 | 6 | 9 | **7.70** |
| 7 | What the Dying See Before They Go | 9 | 5 | 9 | 8 | 7 | 7 | **7.65** |
| 8 | The Tiny Kindness That Mattered Most | 7 | 7 | 8 | 9 | 7 | 8 | **7.60** |
| 9 | Seen From the Ceiling: What They Shouldn't Have Known | 8 | 8 | 7 | 8 | 7 | 7 | **7.60** |
| 10 | Jesus, Krishna or No One: Whose Heaven Is It? | 8 | 8 | 7 | 8 | 8 | 6 | **7.60** |
| 11 | Shared-Death Experiences: When the Living Go Partway | 8 | 5 | 9 | 8 | 8 | 7 | **7.50** |
| 12 | The Atheists Who Came Back | 8 | 7 | 7 | 8 | 6 | 8 | **7.40** |
| 13 | Do Pets Wait for Us? | 7 | 5 | 9 | 9 | 7 | 8 | **7.40** |
| 14 | The Relatives They Didn't Know Had Died | 7 | 6 | 8 | 8 | 9 | 7 | **7.35** |
| 15 | Hell, the Void, and the Way Out | 9 | 6 | 7 | 8 | 6 | 6 | **7.25** |
| 16 | Signs After Death | 8 | 5 | 8 | 8 | 5 | 7 | **7.00** |
| 17 | The Hardest Part Is Coming Back | 5 | 7 | 8 | 6 | 8 | 8 | **6.75** |
| 18 | "I Chose This Life": Pre-Birth Memories | 7 | 6 | 7 | 7 | 6 | 7 | **6.70** |
| 19 | Love vs Fear: NDEs and UFO Encounters Compared | 6 | 7 | 6 | 7 | 10 | 5 | **6.65** |
| 20 | Time Doesn't Exist There | 6 | 8 | 6 | 6 | 6 | 8 | **6.60** |
| 21 | Aliens Inside Near-Death Experiences | 7 | 5 | 6 | 7 | 10 | 6 | **6.60** |
| 22 | After a Suicide Attempt: What They Were Shown | 6 | 6 | 9 | 5 | 7 | 4 | **6.35** |
| 23 | Colors That Don't Exist Here | 5 | 8 | 6 | 6 | 5 | 8 | **6.25** |
| 24 | They Came Back Different: Intuition, Electronics, Abilities | 6 | 6 | 6 | 6 | 6 | 8 | **6.20** |
| 25 | They Were Shown the Future | 7 | 5 | 6 | 7 | 6 | 6 | **6.20** |
| 26 | Born Blind, They Saw | 6 | 4 | 7 | 8 | 6 | 6 | **6.10** |

### Why "Who Comes to Meet You When You Die" is #1

It is the only topic that scores at the top on both halves of the brief. **Demand:** the biggest NDE-adjacent video of the past month (Diary Of A CEO, 4.58M views in two weeks) is about the dying seeing their dead relatives, and its comment section is thousands of people telling the same story. **Archive strength:** it is also the topic where Project Profound's scale is most dramatic and most checkable. 1,972 of 6,454 confirmed accounts code a deceased relative as a being met; the AI coding says which relative, so the video can show a ranked chart no other channel can make (grandparents first, then mothers and fathers, almost exactly tied). The archive also holds the counter-evidence the topic needs to be honest: relatives the experiencer did not know had died, a living grandmother, a stranger who "felt like an uncle", and people who met no one. That gives the script a real argument, not just consolation. It fits Tom's origin story (his first NDE video was Anita Moorjani, whose father sends her back) and the book's "never alone" thread, and the clips come from on-camera experiencers with clean content-safety flags.

Runners-up worth producing next: the life review (#2), "What did you learn?" (#3), and "It's not your time" (#4) share clip pools with #1, so a series can reuse verified material.

## The topics

### 1. Who Comes to Meet You When You Die

**Working title:** We Searched 6,454 Near-Death Experiences: This Is Who Meets You When You Die  
**Alternates:** Who Is Waiting for You? 1,972 People Who Died Describe the Same Moment / Your Grandmother Is the Most Likely Person to Meet You (Here's the Data)  
**Thumbnail:** Old hand reaching toward a younger hand in warm backlight; small data tag "1,972 of 6,454". Text: "WHO MEETS YOU?"

**Hook (first 10 seconds):** "Weeks before they die, hospice patients start talking to people we can't see. Usually their mother. Sometimes a brother who died at two. I wanted to know: who is actually there? So I asked 6,454 people who died and came back."

**Story arc:** The archive counts who greets the dying (grandparents lead), shows what those greeters do (hold, recognise, send back), then tests the comforting answer against the hard cases: relatives the experiencer did not know had died, and the people who met no one at all.

**Why it will get views and shares**

- Demand evidence: [The Deathbed Doctor: Weeks Before Death, Patients Start Having Visions (The Diary Of A CEO, 2026-10-19)](https://www.youtube.com/watch?v=GlaSnROMqRY), 4,584,038 views; [What Nobody Tells You About Death | The Living Feel It Too (The Why Files, 2026-03-27)](https://www.youtube.com/watch?v=xauvaJ1kTBo), 1,990,856 views; [How Loved Ones Communicate After Death (Oprah, 2025-11-18)](https://www.youtube.com/watch?v=5bSR6Ts73Bs), 2,942,077 views; [She Died for Four Days... and Her Dead Dog Was Already Waiting (NDE Journey, 2026-03-16)](https://www.youtube.com/watch?v=GtokV_O3s0Y), 490,202 views.
- Context: The Diary Of A CEO deathbed-visions episode passed 4.58M views in its first two weeks and its top comments are almost all the same story ("my mother saw her mother at the end"). Hospice research backs the premise: in Kerr et al. (Journal of Palliative Medicine, 2014) 88% of 59 hospice patients reported at least one end-of-life dream or vision, mostly of deceased relatives (summarised by Hospice Buffalo: https://hospicebuffalo.com/news/in-the-news/what-deathbed-visions-teach-us-about-living).
- Emotional driver: Grief and the fear of dying alone. Almost every viewer has a specific person in mind within five seconds.
- Shareability: People send it to a grieving friend or post it on a memorial page. "Who do you think will meet you?" is a natural reply prompt.
- Comment bait: Who do you hope is waiting for you? (Pinned: tell us their name.)

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **104 moments in 89 confirmed NDE videos** for "my grandmother was there waiting for me"; "my father came to meet me on the other side"; "my deceased mother was standing there to greet me".
- Structured and phrase counts: 1,972 of 6,454 confirmed NDE videos (30.6%) code at least one deceased relative as an entity (nde_analysis.entities); 2,567 of 6,438 (39.9%) have the deceased_relatives core element. Relationship of the relative, by video: any grandparent 674, mother 339, father 338, sibling 182, aunt/uncle 120, spouse/partner 87, son/daughter 85. Exact phrase "grandmother" appears in 1,091 videos (2,809 moments). Counting each named experiencer once: 1,288 people.
- Candidate clips:
  - `wyOAqLA-iNI` · NewHeaven NewEarth · 64,569 archive views · [4:00](https://www.youtube.com/watch?v=wyOAqLA-iNI&t=240) · "She had been dead for 14 years, and I never once I can still feel her now talking about it, I never once thought of my grandmother surviving her physical death, but my grandmother was there, and she was holding me."
  - `KsmzYqGCxvQ` · Round Trip Death · 1,857 archive views · [13:56](https://www.youtube.com/watch?v=KsmzYqGCxvQ&t=836) · "I said, No, Grandma, I want to come with you! And she says, No, baby, you got to stay here. You got things to do. People need you. But I said, Grandma, yeah, but I can't have babies or nothing. And she goes, It's not you..."
  - `EbnGuNP-zhg` · Round Trip Death · 4,257 archive views · [23:09](https://www.youtube.com/watch?v=EbnGuNP-zhg&t=1389) · "He looked young and healthy and just beautiful. My father had a, a terrible illness."
  - `tmT13Uuump0` · IANDS · 99,850 archive views · [22:01](https://www.youtube.com/watch?v=tmT13Uuump0&t=1321) · "But then my father started to, to tell me that I needed to go back because it wasn't my time."
  - `76NofxoLQK0` · Crossing Over NDE · 58,256 archive views · [15:50](https://www.youtube.com/watch?v=76NofxoLQK0&t=950) · "And I was just enthralled at seeing how well my granddad looked because he looked so much younger, he looked well, he looked fit."

**Visual plan:** Host 35%, archive clips 35%, motion graphics 20% (counters, relationship bar chart, "person they didn't know had died" map of cases), stock 10% (hands, doorways, old photographs).

**Risks:** Grief-heavy; some greeter accounts involve child death or suicide (see flag rates below), so pick clips from the clean majority. Claims: present as testimony; the "grandparents lead" stat partly reflects who has died before the experiencer, and the video must say so. Rights: clips come from 8+ channels; ask permission from each. Content-safety flags across the 89 semantic-hit videos: suicide_related 7/89, self_harm 6/89, child_death 3/89, distressing_content 14/89, medical_graphic 7/89; moderate or severe warning level 11/89.

**Scores:** Demand 9 · Archive 10 · Emotional 10 · Shareability 9 · Uniqueness 9 · Production ease 8 → **weighted 9.30** (rank 1)

### 14. The Relatives They Didn't Know Had Died

**Working title:** They Met Someone in Death Who They Didn't Know Had Died  
**Alternates:** The Near-Death Cases That Are Hardest to Explain Away / A Neurosurgeon Met a Sister He Never Knew Existed  
**Thumbnail:** Faded family photo with one face circled in light. Text: "THEY NEVER MET"

**Hook (first 10 seconds):** "A man drowning off Hawaii saw his uncle on the other side. Nobody had told him his uncle was dead."

**Story arc:** Greyson's "Peak in Darien" idea (seeing someone not known to be dead) walked through the archive's best cases, then the honest limits: few are documented, most are told years later.

**Why it will get views and shares**

- Demand evidence: [The Deathbed Doctor: Weeks Before Death, Patients Start Having Visions (The Diary Of A CEO, 2026-10-19)](https://www.youtube.com/watch?v=GlaSnROMqRY), 4,584,038 views; [14 Year Old Dies & Brings Back Evidence From the Afterlife That No One Can Explain (Back from Death, 2026-03-04)](https://www.youtube.com/watch?v=OQHrwEZmONI), 1,627,183 views; [What happens when you die? John Burke has studied 1,500 people who died and came back (Nicholas John, 2025-07-30)](https://www.youtube.com/watch?v=MtEVHv3i5Ec), 1,381,963 views.
- Context: Evidence-flavoured NDE titles over-perform: Zach Tavcar's "brings back evidence" video is at 1.6M views. Bruce Greyson's 2010 paper on "Peak in Darien" experiences (https://psi-research-site.pages.dev/paper/greyson_2010_peak_in_darien) is widely cited by skeptics and believers alike, and a 2024 Journal of the Society for Psychical Research paper debates alternative explanations, so there is a live argument to join.
- Emotional driver: Awe plus "how could they know?" curiosity.
- Shareability: Skeptics share it to argue; believers share it as proof. Both drive comments.
- Comment bait: Is there any explanation besides the obvious one? Make your case.

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **81 moments in 59 confirmed NDE videos** for "I met a brother I never knew I had"; "I saw a relative I didn't know had died"; "I met my sister who had died before I was born".
- Structured and phrase counts: No coded field. The semantic search finds a few dozen candidate moments; on reading, only a handful are clear "did not know they had died" cases (Keith Thompson 6oDB4BzndCQ, Eben Alexander ibwVDXN66fU and his other tellings). Treat as a 5-10 case video, not a statistic.
- Candidate clips:
  - `6oDB4BzndCQ` · The Other Side NDE · 47,439 archive views · [4:46](https://www.youtube.com/watch?v=6oDB4BzndCQ&t=286) · "I saw friends that I knew who had died; I did see also an uncle that I had, did not know had died."
  - `ibwVDXN66fU` · IANDS · 14,265 archive views · [58:32](https://www.youtube.com/watch?v=ibwVDXN66fU&t=3512) · "And it was about four months after I came out of coma. And I just read that that story in Elizabeth Kübler-Ross's book. And then my birth family had sent me a picture, and I had on my dresser. And it was the next day whe..."
  - `wKMa7-J8fOw` · NewHeaven NewEarth · 97,265 archive views · [2:25](https://www.youtube.com/watch?v=wKMa7-J8fOw&t=145) · "And I remember thinking, I don't have an uncle that looks like him."
  - `KfaDOmT82gk` · Near-Death Experiences · 125,144 archive views · [4:19](https://www.youtube.com/watch?v=KfaDOmT82gk&t=259) · "Your sister, by birth, and from a family that you didn't know because you were adopted, who died several years ago, who you had never met, you saw while you were in a coma?"
  - `KUCVoQUHksE` · The Other Side NDE · 118,739 archive views · [15:24](https://www.youtube.com/watch?v=KUCVoQUHksE&t=924) · "And I didn't meet anybody that I know. My sister passed away when she was 30 in 2010. And I thought I might see her, but I didn't."

**Visual plan:** Host 40%, archive 30%, motion graphics 25% (case cards with what was known when), stock 5%.

**Risks:** Must not overclaim: most cases are retrospective and uncorroborated in the video itself. One strong candidate (Landon, ma6j7hKPfq4) is no longer public. Eben Alexander's case is famous and contested; present his telling, not a verdict. Content-safety flags across the 59 semantic-hit videos: suicide_related 1/59, self_harm 1/59, child_death 2/59, distressing_content 6/59, medical_graphic 6/59; moderate or severe warning level 3/59.

**Scores:** Demand 7 · Archive 6 · Emotional 8 · Shareability 8 · Uniqueness 9 · Production ease 7 → **weighted 7.35** (rank 14)

### 2. The Life Review: Feeling What You Made Them Feel

**Working title:** In the Life Review, You Feel What You Made Other People Feel  
**Alternates:** Hundreds of People Describe the Same Judgement, and It Isn't God's / What 3,167 Life Reviews Say About How You Treat People  
**Thumbnail:** Face split into two faces, one the viewer's, one a stranger's. Text: "YOU FEEL THEIRS"

**Hook (first 10 seconds):** "Almost half the people in our archive say their life flashed before them. That's not the strange part. The strange part is whose side they saw it from."

**Story arc:** The life review as a mechanism: empathy from the other person's side, the ripple effect, the minority who felt accused, and what experiencers changed afterward.

**Why it will get views and shares**

- Demand evidence: [A Nurse's Near-Death Experience: A Life Review That Changed Everything (Coming Home, 2026-01-29)](https://www.youtube.com/watch?v=Qbvs1ncHcwo), 1,728,944 views; [Man dies & learns we have it completely backwards (NDE Journey, 2025-11-12)](https://www.youtube.com/watch?v=SPAJLKimm9k), 2,142,449 views; [She Died and Asked the Beings Why Earth Was So Painful (NDE Journey, 2026-06-04)](https://www.youtube.com/watch?v=LD_A9Lyg0JI), 1,401,139 views.
- Context: Coming Home's nurse life-review interview is at 1.73M views; "we have it completely backwards" framings sit at 2.1M. Commenters on the nurse video write things like "I'm 70 years old and have made such a mess of my life" (1,529 likes), so the audience is looking for a second chance.
- Emotional driver: Guilt, regret and hope of repair.
- Shareability: "Watch this before you text your ex" energy; strong for self-improvement crossover audiences.
- Comment bait: If you had your life review today, which moment would you dread? Which would surprise you?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **60 moments in 56 confirmed NDE videos** for "in my life review I felt the pain I caused other people"; "I felt exactly what the other person felt in my life review".
- Structured and phrase counts: life_review core element present in 3,167 of 6,438 (49.2%); in 3,336 of 5,685 journey sequences. Exact phrase "life review" in 1,363 videos (3,943 moments).
- Candidate clips:
  - `Ot5byhyBYHM` · Beyond with Heather Tesch · 11,379 archive views · [19:21](https://www.youtube.com/watch?v=Ot5byhyBYHM&t=1161) · "every single person in my life review whom who I have hurt in my life. I am I am experiencing the pain that I gave them to the to a level that I had no idea that that it felt like all their emotions, their psychology, th..."
  - `ZPSLrCUpjGE` · Tales Of Resilience · 3,529 archive views · [11:32](https://www.youtube.com/watch?v=ZPSLrCUpjGE&t=692) · "Why do you say that?"
  - `xiuSeJvsHcQ` · NDE Compilations · 7,961 archive views · [32:26](https://www.youtube.com/watch?v=xiuSeJvsHcQ&t=1946) · "And in that knowing that I was known, I experienced a life review of all the people that I had hurt in my life. I experienced all of the pain that I'd ever given to every single person of my entire life."
  - `iOoP2dZ7ksQ` · CT-IANDS - Near Death Experience Support (NDE) · 197 archive views · [11:12](https://www.youtube.com/watch?v=iOoP2dZ7ksQ&t=672) · "So my life review was not super optimal because I was experiencing the pain that I had inflicted upon other people, and then I was experiencing it from their point of view as well, and I was feeling the harm that I had c..."

**Visual plan:** Host 35%, archive 35%, motion graphics 20% (ripple diagram, life_review prevalence), stock 10%.

**Risks:** Some reviews are accusatory and some accounts involve abuse; avoid implying judgement or punishment the testimony doesn't support. Life review appears in 49.2% of coded accounts, not "everyone". Content-safety flags across the 56 semantic-hit videos: suicide_related 8/56, self_harm 6/56, child_death 4/56, distressing_content 14/56, medical_graphic 3/56; moderate or severe warning level 11/56.

**Scores:** Demand 9 · Archive 9 · Emotional 9 · Shareability 8 · Uniqueness 7 · Production ease 8 → **weighted 8.55** (rank 2)

### 8. The Tiny Kindness That Mattered Most

**Working title:** People Who Died Say the Smallest Thing You Did Mattered Most  
**Alternates:** Not Your Career. Not Your Money. What Their Life Review Actually Showed / The Forgotten Moment That Lit Up Their Life Review  
**Thumbnail:** A hand passing a coffee cup to a stranger, glowing. Text: "THIS COUNTED"

**Hook (first 10 seconds):** "One man's life review skipped his whole career and stopped on a moment he'd forgotten. It took about ten seconds in real life."

**Story arc:** Experiencers report that the review weighs small acts over achievements; we collect the examples, then ask what that implies for an ordinary Tuesday.

**Why it will get views and shares**

- Demand evidence: [A Nurse's Near-Death Experience: A Life Review That Changed Everything (Coming Home, 2026-01-29)](https://www.youtube.com/watch?v=Qbvs1ncHcwo), 1,728,944 views; [Shocking NDE! 10 Messages From The Afterlife to Help Humanity (Dr. Mayim Bialik, 2026-05-12)](https://www.youtube.com/watch?v=1Kh_tC11lI8), 1,323,513 views; [Man dies & learns we have it completely backwards (NDE Journey, 2025-11-12)](https://www.youtube.com/watch?v=SPAJLKimm9k), 2,142,449 views.
- Context: Message-style titles ("10 Messages From The Afterlife", 1.32M) and life-review titles both perform; this is the most actionable version of the life-review story and fits the "Integration Station" format in Tom's Video Series Ideas doc.
- Emotional driver: Relief and meaning: you have already done things that count.
- Shareability: Highly shareable as a Short; works on Instagram and Facebook for older audiences.
- Comment bait: What small kindness from a stranger do you still remember?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **57 moments in 47 confirmed NDE videos** for "the small acts of kindness mattered the most in my life review"; "what mattered was a little kindness I had forgotten about".
- Structured and phrase counts: Exact phrase "little things" in 541 videos; "small acts of kindness" in 8. Sits inside the 3,167 life-review accounts.
- Candidate clips:
  - `F-rp6bqfJWQ` · Anthony Chene production · 952,875 archive views · [28:48](https://www.youtube.com/watch?v=F-rp6bqfJWQ&t=1728) · "It's just those little acts of kindness that can be so powerful for people, and I learned that in spades during that life review."
  - `IM5kk-UhsAs` · Love Covered Life Podcast · 17,375 archive views · [68:51](https://www.youtube.com/watch?v=IM5kk-UhsAs&t=4131) · "When we have our life reviews, it's the little things that we see. It's not, it's the little things that mean so much."
  - `AWlY1314zTk` · Tia Renee · 34,909 archive views · [39:41](https://www.youtube.com/watch?v=AWlY1314zTk&t=2381) · "Even the littlest things that we do for somebody is very important. The littlest things. You don't have to do anything large, anything huge. You don't spend a whole lot of money. You just get and help without any expecti..."
  - `lDSDP1tGfJ0` · NDE Compilations · 13,530 archive views · [37:39](https://www.youtube.com/watch?v=lDSDP1tGfJ0&t=2259) · "So, there's another thing that I learned, and that is that it's the small things. It's the little things that we do. And if we do it with love, it doesn't matter whether you're taking out the trash or cooking dinner for ..."
  - `Val5zxJ8UlE` · Heaven Awaits · 6,679 archive views · [12:31](https://www.youtube.com/watch?v=Val5zxJ8UlE&t=751) · "In my life review, I received such applause and  joy for this simple act that it is unbelievable. It was like all the spirits in the universe  were filled with joy from this simple act and were telling me, "We are proud ..."

**Visual plan:** Host 45%, archive 30%, stock 15% (everyday kindness b-roll), motion graphics 10%.

**Risks:** Low sensitivity. Watch for compilation channels that read written accounts aloud; prefer on-camera experiencers. Content-safety flags across the 47 semantic-hit videos: suicide_related 0/47, self_harm 0/47, child_death 2/47, distressing_content 5/47, medical_graphic 6/47; moderate or severe warning level 2/47.

**Scores:** Demand 7 · Archive 7 · Emotional 8 · Shareability 9 · Uniqueness 7 · Production ease 8 → **weighted 7.60** (rank 8)

### 3. "What Did You Learn?" The Question They're Asked

**Working title:** People Who Died Say They Were Asked the Same Question  
**Alternates:** "What Did You Learn?" The Question Waiting for You on the Other Side / The One Question Near-Death Experiencers Couldn't Answer  
**Thumbnail:** Glowing figure, question mark made of light. Text: "THE QUESTION"

**Hook (first 10 seconds):** "Dozens of people who died, in different countries, in different decades, report being asked the same four words."

**Story arc:** Gathers the moments where a being asks "What did you learn?" or "How did you love?", contrasts them with what experiencers expected to be asked, and lands on the viewer answering it now.

**Why it will get views and shares**

- Demand evidence: [What you'll see when you die (The Opening, 2026-05-15)](https://www.youtube.com/watch?v=KJg1-FCweWI), 2,617,798 views; [Dead for 7 Minutes. He Knows What Happens After We Die | John J Davis (Dr. Mayim Bialik, 2026-03-31)](https://www.youtube.com/watch?v=Y9ifwLfoYn4), 2,143,348 views; [Man dies & learns we have it completely backwards (NDE Journey, 2025-11-12)](https://www.youtube.com/watch?v=SPAJLKimm9k), 2,142,449 views.
- Context: "What happens when you die" framings are the genre's biggest search term ("What you'll see when you die", 2.6M; Dhruv Rathee's explainer, 15.2M). A single repeated question is an unusually clean hook, and the archive has it on high-view videos (Shaman Oaks, 12.8M archive views).
- Emotional driver: Curiosity, then self-reflection.
- Shareability: The question itself is the share: people post their answer.
- Comment bait: How would you answer it today, in one sentence?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **104 moments in 84 confirmed NDE videos** for "they asked me what did you do with your life"; "the being asked me how well did you love"; "I was asked what did you learn".
- Structured and phrase counts: Semantic search returns 104 moments in 84 videos across three phrasings; no coded field. Each phrasing must be reported separately.
- Candidate clips:
  - `U64hTJxoTlM` · Dorothy Shelton · 241,135 archive views · [7:51](https://www.youtube.com/watch?v=U64hTJxoTlM&t=471) · "And this beautiful being is communicating, there's no mistakes."
  - `A1onYxA8wiY` · Shaman Oaks · 12,819,034 archive views · [7:29](https://www.youtube.com/watch?v=A1onYxA8wiY&t=449) · "And they were saying things like..."
  - `1FD5lReqe64` · Anthony Chene production · 1,776,139 archive views · [41:46](https://www.youtube.com/watch?v=1FD5lReqe64&t=2506) · "Tell me about what you learned in your experience."
  - `1jyu35n9SnU` · Afterlife Experiences · 128,649 archive views · [11:58](https://www.youtube.com/watch?v=1jyu35n9SnU&t=718) · "He asked me, "How do you love?"
  - `ZZGPNU28pbo` · Beyond with Heather Tesch · 59,220 archive views · [31:09](https://www.youtube.com/watch?v=ZZGPNU28pbo&t=1869) · "What did you learn?"

**Visual plan:** Host 40%, archive 35% (rapid montage of the question), motion graphics 15%, stock 10%.

**Risks:** Exact wording varies ("What did you learn?", "How did you love?", "What did you do with your life?"); report each form separately and never merge them into one quote. Content-safety flags across the 84 semantic-hit videos: suicide_related 11/84, self_harm 9/84, child_death 2/84, distressing_content 15/84, medical_graphic 14/84; moderate or severe warning level 12/84.

**Scores:** Demand 8 · Archive 8 · Emotional 9 · Shareability 9 · Uniqueness 8 · Production ease 8 → **weighted 8.35** (rank 3)

### 9. Seen From the Ceiling: What They Shouldn't Have Known

**Working title:** They Saw Their Own Surgery, Then Told the Doctors What Happened  
**Alternates:** The Out-of-Body Details Doctors Couldn't Explain / 185 Near-Death Experiences With Evidence You Can Check  
**Thumbnail:** Operating table seen from directly above, a faint second figure near the ceiling. Text: "SHE SAW IT"

**Hook (first 10 seconds):** "She was flatlined on the table. Afterward she told the nurse what was written on the top of the cabinet."

**Story arc:** Uses the archive's veridical scoring (185 Exceptional of ~6,300) to pick the checkable cases, sets out what was claimed and what was confirmed, and separates the vivid from the verifiable.

**Why it will get views and shares**

- Demand evidence: [14 Year Old Dies & Brings Back Evidence From the Afterlife That No One Can Explain (Back from Death, 2026-03-04)](https://www.youtube.com/watch?v=OQHrwEZmONI), 1,627,183 views; [Spine Surgeon Drowns for 30 Minutes - Comes Back With a List (100huntley, 2026-05-01)](https://www.youtube.com/watch?v=dG-P1881MhI), 1,176,796 views; [What happens when you die? John Burke has studied 1,500 people who died and came back (Nicholas John, 2025-07-30)](https://www.youtube.com/watch?v=MtEVHv3i5Ec), 1,381,963 views.
- Context: Evidence titles out-perform: "brings back evidence" (1.63M), "Comes Back With a List" (1.18M). Tom's book outline opens with this (Chapter 1, The Snickers Bar), so it builds the book funnel too.
- Emotional driver: Intellectual curiosity and the need for proof.
- Shareability: Skeptic-versus-believer debate; Reddit-friendly.
- Comment bait: What would it take to convince you? Name one detail.

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **75 moments in 59 confirmed NDE videos** for "I saw the doctors working on my body from above and later told them what they said"; "I saw something in the hospital I could not have known and it was confirmed".
- Structured and phrase counts: out_of_body present in 5,382 of 6,438 (83.6%). Veridical (rvnde) level: 185 Exceptional and 553 High (ATLAS-stats 2.4, 2026-09-08 pull).
- Candidate clips:
  - `yl3OS7aA1gg` · Thanatos TV EN · 280,323 archive views · [0:06](https://www.youtube.com/watch?v=yl3OS7aA1gg&t=6) · "I saw myself from above as they operated on me."
  - `RZ-pZXqI6yQ` · Afterlife Experiences · 117,783 archive views · [4:28](https://www.youtube.com/watch?v=RZ-pZXqI6yQ&t=268) · "Then, all of a sudden, I saw the surgery room from above, the doctors who were there, and me."
  - `90_bk9__d1o` · NDE Radio with Lee Witting · 7,924 archive views · [11:25](https://www.youtube.com/watch?v=90_bk9__d1o&t=685) · "Now, I went up above my body, I stood on the side where the sheet was, where the doctor was working, and I sat there and looked at my body as it was laying on the table."
  - `Xw39iEvZcM8` · Thanatos TV EN · 56,943 archive views · [0:00](https://www.youtube.com/watch?v=Xw39iEvZcM8&t=0) · "So I saw myself lying on the operating table with my rib cage open and I could perceive the doctors around me."

**Visual plan:** Host 35%, archive 30%, motion graphics 30% (case files, evidence ladder), stock 5%.

**Risks:** Claims need careful framing: confirmations are usually reported by the experiencer, not documented on screen. Medical-graphic content appears in several candidate videos. Content-safety flags across the 59 semantic-hit videos: suicide_related 2/59, self_harm 1/59, child_death 4/59, distressing_content 12/59, medical_graphic 13/59; moderate or severe warning level 10/59.

**Scores:** Demand 8 · Archive 8 · Emotional 7 · Shareability 8 · Uniqueness 7 · Production ease 7 → **weighted 7.60** (rank 9)

### 26. Born Blind, They Saw

**Working title:** Blind From Birth, They Describe What They Saw When They Died  
**Alternates:** What Does Someone Born Blind See in a Near-Death Experience? / They Had Never Seen Color. Then They Died.  
**Thumbnail:** Closed eyes with color blooming behind the lids. Text: "BLIND. THEN SAW."

**Hook (first 10 seconds):** "How do you describe a color to someone who has never seen one? Some of the people in this archive didn't have to imagine it."

**Story arc:** Ring and Cooper's blind-experiencer research meets the archive's first-person accounts; what they describe and how they struggle to describe it.

**Why it will get views and shares**

- Demand evidence: [Blind 8-Year-Old Describes Heaven the Same as Sighted People (Imagine Heaven Podcast, 2026-05-19)](https://www.youtube.com/watch?v=J7u2nHmclrs), 84,312 views; [Born Blind, Woman Dies in a Car Crash and Sees Heaven (The NDE Files, 2026-04-15)](https://www.youtube.com/watch?v=pFxGx9PeFzM), 37,070 views.
- Context: Steady but smaller demand (84k and 37k for 2026 uploads). The site's own visitor questions ask about blind experiencers and the Big Questions don't answer them (appendix-syntheses).
- Emotional driver: Wonder.
- Shareability: Strong "you won't believe this" Short potential.
- Comment bait: If you've never seen, what does "light" mean?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **69 moments in 53 confirmed NDE videos** for "I was blind but during my near death experience I could see"; "I have been blind since birth and I could see colors".
- Structured and phrase counts: Exact phrase "blind from birth" in 27 videos (47 moments); "born blind" in 11 videos.
- Candidate clips:
  - `mUzS5gHTAvI` · Imagine Heaven Podcast with John Burke · 188,190 archive views · [0:00](https://www.youtube.com/watch?v=mUzS5gHTAvI&t=0) · "When people who are born blind have a near-death experience, they claim that they, they can see, and they report all of the same commonalities as cited people having near-death experiences all over the globe."
  - `maINoqE7aZA` · Thanatos TV EN · 51,392 archive views · [28:18](https://www.youtube.com/watch?v=maINoqE7aZA&t=1698) · "Why did you feel this need to see colors because as somebody, who is blind, wouldn’t you be used to not seeing any colors?"
  - `neuciWsQxp4` · Afterlife Atlas · 1,488 archive views · [15:33](https://www.youtube.com/watch?v=neuciWsQxp4&t=933) · "Then he said, "Here's my sister Emma.""

**Visual plan:** Host 40%, archive 25%, motion graphics 15%, stock 20%.

**Risks:** Thin first-person evidence: only 27 videos contain the exact phrase "blind from birth", and several hits are commentators or narrated readings. Verify each experiencer's blindness from their own words. Content-safety flags across the 53 semantic-hit videos: suicide_related 5/53, self_harm 3/53, child_death 2/53, distressing_content 9/53, medical_graphic 2/53; moderate or severe warning level 6/53.

**Scores:** Demand 6 · Archive 4 · Emotional 7 · Shareability 8 · Uniqueness 6 · Production ease 6 → **weighted 6.10** (rank 26)

### 5. What Children See When They Die

**Working title:** Children Who Died Describe the Other Side, and It Matches the Adults  
**Alternates:** Five-Year-Olds Can't Have Read the Books. Here's What They Saw. / The Youngest Near-Death Experiencers in Our Archive  
**Thumbnail:** Child's crayon drawing of a bright tunnel. Text: "THEY WERE 5"

**Hook (first 10 seconds):** "A five-year-old hasn't read Raymond Moody. So why does her story match his?"

**Story arc:** Childhood NDEs (623 heuristic matches) told mostly by adults remembering, compared with adult accounts; the contamination question answered honestly.

**Why it will get views and shares**

- Demand evidence: [Where is the Famous "Heaven Kid" 23 Years Later? (TruWitness, 2026-07-14)](https://www.youtube.com/watch?v=8FZugWlhdtg), 2,594,135 views; [14 Year Old Dies & Brings Back Evidence From the Afterlife That No One Can Explain (Back from Death, 2026-03-04)](https://www.youtube.com/watch?v=OQHrwEZmONI), 1,627,183 views.
- Context: "Where is the Famous Heaven Kid 23 Years Later?" is at 2.59M views; child-experiencer evidence titles perform (1.63M).
- Emotional driver: Protective tenderness plus credibility.
- Shareability: Parents and grandparents share widely.
- Comment bait: Did your child ever say something about "before" that stopped you cold?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **63 moments in 54 confirmed NDE videos** for "when I was a little girl I drowned and went to heaven"; "I was five years old when I died".
- Structured and phrase counts: 623 heuristic child-experiencer matches, 351 with a parsed age of 12 or under (ATLAS-stats 7). Exact phrase "five years old" in 370 videos.
- Candidate clips:
  - `xgaP3nZLnww` · NDE Accounts - Afterlife Stories · 48,817 archive views · [0:20](https://www.youtube.com/watch?v=xgaP3nZLnww&t=20) · "So my near-death experience happened when I was five years old."
  - `chfcqA3ERro` · Touching The Afterlife · 151,425 archive views · [1:40](https://www.youtube.com/watch?v=chfcqA3ERro&t=100) · "Uh, when I was young, I was five years old, um, uh, we live in a very small apartment in the city in Manila. And if you kind of imagine that, if I will set the place, it's a very crowded, very um, very noisy."
  - `D9KcOf6d4X4` · Pegi Robinson - NDE TV · 1,194 archive views · [14:29](https://www.youtube.com/watch?v=D9KcOf6d4X4&t=869) · "Because I drowned when I was five."
  - `Fc2RBqxNasc` · NDE Diary · 33,707 archive views · [0:17](https://www.youtube.com/watch?v=Fc2RBqxNasc&t=17) · "When I was around five or five years old, I can't remember exactly when, um, I had a near-death experience."
  - `IZWbojibwyA` · Beyond with Heather Tesch · 5,143 archive views · [2:06](https://www.youtube.com/watch?v=IZWbojibwyA&t=126) · "I was about five years old."

**Visual plan:** Host 40%, archive 35%, motion graphics 10%, stock 15% (kids' drawings, playgrounds).

**Risks:** Child death and drowning: check content_safety on every clip (child_death flags below). Most "child" accounts are adults recalling; say so. Avoid any implication that dying is attractive to children. Content-safety flags across the 54 semantic-hit videos: suicide_related 1/54, self_harm 1/54, child_death 4/54, distressing_content 5/54, medical_graphic 2/54; moderate or severe warning level 4/54.

**Scores:** Demand 8 · Archive 7 · Emotional 9 · Shareability 8 · Uniqueness 7 · Production ease 6 → **weighted 7.70** (rank 5)

### 4. "It's Not Your Time": Who Decides You Come Back

**Working title:** "It's Not Your Time": What People Who Died Were Told Before Coming Back  
**Alternates:** Most of Them Didn't Want to Come Back. Here's Why They Did. / Sent Back: The Moment Every Near-Death Experience Ends  
**Thumbnail:** Figure at a glowing threshold, hand on their chest stopping them. Text: "NOT YET"

**Hook (first 10 seconds):** "Nearly four out of five people in our archive reached a point where they had to decide, or be told, whether to come back."

**Story arc:** The return mechanisms (chosen, negotiated, commanded, pushed, refused) quantified from journey sequences, with the people who didn't want to come back at the centre.

**Why it will get views and shares**

- Demand evidence: [Dead 44 Hours! Jesus Revealed Heaven's Greatest Mysteries (God Encounters with Janie DuVall, 2025-11-07)](https://www.youtube.com/watch?v=FVLvRCVsKNU), 2,960,233 views; [Dead for 7 Minutes. He Knows What Happens After We Die | John J Davis (Dr. Mayim Bialik, 2026-03-31)](https://www.youtube.com/watch?v=Y9ifwLfoYn4), 2,143,348 views.
- Context: Return is in almost every big NDE video; as a standalone topic it is less searched but extremely common in comments ("why did they send me back?").
- Emotional driver: Purpose: "why am I still here?"
- Shareability: Good for people who survived illness or accidents.
- Comment bait: If you were told "it's not your time", what do you think you'd still need to do?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **66 moments in 57 confirmed NDE videos** for "they told me it's not your time you have to go back"; "I didn't want to come back I wanted to stay".
- Structured and phrase counts: choice_to_return core element in 5,037 of 6,438 (78.2%); forced_return in 1,536 journey sequences; exact phrase "want to come back" in 637 videos.
- Candidate clips:
  - `g-xqQUCjW1I` · The Other Side NDE · 107,349 archive views · [0:16](https://www.youtube.com/watch?v=g-xqQUCjW1I&t=16) · "Then I was told I had to go back. It wasn't my time."
  - `Bp1O6gKax9A` · Tia Renee · 9,647 archive views · [4:13](https://www.youtube.com/watch?v=Bp1O6gKax9A&t=253) · "I didn't want to come back."
  - `eWPZF2HFduE` · Love Covered Life Podcast · 16,439 archive views · [3:53](https://www.youtube.com/watch?v=eWPZF2HFduE&t=233) · "I didn't want to come back. I absolutely had no desire to come back."
  - `uoI5c1g2bEA` · NDE Radio with Lee Witting · 7,022 archive views · [26:16](https://www.youtube.com/watch?v=uoI5c1g2bEA&t=1576) · "No, I just wanted to stay there. I didn't want to come back. That's what I didn't want to come back."
  - `-PNYA4cso1g` · NDE Compilations · 4,581 archive views · [7:48](https://www.youtube.com/watch?v=-PNYA4cso1g&t=468) · "And they are telling me, it's not really your time to die and you should go back."

**Visual plan:** Host 40%, archive 40%, motion graphics 15%, stock 5%.

**Risks:** Can be read as "some lives are worth more"; frame carefully. Avoid romanticising death for viewers in crisis. Content-safety flags across the 57 semantic-hit videos: suicide_related 2/57, self_harm 1/57, child_death 2/57, distressing_content 3/57, medical_graphic 7/57; moderate or severe warning level 3/57.

**Scores:** Demand 8 · Archive 9 · Emotional 8 · Shareability 7 · Uniqueness 6 · Production ease 9 → **weighted 7.95** (rank 4)

### 15. Hell, the Void, and the Way Out

**Working title:** The Near-Death Experiences That Went Dark, and How They Got Out  
**Alternates:** Not Everyone Sees the Light: What 250 Distressing NDEs Actually Say / They Cried Out in the Dark. Here's What Answered.  
**Thumbnail:** Pitch-black frame with one thin crack of light. Text: "THE DARK ONES"

**Hook (first 10 seconds):** "Four percent of the near-death experiences in our archive are terrifying. Here's the part the scary videos leave out: most of them don't end there."

**Story arc:** Distressing NDEs by the numbers (one channel supplies most of the hell shelf), then the pattern of rescue after crying out, then the ones that never resolved.

**Why it will get views and shares**

- Demand evidence: [I Died & Saw EVERY Level of Hell [An Atheist's NDE] (God Encounters with Janie DuVall, 2026-02-14)](https://www.youtube.com/watch?v=uoQzsUVYZtA), 741,010 views; [Evil People Don't Go To Hell. Here's What Actually Happens To Them (Dr. Mayim Bialik, 2026-04-21)](https://www.youtube.com/watch?v=PJy1FlPXTgQ), 915,090 views.
- Context: Hell titles reliably pull 0.7M-0.9M; the archive's top distressing video has 1.27M views (gAJShDqxM1E). The data-driven angle (one channel is 47% distressing) is something no hell channel will say.
- Emotional driver: Fear, then relief.
- Shareability: Debate between religious and non-religious viewers.
- Comment bait: Is hell a place or a state? Make your case from the accounts.

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **71 moments in 64 confirmed NDE videos** for "I went to a dark place full of torment and demons"; "I was in hell and I cried out for help and a light came".
- Structured and phrase counts: Distressing journeys 250 and very_negative tone 98 videos; hellish_realm in 248 journey sequences; exact phrase "demons" in 615 videos. Touching The Afterlife is 47% distressing (ATLAS-stats 3).
- Candidate clips:
  - `zTsrlEfrTXU` · Love Covered Life Podcast · 158,379 archive views · [53:28](https://www.youtube.com/watch?v=zTsrlEfrTXU&t=3208) · "And as soon as I cry out, "Help me," my light from within came on. And just like when he had the rock and he showed me the demonstration and the light was everywhere emanating, that's exactly what my body was. It was giv..."
  - `qTqUg_3lg2c` · Dorothy Shelton · 218,224 archive views · [9:13](https://www.youtube.com/watch?v=qTqUg_3lg2c&t=553) · "I cried, "Where am I? Am I in hell? Can you save me from the suffering, or must I stay here forever? What did I do to deserve this hell?""
  - `C_bZshe18fk` · Divine Encounters NDE · 79,140 archive views · [4:57](https://www.youtube.com/watch?v=C_bZshe18fk&t=297) · "I came to a dark place very dark very black."
  - `k82QLQxlksA` · Crossing Over NDE · 1,368 archive views · [14:50](https://www.youtube.com/watch?v=k82QLQxlksA&t=890) · "And I'm crying out to them for help, and no one's helping me, and in this moment, it feels like eternity. It feels like I thought I was in hell. I thought that I must have died and gone to hell because that's what it mus..."
  - `RjrwQaBpR_o` · Touching The Afterlife · 119,166 archive views · [6:18](https://www.youtube.com/watch?v=RjrwQaBpR_o&t=378) · "It's a dark, it's a dark place where I went through. I can see there's other entrance that lead into other other area of hell where I went to."

**Visual plan:** Host 45%, archive 30%, motion graphics 20%, stock 5%.

**Risks:** Fear-mongering risk is high: lead with the data and the resolution. 25 of 64 matching videos carry distressing_content flags. Religious claims need neutral framing. Content-safety flags across the 64 semantic-hit videos: suicide_related 3/64, self_harm 1/64, child_death 6/64, distressing_content 25/64, medical_graphic 11/64; moderate or severe warning level 20/64.

**Scores:** Demand 9 · Archive 6 · Emotional 7 · Shareability 8 · Uniqueness 6 · Production ease 6 → **weighted 7.25** (rank 15)

### 12. The Atheists Who Came Back

**Working title:** They Didn't Believe in Anything. Then They Died.  
**Alternates:** What Atheists Report When They Have a Near-Death Experience / The Skeptics in Our Archive, and What Changed Their Minds  
**Thumbnail:** Lab coat on a chair, a beam of light across it. Text: "I DIDN'T BELIEVE"

**Hook (first 10 seconds):** "The strongest testimony in this archive comes from people who expected nothing."

**Story arc:** Self-described atheists and skeptics: what they expected, what they report, and the minority who stayed unconvinced (transformation scores of zero exist).

**Why it will get views and shares**

- Demand evidence: [I Died & Saw EVERY Level of Hell [An Atheist's NDE] (God Encounters with Janie DuVall, 2026-02-14)](https://www.youtube.com/watch?v=uoQzsUVYZtA), 741,010 views; [Dead 44 Hours! Jesus Revealed Heaven's Greatest Mysteries (God Encounters with Janie DuVall, 2025-11-07)](https://www.youtube.com/watch?v=FVLvRCVsKNU), 2,960,233 views.
- Context: "Atheist dies" is a perennial genre title (an "Atheist's NDE" at 741k this year). Tom's own target reader is the spiritual-but-not-religious skeptic (book outline, "Who this Book is For").
- Emotional driver: Identity and permission to wonder.
- Shareability: Shared into skeptic and ex-religious communities.
- Comment bait: What would change your mind about what happens after death?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **62 moments in 58 confirmed NDE videos** for "I was an atheist and I didn't believe in anything after death"; "I was a skeptic until I died".
- Structured and phrase counts: Exact phrase "atheist" in 611 videos (includes people talking about others).
- Candidate clips:
  - `F-rp6bqfJWQ` · Anthony Chene production · 952,875 archive views · [0:30](https://www.youtube.com/watch?v=F-rp6bqfJWQ&t=30) · "I would say that I was a complete atheist by that point and really didn't believe in anything spiritual, anything religious."
  - `HZOH57vFwj0` · The Other Side NDE · 325,780 archive views · [5:27](https://www.youtube.com/watch?v=HZOH57vFwj0&t=327) · "I had no beliefs in the afterlife, I had no beliefs in angels, in soul survival, nothing."
  - `bKI3jBJM_kE` · NDE Diary · 24,567 archive views · [11:12](https://www.youtube.com/watch?v=bKI3jBJM_kE&t=672) · "I didn't believe in this, I didn't believe in life after death, I didn't believe in God."
  - `T-CQniGNTb0` · Imagine Heaven Podcast with John Burke · 57,540 archive views · [2:38](https://www.youtube.com/watch?v=T-CQniGNTb0&t=158) · "And my understanding at that point, I was completely atheist, completely away from God, didn't believe there was life after death."
  - `80OVJr4CAy8` · Logical-NDE · 33,273 archive views · [10:59](https://www.youtube.com/watch?v=80OVJr4CAy8&t=659) · "And at that point in my life, I didn't believe in the afterlife, I didn't believe in the spirit world, I didn't believe in God, I didn't believe in anything."

**Visual plan:** Host 45%, archive 35%, motion graphics 10%, stock 10%.

**Risks:** Avoid conversion framing; several atheist accounts become strongly Christian and others become non-religious. Show both. Content-safety flags across the 58 semantic-hit videos: suicide_related 0/58, self_harm 0/58, child_death 1/58, distressing_content 8/58, medical_graphic 8/58; moderate or severe warning level 4/58.

**Scores:** Demand 8 · Archive 7 · Emotional 7 · Shareability 8 · Uniqueness 6 · Production ease 8 → **weighted 7.40** (rank 12)

### 22. After a Suicide Attempt: What They Were Shown

**Working title:** What People Who Attempted Suicide Experienced, in Their Own Words  
**Alternates:** After a Suicide Attempt, Many Report the Same Message / Not Punishment: What Suicide-Attempt NDEs Actually Describe  
**Thumbnail:** Sunrise through a hospital window. Text: "YOU MATTER" (no method imagery).

**Hook (first 10 seconds):** (Content note first.) "Some of the people in our archive tried to end their lives. What they say they found is not what they expected."

**Story arc:** Only with crisis resources on screen: compassion and regret rather than damnation in most accounts, the higher distress rate (13.6% distressing journeys vs ~1-2% for accidents), and the message to stay.

**Why it will get views and shares**

- Demand evidence: [Addiction, NDE and Recovery-Betty (Soft White Underbelly, 2026-05-10)](https://www.youtube.com/watch?v=rCFRpA3Dk8o), 865,031 views.
- Context: Real search demand (the site's user questions include "I'm thinking of committing suicide, what will I find", unanswered), but YouTube limits monetisation and recommendation on this topic.
- Emotional driver: Hope for people in crisis and for the bereaved.
- Shareability: Shared privately rather than publicly.
- Comment bait: (Disable bait.) Pin crisis lines instead.

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **75 moments in 71 confirmed NDE videos** for "I took all the pills because I wanted to die and then I left my body"; "after I tried to end my life I was shown how much I was loved".
- Structured and phrase counts: trigger_category suicide_attempt 171 and overdose 217 videos; suicide_related flag on 443, self_harm 277.
- Candidate clips:
  - `BIzQz44w6pM` · Pegi Robinson - NDE TV · 240 archive views · [47:27](https://www.youtube.com/watch?v=BIzQz44w6pM&t=2847) · "I was going to have to pick myself back up and keep moving forward. Uh, but I wouldn't wouldn't remember those when I woke up that day. I just remembered having an experience and I woke up knowing that I no longer wanted..."
  - `WLpv8ODs8sk` · Beyond with Heather Tesch · 6,015 archive views · [24:39](https://www.youtube.com/watch?v=WLpv8ODs8sk&t=1479) · "And I remember when I saw myself making, completing suicide, there was ultimate love."
  - `aBHHrCr_AnA` · Pegi Robinson - NDE TV · 2,454 archive views · [1:08](https://www.youtube.com/watch?v=aBHHrCr_AnA&t=68) · "And so I have gone through a lot of, um, depression in my life, suicide attempts, and those have led me to my, uh, near-death experiences. I've had two that I can say for sure are near-death experiences."
  - `fyQqtBx7PTY` · NDE Video · 4,583 archive views · [0:11](https://www.youtube.com/watch?v=fyQqtBx7PTY&t=11) · "Before I had my near-death experience, I was in depression and I had given up on life."

**Visual plan:** Host 55%, archive 25%, stock 15%, motion graphics 5%.

**Risks:** Highest sensitivity: 20 of 71 matching videos flagged suicide_related, 13 self_harm. Must follow safe-messaging guidelines (no method detail, crisis line on screen), and get a clinician review before publishing. Content-safety flags across the 71 semantic-hit videos: suicide_related 20/71, self_harm 13/71, child_death 0/71, distressing_content 28/71, medical_graphic 18/71; moderate or severe warning level 30/71.

**Scores:** Demand 6 · Archive 6 · Emotional 9 · Shareability 5 · Uniqueness 7 · Production ease 4 → **weighted 6.35** (rank 22)

### 13. Do Pets Wait for Us?

**Working title:** People Who Died Say Their Pets Were Waiting  
**Alternates:** Do Dogs Go to Heaven? 177 Near-Death Experiences Answer / The Dog Who Met Her at the Other Side  
**Thumbnail:** Dog silhouette in golden light looking back. Text: "THEY WAITED"

**Hook (first 10 seconds):** "When she died, the first one to reach her wasn't a person."

**Story arc:** Animals in the archive as greeters and guides, with the honest count (they're rarer than people hope).

**Why it will get views and shares**

- Demand evidence: [She Died for Four Days... and Her Dead Dog Was Already Waiting (NDE Journey, 2026-03-16)](https://www.youtube.com/watch?v=GtokV_O3s0Y), 490,202 views.
- Context: "Her Dead Dog Was Already Waiting" is at 490k; the site's six Pets Big Questions show steady interest.
- Emotional driver: Love and grief for animals.
- Shareability: Very high on Facebook and Instagram pet communities.
- Comment bait: Who's the pet you hope is waiting? Drop their name.

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **67 moments in 55 confirmed NDE videos** for "my dog that had died came running to me"; "my pets were there on the other side".
- Structured and phrase counts: 177 videos code an animal entity; exact phrase "pets" in 420 videos.
- Candidate clips:
  - `rm-FQMpOuA0` · Tia Renee · 4,816 archive views · [5:25](https://www.youtube.com/watch?v=rm-FQMpOuA0&t=325) · "So she was coming towards me and next to her was my first um dog, my first pet who had crossed over."
  - `FDRKjLWaark` · Outstanding Near-Death Experiences · 2,317 archive views · [4:41](https://www.youtube.com/watch?v=FDRKjLWaark&t=281) · "Our dog, who had died three weeks before, our Maggie suddenly appeared before the gurney and looked at me. I was, I was just totally amazed."
  - `BzlWDe0lYeM` · NDE Radio with Lee Witting · 3,323 archive views · [16:05](https://www.youtube.com/watch?v=BzlWDe0lYeM&t=965) · "I felt my dead dog's individual presence behind me."
  - `jzanS184Y6c` · Divine Encounters NDE · 6,006 archive views · [5:37](https://www.youtube.com/watch?v=jzanS184Y6c&t=337) · "Pets that had crossed over were there."

**Visual plan:** Host 35%, archive 30%, stock 30% (animals), motion graphics 5%.

**Risks:** Smaller evidence base (177 videos code an animal entity; many hits are hosts talking about pets rather than experiencers meeting them). One good clip (FDRKjLWaark) is a reposted TV segment. Content-safety flags across the 55 semantic-hit videos: suicide_related 2/55, self_harm 1/55, child_death 0/55, distressing_content 3/55, medical_graphic 9/55; moderate or severe warning level 3/55.

**Scores:** Demand 7 · Archive 5 · Emotional 9 · Shareability 9 · Uniqueness 7 · Production ease 8 → **weighted 7.40** (rank 13)

### 20. Time Doesn't Exist There

**Working title:** People Who Died Say Time Stopped Existing  
**Alternates:** Years in Minutes: How Time Works on the Other Side / "Everything Was Happening at Once"  
**Thumbnail:** Melting clock face dissolving into stars. Text: "NO TIME"

**Hook (first 10 seconds):** "Four minutes on the operating table. Months, by her count."

**Story arc:** Time distortion (58.9% of coded accounts) and the physics-curious framings, ending on what "an eternal now" means for daily life.

**Why it will get views and shares**

- Demand evidence: [What you'll see when you die (The Opening, 2026-05-15)](https://www.youtube.com/watch?v=KJg1-FCweWI), 2,617,798 views; [He Studied 2K Near-Death Experiences... (Next Level Soul Podcast, 2026-04-28)](https://www.youtube.com/watch?v=66NBO177liM), 663,279 views.
- Context: No standalone breakout found; it rides inside the big "what happens when you die" videos.
- Emotional driver: Mind-bending curiosity.
- Shareability: Physics and philosophy crossover.
- Comment bait: Have you ever had a moment where time stopped?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **73 moments in 61 confirmed NDE videos** for "there was no time there it was all happening at once"; "it felt like years but it was only minutes".
- Structured and phrase counts: time_distortion core element in 3,795 of 6,438 (58.9%).
- Candidate clips:
  - `oR0Ezlr3eos` · The Other Side NDE · 55,829 archive views · [15:03](https://www.youtube.com/watch?v=oR0Ezlr3eos&t=903) · "You know, like time doesn't exist at all. So it felt like whatever was happening in the past, in the present, and now, was all happening at once."
  - `eWPZF2HFduE` · Love Covered Life Podcast · 16,439 archive views · [3:19](https://www.youtube.com/watch?v=eWPZF2HFduE&t=199) · "There was no time, past, present, future, all happening at the same time."
  - `YIVBTT-Q4Kg` · Tia Renee · 471 archive views · [6:11](https://www.youtube.com/watch?v=YIVBTT-Q4Kg&t=371) · "So there wasn't a time. Everything was happening at once."
  - `VwjP938ypq0` · Thanatos TV EN · 31,171 archive views · [15:10](https://www.youtube.com/watch?v=VwjP938ypq0&t=910) · "It felt like an eternity, but it wasn't really that long."
  - `q0xDNyKmwr0` · Beyond with Heather Tesch · 5,931 archive views · [7:28](https://www.youtube.com/watch?v=q0xDNyKmwr0&t=448) · "It was all happening simultaneously."

**Visual plan:** Host 35%, archive 30%, motion graphics 30%, stock 5%.

**Risks:** Low sensitivity; risk of overclaiming physics. Keep quantum talk as Tom's curiosity, not evidence. Content-safety flags across the 61 semantic-hit videos: suicide_related 7/61, self_harm 3/61, child_death 1/61, distressing_content 9/61, medical_graphic 7/61; moderate or severe warning level 9/61.

**Scores:** Demand 6 · Archive 8 · Emotional 6 · Shareability 6 · Uniqueness 6 · Production ease 8 → **weighted 6.60** (rank 20)

### 11. Shared-Death Experiences: When the Living Go Partway

**Working title:** They Didn't Die, but They Went Partway With Someone Who Did  
**Alternates:** Shared-Death Experiences: The Living Feel It Too / At the Bedside, Something Left the Room With Them  
**Thumbnail:** Two hands, one fading into light. Text: "I WENT WITH HER"

**Hook (first 10 seconds):** "You don't have to be dying to see it. Sometimes you only have to be holding the hand of someone who is."

**Story arc:** SDEs (173 typed in the archive) as the bridge between NDEs and deathbed visions; what caregivers and families report.

**Why it will get views and shares**

- Demand evidence: [What Nobody Tells You About Death | The Living Feel It Too (The Why Files, 2026-03-27)](https://www.youtube.com/watch?v=xauvaJ1kTBo), 1,990,856 views; [The Deathbed Doctor: Weeks Before Death, Patients Start Having Visions (The Diary Of A CEO, 2026-10-19)](https://www.youtube.com/watch?v=GlaSnROMqRY), 4,584,038 views.
- Context: The Why Files episode on this exact idea is at 1.99M; Raymond Moody's shared-death framing is widely searched but the archive's SDE material has never been featured on the site (blog has one SDE story).
- Emotional driver: Grief and connection.
- Shareability: Hospice and caregiver communities.
- Comment bait: Were you there when someone died? What did you notice?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **72 moments in 66 confirmed NDE videos** for "when my mother died I left my body with her"; "I felt myself go with him as he was dying".
- Structured and phrase counts: experience_type sde: 173 videos. Exact phrase "shared death" in 203 videos.
- Candidate clips:
  - `B_EDuAMTf9I` · NDE Radio with Lee Witting · 4,639 archive views · [25:36](https://www.youtube.com/watch?v=B_EDuAMTf9I&t=1536) · "I saw my mother reach out to my father and lift him into her light, cradling him in her arms. Then I saw the light begin to fade and disappear from my vision."
  - `RXn4pLfoNbs` · Tia Renee · 607 archive views · [33:53](https://www.youtube.com/watch?v=RXn4pLfoNbs&t=2033) · "My mother passed away in 2004 of metastasized uterine cancer. And I helped her cross. And and I, she came to me when she crossed, so I had a little bit of a shared death experience with her. And so part of that knowing, ..."
  - `7_mSPxColVI` · Anthony Chene production · 1,927,279 archive views · [24:08](https://www.youtube.com/watch?v=7_mSPxColVI&t=1448) · "My own mother's passing, um, in April of 2012, I stood right beside my mother when my mother passed away, and within an hour of my mother's passing, my mother spoke to me. She told me, 'I've made it. I've crossed over. I..."
  - `qQH5TYFMCAs` · Logical-NDE · 4,306 archive views · [3:17](https://www.youtube.com/watch?v=qQH5TYFMCAs&t=197) · "I had felt him prior to my death, I knew he was with me, he did not abandon me the whole time I was dying."

**Visual plan:** Host 45%, archive 30%, stock 15%, motion graphics 10%.

**Risks:** Semantic hits are noisier here; build the clip list from experience_type = sde. 10 of 66 matching videos carry suicide_related flags. Content-safety flags across the 66 semantic-hit videos: suicide_related 10/66, self_harm 8/66, child_death 0/66, distressing_content 14/66, medical_graphic 12/66; moderate or severe warning level 11/66.

**Scores:** Demand 8 · Archive 5 · Emotional 9 · Shareability 8 · Uniqueness 8 · Production ease 7 → **weighted 7.50** (rank 11)

### 7. What the Dying See Before They Go

**Working title:** Weeks Before Death, the Dying See Them. People Who Came Back Explain.  
**Alternates:** Deathbed Visions vs Near-Death Experiences: The Same People Show Up / Who They Reach For at the End  
**Thumbnail:** Elderly hand reaching toward a bright doorway. Text: "THEY SEE THEM"

**Hook (first 10 seconds):** "Ask any hospice nurse: near the end, the dying start talking to people in the corner of the room."

**Story arc:** Kerr's hospice research and caregiver accounts in the archive, compared with what NDErs report meeting.

**Why it will get views and shares**

- Demand evidence: [The Deathbed Doctor: Weeks Before Death, Patients Start Having Visions (The Diary Of A CEO, 2026-10-19)](https://www.youtube.com/watch?v=GlaSnROMqRY), 4,584,038 views; [The PSYCHIC Paramedic Who Saw HUNDREDS of SOULS Rise Out of the DYING (Next Level Soul, 2026-07-28)](https://www.youtube.com/watch?v=f0INCWLN3Fs), 213,900 views.
- Context: The DOAC episode (4.58M in two weeks) makes this the hottest adjacent topic right now. The archive is about survivors, so its deathbed material is second-hand (nurses, relatives); that is why it works better as a section of the #1 topic than as its own video.
- Emotional driver: Grief and reassurance.
- Shareability: Very high: comment sections fill with family stories.
- Comment bait: Did someone you love see someone at the end?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **69 moments in 58 confirmed NDE videos** for "before he died he was talking to his dead mother in the room"; "in hospice patients see their loved ones before they die".
- Structured and phrase counts: Exact phrase "hospice" in 320 videos. No coded deathbed field; accounts are second-hand (caregivers, relatives).
- Candidate clips:
  - `M4MqiKcVOFU` · NDE Accounts - Afterlife Stories · 173,745 archive views · [4:47](https://www.youtube.com/watch?v=M4MqiKcVOFU&t=287) · "When my mom was dying of cancer, she looked up to one corner of the room and started mumbling something."
  - `JsEOk4tZJlA` · Tales Of Resilience · 131,101 archive views · [54:34](https://www.youtube.com/watch?v=JsEOk4tZJlA&t=3274) · "Adult hospice patients often saw their family members, and they would come in, and they would be speaking to them."
  - `hhADKDdhTTk` · NDE Radio with Lee Witting · 8,461 archive views · [19:47](https://www.youtube.com/watch?v=hhADKDdhTTk&t=1187) · "And I would always let them talk about it, and I would ask them questions about it. But my own father saw his father. I was with him when he died, and he even said, you know, he sat up after being pretty much unconscious..."
  - `bdQMhfXmIsQ` · NDE Radio with Lee Witting · 739 archive views · [14:03](https://www.youtube.com/watch?v=bdQMhfXmIsQ&t=843) · "In a hospice, they see a lot of deathbed visions where people who are dying see their loved ones who have passed on, or they might see a spiritual figure."
  - `QuAePSvxbOs` · IANDS · 11,507 archive views · [2:14](https://www.youtube.com/watch?v=QuAePSvxbOs&t=134) · "And my dad and my, my mom's sister, my aunt, were in, um, in the room with me, um, with grandma, when she died. And as she took her last breath, all three of us, my dad, my aunt, and myself, turned and looked at the uppe..."

**Visual plan:** Host 45%, archive 25%, stock 20%, motion graphics 10%.

**Risks:** Second-hand testimony; label it. Avoid medical claims about what visions mean. Content-safety flags across the 58 semantic-hit videos: suicide_related 1/58, self_harm 1/58, child_death 4/58, distressing_content 9/58, medical_graphic 4/58; moderate or severe warning level 7/58.

**Scores:** Demand 9 · Archive 5 · Emotional 9 · Shareability 8 · Uniqueness 7 · Production ease 7 → **weighted 7.65** (rank 7)

### 16. Signs After Death

**Working title:** After They Died, They Came Back to Say One Thing  
**Alternates:** The Signs People Say Their Loved Ones Sent / After-Death Communication: What the Archive Shows  
**Thumbnail:** Feather on a windowsill in morning light. Text: "A SIGN?"

**Hook (first 10 seconds):** "A month after he died, she says he woke her up to warn her about their son."

**Story arc:** After-death communications (77 typed) and the visitations inside NDE accounts; the ones with a checkable detail.

**Why it will get views and shares**

- Demand evidence: [How Loved Ones Communicate After Death (Oprah, 2025-11-18)](https://www.youtube.com/watch?v=5bSR6Ts73Bs), 2,942,077 views; [You're Probably Ignoring the Signs Your Dead Loved Ones Are Sending (Gabby Bernstein, 2026-08-10)](https://www.youtube.com/watch?v=3E_GpFBRSJo), 415,009 views.
- Context: Oprah's medium interview on loved ones communicating is at 2.94M; Gabby Bernstein's "signs" video 415k.
- Emotional driver: Grief and longing for contact.
- Shareability: Grief groups.
- Comment bait: What sign did you get? Tell us.

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **70 moments in 63 confirmed NDE videos** for "after she died she came to me and gave me a sign"; "my father visited me after he passed away".
- Structured and phrase counts: experience_type adc: 77 videos.
- Candidate clips:
  - `tnHgYKxXYjg` · NDE Radio with Lee Witting · 1,098 archive views · [10:16](https://www.youtube.com/watch?v=tnHgYKxXYjg&t=616) · "And I said, "What happened to you?" Oh, he said, "Mom, it happened so soon after Dad died, I didn't want to bother you. And I told everybody not to tell you.""
  - `x-b9ltoFOk8` · T&H - Afterlife · 313,819 archive views · [3:50](https://www.youtube.com/watch?v=x-b9ltoFOk8&t=230) · "I encountered my deceased father. My father had died 10 years prior, and I felt that he was there to greet me, and he wanted me to know that it wasn't my time."
  - `rH1f-LLUBfw` · Afterlife Experiences · 17,886 archive views · [13:53](https://www.youtube.com/watch?v=rH1f-LLUBfw&t=833) · "At some point she told me that someone had been in the room and so on and then we agreed that when she is over there she would give me a sign any sign."
  - `fQ5MkUTZT8U` · NDE Radio with Lee Witting · 1,722 archive views · [21:55](https://www.youtube.com/watch?v=fQ5MkUTZT8U&t=1315) · "My both my parents came to me after they passed on."

**Visual plan:** Host 45%, archive 30%, stock 20%, motion graphics 5%.

**Risks:** Overlaps with mediumship content the archive isn't built for; easy to drift into unverifiable claims. Content-safety flags across the 63 semantic-hit videos: suicide_related 7/63, self_harm 4/63, child_death 2/63, distressing_content 14/63, medical_graphic 7/63; moderate or severe warning level 10/63.

**Scores:** Demand 8 · Archive 5 · Emotional 8 · Shareability 8 · Uniqueness 5 · Production ease 7 → **weighted 7.00** (rank 16)

### 24. They Came Back Different: Intuition, Electronics, Abilities

**Working title:** After They Died, Their Watches Stopped Working  
**Alternates:** The Strange Abilities People Bring Back From Near-Death Experiences / "I Could Hear People's Thoughts": Life After an NDE  
**Thumbnail:** Light bulb flickering beside a person. Text: "CAME BACK WIRED"

**Hook (first 10 seconds):** "Since her near-death experience, she says she goes through a watch a month."

**Story arc:** The psychic and expanded-perception domain (present in about 43% of transformation analyses), from electronics trouble to intuition, plus the cost of it.

**Why it will get views and shares**

- Demand evidence: [Sharon Stone Saw the Afterlife: 5 Alien Orbs Told Her to Stay (Dr. Mayim Bialik, 2026-09-08)](https://www.youtube.com/watch?v=7hsvA4-zWAI), 2,265,866 views; [The PSYCHIC Paramedic Who Saw HUNDREDS of SOULS Rise Out of the DYING (Next Level Soul, 2026-07-28)](https://www.youtube.com/watch?v=f0INCWLN3Fs), 213,900 views.
- Context: Psychic-ability content performs on the big spiritual podcasts (Next Level Soul guests at 0.2M-0.9M).
- Emotional driver: Curiosity and "is this happening to me?"
- Shareability: Experiencer communities.
- Comment bait: Has anything strange happened to you since a near-miss?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **71 moments in 67 confirmed NDE videos** for "after I came back I could sense things about people"; "since my near death experience electronics go haywire around me".
- Structured and phrase counts: Psychic and expanded perception domain present in 43.3% of transformation analyses, 486 coded as new (ATLAS-stats 2.3); exact phrase "electronics" in 222 videos.
- Candidate clips:
  - `KUCVoQUHksE` · The Other Side NDE · 118,739 archive views · [10:47](https://www.youtube.com/watch?v=KUCVoQUHksE&t=647) · "And so, when I came back, something did happen to me. I started to feel energy much more stronger than I ever did. I'd be around people and I'd know things. Not that I wanted to know these things, but I would know things..."
  - `G378QaqMvGg` · Round Trip Death · 1,900 archive views · [40:11](https://www.youtube.com/watch?v=G378QaqMvGg&t=2411) · "I had come back with medical intuition blown wide open, I could feel people's pain, I could hear people's thoughts."
  - `vx9n4fwtMwA` · NDE Accounts - Afterlife Stories · 26,113 archive views · [14:49](https://www.youtube.com/watch?v=vx9n4fwtMwA&t=889) · "What happened after these near-death experiences? I had a lot of electrical interference; my watches would stop and televisions would turn on."
  - `VbvV4etSRoY` · Crossing Over NDE · 7,434 archive views · [8:55](https://www.youtube.com/watch?v=VbvV4etSRoY&t=535) · "I could sense people's feelings about me. I I could sense if they like me. I could sense if they were not a good person. It's just something that was attached to me."
  - `unb7PmmXRUQ` · Crossing Over NDE · 2,942 archive views · [1:55](https://www.youtube.com/watch?v=unb7PmmXRUQ&t=115) · "I found that I could walk by a house and know what was happening inside it. I could almost taste people, knowing what they were like without really meeting them. I seemed to know what people were thinking."

**Visual plan:** Host 40%, archive 35%, stock 15%, motion graphics 10%.

**Risks:** Extraordinary claims; present as reports. Tom's own post-experience mediumship would need careful handling if mentioned. Content-safety flags across the 67 semantic-hit videos: suicide_related 9/67, self_harm 5/67, child_death 3/67, distressing_content 9/67, medical_graphic 5/67; moderate or severe warning level 8/67.

**Scores:** Demand 6 · Archive 6 · Emotional 6 · Shareability 6 · Uniqueness 6 · Production ease 8 → **weighted 6.20** (rank 24)

### 23. Colors That Don't Exist Here

**Working title:** Colors That Don't Exist on Earth: What People Who Died Saw  
**Alternates:** The Music They Heard When They Died / Describing the Indescribable  
**Thumbnail:** Impossible gradient swatch. Text: "NOT ON EARTH"

**Hook (first 10 seconds):** "She says the colors there don't exist on Earth. So what did she actually see?"

**Story arc:** Ineffability: colors and music that resist description, and how people try.

**Why it will get views and shares**

- Demand evidence: [She saw colors that don't exist on Earth NDE (The Chatta, 2026-06-27, Short)](https://www.youtube.com/watch?v=bV2zLxQqGzQ), 830 views.
- Context: Weak standalone demand (2026 Shorts on this exact phrase get under 1k views). Better as a segment.
- Emotional driver: Wonder.
- Shareability: Visual Short only.
- Comment bait: Describe the most beautiful color you've ever seen.

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **67 moments in 61 confirmed NDE videos** for "colors that don't exist here on earth"; "the music was more beautiful than anything on earth".
- Structured and phrase counts: Exact phrase "colors" in 2,624 videos, "music" in 2,063; celestial_music in 554 journey sequences.
- Candidate clips:
  - `vYIOAUtA3Oo` · Thanatos TV EN · 261,983 archive views · [11:06](https://www.youtube.com/watch?v=vYIOAUtA3Oo&t=666) · "Those colors don't exist on earth."
  - `1jyu35n9SnU` · Afterlife Experiences · 128,649 archive views · [8:34](https://www.youtube.com/watch?v=1jyu35n9SnU&t=514) · "I saw other colors, pastel colors that we don't have here on earth."
  - `rH1f-LLUBfw` · Afterlife Experiences · 17,886 archive views · [6:04](https://www.youtube.com/watch?v=rH1f-LLUBfw&t=364) · "There were colors you can't imagine here on Earth."
  - `W3o28Zw3-D8` · Love Covered Life Podcast · 26,025 archive views · [18:35](https://www.youtube.com/watch?v=W3o28Zw3-D8&t=1115) · "Except that the colors were not of Earth."

**Visual plan:** Host 30%, archive 30%, motion graphics 30%, stock 10%.

**Risks:** Low sensitivity, low demand. Content-safety flags across the 61 semantic-hit videos: suicide_related 3/61, self_harm 2/61, child_death 0/61, distressing_content 7/61, medical_graphic 7/61; moderate or severe warning level 5/61.

**Scores:** Demand 5 · Archive 8 · Emotional 6 · Shareability 6 · Uniqueness 5 · Production ease 8 → **weighted 6.25** (rank 23)

### 10. Jesus, Krishna or No One: Whose Heaven Is It?

**Working title:** Christians Saw Jesus. Others Didn't. What 2,500 Near-Death Experiences Say About Religion  
**Alternates:** "There Is No Religion in Heaven"? The Archive Disagrees With Itself / Who Do People of Different Faiths Meet When They Die?  
**Thumbnail:** Split frame: cathedral window and starfield. Text: "WHOSE HEAVEN?"

**Hook (first 10 seconds):** "39 percent of the near-death experiences in our archive meet a religious figure. Which one depends on who's telling the story, and that's the most interesting finding we have."

**Story arc:** Religious figures by tradition, the experiencers who say there is no religion there, and the conversions in both directions.

**Why it will get views and shares**

- Demand evidence: [Dead 44 Hours! Jesus Revealed Heaven's Greatest Mysteries (God Encounters with Janie DuVall, 2025-11-07)](https://www.youtube.com/watch?v=FVLvRCVsKNU), 2,960,233 views; [He Died For a Minute and Saw Jesus (Emotia, 2026-03-21, Short)](https://www.youtube.com/watch?v=canMzorsH8A), 3,839,848 views; [What Happens After Death? | Does Aatma really Exist? (Dhruv Rathee, 2026-07-19)](https://www.youtube.com/watch?v=fFMcolWgD3w), 15,200,678 views.
- Context: Jesus-centred NDE videos are the highest-volume niche (2.96M long-form, 3.84M Short); Dhruv Rathee's religion-and-afterlife explainer is at 15.2M.
- Emotional driver: Identity and belonging.
- Shareability: High; also high conflict.
- Comment bait: Did the accounts match what your tradition taught you?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **66 moments in 56 confirmed NDE videos** for "there is no religion in heaven"; "I met Jesus and he loved me unconditionally".
- Structured and phrase counts: religious_figure entity in 2,534 of 6,454 videos (39.3%); exact phrase "Jesus" in 2,318 videos, "religion" in 1,888.
- Candidate clips:
  - `k1nRZ0mQWZQ` · The Other Side NDE · 114,591 archive views · [5:07](https://www.youtube.com/watch?v=k1nRZ0mQWZQ&t=307) · "Jesus already knew who I was, and He loved me regardless of my successes and failures."
  - `HnoRLcSrNmI` · Logical-NDE · 3,311 archive views · [19:17](https://www.youtube.com/watch?v=HnoRLcSrNmI&t=1157) · "He said, 'Well, when you come to heaven, there is no religion."
  - `_mjkXjMAliw` · Beyond with Heather Tesch · 8,427 archive views · [19:55](https://www.youtube.com/watch?v=_mjkXjMAliw&t=1195) · "Jesus was unconditional love for all, it was God's love manifested to me, that's how I felt it, that it was God's love manifested."
  - `gpPurcd_ERU` · NDE Radio with Lee Witting · 44,489 archive views · [31:49](https://www.youtube.com/watch?v=gpPurcd_ERU&t=1909) · "But I met Jesus."
  - `kdUC6pTB5CQ` · NDE Radio with Lee Witting · 6,396 archive views · [5:58](https://www.youtube.com/watch?v=kdUC6pTB5CQ&t=358) · "Clearly, that is not what Jesus, Jesus said, and NDE affirm. There's no religion in heaven, only love."

**Visual plan:** Host 45%, archive 35%, motion graphics 15%, stock 5%.

**Risks:** Comment-section conflict and creator-reputation risk; religious figures are not split by name in structured fields, so counts by tradition need a manual coding pass. Content-safety flags across the 56 semantic-hit videos: suicide_related 1/56, self_harm 1/56, child_death 1/56, distressing_content 7/56, medical_graphic 7/56; moderate or severe warning level 6/56.

**Scores:** Demand 8 · Archive 8 · Emotional 7 · Shareability 8 · Uniqueness 8 · Production ease 6 → **weighted 7.60** (rank 10)

### 21. Aliens Inside Near-Death Experiences

**Working title:** They Died and Met Beings That Weren't Angels  
**Alternates:** Where Near-Death Experiences and UFO Encounters Overlap / The People Who Had Both: an NDE and a Contact Experience  
**Thumbnail:** Silhouette in a tunnel of light with a non-human outline at the end. Text: "NOT ANGELS"

**Hook (first 10 seconds):** "Project Profound holds 6,454 near-death experiences and 8,394 UFO accounts. A handful of people appear in both."

**Story arc:** Non-human beings in NDEs (greys, mantids, "fish-like humanoids"), the NDE-plus-UAP hybrids that top the UAP transformation scores, and Keith Thompson's argument that the two overlap.

**Why it will get views and shares**

- Demand evidence: [Sharon Stone Saw the Afterlife: 5 Alien Orbs Told Her to Stay (Dr. Mayim Bialik, 2026-09-08)](https://www.youtube.com/watch?v=7hsvA4-zWAI), 2,265,866 views.
- Context: Sharon Stone's "5 alien orbs" NDE interview is at 2.27M; no other channel can cross-search both corpora.
- Emotional driver: Curiosity and novelty.
- Shareability: UFO and NDE communities rarely overlap; this is the bridge.
- Comment bait: Angels, aliens, or the same thing described twice?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **60 moments in 58 confirmed NDE videos** for "the beings I met when I died were extraterrestrials"; "during my near death experience I was shown other planets and alien beings".
- Structured and phrase counts: NDE side: exact phrase "aliens" in 353 videos, "spaceship" in 115. UAP side (--domain uap, min-sim 0.50): "I left my body and found myself aboard the craft" 40 moments / 36 videos; "I died and the beings I met showed me there is no death" 33 / 31.
- Candidate clips:
  - `KUCVoQUHksE` · The Other Side NDE · 118,739 archive views · [15:35](https://www.youtube.com/watch?v=KUCVoQUHksE&t=935) · "So, that's always interesting as well. You never know quite who you're going to meet. I certainly didn't know. I certainly didn't know I was going to meet two fishlike humanoid beings with feathered hair. That's for sure..."
  - `azJY-VrFt8w` · NDE Radio with Lee Witting · 9,506 archive views · [14:11](https://www.youtube.com/watch?v=azJY-VrFt8w&t=851) · "I traveled to another planet and saw a different alien species. I did see my body there. It was deformed like a person with a disabling disease. I heard from my guide, whose voice I heard but I couldn't see who it was fr..."
  - `8hOabMYEGEo` · Round Trip Death · 1,152 archive views · [22:19](https://www.youtube.com/watch?v=8hOabMYEGEo&t=1339) · "The beings I met in this near-death experience, they don't, they were human beings like us, but we made of light."
  - `6oDB4BzndCQ` · The Other Side NDE · 47,439 archive views · [0:00](https://www.youtube.com/watch?v=6oDB4BzndCQ&t=0) · "I'm Keith Thompson and I'm the author of a new book this year called the UFO Paradox."

**Visual plan:** Host 40%, archive 30% (both corpora), motion graphics 25%, stock 5%.

**Risks:** Easy to sensationalise. UAP semantic hits are sparse (15-36 videos per query) and the UAP corpus is mostly not first-person. Content-safety flags across the 58 semantic-hit videos: suicide_related 8/58, self_harm 4/58, child_death 1/58, distressing_content 6/58, medical_graphic 4/58; moderate or severe warning level 8/58.

**Scores:** Demand 7 · Archive 5 · Emotional 6 · Shareability 7 · Uniqueness 10 · Production ease 6 → **weighted 6.60** (rank 21)

### 6. "Dying Doesn't Hurt": Why They Lost the Fear of Death

**Working title:** People Who Died Say They're No Longer Afraid of Death. Here's Why.  
**Alternates:** What Dying Actually Feels Like, From 6,454 People Who Did It / The Fear Leaves and Doesn't Come Back  
**Thumbnail:** Calm face with eyes closed, soft light. Text: "NOT AFRAID"

**Hook (first 10 seconds):** "Fear of death drops in nearly every account in our archive. Not most. Nearly every."

**Story arc:** The attitude-toward-death domain (fear falls in ~5,900 transformation analyses), what dying felt like moment to moment, and the exceptions.

**Why it will get views and shares**

- Demand evidence: [What you'll see when you die (The Opening, 2026-05-15)](https://www.youtube.com/watch?v=KJg1-FCweWI), 2,617,798 views; [Dead for 7 Minutes. He Knows What Happens After We Die | John J Davis (Dr. Mayim Bialik, 2026-03-31)](https://www.youtube.com/watch?v=Y9ifwLfoYn4), 2,143,348 views.
- Context: "What happens when you die" is the core search; fear-of-death framing suits the anxious viewer.
- Emotional driver: Relief from death anxiety.
- Shareability: Shared with sick or elderly relatives.
- Comment bait: What scares you most about dying: the pain, the unknown, or leaving people?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **71 moments in 61 confirmed NDE videos** for "I am no longer afraid of death"; "dying didn't hurt at all it was peaceful".
- Structured and phrase counts: Attitude-toward-death domain moves down (fear falls) in 5,893 of 6,295 analyses (ATLAS-stats 2.3); exact phrase "fear of death" in 599 videos.
- Candidate clips:
  - `xp7eYWh1J0w` · T&H - Afterlife · 741,973 archive views · [13:19](https://www.youtube.com/watch?v=xp7eYWh1J0w&t=799) · "I've got no fear of death now."
  - `vYIOAUtA3Oo` · Thanatos TV EN · 261,983 archive views · [20:17](https://www.youtube.com/watch?v=vYIOAUtA3Oo&t=1217) · "I personally no longer have any fear of death."
  - `dj3ZWLxXnDM` · Thanatos TV EN · 50,708 archive views · [27:36](https://www.youtube.com/watch?v=dj3ZWLxXnDM&t=1656) · "I was no longer afraid of death."
  - `QJEpWHPdVyE` · Round Trip Death · 15,198 archive views · [13:27](https://www.youtube.com/watch?v=QJEpWHPdVyE&t=807) · "I'm not afraid of death anymore."
  - `c9pnuJ24B6o` · Heaven Awaits · 9,255 archive views · [13:44](https://www.youtube.com/watch?v=c9pnuJ24B6o&t=824) · "I'm not afraid of dying anymore."

**Visual plan:** Host 40%, archive 40%, motion graphics 15%, stock 5%.

**Risks:** Must not suggest death is desirable; 12 of 61 matching videos carry suicide_related flags. Content-safety flags across the 61 semantic-hit videos: suicide_related 12/61, self_harm 5/61, child_death 2/61, distressing_content 13/61, medical_graphic 10/61; moderate or severe warning level 13/61.

**Scores:** Demand 7 · Archive 9 · Emotional 8 · Shareability 7 · Uniqueness 6 · Production ease 9 → **weighted 7.70** (rank 6)

### 18. "I Chose This Life": Pre-Birth Memories

**Working title:** People Who Died Say They Chose This Life Before They Were Born  
**Alternates:** Did You Plan Your Life Before You Were Born? / The Pre-Birth Plan, and Why It Breaks Down  
**Thumbnail:** Hands writing on a glowing scroll. Text: "I CHOSE THIS?"

**Hook (first 10 seconds):** "Some people come back saying they signed up for all of it, the pain included."

**Story arc:** Pre-birth planning accounts, tested against the hard cases (abuse, addiction) and the "plans are flexible" accounts.

**Why it will get views and shares**

- Demand evidence: [He Died and Saw Everything Before Life on Earth (NDE Mystery Diaries, 2026-09-23)](https://www.youtube.com/watch?v=1Ut0HNbSzAM), 2,627,697 views.
- Context: "He Died and Saw Everything Before Life on Earth" is at 2.63M in six weeks.
- Emotional driver: Meaning in suffering.
- Shareability: Spiritual communities.
- Comment bait: If you chose this life, what do you think you came to learn?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **72 moments in 59 confirmed NDE videos** for "I chose this life before I was born"; "I saw myself planning my life before I came here".
- Structured and phrase counts: No coded field; exact phrase "chose my parents" in 20 videos.
- Candidate clips:
  - `7MEH_fdNgEo` · Lamplighter · 18,898 archive views · [0:15](https://www.youtube.com/watch?v=7MEH_fdNgEo&t=15) · "I remembered that my soul chose to come to earth. I remembered where I was before I was born. What made me come back was that I had agreed to do this before I was born."
  - `Ht8fFjCAYNA` · Tia Renee · 3,439 archive views · [1:56](https://www.youtube.com/watch?v=Ht8fFjCAYNA&t=116) · "I remember being born. I remember conversations before I was born in choosing my family."
  - `pjxqvZQNFWY` · Sergei Davidoff · 4,093 archive views · [21:08](https://www.youtube.com/watch?v=pjxqvZQNFWY&t=1268) · "And my guide took me here to show me that all of us actually plan our lives ahead of time."
  - `W907DTdgUtE` · Beyond with Heather Tesch · 5,259 archive views · [19:27](https://www.youtube.com/watch?v=W907DTdgUtE&t=1167) · "People talk about this is a school. They say that you choose this life. And okay, I chose my life. And I have a million probable lives to live, even though I chose this one, because of all the choices I'm making. I know ..."

**Visual plan:** Host 45%, archive 35%, stock 10%, motion graphics 10%.

**Risks:** Morally fraught when applied to abuse or illness; can read as victim-blaming. Content-safety flags across the 59 semantic-hit videos: suicide_related 4/59, self_harm 2/59, child_death 4/59, distressing_content 10/59, medical_graphic 5/59; moderate or severe warning level 8/59.

**Scores:** Demand 7 · Archive 6 · Emotional 7 · Shareability 7 · Uniqueness 6 · Production ease 7 → **weighted 6.70** (rank 18)

### 25. They Were Shown the Future

**Working title:** People Who Died Say They Saw Their Future. Did It Happen?  
**Alternates:** Precognition in Near-Death Experiences: Checking the Claims / The Life Preview: Seeing Your Life Before It Happens  
**Thumbnail:** Calendar pages flying into light. Text: "DID IT HAPPEN?"

**Hook (first 10 seconds):** "At age eight he says he was shown his life to 58. He's now old enough to check."

**Story arc:** Personal life previews versus world predictions, checked against dates where possible.

**Why it will get views and shares**

- Demand evidence: [Boy Dies & Jesus Shows What's Coming for Trump in 2026! (Near-Death Experiences, 2025-12-06)](https://www.youtube.com/watch?v=9DKN4UUCSk0), 2,396,231 views.
- Context: Prophecy titles pull huge numbers (2.40M for a political prediction video) but that lane rewards claims the evidence can't back.
- Emotional driver: Curiosity and anxiety.
- Shareability: High but contentious.
- Comment bait: Would you want to see your future?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **57 moments in 47 confirmed NDE videos** for "I was shown the future and it came true"; "I saw events in my life that hadn't happened yet".
- Structured and phrase counts: future_visions in 726 of 5,685 journey sequences; precognition is the least-endorsed Greyson item. Exact phrase "came true" in 46 videos.
- Candidate clips:
  - `LSjrwes0QS4` · NDE Diary · 43,854 archive views · [6:47](https://www.youtube.com/watch?v=LSjrwes0QS4&t=407) · "And I saw events and things unfolding that I knew as I was watching them that I was watching my future self, that that is something that's going to happen to me."
  - `1jyu35n9SnU` · Afterlife Experiences · 128,649 archive views · [13:53](https://www.youtube.com/watch?v=1jyu35n9SnU&t=833) · "And at one point, I was shown the future of my life."
  - `TfdVH9d4y2M` · NDE Diary · 12,896 archive views · [13:52](https://www.youtube.com/watch?v=TfdVH9d4y2M&t=832) · "And I got to see the future."
  - `fZRLb9n6tec` · Thanatos TV EN · 25,175 archive views · [14:39](https://www.youtube.com/watch?v=fZRLb9n6tec&t=879) · "I saw my own future and the future of the Earth. I was shown a new Earth and a new Heaven."

**Visual plan:** Host 45%, archive 30%, motion graphics 20%, stock 5%.

**Risks:** Claims risk is high; precognition is the least-endorsed Greyson item. Don't publish predictions as forecasts. Content-safety flags across the 47 semantic-hit videos: suicide_related 2/47, self_harm 2/47, child_death 3/47, distressing_content 9/47, medical_graphic 9/47; moderate or severe warning level 5/47.

**Scores:** Demand 7 · Archive 5 · Emotional 6 · Shareability 7 · Uniqueness 6 · Production ease 6 → **weighted 6.20** (rank 25)

### 17. The Hardest Part Is Coming Back

**Working title:** Nobody Tells You What Happens After a Near-Death Experience  
**Alternates:** "Coming Back Was Worse Than Death": The Other Half of the Story / Heaven Ruined Normal Life for Them  
**Thumbnail:** Person sitting alone on a hospital bed edge, light fading. Text: "THEN WHAT?"

**Hook (first 10 seconds):** "Everyone wants to hear about the light. Almost nobody asks what Monday morning was like afterward."

**Story arc:** Depression, disbelief, marriages and careers after the NDE, and what helped (IANDS groups, purpose, telling the story).

**Why it will get views and shares**

- Demand evidence: [A Near Death Experience That Changes How You See Pain - JoAnna Oblander NDE (Laurie Majka, 2026-03-25)](https://www.youtube.com/watch?v=u2c7jrjQvvc), 122,955 views; [A Nurse's Near-Death Experience: A Life Review That Changed Everything (Coming Home, 2026-01-29)](https://www.youtube.com/watch?v=Qbvs1ncHcwo), 1,728,944 views.
- Context: Under-served: the site's Big Questions have almost nothing on aftermath, and Tom's own Drive essays (The Profound Nature of Trauma) are about this.
- Emotional driver: Recognition for experiencers.
- Shareability: Experiencer communities share it as "finally someone said it".
- Comment bait: If you've had an experience like this, what was the hardest part afterward?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **70 moments in 63 confirmed NDE videos** for "coming back was the hardest part I was depressed"; "nobody believed me when I came back".
- Structured and phrase counts: 190 videos score zero transformation (ATLAS-stats 2.3); exact phrase "nobody believed" in 30 videos.
- Candidate clips:
  - `7SW-1rKQIrg` · Coming Home · 971,004 archive views · [31:51](https://www.youtube.com/watch?v=7SW-1rKQIrg&t=1911) · "The hard part was coming back to me, that was worse than death."
  - `dtz7wp1b-iI` · IANDS · 15,583 archive views · [7:36](https://www.youtube.com/watch?v=dtz7wp1b-iI&t=456) · "I came back and nobody believed me, and I was pretty, uh, not happy for a couple days and, um, after a couple weeks, she stopped talking about it."
  - `9uQPuelkQT0` · NDE Radio with Lee Witting · 13,179 archive views · [14:53](https://www.youtube.com/watch?v=9uQPuelkQT0&t=893) · "Coming back is the hardest part. Everybody says this."
  - `u9O_LnT6eJU` · Dorothy Shelton · 10,743 archive views · [11:12](https://www.youtube.com/watch?v=u9O_LnT6eJU&t=672) · "It was really hard to come back."

**Visual plan:** Host 50%, archive 35%, stock 10%, motion graphics 5%.

**Risks:** Mental-health content; include support resources (IANDS sharing groups). Content-safety flags across the 63 semantic-hit videos: suicide_related 4/63, self_harm 3/63, child_death 1/63, distressing_content 11/63, medical_graphic 10/63; moderate or severe warning level 8/63.

**Scores:** Demand 5 · Archive 7 · Emotional 8 · Shareability 6 · Uniqueness 8 · Production ease 8 → **weighted 6.75** (rank 17)

### 19. Love vs Fear: NDEs and UFO Encounters Compared

**Working title:** We Compared 6,000 Near-Death Experiences With 8,000 UFO Encounters  
**Alternates:** Why Near-Death Experiences Feel Like Love and UFO Encounters Feel Like Fear / Same Light, Different Feeling?  
**Thumbnail:** Split screen: warm light vs cold craft light. Text: "64% vs 1%"

**Hook (first 10 seconds):** "In near-death experiences, 63.8% of the beings people meet are described as loving. In UFO encounters it's 1%."

**Story arc:** The archive's strongest cross-domain number, then the cases that break it (loving contact, terrifying NDEs), and what might set the tone.

**Why it will get views and shares**

- Demand evidence: [Sharon Stone Saw the Afterlife: 5 Alien Orbs Told Her to Stay (Dr. Mayim Bialik, 2026-09-08)](https://www.youtube.com/watch?v=7hsvA4-zWAI), 2,265,866 views.
- Context: No competitor can make this comparison; demand is niche but the Sharon Stone interview shows the audiences overlap.
- Emotional driver: Curiosity.
- Shareability: Data-viz Short.
- Comment bait: What do you think decides whether an encounter feels like love or fear?

**Archive evidence**

- Semantic search (moments, min-sim 0.50, capped near 40 per query): **16 moments in 15 confirmed NDE videos** for "the being radiated pure love toward me (UAP domain)".
- Structured and phrase counts: Entity emotional quality: loving 63.8% of NDE entity encounters vs 1.0% of UAP; fear 3.0% vs 24.1% (site viz_graph_cache cross-domain entry, ATLAS-stats 6). UAP (--domain uap, min-sim 0.50): "the being radiated pure love toward me" 16 moments / 15 videos.
- Candidate clips:
  - `6oDB4BzndCQ` · The Other Side NDE · 47,439 archive views · [4:46](https://www.youtube.com/watch?v=6oDB4BzndCQ&t=286) · "I saw friends that I knew who had died; I did see also an uncle that I had, did not know had died."
  - `KUCVoQUHksE` · The Other Side NDE · 118,739 archive views · [15:35](https://www.youtube.com/watch?v=KUCVoQUHksE&t=935) · "So, that's always interesting as well. You never know quite who you're going to meet. I certainly didn't know. I certainly didn't know I was going to meet two fishlike humanoid beings with feathered hair. That's for sure..."

**Visual plan:** Host 35%, archive 25% (both corpora), motion graphics 35%, stock 5%.

**Risks:** The figure comes from the site's cached cross-domain coding (ATLAS-stats section 6/8), not a fresh recount; say so on screen. Content-safety flags across the 15 semantic-hit videos: suicide_related n/a (UAP), self_harm n/a (UAP), child_death n/a (UAP), distressing_content n/a (UAP), medical_graphic n/a (UAP); moderate or severe warning level n/a (UAP).

**Scores:** Demand 6 · Archive 7 · Emotional 6 · Shareability 7 · Uniqueness 10 · Production ease 5 → **weighted 6.65** (rank 19)

## Decisions I made

- Worked on the session's designated branch `claude/confident-goldberg-l0rceu` rather than creating `claude/video-topics-script`; the environment requires that branch, and both rules say "not main".
- Used a fresh pull (6,454 confirmed NDEs) for every structured count instead of the atlas's 6,304, because the archive has grown and the video will be published now. Atlas figures are labelled where reused.
- Reported the semantic-search counts but did not use them for prevalence after finding the ~40-hit cap; structured fields and exact-phrase counts carry the scale claims.
- Weighted Demand and Archive strength highest (25% and 20%) because both are hard constraints for this channel.
- Ranked deathbed visions below the greeter topic and folded it into the #1 script as the cold open, because the archive is survivor testimony and its deathbed material is second-hand.
- Kept suicide-attempt NDEs on the list but scored production ease 4: it needs safe-messaging review before it is made.
- Checked public status only for the #1 script's clips (all via youtube_video_info); topic-list clips are candidates and were not each checked.
- Preferred on-camera experiencers over channels that narrate written accounts (for example HeavenIsReal, Spirit Travels, Prioritize Your Life, NDE Accounts - Afterlife Stories). Those still appear in some candidate lists and are flagged in the script's rights notes where relevant.

## Sources

- Kerr et al., end-of-life dreams and visions, summarised by Hospice Buffalo: https://hospicebuffalo.com/news/in-the-news/what-deathbed-visions-teach-us-about-living
- Greyson (2010), "Seeing Dead People Not Known to Have Died: Peak in Darien Experiences": https://psi-research-site.pages.dev/paper/greyson_2010_peak_in_darien and SPR Psi Encyclopedia entry https://psi-encyclopedia.spr.ac.uk/articles/bruce-greyson/
- YouTube view counts: links in each topic and the market snapshot, read 2026-11-03 via the YouTube Data tools.
- Archive: Supabase tables `nde_vids`, `nde_analysis`, `nde_punctuated_embeddings` (read-only), `research/corpus-atlas/*`.
