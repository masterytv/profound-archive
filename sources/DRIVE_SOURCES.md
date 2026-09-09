# Content Sources — Google Drive Index

> Tom's book manuscripts and project research notes live in **Google Drive**, not in this
> repo. This repo is public, so the actual text stays private in Drive — this file holds
> only pointers (titles, file IDs, links) so AI assistants can fetch content on demand.
> The Drive links below only open for accounts Tom has shared the files with.

## How to fetch these (AI assistants)

- In Claude sessions with the **Google Drive connector** attached (claude.ai web/desktop
  sessions on Tom's account have it), use the Drive tools: `read_file_content` with the
  exact `fileId` from the tables below. Never guess or retype IDs — copy them verbatim;
  a single wrong character returns "Entity not found".
- To list a folder's *current* contents live, use `search_files` with query
  `parentId = '<folder id>'`. Prefer that over this index when completeness matters —
  IDs here are stable, but folder contents drift.
- If no Google Drive tools are available in your session (e.g. a local CLI without the
  connector), say so and ask Tom to attach the Google Drive connector or paste the doc
  content into the chat. Do not commit book content into this repo.

## Book — *The Accidental Mystic*

Folder: [Book - The Accidental Mystic](https://drive.google.com/drive/folders/1uSpDZ8xE-qjpZqkm83oKinMH6bGoRgeH)
— folder ID `1uSpDZ8xE-qjpZqkm83oKinMH6bGoRgeH`

| Doc (Google Doc unless noted) | File ID | What it is |
|---|---|---|
| The Accidental Mystic | `1lc1JzqWTBVy7EMWGUK6aLYkdtbVuNLSS7M-RI6FEdUw` | Primary manuscript (most recently edited version) |
| The Accidental Mystic - Paperback | `1YnGdLAq-bqDlxhnfXdbKMaLOT38wv-IHnwKkSHfS7m0` | Paperback edition variant |
| The Accidental Mystic - Revised by AI | `1d5EY8Sr2jrmx3jJBeRrhRNgmy4y7hBsisGJEVYSNtdE` | Much shorter AI-revised draft (partial) |
| Book Outline and Key Ideas/Stories | `13DKRLPIyOnsxZVKQINMZhno8hwDPZ8aQu5BcLvkC6Jg` | Chapter-by-chapter outline, Preface → "Your Next Click" |
| Notes - The Accidental Mystic | `1OBt3J99nJ7JrUXrox4uaLZ-f6DsF1MABOc3CwSYnYK0` | Working notes for the book |
| Writing Style and Identity | `1sxFhGH4ZncLsxKSGZmgSS4hloO8b1ZVWXkb7FYNh7Uo` | Voice & style guide — read before writing in Tom's voice |
| Book Testimonials | `15_ByvnyDB9Alar11EG4XYDbZ24wkT5oS9dYwl5p3qNs` | Testimonials (Google Sheet) |
| Accidendal Mystic - Additional Ideas, Chapters, Covers | `1YIAxKs1A4oWHNgOd2dYDOplxNNi0iHT4yQadovp2RCs` | Extra ideas, chapters, cover concepts (~31 MB, image-heavy) |
| The Accidental Mystic Podcast | `1Ow7tmEIvRNEOkl4MGQw2q4LwKg8kPUxps1-lwgCI9_Q` | Podcast planning notes |
| My Life-Changing Experience Listening to My First NDE Video | `1GaD_VfLnCl-9RsU2ovNVYk3KkHvB663g2oGk13tjtkA` | Tom's origin-story essay |
| Proof of Love | `1p3wF3ZZ6dNXppgCgpO5XwE9hoETGkRAzjCqlu2Vr8vE` | Related earlier manuscript |
| Simple Spirituality | `12tlVkJPydkEKgSwaHGlbrvlAp4gZgghoitR_F8i576o` | Related earlier manuscript |
| Add to Simple Spirituality | `168kk_Y9DLzI5UG7XL9eCJMtIsZiwUngRZ4mm6QifRuU` | Additions for Simple Spirituality |

Subfolders: Resources (`1jOnobAHFTzzj0CZGDfPsxVSqvssoCuaf`),
Rideshare Psychic - TikTok Videos (`1v5fXFMydAwefUraxKMM2dXC2gdOOCW5D`).

## Book 1: *You Do Not Have to Die to Know Me*

Sixty short lessons from people who nearly died, the first title from the round-one book ideas.
Folder: [Book 1](https://drive.google.com/drive/folders/1FvRB-EyCHQtodPbsuElQnGRC7b--sye1) under
Project Profound, folder ID `1FvRB-EyCHQtodPbsuElQnGRC7b--sye1`. The book text lives only in
Drive; this section holds pointers and status.

The folder mirrors the site's branches. Sections are files, folders are environments, promotion
is a move:

| Folder | ID | Holds |
|---|---|---|
| dev | `123f-KgxrQv8jClfV9kOUMqktkArXfdLS` | Brainstorm docs: ideas, topic map, section proposals, drafts, titles. Anything can change. |
| staging | `11TvKz_EyDoBserFA89B_mYec7pC8VZlm` | One Google Doc per settled section, named to sort in order (S01, S02, ...). Tom's copy is the truth. AI revisions arrive as a new doc; the old one moves to a staging/archive subfolder. |
| production | `1TrVuU6m4JMFLZICGVa-0W8rvenIx4fSL` | Sections Tom has promoted. Not touched without an explicit ask. |

Working rules for AI sessions:

- The Drive tool cannot edit a doc's text. It can create, copy, rename, move, trash, and read
  (comments included). So never regenerate a doc Tom may have edited: read it fresh, write the
  revision as a new doc, move the old one aside, and say what changed.
- "approve S01" = create the section doc in staging from the dev draft. "revise S01" = read the
  live doc and its comments, create v2, archive v1. "assemble" = create one reading copy from the
  live staging sections in order, trashing the previous assembled copy. "promote S01" = copy the
  live doc into production.
- Keep the Status column below current (dev, staging, production) and add a row for every new doc.

| Doc (Google Doc) | File ID | Status | What it is |
|---|---|---|---|
| Book Ideas, Round 1 (from the Corpus Atlas), 2026-09-09, final | `100-SRKRupHtTHsTmbElzFDd2mbB0BAvZhScYd7Z7eQE` | dev | Ten book ideas generated from the corpus atlas; Book 1 is idea 1, with its original nine sections |
| Book 1 Working Doc: You Do Not Have to Die to Know Me (topic map), 2026-09-09 | `1S2i43p8kB7TY_TVBXUR7_ups-igPkA3HWCcNR5geyBM` | dev | Market research on the most-shared spiritual quotes, attribution warnings, and a sixteen-topic map with matching corpus lines and video IDs |
| Book 1 Sections, Round 2 (ten new), 2026-09-09 | `14tBu6IgHPaRofg9epQ2L5ZzKL7Lw4cVzACtc6eiv3wc` | dev | Ten proposed new sections: opening corpus lines with video IDs and timestamps, masters' lines with attribution status, candidate lessons, and a proposed order for all nineteen sections |
| Book 1 Section Draft: Not Even a Millisecond, 2026-09-09 | `1KISTylEEhGRgXSeGLnNexBj0aVkuaMy17U6JAAyvhbY` | dev | First drafted section (five lessons on never being alone); quotes carry video IDs and timestamps, nothing yet checked against audio |
| Book 1 Title Options, 2026-09-09 | `1vbEsXsn6B__puyk1FkYEsxwEOzltCYe5esQjLxdLzaw` | dev | Thirteen title and introduction options (Tom's three plus ten more), each built on a corpus line with its video ID |
| Book 1 Marketing Titles, 2026-09-09 | `1ObbFXTy4WPw81SED1zNdYUlkgprCapbumIHxWjGat_w` | dev | Ten buyer-facing titles with back-cover descriptions (pull, surprise, promise, buyer, risk), copy for the front-runner title, and a title-test plan |
| S01 Not Even a Millisecond | `18GfTJ58PbcQ9KMgoeIa9290UKO86goDYQ0D10a_AbTM` | staging | Live section doc, approved 2026-09-09 from the dev draft (five lessons, sources under each); Tom's copy is the truth |

## Project Profound — parent Drive folder

Folder: [Project Profound](https://drive.google.com/drive/folders/1yBmBejNystVWkvaokveg5nMiY-giGRTA)
— folder ID `1yBmBejNystVWkvaokveg5nMiY-giGRTA` (under Clients in Tom's Drive)

Subfolders (list live with `parentId = '<id>'` for current contents):

| Folder | ID |
|---|---|
| Book - Elsewhere | `1HekkjAtxMNbiumzAYQgx1Xx0rwB6IonW` |
| Book 1 (dev / staging / production, see the Book 1 section above) | `1FvRB-EyCHQtodPbsuElQnGRC7b--sye1` |
| NDE Research Project | `1MKEFhP5TEA8EFaauX-h6F4mx9RE-cUoL` |
| rvNDE Scale | `178g3Dw0HFhNaNFE9nvsPVb5b58JDPp_j` |
| NDE-TI | `1NIwMIfMxNoVEblncxdwCN1bqmWgu1kXi` |
| UAP Research Project | `13TnyWuPSrIV4mPOMlbb4DB5NTSvtmG0M` |
| UFO-UAP | `1V-cea7F6uV_1wnL_bsIuGRDoFUWUo5Wq` |
| PP Content Strategy (SEO) | `1azf50IH4Fd4VnUSHTChi6EbKM76zOSOo` |
| Project Profound Podcast | `1yNLDE0JzufO99hgZutWNFqltydCtm13x` |
| Video Scripts | `1rG2F2A6J02DBupUxm-ko4RsDk_78N0vZ` |
| Brand Kit | `1vFFmTsXTUiaGdI7pyF1sbNKt9ZkvFTwN` |
| Media Assets | `1U2bn9OuBTFTExtKwyZfc2amPL45SEhJw` |
| YouTube Channel | `1dP49fNNAB_n_ZufPQJzPHYJsFBW_i43_` |
| Web App (original ideas) | `1TahaN6x409Pd1j0ehQlQ0GIC2usm2FI8` |

Notable loose docs: NDE-ANALYSIS-FRAMEWORK.md (`1nAxoR1DD08W5LqaU4nrOaDj9riwtM9UM`),
Enhancing NDE Website Engagement and Virality (`1GdEheqQWaplJtmiOYtFz7tv7fdfU09x2mb6me-r2ceM`),
theself-references.pdf (`1AuB9s1mMk7EPmovmMO0wOLwM-8E_100X`).

## Scope notes

- This index serves **AI conversations only**. The website's chatbot and search read from
  the Supabase RAG tables (`nde_chatbot_chunks` via `nde_chatbot_match`), which are
  video-based — they do not see Drive. Ingesting the book into the site is a separate
  feature with schema implications; flag it for Tom before building.
- Index snapshot: 2026-09-09. When a doc you need isn't listed, do a live `parentId`
  listing of the folder rather than assuming it doesn't exist.
