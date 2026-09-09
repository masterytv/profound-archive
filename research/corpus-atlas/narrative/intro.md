# Narrative atlas

This document is the narrative half of the Project Profound corpus atlas. It is a reading companion to an archive of about 6,300 confirmed near-death-experience videos and about 7,600 UAP and UFO videos with summaries, written so that a later Claude session can generate book ideas for the archive's founder without rereading 14,000 summaries. The founder's first book, *The Accidental Mystic*, argues from 5,000 NDEs that the experience teaches us to live with love; every book direction below is framed against that book and against the site's existing consolation-oriented material (ATLAS-stats section 1). The statistical half, ATLAS-stats.md, holds the exact coded figures and is cited here by section number.

## How it was built

The atlas was produced in four passes. First, 348 batch digests were written on gpt-5.6-luna, each covering about 40 videos (158 batches for the NDE corpus, 190 for the UAP corpus), and each recording themes, standout accounts, quotable lines, tensions and rarities. Second, the batch digests were merged into 18 section digests of roughly 800 videos each (nde-01 to nde-08 and ten UAP sections). Third, the section digests for each domain were merged into one domain narrative, the NDE narrative atlas and the UAP narrative atlas that follow. Fourth, this synthesis was written from the two domain narratives together with the cross-domain comparison (ATLAS-stats section 6) and the list of gaps the numbers raise (ATLAS-stats section 8).

## How to read it for ideation

Start with the candidate book directions: twelve in the NDE atlas, twelve in the UAP atlas, and the cross-domain directions in the final part, which need both corpora and are not repeated in either domain file. Each direction names its themes, its anchoring number and eight to ten video IDs. Then use the quote banks and standout accounts as evidence for whichever direction you pursue; the tensions sections show where the archive contradicts itself, which is usually where the book is. Check every prevalence figure against ATLAS-stats.md before relying on it, because the theme counts in the narrative files are model estimates and only the figures marked exact come from database tables. Pull the underlying passages with scripts/corpus-atlas/retrieve.mjs, which takes video IDs and returns the analysis records and summaries the digests were written from.

## Caveats

Theme counts are model estimates summed across batches and overlap heavily; read them as orders of magnitude, and prefer the exact figures cited from ATLAS-stats.md. The batch digests could only read videos that had a summary, so 802 UAP videos and 2 NDE videos are absent from every narrative count (the UAP atlas works from 7,592 of 8,394 videos, ATLAS-stats section 4.1). Quotes are verbatim from the digests, which quoted the analysis records rather than the raw audio, so a quote is a transcript artifact until it has been checked against the video; verify every quotation against the source before publishing it. The same experiencer often appears under several IDs (806 exact names appear on two or more NDE videos, ATLAS-stats section 7), which inflates thematic counts. The two domains were coded with different instruments, so the cross-domain rates in ATLAS-stats section 6 are indicative, not equivalent, and the emotional-quality contrast rests on the site cache's coding (ATLAS-stats section 8).

## Contents

Part one, the NDE narrative atlas (themes, standouts, quotes, tensions, rarities, directions); part two, the UAP narrative atlas (the same shape plus bridges to the NDE corpus); part three, the cross-domain synthesis (shared phenomenology, disagreements, open questions, cross-domain directions and a reading order).
