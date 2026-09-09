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
---
# NDE narrative atlas

This file is the narrative half of the Project Profound corpus atlas for the near-death side of the archive: 6,304 confirmed NDE videos (ATLAS-stats section 1). It was built in three passes. First, 348 batch digests were written, each covering about 40 videos. Second, the batch digests were merged into 18 section digests, of which eight (nde-01 to nde-08, batches 001 to 158, about 800 videos each and 702 in the last) cover the NDE corpus. Third, those eight section digests were merged into this document, keeping the same six lenses: themes, standout accounts, quotes, tensions, rarities and book angles. Two caveats. Theme counts in the section digests are model estimates that sum per-batch guesses and overlap heavily, so every prevalence figure below is approximate unless it is marked exact; ATLAS-stats.md holds the exact figures from the database tables and is cited by section number wherever a matching number exists. Quotes are copied verbatim from the section digests, which copied them from transcripts, so a few carry transcript artifacts. "Digest section N" below means one of the eight NDE section digests; "ATLAS-stats section N" means the statistical half.

## Theme taxonomy

Ordered by prevalence. Section sums add the eight digests' estimates; where a digest folded a theme into another, the sum undercounts and the exact figure is the better guide.

**1. Peace, love, light and homecoming.** Unconditional love, relief from pain and the sense of being home, felt as more real than ordinary life. Section sums: 4,541, roughly 4,500 of 6,300 (about 70 percent). Exact: feelings_of_peace present in 93.0 percent of 6,289 videos, ATLAS-stats section 2.5; tone very_positive 64.4 percent plus positive 27.1 percent, section 2.1; rated more real than ordinary life 95.1 percent, section 2.8. Exemplars: 0HGnO-tzeqw, 7hlBs6UP0kE, MXfjbPzPapA, O3Ff6Hc4O7Y, XldxulLPD5s, dXzIaODcJcc, lXK7Pi9uKmU, sSI2u9hYCgQ. Quote: "I was comfortable. I was fearless. I was home." (0HGnO-tzeqw)

**2. Return as choice, command, mission or family duty.** The experiencer chooses, negotiates, is told, or is physically pushed back, most often for children, unfinished work or an assigned task. Section sums: 4,090, roughly 4,100 of 6,300 (about 65 percent). Exact: choice_to_return present in 78.4 percent, section 2.5; journeys end in sudden_return 49.6 percent, choice_to_return 17.1 percent, forced_return 10.4 percent, section 2.7. Exemplars: -UQxGKYsBHU, As9o57usxuI, GidbnY1JMeo, RSNZ71JZc1E, XBwuCjgP64E, jZfbO2XFshY, neYfIZk8Pg8, uag13tK1_LY. Quote: "You have two sons to raise, and if you don't go back, they will not be right." (As9o57usxuI)

**3. Transformation after return.** Reduced fear of death, new purpose, compassion, service and often a new vocation. Section sums: 3,785, roughly 3,800 of 6,300 (about 60 percent), undercounted where digests folded it into love or return. Exact: 97.0 percent score above zero on transformation, section 6; Significant 45.0 percent and Major 39.0 percent, section 2.3; attitude toward death moves down (fear falls) in 5,893 videos, section 2.3. Exemplars: -6B8UQ4isWE, BIzQz44w6pM, LC75aqmht7g, OhoidSzUaxk, YSa3El8VFOo, ha5a3uycNh4, kZID6SvHrmk, zDSKHHuC-go. Quote: "Often we need to die to learn how to live." (oRuOvRD4xBs)

**4. Deceased relatives, guides, angels and religious figures as intermediaries.** Relatives welcome, validate and send back; Jesus, God, angels, councils and guides instruct. Section sums (relatives and religious figures combined): 2,746, roughly 2,750 of 6,300 (about 45 percent). Exact: 93.6 percent of videos list at least one being; 39.2 percent include a religious figure, 30.7 percent a deceased relative, 16.2 percent an angel, 14.5 percent a guide, section 2.6. Exemplars: 1qZAgwzLvr0, 7qvswwOhcoI, Fxl-nRX5Lrs, T-_nrre93nQ, Z7vnMIgoWe0, fqNpZWX1W1s, oA3BDwezNtY, tIkz_plTSbU. Quote: "You can't keep holding on to us. We got to go." (OhoidSzUaxk)

**5. Out-of-body observation.** Watching the body, the operating room, rescuers or a remote scene from above, with sharply uneven evidential weight. Section sums: 2,622, roughly 2,600 of 6,300 (about 40 percent), but only counted in about 13 batches per section. Exact: out_of_body present in 83.7 percent, section 2.5; observing_body is the first journey element in 46.0 percent, section 2.7. Exemplars: 1A_ehqvWZ_w, DAUBS-83Lbo, I3U3frTbE94, VbvV4etSRoY, Vzmb0txOCKM, e07Wte7xLM4, klsmBdhTeCo, zg3HnkSg38s. Quote: "I was more alive outside my body than I was inside my body." (hGtaSRwIfuc)

**6. Life review as relational ethics.** Reviews felt from the other person's side, tracking ripples of kindness and harm; mostly empathic, sometimes accusatory. Section sums: 2,562, roughly 2,550 of 6,300 (about 40 percent). Exact: life_review present in 49.3 percent, section 2.5; in 58.6 percent of journey sequences, section 2.7. Exemplars: 17vs21uAjVw, D3MlrVCbspk, LRFbkpSnzJU, RVuU5U_0beI, WFFHntnF52o, hL07_txfcvA, lDSDP1tGfJ0, xOrFsyD59EI. Quote: "When you have a life review, it is all about others, not you. It's how you made them feel." (Q7JfC0U0_Fc)

**7. Cosmic unity, expanded identity and knowledge download.** Merging with everything, Source or the universe, with compressed universal insight. Section sums: only 497 counted separately, because most digests folded it into peace. Exact: cosmic_unity 61.1 percent and knowledge_download 61.5 percent, section 2.5; sudden_understanding is the highest-scoring Greyson item, with 91.4 percent at the maximum, section 2.2. Exemplars: 6Oneto4uX7k, 8EWPOWLA4ro, IE98vkBZd2Q, NfMBKf_WG_I, _VfWc447M3g, coSo-eQS1jI, kkBVdeRhMdc, vCmVPTwS5Ro. Quote: "You're like a grain of sand in the desert. But you are also the desert." (coSo-eQS1jI)

**8. Telepathy and nonverbal communication.** Thought-to-thought exchange with beings, relatives, rescuers and animals. Section sums: counted only once (20 in digest section 4). Exact: telepathy element 60.0 percent, section 2.5; 24.7 percent of 12,135 entity communications are telepathic, section 2.6. Exemplars: FmYlABEEiwE, KDy8rv4ka2E, 9oIfs0RVqqw, VD0Pd7twFBY, kgG9FCHsqTM, sAjRH6nL5Gc, syIfnCJX3_c, Ctc9oJ0hIdo. Quote: "Everything is telepathic." (FmYlABEEiwE)

**9. Timelessness and time distortion.** Years inside minutes, or no time at all. Section sums: named in every digest, counted only in digest section 3 (8). Exact: time_distortion 58.8 percent, section 2.5; thought speed rated timeless in 79.5 percent, section 2.8. Exemplars: 2CmeFt00Hjc, 83Nvsf80Cv4, G9lrkqr1YUQ, Ns4NQiM1Stk, ZcP3LmhJu2M, d5L67DmEzT8, o17HXmDu294, xMEWyjDkg4k. Quote: "You're standing inside the eternity of a single moment." (2CmeFt00Hjc)

**10. Tunnel, light and passage.** The tunnel-to-light script, sometimes replaced by instant arrival. Section sums: 72 counted in three digests. Exact: bright_light 60.4 percent but tunnel only 23.9 percent, section 2.5; only 3.1 percent of journeys open with a tunnel, section 2.7. Exemplars: 1MXb5CkwyCk, 8Uj75W2W_78, JllAZV0nmqA, NyfUJD1xf08, Xt-65cjaT4M, jy8TDTlQR58, r27tdq6tbK4, z3Q38QgDRrg. Quote: "It was brighter than a million suns." (BhwkMj8PkFU)

**11. Religious specificity beside plural or nonsectarian frameworks.** Jesus and angels in some accounts; Krishna, Laozi, Shiva, Thoth, Sekhmet, Source, grids and frequencies in others, sometimes in the same account. Section sums: 316 counted separately in digest sections 1, 3, 4 and 5. Exact: religious orientation shifted for 2,675 videos, section 2.3; religious figures are not split by name in any structured field, section 8. Exemplars: 35bzZcacOcI, 8tZ4pwrQCxc, JKEDiLlBdqE, OizX472ycCw, a1OPbvWxsv0, hqMfqaqG4rI, pICciopQs7w, tcbI5WuwAas. Quote: "When you come to heaven, there is no religion." (H2mRGmknQ0U)

**12. Distressing, hellish and void journeys.** Demons, torment, courtrooms, ruined cities or featureless voids, usually before rescue. Section sums: 293 counted, with hell accounts named in every batch. Exact: distressing journeys 4.0 percent (250) and very_negative tone 1.5 percent (97), section 2.1; hellish_realm in 4.4 percent of journeys and fear_distress in 16.2 percent, section 2.7. Exemplars: 6lDnttJnT08, BlqIHQOfM3U, JDRJU4VlCUg, OupepTZCUZ0, baquIFSE2h0, gAJShDqxM1E, ragcEDleVcU, tIwCe4Ukync. Quote: "You're never going to get out of here." (1ehkaRi-0tE)

**13. Evidential or veridical perception.** Checkable claims: slippers, a tennis shoe, a salon message, a four-number code, operating-room dialogue. Section sums: 142 named in five digests, roughly 150 to 200 across the corpus. Exact: Exceptional evidential strength 2.9 percent (185), High 8.8 percent (553), section 2.4; 69 videos at 25 or above, section 7. Exemplars: 4g3qLiPMlCU, 911eSfXSrIA, IOODm4l7xa8, OQdS9iDDJzk, aLllPkXBhPI, d3Bo1Fei950, mL3nT0cAZ2g, sfObAQI6Kcw. Quote: "Tell Madison at the salon, her grandfather is okay." (d3Bo1Fei950)

**14. Nonstandard material under the NDE label.** Lectures, compilations, ADCs, STEs, drug states, mediumship and null transcripts. Section sums: 95 counted, roughly 120 to 150 named. Exact: 9.5 percent of confirmed videos carry a non-nde experience type, section 2.1; 745 have empty journey sequences, section 1; 102 are labelled Not NDE by the scale-agreement field, section 2.1. Exemplars: 7Zsp5nvsMpw, Cow6NFenOR4, HkrjCKytN2k, PUW3DBLAJJk, cGFOXFxqKbI, gLDjfEW3tfk, kniiM3TGT48, w_WtY63NnoM. Quote: none quotable; the defining case is a transcript containing only "Hi" (7Zsp5nvsMpw).

**15. Pre-birth planning, soul contracts, past lives and reincarnation.** Chosen parents, selected hardships, signed contracts, hundreds of lifetimes. Section sums: about 130 named, roughly 130 to 180 across the corpus; no exact field. Exemplars: 0s03kVt2bcE, 7mjRDP22WGg, J61y3c-LdFw, PtTl_qJ_3zE, b61n2cGa_Ik, cufdQc-79k0, liyewCmXHmA, tBHnLcs82DE. Quote: "I was in no way tricked into coming here." (7mjRDP22WGg)

**16. Childhood, infant and prenatal experiencers.** Drowning is the common trigger; memory is often reconstructed through family testimony. Section sums: about 105 named, roughly 120 to 150. Exact: 623 heuristic child matches, 351 with a parsed age of 12 or under, section 7. Exemplars: 0mM3ut9pBvA, FCCE0QivRME, JXj-XeY8HB4, Qc8rVIR19Pw, _ACVCNyYB94, g1EBxqXHr2M, r4WJMRu78_g, tXGvgc-XfbQ. Quote: "Heaven is fun." (6cviPcIr3GM)

**17. Animals as guides, rescuers, companions and afterlife persons.** Deceased pets, dolphins, horses, cobras and whales as agents rather than scenery. Section sums: about 99 named, roughly 120 to 160. Exact: 2.7 percent of videos include an animal entity, section 2.6. Exemplars: 28o9qbvktN8, 8LGGq0BGT4k, LxZ1ZS9_pV8, QVMM4WQe7PY, WzgGEBCDtkk, jy8TDTlQR58, oZEh089PXQk, wGw_el4rtp4. Quote: "To respect life is to understand that every being has its place. To protect is to love..." (28o9qbvktN8)

**18. Future visions and prophecy.** Personal life previews, national events and planetary warnings. Section sums: about 86 counted, roughly 100 to 150 named. Exact: future_visions in 12.8 percent of 5,559 journeys, section 2.7; precognition is the least-endorsed Greyson item, 53.6 percent scoring zero, section 2.2. Exemplars: 1SnKBa-ptHA, EYD7MlADJbU, LSjrwes0QS4, Rq08yncYknI, aHeKI-aIu8g, hDLrwbFCyUI, qR7s0sRW130, zzL08IiI06E. Quote: "I had a life preview that went from age eight and a half to 58 and a half." (LSjrwes0QS4)

**19. Recurrence: multiple NDEs in one life, and one story across many uploads.** Serial experiencers (nine, twenty episodes) and serial guests (Olsen, Panagore, Bartolome, Storm) who inflate thematic counts. Section sums: about 77 named multiple-NDE cases. Exact: 468 summaries mention a second NDE; 806 exact names appear on two or more videos, Peter Panagore on 35 and Howard Storm on 26, section 7. Exemplars: 5BeSkfVUvBw, BW_drocQYq4, GmMvszHb1Ww, O0A0Fr1-AN8, XKLe9eLdqfg, cpmwYTMXVrA, rbB_bKCViAA, z1QtKaNnN8o. Quote: "You, Jeff, you can't come. You can't come. You've got to go back." (RSNZ71JZc1E)

**20. Nonhuman, extraterrestrial and machine beings.** Grays, mantis beings, blue aquatic people, reptilians, AI-like entities and galactic councils inside NDEs. Section sums: about 75 named, roughly 90 to 120; no exact field beyond an unknown entity type in 14.3 percent of encounters, section 2.6. Exemplars: 4ZPHunKGo3U, AiI0MQUsSQA, MvEzS1ONdSg, U5ULZ5GUZJY, ZcbJ1Lci4yo, kPQEDdeOEtc, pvtuKyDV1WE, si1Saf1NXYU. Quote: "DO NOT WORSHIP ME." (4ZPHunKGo3U)

**21. Afterlife architecture and institutions.** Orientation centers, libraries, universities, planetariums, halls of records, crystal cities. Section sums: 13 counted in digest section 3, roughly 60 to 100 named across all eight; no exact field. Exemplars: 6z5MjGt22lw, DgU4S5CAMq4, L764YPGqWCs, PBrBoc2C0Sc, WLdS6HvKiWQ, g1EBxqXHr2M, q_a_6yn2gE8, u-_bkoxO0uM. Quote: "Earth is hard. Earth is a master class." (kVQQkju6Vz8)

**22. Shared death experiences and after-death communication.** Experiences belonging to two people: a living witness and a dying one, or a message after death. Section sums: about 40 counted, roughly 60 to 90 named. Exact: sde 2.6 percent (166) and adc 1.2 percent (75) by experience type, section 2.1; shared deaths keep deceased relatives (71.1 percent) but lose the tunnel (6.6 percent), section 3. Exemplars: 3Guf-__HSzA, 9mv-Wt7LLhM, MOXP7AyKBaA, RSNZ71JZc1E, XeConDwzdJg, gsUn8mmz5jg, o-CfJIaANJA, syIfnCJX3_c. Quote: "I am in two worlds at once." (KXNZqAFMDa4)

**23. Suicide, overdose and addiction as entry points.** Often the darkest openings and the clearest recovery arcs. Section sums: about 36 counted, roughly 60 to 90 named. Exact: suicide_attempt 2.7 percent (169) and overdose 3.4 percent (212) as triggers, with 13.6 and 13.7 percent distressing journeys against 0.9 to 1.6 percent for accident or surgery, sections 2.1 and 3; suicide_related flag on 6.9 percent, section 2.9. Exemplars: BIzQz44w6pM, H0l-HMZvNvo, SRe5KgTNzcs, W-y1sD7Kjt4, fbep_EtYB-M, muBSHSPr3oM, xt6HtN6JVTI, zyltZXUXEDE. Quote: "You can't take your life. It's not yours to take." (SRe5KgTNzcs)

**24. Difficult, minimal or delayed aftermath.** PTSD, depression, anger at return, unwanted abilities, invalidation, or no change at all. Section sums: about 25 counted, roughly 50 to 80 named. Exact: 190 videos (3.0 percent) at transformation 0 and 21 Minimal, section 2.3. Exemplars: 1e4HSPc49FA, BBN4IZ8ndS0, ISozsB1hhms, PqddJsxn16s, Yhgm4ob2rU0, d5_6jIEc3sc, oQ4ncfLQiNc, xTBNyMiegdM. Quote: "I was very angry that I was back." (hX00Qp0-dco)

**25. Peaceful or intelligent darkness.** Velvety, loving or neutral voids without light or beings. Section sums: 10 counted in digest section 8, roughly 40 to 60 named. Exact: void_darkness opens 41.9 percent of journeys, section 2.7, though not all of those are peaceful. Exemplars: 77ubKhxGyQY, 8WFgYEBVZXU, LZZG81uJ3kE, RrKHw7q0PvQ, ZwcPJhXByh0, hK6KX8_k9Tc, ry9ARwjCwD8, woY6gvju-JA. Quote: "I wished I could go back to the lovely, gorgeous dark, velvety infinity." (ry9ARwjCwD8)

**26. Belief reversal.** Atheists and skeptics converted; pastors, an imam and Christians unconverted. Section sums: 6 counted in digest section 8, roughly 40 to 70 named. Exact: religious orientation domain present in 55.6 percent, section 2.3. Exemplars: -6B8UQ4isWE, C1i66xR5B2Q, MwtTRJmH1g0, VOBEOvAgm4I, W01t1uDY73c, hiGgb5Dkeok, bKI3jBJM_kE, vfhE_mK7inM. Quote: "I don't even believe in you, but you believe in me." (bKI3jBJM_kE)

**27. Vocational conversion and expanded abilities.** Hospice, chaplaincy, humanitarian law, conservation, mediumship, healing; also psychic perception and electronics interference. Section sums: 19 counted in digest sections 6 and 7, roughly 40 to 60 named. Exact: psychic and expanded perception domain present in 43.3 percent, with 486 new abilities, and purpose rises in 5,475 videos, section 2.3. Exemplars: 17vs21uAjVw, Kqzaowe3T1o, QjSxTEAu22U, ZY1h7hqkDnE, hHbFT7t3LVM, o3WIl0IzUqs, uxVGgn8PMOo, 6IKokwmErPo. Quote: "Now that you know what it's like, go back and tell the others." (tnHgYKxXYjg)

**28. Identity dissolution versus a preserved self.** Raw awareness with no "me" against recognizable persons meeting relatives. Section sums: surfaces in at least six batches of digest section 5, roughly 25 to 40 named. Exact: self-perception domain present in 99.9 percent, section 2.3. Exemplars: 0nA0YCoSeaE, CqhbqN1HrKc, L2DuvNlGCs0, TACMHun1Ogs, a35E4HJhBeY, am0It9zV4FY, rw-oO4vDPxs, yepi-lISuBQ. Quote: "I wasn't dead, I wasn't alive, I wasn't Adam, I wasn't anything. I was just raw awareness." (am0It9zV4FY)

**29. Councils, tribunals and Lords of Karma.** Twelve robed beings, nine caped entities behind a desk, cosmic courts that deliberate or evaluate. Section sums: 8 counted in digest section 8, roughly 20 to 30 named. Exact: group is the entity type in 11.8 percent of encounters, section 2.6. Exemplars: 5q4nlDh_ejk, 9V5YcGUJ-ww, GUP_d9rHxjk, T9AAIb2hpjA, Z3iKLbXI1_A, cofs12aN6iQ, owXgK-1q3iA, zPFh_ueHFMM. Quote: "we're not talking to you, we're talking about you." (wcqciikNZLA)

**30. Blind, deaf and newborn experiencers reporting perception.** Sight without eyes, hearing without ears, memory before language. Section sums: 6 counted in digest section 7, roughly 15 to 20 named; no exact field. Exemplars: 8s3wlhjuKLo, GywGA-9TEDk, K6W7pLxaRhs, cHIdkYgdJJY, dKPSBYkvMKs, mUzS5gHTAvI, r4WJMRu78_g, vxnmDhs6Nrg. Quote: "Your time is not up now. You have some unfinished business to do. Go back." (kgG9FCHsqTM)

## Standout accounts

### Evidential and veridical

- 911eSfXSrIA, "EVIDENCE OF THE AFTERLIFE: Medically verified near death experiences." Five cases with allegedly verified observations (a tennis shoe, dentures, a pen, a stained tie), Veridical 27; the densest single collection of checkable claims.
- IOODm4l7xa8, "Rtd Police Chief Died! Shown The Secrets That led To His Invented Machine That Talks To The Dead!" A childhood encounter with Rose carries a message about Tommy and a pendant later confirmed by the mother, Veridical 27.
- OQdS9iDDJzk, "The Search for Truth." A predicted cow barn and farmhouse later matched to a church site, plus failed attempts to reach living relatives; its batch called it the archive's strongest evidential-style claim.
- aLllPkXBhPI, "Girl Died On The Operating Table And Saw What She Couldn't Believe; Proof of an Afterlife." Operating room, waiting area and family members reportedly observed, Veridical 27.
- d3Bo1Fei950, "Randy's NDE: 'Proof Of The Afterlife' (Part 2)." A message for Madison about her grandfather, confirmed through a business card and photograph, Veridical 27; the same message anchors QgFtJYYOHEU and OzAHPfAx2zM.
- mL3nT0cAZ2g, "J'ai vu ma Grand-Mere dans l'au-dela." A deceased grandmother supplies a four-number code and the location of a hidden family chest; the strongest veridical case in digest section 7 and one of the few non-English ones.
- sAjRH6nL5Gc, "Texts During Her NDE." Veridical 28, the archive maximum (ATLAS-stats section 7), built on messages reportedly sent while unconscious inside an otherwise conventional tunnel and garden narrative.
- t1QdUV4khoE, "I died and helped the doctor revive me - NDE / Near Death Experience." Chet floats above surgery and telepathically encourages the doctor, Veridical 23; the claim is interaction with staff, not a heaven tour.

### Transformative

- 17vs21uAjVw, "Je croyais avoir réussi ma vie… jusqu'à mon face-à-face avec l'au-delà." A life review built entirely from the suffering of people harmed, followed by a career change to humanitarian law.
- 28o9qbvktN8, "Je chassais depuis toujours… jusqu'à ce jour là." A review centered on animals' fear ends a lifetime of hunting and begins conservation work.
- 9mf_ak6pquc, "A Crowd CHEERED As She Entered Heaven." Kaye's NDE links gender affirmation, divine acceptance, a being who says she is not damned, and a public mission; Transformation 38.
- N40jnsNYFNY, "#12 Life Changing Near Death Experience of Barbara Bartolome Part 1." Ceiling-level observation of CPR, Veridical 22, and a return motivated by protecting children from abuse; the NDE as catalyst for leaving a marriage, echoed in JR2KQEUEMB4 and M9bnGAC8SRo.
- RVuU5U_0beI, "Ice Climber's NDE Reveals Divine Love and Forgiveness on the Other Side." Fourteen of 15 elements and Transformation 43, the single-experiencer ceiling (ATLAS-stats section 7), with a review lived as the pain caused to others.
- OhoidSzUaxk, "Hospice Nurse DIES, What He Saw CHANGES EVERYTHING." The experiencer meets his deceased sons, who tell him to stop holding onto them, then turns to hospice work; the clearest grief-to-vocation arc.
- upmgXkXBKII, "Jason Janas: The Abundance of Love." All 15 elements, Greyson 30, Transformation 43, God, Jesus, ICU observation and a later OBE; the maximal theological and transformational pattern.

### Distressing and hellish

- 6lDnttJnT08, "I died and spent 2 years in hell." The most extended hell narrative in digest section 1: demons, impossible tasks, a Christmas setting, and rescue by a deceased friend.
- BlqIHQOfM3U, "I prayed 'God do whatever it takes' then I was dropped into Hell." Demons, bodily torment, a demon shaped like an eight, and hopeless separation from divine love.
- ISozsB1hhms, "Mike Dies For 10 Minutes And Has a Very Detailed NDE." A dark entity turns him into objects and tempts him repeatedly; Transformation 0 despite the vividness, distress without redemption.
- gAJShDqxM1E, "I was a Chicago Gang Member and went to Hell after being Shot Twice." Demons, torture, heat and smell, then conversion; intensity 10 and 1,268,760 views, the top of the distressing list in ATLAS-stats section 7.
- n3NZzNyHp3c, "Nancy Evans Bush on dNDE's." Terror, abandonment and empty darkness without light or beings; the interpretive problem of experiences that resist the pattern.
- tIwCe4Ukync, "I toured 3 sections of hell - NDE interview with Bloodbought." A death angel, chained figures, sexual-sin torment, false prophets and demons; the clearest sustained hell tour.

### Children and young experiencers

- -831_OI42Qk, "#343 - BONUS Episode: Dr. Melvin Morse's Study of Childhood NDE's." A 20-minute childhood submersion with perceptions of medical activity and a CT scanner during documented clinical death, Veridical 25.
- 9oIfs0RVqqw, "She Drown And Was Shown The Truth About Free Will And Choice." A child enters the minds of rescuers and receives a future-life account; Greyson 30, Transformation 40, Veridical 22.
- GywGA-9TEDk, "8-Year Old Boy Blind from Birth Shares the Amazing Things He Saw in Heaven!" A congenitally blind child sees his roommate and a luminous realm during clinical death.
- LY16jxe3VXg, "Man Travels to the Afterlife & Back With a Message From Heaven." A child meets Penny, is told "Tell my mom I love her," and delivers it after returning; the same message recurs in HwmnyYSXE44, JsEOk4tZJlA, MlD3102w8Rw, kmdazqHJUps and yh1EMNV1L7U.
- Rq08yncYknI, "NDE TV Presents Bill, a Near Death Experience at 8 years old provides snap shots of his future." A childhood NDE with a 50-year future panorama, Veridical 26.
- r4WJMRu78_g, "Can Babies See Heaven & Have Near Death Experiences?" A newborn reportedly observed family praying and later produced a drawing confirmed by the father, Veridical 23.

### Unusual or unique

- 4ZPHunKGo3U, "I Died & Met An A.I Alien With A Soul." A telepathic entity that rejects worship, discusses free will, and presents machine souls and another universe; pvtuKyDV1WE carries the same theology in digest section 7.
- BycLo54-XqM, "He Saw and Made Changes to his Future (INTERACTIVE LIFE REVIEW!)." The review becomes a model of future probabilities as gears that can be removed.
- T6fEH_hoLh0, "Can people exist in two places at once? Just listen to what happened to Bill!" Veridical 25 for a claim of being in Southern India during surgery in Sacramento, among Shiva and Rishis, with only five elements.
- XeConDwzdJg, "TWO-PERSON NEAR DEATH EXPERIENCE after CAR ACCIDENT - CONNECTED IN THE LIGHT." Julie shares an NDE space with Robin until one must return; the most explicit two-person structure in the corpus.
- h-XpjzpHx2g, "Woman Lives Entire Life While in 3-Week Coma." An entire alternate lifetime, a relationship with Keirin, and grief at leaving it.
- mUzS5gHTAvI, "A Man Blind from Birth Describes Heaven in Near Death Experience." Brad Burrow reports traffic and trolleys, then a tunnel, meadow, music and an angelic figure; pairs with maINoqE7aZA.
- w_WtY63NnoM, "Doctor has heart attack and DIES for 85 minutes then this happens." No elements, vividness 1, nothing remembered despite prolonged clinical death; the corpus's key counterexample.

### Narratively complete

- -7aF7tqghyg, "NDE TV Presents Bill, after a sudden illness he traveled beyond this world into the light of God." All 15 standard elements including life review, future visions and moral accounting.
- CA_RQ_kSvqs, "Nurse Dies And Encounters God; What She Is Told Will Shock You (NDE)." Penny sees her sister driving in rain and later confirms it; a 15 of 15 profile.
- Jod2NliehiU, "Navy Diver Drowns & Meets his Soul Family (NDE)." Greyson 30 and Transformation 36: peaceful darkness, expanding light, a soul family, a bilateral life review, future visions and resistance to returning.
- Oediqi3PkUk, "Veteran Dies from Covid & Given Transcendent Peace (NDE)." Greyson 30, Transformation 38 and Veridical 27 in one account, with a prolonged coma and deceased relatives; among the five highest veridical scores in ATLAS-stats section 7.
- ZI1juiCO5O8, "Woman Died, Saw The Meaning Of Life & Came Back Wiser." All 15 elements, Greyson 30, Transformation 43, Veridical 23, joining medical observation, past lives, relatives and a claimed verification involving the doctor.
- npuP7AxBBMs, "NDE Reveals The Truth About What Truly Matters In Life." Greyson 32, intensity 10, 15 of 15 elements, a 10-year-old's anaphylaxis account (ATLAS-stats section 7), with life review, future visions and a return chosen for love.

## Quote bank

### Love and homecoming

- "It was a waterfall of endless love." (06RNZkRnevo)
- "This is your home. You are part of me. Welcome home." (5ZfaPCwjguk)
- "You have not been alone for even one moment in your entire life." (-Czk8zR_OeM)
- "the creator of the universe is madly in love with you" (3XurduW72c0)
- "I was accepted and I was welcomed for all my frailty." (DANVCZJrSwY)
- "I have loved you every moment of your life, every single moment." (OIo2kFjcWHs)
- "It just loved me. Just because I'm me." (XldxulLPD5s)
- "Dying doesn't hurt. Nobody dies alone." (kKqreMVM_ig)
- "You are worthy of all the love in the universe." (xb2eHbj8huU)

### Unity and the self

- "I am every blade of grass." (6Oneto4uX7k)
- "You are not in the universe. You actually are the universe." (BTOhMMXqsrg)
- "You are a letter in an infinite word." (Dvt8bv970-c)
- "I was not experiencing love as we may think of it, because I was love." (JpyJlDxQ5VA)
- "I felt like I am that tree, and that tree is me." (_EPvcS8S2-Q)
- "We're all just fractals of the same whole." (zVSo1B1SAPc)
- "The idea of a self just seems ridiculous." (yepi-lISuBQ)

### The return

- "put, put me back in coach. I'm ready to play." (-037JoSLNrM)
- "I give the choice to you." (1RLnKja_EPE)
- "I have to go back. I have to go back for my son." (GidbnY1JMeo)
- "You, Jeff, you can't come. You can't come. You've got to go back." (RSNZ71JZc1E)
- "You can stay or you can come with me. You're good either way." (SpyB-ElkeRk)
- "It takes more courage to live than it does to die." (OglaN_u_5ms)
- "I did not want to return. I was like, no thank you, no thank you." (gER5KxnMfw0)
- "You are under no obligation to do anything, neither to stay nor to go." (jZfbO2XFshY)
- "dying is easy, but returning to life is hard" (rKMHsB3Z--8)

### The life review

- "We do not judge what you did, but what you were." (17vs21uAjVw)
- "I went through all of the pain that I gave everyone in my entire life." (4BkS4DIiFP8)
- "There are no mistakes. What did you learn?" (ACneU_WZYjg)
- "Now your life is over and you wasted it that way." (J8Qv8qnfues)
- "I was the judge and the jury and the prosecutor and all that of my own life." (Q0ssO8KvmNA)
- "Judgment is the opposite of love." (UoPyL-cYGxw)
- "He showed me the ripple effect of every little act of kindness." (XLJ4V7O6KhI)
- "It's not up to you to judge, Alexis, but to understand." (bjEYAWyFAkE)
- "You're free of choices, but not free of consequences." (lLH_m4DqoW4)

### Time

- "Sixty years in heaven, 30 minutes Earth time." (G9lrkqr1YUQ)
- "It felt like months that I was there, but it was four minutes." (83Nvsf80Cv4)
- "The only time is an eternal now." (ZcP3LmhJu2M)
- "There was no past or future. It was a perpetual unfolding of now." (xMEWyjDkg4k)

### God, religion and guides

- "God is love, love is God, like end of story." (-HzAMygzvqI)
- "No son, I'm not God, I'm your guide." (7SW-1rKQIrg)
- "You do not have to die to know me." (73Ex_ROumGc)
- "You're my creature. I created you. I love you. I know you." (7hlBs6UP0kE)
- "Christianity has forgotten me." (MyrTTW3DU68)
- "I didn't forgive some of your sins, I forgave all of them." (W01t1uDY73c)
- "Who and what is not God?" (ZOAVzE_3nuY)
- "God is love, and that love does not include wrath." (k_Iwa790eY0)
- "Please keep your belief systems malleable." (0XJ-6Sven_Q)

### Hell and warning

- "Everything I've shown you, time's up. Me or the devil." (2F8S2mj0J4g)
- "We come here to steal, kill, and destroy." (BlqIHQOfM3U)
- "You think you can say no to me? You have no idea who I am." (ISozsB1hhms)
- "You are in hell eternally for unforgiveness." (WY-UOz01m0U)
- "You need to tell my people that the lake of fire is real." (kjd8moRa0Qs)
- "You are so loved. Hell's not real." (8r4SsV8apCw)

### Messages carried back

- "Tell my mom I love her." (HwmnyYSXE44)
- "please tell your mother that Tommy's okay." (IOODm4l7xa8)
- "Tell your sister I saw her at the wedding and she looked beautiful." (j0359hXZlIk)
- "You must tell them there is no death." (0YJAqNe2exc)
- "Stop crying for me. Stop crying. I'm happy in my real home." (4fOkyhIDrkY)
- "Mourning is lethal. Missing someone is healthy." (11DgYOavHlM)

### Aftermath and purpose

- "I woke up knowing that I no longer wanted to kill myself." (BIzQz44w6pM)
- "When you go back, it's time to live big." (YsXmXMHiE28)
- "Your purpose is to love. It's that simple." (lXK7Pi9uKmU)
- "kindness is God's love in action" (rHWBZSfWTVs)
- "I wanted to come back to get a chance to actually love." (u-2Kukqqqko)

### Pre-birth and the body

- "I remember signing up for this." (b61n2cGa_Ik)
- "We made a choice. We made a deal." (ac8aq2kzpRg)
- "Before you were born, you were given a job to do." (yqOmoXTJFM4)
- "true learning happens in the body." (I9Y3WnsaejA)
- "The body is just a prison ... to leave this body through death ... it's a liberation." (32cmmEB6vJI)

### Darkness

- "I was floating in a velvety darkness of unconditional peace, love, and tranquility." (MXfjbPzPapA)
- "Darkness may sound scary to some, but it was the most peaceful place I've ever been." (woY6gvju-JA)
- "I went from complete terror to absolute peace." (N_BHl3FV9NE)

### Animals and nature

- "All living organisms are conscious." (V53iJhwCR5M)
- "I was the one controlling the bird's actions; I actually was the bird." (CjHlv_g5mI8)

## Tensions and contradictions

1. **Loving welcome versus hellish ordeal.** Peace dominates (1oyZsqd0y3g, 82aema6PX7A, NVlnv2zBSTU, S6v6IjBZofk, ikOrFhktRpE, npuP7AxBBMs) while every digest section carries hell (1ehkaRi-0tE, BlqIHQOfM3U, JDRJU4VlCUg, OupepTZCUZ0, baquIFSE2h0, gAJShDqxM1E, kjd8moRa0Qs, xvwvK3aA8OI). Exact: 79.4 percent positive journeys against 4.0 percent distressing and 1.5 percent very negative tone (ATLAS-stats section 2.1); one channel, Touching The Afterlife, is 47.0 percent distressing against 0.6 to 4.7 percent elsewhere (section 3). Why it matters: the hell shelf is small, editorially concentrated and heavily viewed, and a book must decide whether it is data or genre.

2. **Hell is real versus hell is not real.** Literal, sometimes graded realms: 5SGbWUWoP8Y, 78QEtegZ90g (seven levels), 94W8gN0hKmI, 9HetcJ2geiM, tIwCe4Ukync. Denials from the divine side: 5eDK4_MJFKI, 8r4SsV8apCw, Bzh2puwUODw, ckACxpi7hi0 (sins do not exist), 4DDJbEAm9q8 (no duality). Hell as an escapable state: 8YGDBN9X7R8, hDhYK1ipR4M (ego loops), qTqUg_3lg2c. Why: the same archive supplies proof texts for opposite theologies, which is itself the story.

3. **Chosen, commanded or refused return.** Chosen: -V_vgOuENrw, EODDzooJ6Nw, IcqptpOHYNg, SpyB-ElkeRk, cK-1RBpZ3YY, uag13tK1_LY. Commanded or physically forced: -UQxGKYsBHU, 9z_axo_GaVo, G78BwAa5fTo, OswjIZagplI, cB3-WF5E-0k, ktixNw47KBQ, kknBKk9LZ9c. Refused, protested or reversed: 6GQDnIMpocU, EGrpt5KgwH4, M-DWYU1YJMU, f5k8tNn4DwI, gER5KxnMfw0, sS68CbEogTs. Return for someone else's welfare rather than by command or preference: RrKHw7q0PvQ, Qc8rVIR19Pw, S9NhDYQIRfQ. Exact: 17.1 percent of journeys end on a chosen return, 10.4 percent on a forced one, 49.6 percent on sudden_return (section 2.7). Why: the consolation frame assumes a willing return; many named cases did not want to come back.

4. **Life review as empathy, accusation or absence.** Empathic and nonjudgmental: 2G3ixhMxb2I, 9m77ID3wC6s, O5m1Z5hEnH4, XrNMk0K7AmU, hL07_txfcvA, u9O_LnT6eJU. Accusatory or punitive: 2Oz98Aoaaf0, 4728FuvkCOs, EhJoiaSTp7Y, J8Qv8qnfues, S1Biml02x9E, eQUrxAocfdI, q63925h8eaY. Absent: 7nPQVPbxJD4, VetWriAWgyQ, wvTexJFlePg. Exact: life_review present in 49.3 percent (section 2.5). Why: the review is the site's third most repeated claim (section 1), yet half the accounts have none and a minority describe a tribunal.

5. **Vividness versus evidential rating.** Sparse but highly rated: 4g3qLiPMlCU, DAUBS-83Lbo, DhBM4SKDq5s, RgQmKWNP3DE, T6fEH_hoLh0, cIyb089-2f8 (one element, Veridical 24). Elaborate but low rated: CqhbqN1HrKc, DN-bhUt14zA, RVuU5U_0beI, VOBEOvAgm4I, cDbEkJeWuAI (15 elements, Veridical 10), riuoB-pX4Ok. Exact: 95.1 percent rated more real than life (section 2.8) while 73.4 percent are Low evidential strength and 185 Exceptional (section 2.4); the two Greyson items that make checkable claims, deceased spirits and precognition, are the least endorsed (section 2.2). Why: intensity, depth and evidence are three axes, and a book that ranks by one will mislead.

6. **Christian specificity versus plural frameworks, and faith lost.** Jesus-centered: -pveKCy5OF8, 4HLgDKXe8TE, K2MVoxvef5M, QS6gke39iiY, XZwzxDxywoA, kTSAolN01cQ. Other traditions or none: 52e1gAdDH-Y (Jewish), 5f2y0Z5Bg7E (Islamic angels), 8tZ4pwrQCxc (Krishna), ATo0dNbUjDs (Laozi), T6fEH_hoLh0 (Shiva), OL7R0ALJjN0 (Thoth), xV-MVyTH7Hc (Sekhmet), H2mRGmknQ0U. Faith lost or loosened: MwtTRJmH1g0, VOBEOvAgm4I, aguTPw_8goU, gh6Ou14tc8I, X1vNFcR5Wh8; conversion the other way: W01t1uDY73c, M5p3GX_-0wk, hiGgb5Dkeok. Exact: religious orientation shifted for 2,675 videos (section 2.3). Why: the site's claim that belief does not matter (section 1) is contradicted in both directions.

7. **Transformation as gain, cost or nothing.** Gain: RVuU5U_0beI, YSa3El8VFOo, neYfIZk8Pg8, upmgXkXBKII. Cost: 1e4HSPc49FA (PTSD), 3yu0alwRjig (two decades of depression), GVF3Tb4GqiI (family friction), d5_6jIEc3sc, jSCUzJ6NrtQ, p3aAk8AKRQg, xTBNyMiegdM. Nothing or fading: 1pzxPkYsT9A, BBN4IZ8ndS0, ISozsB1hhms, PqddJsxn16s (an atheist for 35 more years), Yhgm4ob2rU0, alHkts11cEs, oOo6YoZPNDw (fear of death increased). Exact: 190 videos at transformation 0 (section 2.3). Why: "fear of death disappears" is the site's eighth confident claim (section 1); the exceptions are where the human story lives.

8. **Tunnel and light versus instant arrival or no imagery.** Tunnels: 1MXb5CkwyCk, 8Uj75W2W_78, JllAZV0nmqA, NyfUJD1xf08, r27tdq6tbK4. No tunnel or no light: 1WaxVu7benw, 3XurduW72c0, Cdmu8-BRxpU, Ns4NQiM1Stk, PRIMYkoZ9HY, rKMHsB3Z--8. No visuals at all: 7X3ydhGNhDI, AC4NjZEk81E. Four tunnels to choose from: QQy02qK9iq8. Exact: tunnel 23.9 percent, bright_light 60.4 percent (section 2.5); 3.1 percent of journeys open with a tunnel (section 2.7). Why: the tunnel is the popular icon and a minority feature.

9. **Darkness as terror versus darkness as home.** Terror: 3erzR-tEY1Y, ZZ4mLk4Xj7A, _v2qvMmp6WE, k9QyMwcRAmY, n3NZzNyHp3c, tdRdrfiacns. Home: 77ubKhxGyQY, 8WFgYEBVZXU, MXfjbPzPapA, ZwcPJhXByh0, ry9ARwjCwD8, tdDJHdlYyqM, woY6gvju-JA, xEKiZ8uXogY (keepers of the dark). Exact: void_darkness opens 41.9 percent of journeys and void_darkness to fear_distress is the most common doorway into distress (section 2.7). Why: the same setting is the corpus's commonest opening and its most contested meaning.

10. **Preserved self versus dissolved self.** Preserved: a8rgxYht2ms, Zxso_ix4IQw, _tn__q45bYU, wuX35UPauSw. Dissolved: 0nA0YCoSeaE, L2DuvNlGCs0, ZcP3LmhJu2M, a35E4HJhBeY, am0It9zV4FY, rw-oO4vDPxs, yepi-lISuBQ. Both at once: 8M6VvlXP2Do (merging with light while preserving choice). Why: the site's fourth claim, that you stay yourself, humor included (section 1), is exactly what the raw-awareness accounts deny.

11. **Relatives as welcomers versus refusers, deceptions or strangers.** Welcoming: 0ISQ4ejRkXU, 7qvswwOhcoI, 9a6ihWJhHfA, oYOKSioBjl4. Refusing or withholding: 0DZ6THcU0Tk, 11DgYOavHlM, LiHlGyt8hEg, OhoidSzUaxk, onghPOQEFAU (do not hug me). Deceptive: D2VxqNIkeLE, t9VIxf5oGk8. Neutral: oj8LiGnBMZ4, xpBa6BkY4Nw. Unknown in life: 6oDB4BzndCQ, FDuI95XD0FY, OIIhiywH71Q, cg-EqwksNkw. Exact: deceased relatives in 39.9 percent of element arrays (section 2.5) and 30.7 percent of videos (section 2.6). Why: "someone was chosen to wait for you" is the site's first claim (section 1); the waiting is not always a welcome.

12. **Family as anchor versus family forgotten.** Anchor: As9o57usxuI, GidbnY1JMeo, XBwuCjgP64E, neYfIZk8Pg8, z1QtKaNnN8o. Forgotten or unfelt: 0nA0YCoSeaE, I0rHgQgm430, NePBdX5gb8M, ScCE1Y5v8u8, l5kQTT7p19I, ocQWhCocVjo. Why: the return-for-the-children plot is the archive's most repeated, and some experiencers report feeling no pull at all.

13. **Body as prison versus body as classroom.** Prison or downgrade: 32cmmEB6vJI, 8EWPOWLA4ro, BCV0xLbp-AU, hGtaSRwIfuc. Classroom or necessity: I9Y3WnsaejA, s3_qA8LXnYs, fRroXDCfjQM (the body as a car), kVQQkju6Vz8 (Earth as master class), plp17v4VlRk. Why: the two readings lead to opposite ethics of embodiment, and the site's "brain receives consciousness" claim (section 1) sits closer to the first.

14. **Prolonged clinical death with nothing remembered versus hours of content, and one episode versus many.** Nothing: w_WtY63NnoM (85 minutes), 7Zsp5nvsMpw and N8NRfCHOO8Y (one-word transcripts). Elaborate: wrfI3D0sEQg (12 hours in a morgue), wy9LnsfxVvQ (11 hours), zFDzx6PSPf8 (24 hours), dhzXDxjWjcc (45 minutes in a body bag), PY5I2sCRQWE (47 minutes without a pulse). Many episodes: cpmwYTMXVrA (nine), rbB_bKCViAA (twenty), BW_drocQYq4 (ten arrests). Exact: 60 videos have none of the 15 elements (section 2.5); 468 summaries mention multiple NDEs (section 7). Why: duration and richness do not track, and repetition changes what one "experience" means.

15. **NDE label versus content.** Compilations, lectures, ADCs, STEs, drug states, mediumship and null transcripts: -gKY-EmmTSQ, 4AmEiVvBQmo, 8Gghhqcu-Es, AE-Z6jZ6BFU (a product launch), PUW3DBLAJJk (a Swedenborg summary), RTXxA-Fm0qA (1916 mediumship), gLDjfEW3tfk (5-MeO-DMT), g-H-Gm_2sUg, kniiM3TGT48, sG506zu4FW0 (a chameleon story), w1O_wsPOM1A. Exact: 9.5 percent of confirmed videos carry a non-nde experience type and 102 are labelled Not NDE (section 2.1); 745 have empty journey sequences (section 1). Why: every count in this atlas includes some of this material.

## Rare and unusual

1. Transcripts containing only a greeting, "Hi" (7Zsp5nvsMpw, N8NRfCHOO8Y) or "Hello." (TOvp2vvxjH8); an alphabet history (HkrjCKytN2k); a moving-day transcript (S7-LOH8hVTE).
2. A future-probability machine of gears or an egg-shaped lattice, often beside a ruined city, in seven of eight sections: 2j3Y56wlR_E, BycLo54-XqM, 83nippOv-QI, HFGOHZgvaho, MbNVvz0DzMw, O1w0rYE3398, PRWLJUCq0iI, WVuIi_1nAgo, aJaWNnPYo74, fXTLDvm-DLg, zE1aFGPJT78.
3. A blue tunnel of binary code: APPKmB7lOrc, G378QaqMvGg, Xt-65cjaT4M, Y9N9H6bvEHg, lgumAeBtwgo.
4. Councils of twelve, twice as blue Arcturians reviewing 844 lifetimes and adjusting DNA: 9V5YcGUJ-ww, GUP_d9rHxjk, Kp0ClWg5gaE, T9AAIb2hpjA, cofs12aN6iQ, klsmBdhTeCo, vjxlEGUX9g4, yK5HZqeD7tU.
5. Nine caped Lords of Karma: 5q4nlDh_ejk, owXgK-1q3iA, zPFh_ueHFMM.
6. Stopping a water drop in midair and multiplying into five selves: MQ1M6QzodSQ, ai8Eu--KHjo, bZX5J8tlmrQ, rD723voREfc, vAPNwnQ0rBU.
7. A 30-foot being that becomes an icosahedron, with seven giant female angels: Fq1qdoLA1fo, Ef5nL9t2j-8, Vc4drwrYdZ4, ABdHND-LWqo.
8. A cobra as loving presence, once working like a defibrillator: 4xrtyOqwr9E, AcZi2ppcneg, KS47u9TcNUQ, LSjrwes0QS4, Xoq7PNoTkHQ, hIBGOEcxRyM, nXP69odM2fI.
9. Dolphins physically pushing drowning people to the surface: D7Yxikrla4M, H2mRGmknQ0U, UPtDWAaDIU0, arDUy5S4YRI, eWgh8bRLCRk, l15XSTsHuc4, r5oj6vNXDvM, uVfuWa4V9T4.
10. Deceased pets as floating spheres of awareness (8LGGq0BGT4k, ACvdSH2QfAA, wqlzxHDuNB8) and a horse identifying which of its eyes was blind (CBX_L8oDBU4, wB92QIV00A8).
11. Grass that tastes like watermelon (_PpFinFUD8o, u8qFFFd2AmQ); tasting colors and sound-color synesthesia (380o2GIluB8, 5cSL2upSdX8, NWMYIVoeMSo).
12. Celebrity-shaped guides: George Carlin (ZTWpoIeJovE, kVQQkju6Vz8), Abraham Lincoln (rbB_bKCViAA), George Washington (Ix_XzmRY3wQ), Sitting Bull and Freddie Mercury at a table of 77 (sKGjt6TwEek), Tupac and Michael Jackson (fr-sBxUsiWA), a Santa Claus figure (Xmty6MoWk2A), a sinister Marilyn Monroe (HhgV8fcsQdk).
13. A rescuer in a vintage bathing suit who vanishes (Qc8rVIR19Pw, fxgClj4J3G0, vYeIV3tW-DM) and a woman at a crash site whom rescuers did not see (aMig7oQoBrw).
14. A guide named Drake across three sections: DmviKRfJ8vI, SV712eZNI3o, PmPI_xqtwZc, QXwyZoOf0xY, dhzXDxjWjcc, f5dO4hsR8_M, j6HKEII-fAw.
15. Penny's message in six videos (HwmnyYSXE44, JsEOk4tZJlA, LY16jxe3VXg, MlD3102w8Rw, kmdazqHJUps, yh1EMNV1L7U) and the Mary Fran and Nolan shared death in three (M3YeSCgHug8, MOXP7AyKBaA, N2287G6fvw0).
16. A child choosing a next life in Numata or Numano, Hokkaido: J61y3c-LdFw, vu2B1CS47GQ.
17. Three small hooded, playful beings, sometimes asking "What did you learn?": 1aL9ygMbjCs, 5MjoNcVO-hE, 7xO_VqpgIt4, 7zBa3diA0kM, EJSUAmR-I1o, e9h42liFieM, v_AQgUDx35g.
18. Twelve Native American elders dictating thirteen chapters over thirteen nights: 0NsLVjC6rd8, exrc19Zm5Bg.
19. Walk-in souls and soul fragments: 0aZxXfmOicM, 6w1pRO8MxnY, Ar8HPsuvbB8, EOblFuUL7EQ (twenty-two fragments), FGM_kG1j31c, XATtwfCFkmg, a3ahyF00aaw, xS6OGJq3KwM.
20. A silver or golden cord: 8Fx_g0Z-XsM, Bq8tMm0qySg, DYnh3F093i0, ECEzjV5Pxac, Ht8fFjCAYNA, MwZ7fNsWQig, NHWzHFPs15A, aa3aCe_rVZ0, k1nRZ0mQWZQ.
21. Kennedy's assassination and Vietnam foreseen, usually in childhood: 4pQJG9ZlvqQ, EYD7MlADJbU, IGj-rUp7sD0, V6XXFICMXLU, W5XPg7oz_-8, Xoq7PNoTkHQ, qR7s0sRW130.
22. Satan offering fame, money and marriage for worship, and a blood contract: gW_2PmL5mWg, j4zj3cKT4uo, qur0CAHu-X8.
23. Whole lifetimes inside minutes: an alternate life in a three-week coma (h-XpjzpHx2g), 2,500 subjective years (Zgn0TtqrAFY), 42 years in a three-year-old's NDE (jPqMsmvgE3w), sixty years in thirty minutes (G9lrkqr1YUQ, d5L67DmEzT8), 500 years in two minutes (NWzFarHI8DQ).
24. Blue-skinned fish-tailed beings and water planets with mer people: 3ogvhI-tcdk, 4tKceLJplFM, 8dWMZU4F1OA, KUCVoQUHksE, _juQTUJ0_Gw, cDbEkJeWuAI, k8G2Z5y_wX8, vbHuifrMSAc.
25. Body-bag NDEs (-Bhv9YIRC-I, SV712eZNI3o, dhzXDxjWjcc, xo4qaSD-Y4E), Hitler in hell (dwCEPYFD67s, nUFC24LLZ7Q), and a police chief who builds a machine to talk to the dead (IOODm4l7xa8, hqgJ4GJWBpc).

## Candidate book directions

Each direction is framed against *The Accidental Mystic* (how 5,000 NDEs teach us to live with love) and the existing site material as summarized in ATLAS-stats section 1: 81 consolation-oriented Big Questions with nothing on evidence, the brain, blind or child experiencers, combat, or what an NDE does to a marriage or career, and 111 blog stories drawn only from experiencers above 250,000 views.

**1. Sent Back (the return problem).** The modal story closes with an abrupt return, and only 17.1 percent end on a chosen one (ATLAS-stats section 2.7), yet the accounts describe at least six mechanisms: free choice, negotiation, command, physical force, return for someone else's welfare, and refusal or reversal. A book that makes the return the moral center rather than the epilogue. Themes: 2, 12, 24. IDs: -UQxGKYsBHU, 1RLnKja_EPE, 6GQDnIMpocU, EGrpt5KgwH4, M-DWYU1YJMU, RrKHw7q0PvQ, SWRy_tpwsq8, er4ZGG4p-5I, jZfbO2XFshY, uag13tK1_LY. Differs: the existing stories use the return as the moment the lesson is carried home; this asks who decides, and what it costs those who did not want to come back.

**2. Feeling What You Made Them Feel (the empathy machine).** The life review as a mechanism: felt from the victim's side, from animals' side, across ripples of kindness, from three viewpoints at once, interactive with removable gears, sometimes accusatory, sometimes run forward into the future, and absent from half the corpus (49.3 percent present, section 2.5). Themes: 6, 17, 18. IDs: 17vs21uAjVw, 28o9qbvktN8, 2Oz98Aoaaf0, BycLo54-XqM, D3MlrVCbspk, HI31zW6GiZY, LtdVlrugGt4, Q7JfC0U0_Fc, RVuU5U_0beI, zoq0jfCN_8Q. Differs: the site already says the review is self-judgment inside love (section 1); this takes the machine apart, including the reviews that accuse.

**3. Evidence at the Ceiling (vivid is not veridical).** Nearly every account is rated more real than life (95.1 percent, section 2.8) but 73.4 percent are Low evidential strength (section 2.4); the highest ratings attach to slippers, a Snickers bar, a salon message and a four-number code while elaborate cosmologies rate lowest. Told through the 185 Exceptional cases. Themes: 13, 5, 30. IDs: 4g3qLiPMlCU, 911eSfXSrIA, 7qvswwOhcoI, IOODm4l7xa8, OQdS9iDDJzk, aLllPkXBhPI, d3Bo1Fei950, mL3nT0cAZ2g, sAjRH6nL5Gc, cIyb089-2f8. Differs: the Big Questions contain nothing on evidence and readers ask for it (section 1); *The Accidental Mystic* argues from love, not from proof.

**4. The Counter-Archive (hell is not the end of the story).** Only 4.0 percent of journeys are distressing and one channel supplies most of the top of that list (section 3), yet more than a third of distressing journeys end with a positive tone (section 3); hell here is a threshold that produces conversion, sobriety or service, and a minority stay frightened. Themes: 12, 23, 26. IDs: -wSVuwl0G4k, 6lDnttJnT08, BlqIHQOfM3U, ISozsB1hhms, JDRJU4VlCUg, XGsCcEWCAU8, baquIFSE2h0, gAJShDqxM1E, qTqUg_3lg2c, tIwCe4Ukync. Differs: the site's Hell and Judgment answers hedge between "no literal hell" and ten literal hell stories (section 1); this makes the counter-archive itself the subject, including accounts where hell never resolves.

**5. Who Owns the Light (one light, many names).** Jesus, Allah, Shiva, Thoth, Sekhmet, Lady Zainab, Laozi, Buddha, an aurora field, a George Carlin lookalike and an entity that refuses worship, all announced with equal certainty; near-identical unity experiences lead to conversion, universalism or loss of faith. Themes: 11, 26, 20. IDs: 35bzZcacOcI, 4ZPHunKGo3U, 8tZ4pwrQCxc, H2mRGmknQ0U, OizX472ycCw, OL7R0ALJjN0, TZUupVwc-Uk, VOBEOvAgm4I, hiGgb5Dkeok, xV-MVyTH7Hc. Differs: the site's confident claim is that belief does not matter and the divine takes a recognizable form (section 1); this sits with the imam's reversal and the pastor's loss of faith.

**6. Before Words, Without Eyes (who gets to see).** Blind-from-birth experiencers describe traffic and rings, a deaf man hears relatives, a newborn draws what he saw, a two-day-old reports a circumcision room, a fetus remembers a twin, a small child plans a life in Hokkaido. Themes: 16, 30, 8. IDs: 0mM3ut9pBvA, FCCE0QivRME, 8s3wlhjuKLo, GywGA-9TEDk, J61y3c-LdFw, JXj-XeY8HB4, cHIdkYgdJJY, dKPSBYkvMKs, mUzS5gHTAvI, r4WJMRu78_g. Differs: the site has nothing on blind or child experiencers although visitors ask about both (section 1), and roughly 623 child cases sit in the corpus with no coded field (section 7).

**7. The Second Half of the Story (when heaven hurts).** Almost every account shows some transformation (97.0 percent, section 6), but 190 score zero (section 2.3) and the digests name PTSD, depression, anger at return, unwanted mediumship, decades of isolation and institutional silence. Reintegration as the neglected half, with vocation as its best outcome. Themes: 24, 27, 3. IDs: 1e4HSPc49FA, 3yu0alwRjig, AE_8E6casn0, AW8YdHHiDzk, BBN4IZ8ndS0, d5_6jIEc3sc, hX00Qp0-dco, oQ4ncfLQiNc, p3aAk8AKRQg, xTBNyMiegdM. Differs: the blog's subjects are Bridge Builders with big audiences and the site claims fear of death disappears (section 1); this follows what the NDE does to a marriage, a career and a mind.

**8. Two at the Threshold (shared death).** 166 shared death experiences and 75 after-death communications (section 2.1), plus dozens filed as NDEs, describe experiences that belong to two people: a daughter and dying father, a mother collecting her dying child, two women connected in the light until one must come down. Themes: 22, 4. IDs: 3Guf-__HSzA, 5HKSk5F_aNo, 9mv-Wt7LLhM, KXNZqAFMDa4, MOXP7AyKBaA, XeConDwzdJg, ZRRZ-cyq2JE, gsUn8mmz5jg, o-CfJIaANJA, syIfnCJX3_c. Differs: the blog has one SDE story and nothing on ADC or deathbed visions (section 1); grief as portal carries a different evidential logic from the operating room.

**9. Orientation Center (the afterlife atlas).** Libraries, orientation centers, universities, planetariums, a Book of Life, councils of twelve, Lords of Karma, crystal cities, water planets, Watchers and galactic federations, mapped as competing architectures rather than one heaven. Themes: 21, 29, 20. IDs: 94W8gN0hKmI, DgU4S5CAMq4, K9rOdAoaKcI, PBrBoc2C0Sc, S14VrsILt6U, cufdQc-79k0, g1EBxqXHr2M, q_a_6yn2gE8, u-_bkoxO0uM, zPFh_ueHFMM. Differs: What the Afterlife Is Like is a seven-question consolation category (section 1); this is cartography, including the spaceship and simulation vocabulary of the late archive.

**10. Signing Up for This (life as curriculum).** Pre-birth planning, chosen parents, selected traumas and injuries, contracts signed and dated, a marketplace of hardships; the model recasts suffering as agreed assignment and turns morally difficult when the hardship is abuse or addiction. Themes: 15, 23, 16. IDs: 0s03kVt2bcE, 7mjRDP22WGg, 7taDEsm_GWc, DKU-075i-uY, PtTl_qJ_3zE, TbWccmzIMa0, b61n2cGa_Ik, cX6A7w2vLl8, liyewCmXHmA, u3WqNlnPNCU. Differs: the site's pre-birth answers sit unresolved beside "mistakes allowed, plan flexible" (section 1); this tests the contract model against the suicide and abuse accounts.

**11. Told Again (the Olsen problem).** Jeff Olsen's accident appears in at least a dozen videos across six sections, Barbara Bartolome's ceiling view in six with different veridical ratings, Penny's message in six, and Peter Panagore has 35 videos and Howard Storm 26 (section 7). A book about how testimony changes in retelling, and what the archive's counts actually count. Themes: 19, 13. IDs: 1FD5lReqe64, ACneU_WZYjg, M-FijSjhV0A, RSNZ71JZc1E, s3s56iUENd4, z1QtKaNnN8o, DAUBS-83Lbo, N40jnsNYFNY, e07Wte7xLM4, zg3HnkSg38s. Differs: the blog already duplicates Olsen, Tolman and McDaniel under different slugs (section 1); this makes repetition the method.

**12. Every Being Has Its Place (the animal afterlife).** Dolphins push drowning children up, a horse says which eye was blind, a cobra works like a defibrillator, pets return as spheres of awareness, and a hunter's review is built from animals' fear; the animal as person, rescuer and moral teacher, with an ecological mandate. Themes: 17, 6. IDs: 28o9qbvktN8, 8LGGq0BGT4k, D7Yxikrla4M, CBX_L8oDBU4, Xoq7PNoTkHQ, jy8TDTlQR58, oZEh089PXQk, wGw_el4rtp4, wqlzxHDuNB8, Z3iKLbXI1_A. Differs: the six Pets questions say pets are there, restored, and carry no blame (section 1); this is about animals as agents rather than comforts.

## Coverage notes

Distinct video IDs cited in this file: 621, drawn from all eight digest sections. Section contributions by part: the theme taxonomy takes one exemplar per section wherever a theme was named in all eight, so it is close to even; digest section 1 supplies the most quotes to the quote bank (its digest carried 44 quotable lines, the largest set), with sections 4, 5, 7 and 8 next; standout accounts are weighted toward digest sections 1 through 4 and 7 (six each) and lighter on 5, 6 and 8 (three or four each), because the evidential and childhood standouts cluster in the earlier sections and in section 7; the tensions and rarities draw most on digest sections 1, 2, 3 and 8, which had the longest rare lists; the book directions lean on ATLAS-stats sections 1, 2.1, 2.3, 2.5, 2.7 and 7 for their anchoring numbers. Left out for space: healing claims after return (Pru_MbqJ0Ts, xpYnBDyPFJs, mZj9eWeccAM), childbirth and combat as trigger contexts (rbkmRgwqHmM, KyXyFKEGu0A), trauma and abuse as context (Y2FuFg2VGLs, b-OJPx2QiII), the simulation and mathematics vocabulary as its own theme (5XrA79_T_R0, WJhDea6rrTU, qFwBhxN0GdQ), several hundred single-section oddities in the digests' rare lists, most of the 15-element cards, the channel-level view in ATLAS-stats section 3, and the four French and Portuguese accounts beyond the three cited here (17vs21uAjVw, 28o9qbvktN8, mL3nT0cAZ2g). Two limits to keep in mind when using this file: the same experiencer under several IDs inflates every count above (theme 19), and every theme figure not marked exact is a sum of model estimates.
---
# UAP narrative atlas

This file is the UAP half of the Project Profound narrative atlas, a reading companion to an archive of about 8,400 tier 1 and 2 UFO and UAP videos (7,592 with summaries) and about 7,000 coded encounters (exact: n=8394 videos and n=7017 encounters in ATLAS-stats sections 4.1 and 4.2). It was built in three passes: 190 batch digests of 40 videos each, merged into ten section digests of roughly 800 videos (section 10 holds about 392), merged here into one corpus-wide view. Its purpose is to let a later session generate book ideas without rereading 7,600 summaries. Theme counts below are model estimates summed across the ten section digests and should be read as orders of magnitude, not measurements; ATLAS-stats.md holds the exact coded figures and is cited as "exact: ... in ATLAS-stats section N" wherever a coded field matches a theme. Every video ID opens at youtube.com/watch?v=ID.

## Theme taxonomy

Twenty-nine themes, ordered by summed section estimates. Themes the batch digests never counted separately but that recur in every section's rare lists are placed last with examples only.

**1. Disclosure, secrecy and institutional control.** Classified programs, crash-retrieval claims, whistleblowers, FOIA barriers, hearings, nondisclosure agreements and retaliation. Roughly 2,850 of 7,600 (about 37 percent), the largest theme in every section. Exact: secrecy mechanisms appear in 22.2 percent of videos, legislative events in 15.8 percent, and 171 videos carry under-oath claims (ATLAS-stats section 4.3); program_disclosure is 14.1 percent of content type (4.1) and the UAP Disclosure Act is the most-linked event at 77 videos (4.4). Examples: -U2u43Vdt_g, 7STUNCWWn5c, Dk7wWp7iL60, OZMEwUsFMiA, SL5aeQpd984, cPr0GqahbkI, kRO5jOa06Qw, vSpHaNbd5A8. Quote: "withholding information is a crime against humanity." (Npn6D6NvPd8)

**2. Psi, consciousness and telepathic contact.** Meditation, remote viewing, channeling, hypnosis, DMT, out-of-body travel and telepathic summons as the medium of contact. Roughly 2,200 of 7,600 (about 29 percent). Exact: has_psi_content is flagged on 54.0 percent of videos (4,111), and psi videos have mean contact depth 21.6 against 11.3 without (ATLAS-stats sections 4.3 and 5). Examples: 0Mt2RPQ-pX8, 9nwX7OiyGF4, Cm_OGhtAptc, M33siPVZg24, RhaZdlRKzAQ, ZYcLgi8iJ6g, jXnizNCEoH4, y-98uGc76Gk. Quote: "the brain does not create consciousness but may filter or modulate it." (ReT4JkaTZ0o)

**3. Close-range craft, lights and anomalous motion.** Silent hovering, instantaneous acceleration, splitting and merging, cubes inside spheres, triangles, Tic Tacs and objects with no visible edge. Roughly 1,400 of 7,600 (about 18 percent), an undercount because section 1 counted it in only six batches. Exact: has_craft_observation 38.7 percent of videos (4.3); CE1 is 33.1 percent (2,326) of encounters and NL 3.7 percent (4.2); CE1 rises to 59.5 percent of 2020s encounters (5). Examples: 4xC_fY8VXsU, 6JTru-XtmIc, DBV2bG0NXsM, NJzN3AFlTcw, U-8XJvHRuzY, _Q7E8Z2yZnY, lPqFZOpfyX4, wpkX3_WkosA. Quote: "VIOLATES EVERY KIND OF LAW WE CAN THINK OF" (5KfiM9McgKs)

**4. Nonhuman entities and occupants.** Greys, humanoids, mantids, reptilians, Nordics, light beings, robots and unclassified figures seen at close range. Roughly 1,100 of 7,600 (about 15 percent). Exact: CE3 is the largest Hynek class at 37.7 percent (2,644) of encounters (4.2); dominant entity codes are humanoid 13.6 percent (1,031), grey 5.9 percent (448), light_being 2.4 percent (179), insectoid_other 1.5 percent, mantis 1.1 percent (83), reptilian 0.6 percent (4.3); CE3 peaks in the 1970s at 59.2 percent and falls to 24.2 percent in the 2020s (5). Examples: 0H-r5QzJnuM, 9KsdePja77g, F83oyez1wl0, L8t6e65YbK0, SDx0uMPivJY, YnpbuAAFHjM, g5Jdq8yig74, zQYte-GElNw. Quote: "a three-fingered hand waved back." (ujc1uV09dpo)

**5. Military, aviation and official witnesses.** Pilots, radar operators, missile crews, police, astronauts and flight surgeons who move the subject from folklore toward operational concern. Roughly 950 of 7,600 (about 12 percent). Exact: a military witness is present in 15.3 percent (1,002) of encounters with context (4.2), and the top-evidence tier of the archive is military witnesses and archival footage (7). Examples: 3L-XG1F_S7I, 6cgeAklr2VM, GBUULtF0TGw, KUyGnFFilP0, WJjP0khrKsI, ZBVhtwwkgFs, gX8qflzkQIE, wQwFoMpcoZg. Quote: "IT JUST REVERSED COURSE AND IS TRAILING YOUR AIRCRAFT." (bmsc8wblUOw)

**6. Transformation, vocation and public testimony.** Witnesses become researchers, advocates, healers, authors or whistleblowers; a minority report trauma, PTSD or nothing at all. Roughly 900 of 7,600 (about 12 percent). Exact: 61.3 percent of 4,845 scored encounters score exactly 0 on transformation and 8.7 percent score 30 to 60 (4.2); CE4 (mean 21.4) and CE5 (22.3) transform while CE1 (3.4) and CE2 (3.7) do not (5). Examples: -gV7ugoaRO4, AjMbdsmBI_M, DjlrxD2Fl84, NeWtRgFanxc, V738gSQkXKY, nVkGEL5eRiY, uo24GnzcLpg, yf5YfObpBC4. Quote: "obliteration of her identity" (nVkGEL5eRiY)

**7. Physical traces, bodily effects and instrument corroboration.** Burns, radiation, whitened grass, compressed soil, stalled or lifted vehicles, stopped clocks, radar and infrared tracks. Roughly 600 of 7,600 (about 8 percent). Exact: CE2 is only 1.9 percent (134) of encounters but carries the strongest evidence of any class, mean 16.4 with 28.9 percent at 19 or above (4.2 and 5). Examples: 2YfF6IUBLuw, 7byEMoFezRQ, Ctt1__Y2nVI, P-qkBu7RPm4, QC6nxcOoHbk, aQxV7NwSSWA, njvpQDrprpE, zAzDhbkoBHs. Quote: "The object lifted their car off the ground" (P-qkBu7RPm4)

**8. Abduction, missing time and onboard examination.** Paralysis, lost hours or days, regression memories, examinations, reproductive procedures and craft interiors. Roughly 550 of 7,600 (about 7 percent). Exact: CE4 is 5.6 percent (390) of encounters, with mean contact depth 26.7 and 76.7 percent in the 25 to 32 band (4.2 and 5). Examples: 5d-ccxq0s50, 89SaMvnY4BU, DqbNlj-k0Zo, MEcuAAJnSeM, SYoXSa32EZI, cAjZxClrdCQ, rE0LJvSUi8s, xE6PC7_GFv8. Quote: "I felt like boiling water was flowing through me." (SYoXSa32EZI)

**9. Evidence disputes, skepticism and conventional explanations.** Balloons, satellites, drones, hoaxes, AI fakes and laboratory results weighed against unknowns, including the New Jersey drone wave (hyECkHa2eiU, j3kgwc4Ymzo). Roughly 500 of 7,600 (about 7 percent). Exact: investigative is the dominant video tone at 50.4 percent (4.3), and evidence score is null on 31.0 percent of encounters and effectively an encounters-track measure (4.2 and 5). Examples: 3joF9DEaPVg, 8TXpU-bDgyc, E9HPUxD1ZyY, M8Xb3q0NILY, Sh9Q9j53DnQ, a9ZQ39I1I10, sQ7JW94VSmI, z0ngu1swppQ. Quote: "current evidence does not convincingly support the idea of extraterrestrial craft." (z0ngu1swppQ)

**10. Historical cases and archival reconstruction.** Roswell, Blue Book, Rendlesham chronology, Kecksburg, ghost rockets and pre-1900 reports retold through modern disclosure. Roughly 250 of 7,600 (about 3 percent). Exact: dated encounters cluster in 1960 to 1999 (1970s 632, 1990s 548) even though the videos are from 2021 to 2026, and 34 encounters are dated before 1900, all retold rather than witnessed (4.2 and 7). Examples: 3eg0X8xEhfQ, 7LI7ht4KFsY, Db8jLmwtBas, Nr3j-lYrmto, avZjNzGw3EY, dsC2uHLSI84, o_HcqpNTUws, vrLhPQm3W3k. Quote: "There was a cover-up" (7STUNCWWn5c)

**11. Crash retrieval and nonhuman biologics.** Debris, crates, bodies, hospital-treated creatures and recovered technology. Counted separately in seven sections at roughly 110 of 7,600, but the coded flags are far larger. Exact: has_crash_retrieval_claim 11.9 percent (906 videos) and has_biologics_claim 16.4 percent (1,248) (4.3). Examples: 3PZ2HIGVmjE, 97bkQT_BCkI, GYvYLQ8Klk0, Jpf0ZGY87c0, VHOwe9dsOwI, _sv0Otxtcn4, dnnpyNuPdXs, ySYuYKDDBuM. Quote: "We have alien bodies and they are hiding it from you" (kZle-PYmoQE)

**12. Stigma, credibility and psychological aftermath.** Ridicule, family disbelief, institutionalization, decades of silence and support networks. Roughly 100 of 7,600 where counted (sections 1, 3, 6, 8), though the motif runs through most testimony. Examples: 2VZJvUOYWao, 99JGZ2lmXXU, Gj7bRKlzwfE, bOWdv8U8moE, kJQ_FsmU19g, wp4btkW1kbs. Quote: "they no longer felt crazy" (U6cVjGq_7iQ)

**13. Research, commentary and mediated formats.** Panels, documentaries and retold cases that shift attention from event to evidence and trust. Roughly 85 of 7,600 where counted (sections 2, 8, 10). Exact: content type is interview 29.0 percent, research_analysis 20.0 percent, program_disclosure 14.1 percent and first_person only 10.6 percent, and 52.3 percent of videos contain zero encounters (4.1). Examples: BnUdafE1Xd4, C1ZdJ7wsgnQ, mwIsDq5qLXU, n_UsFX0op8k, x7Yqs75eRUI, ya8_5PyM2F0. Quote: "many UFO sightings can be attributed to psychological and sociological factors" (mwIsDq5qLXU)

**14. Alternative origins and nonhuman ontologies.** Interdimensional beings, cryptoterrestrials, future humans, Anunnaki engineering, hollow Earth and simulation. Roughly 80 of 7,600 where counted (sections 4, 7, 9). Examples: 5Irh1gr4Sts, 6jQFWiaUPCg, HQQGksVfdV4, KFfsyb07QPw, MSGot93J1Ow, jSwCCCF5x3I, vZBRMcUkqNA, yryV6kwo7AA. Quote: "The aliens explained they came from a different dimension, not a different star." (JyWH9Y6GbGg)

**15. Multi-witness and mass sightings.** Schoolyards, stadiums, troops, towns and highways. Roughly 55 of 7,600 where counted (sections 3, 8, 9, 10). Exact: 0.8 percent (53) of encounters mention more than 100 witnesses and 2.3 percent mention 11 to 100 (4.2). Examples: 4I75neaOIGE, 7J132DogCUs, E5wdHgx8uMs, LB5rDWOduqg, SMvpCU9QM9I, YUtEcAPMsT8, oy_vI5JsrYw, wu3d4IEIDLc. Quote: "They were running in slowmotion" (7J132DogCUs)

**16. The push to make UAP research scientific.** Sensors, detector studies, injury surveys, passive radar, databases and image standards. Roughly 55 of 7,600 where counted (sections 1, 8). Exact: academic tone is 0.6 percent (47 videos) (4.3). Examples: 4CPhH2DEp74, 9D7XPZnxoqw, HoIaVvU-VUE, U6cVjGq_7iQ, mwsEatnZ358, q_9DyxGceQo, t_srfowbF48. Quote: "data rather than a predetermined narrative" (kNEJaw-Erks)

**17. Religion, human origins and cultural translation.** Fatima, Marian apparitions, Genesis 6, ancestors, Anunnaki labor forces and new movements. Roughly 55 of 7,600 where counted (sections 1, 5 and part of section 8's historical theme). Examples: 27eN_ULanWM, 1zimA2Sv-Q0, 7YY5GYT43bk, EFeC7HS4B24, musvkaZm6Jc, pTQ5vWJ6aBA, v3g2mp4WO2Y, z77GG6nnrfI. Quote: "We never called ourselves angels, you did." (PIiN6nf22q4)

**18. Nuclear weapons and missile-site incidents.** Missile shutdowns, warheads off alert, beams at test warheads and the silence orders that follow. Counted separately only in sections 5 and 7 (about 35), but present in every section inside the military theme. Exact: three of the five top-evidence encounters in the archive are Robert Salas or the 2010 nuclear-sites press conference (7). Examples: -0g3lLGxNfc, Cac-056wRpk, HZUzGJmE0hQ, KkZWHpP17Rc, Tu2USgrCMvk, _EIBtsag8Sc, fnnwvxDKwtM, x4wL4lbwwNU. Quote: "all ten of the nuclear missiles under his control went offline" (HZUzGJmE0hQ)

**19. Childhood onset, family and multigenerational contact.** Early figures, later triggers, adult vocations, and abduction that spans parents, siblings, children and grandchildren. Roughly 25 of 7,600 where counted (sections 2, 3, 5), with uncounted family examples in every section. Examples: -tv-ARz7lqU, -MYsNEl9Lrw, 8Qs8JqBifg4, B2K4_uEteZU, SuYlonQsMaI, b3FbW0GfDbw, lPmypzHu7Jk, rE0LJvSUi8s. Quote: "We are coming back for you." (-BHwqr6EZMw)

**20. Nonhuman messages: warnings, ecology, benevolence and threat.** Environmental warnings, evolutionary claims, guardians and demons. Roughly 25 of 7,600 where counted (sections 2, 6, 7). Examples: 8L6M2mRcux4, QRkhmCHHdhc, U3GJ7AEqQmg, YkT4CK-omjo, dJSXIkNCDTo, dRFT_YGL04c, udwaN5YVz-A, x4IXDQqpMSY. Quote: "You're in no danger. We mean you no harm." (dEJE2mAuwqQ)

**21. Underwater objects and transmedium craft.** USOs, sonar contacts, seabed anomalies and objects entering or leaving water. Roughly 20 of 7,600 where counted (sections 3, 6, 9), uncounted in section 1. Examples: 0DKgV8DKSu8, ABDlCbumob0, H5Jrp3CRbao, Q1WtylyzOdA, RIUskH2rsxc, cOG1kZozQc8, hUx6gHw3McM, sFsjFS8LVto. Quote: "moving at several hundred knots underwater" (sFsjFS8LVto)

**22. UAP and paranormal crossover.** Yowies, Sasquatch, hellhounds, ghosts, owls and Skinwalker "hitchhikers." Roughly 15 of 7,600 where counted (sections 4, 5). Examples: 1jFPOqycPm0, 8VBE_K8kk1E, JBVPEyERkZM, OsHOQe-xRUk, QbQvoPDVpu4, Xn9lGPBSuUM, nrO10iXYrqc, xRR6NR0VDl4. Quote: "a strong connection to the themes of owls and their symbolism" (y-98uGc76Gk)

**23. Human-initiated contact (CE5).** Meditation, machine calling, laser and flashlight signals, and lights that answer. Roughly 10 of 7,600 where counted (sections 1, 10) but discussed in most sections. Exact: CE5 is 1.5 percent (107) of encounters, appears only from the 1990s, and is the one class that is simultaneously lowest in evidence (mean 9.7) and highest in transformation (mean 22.3) (4.2 and 5). Examples: 36p3g8Zhnvg, 6TaNOkvQSCQ, F56P24aulLY, JUthXIGUsq8, RtywWrnyKU4, XGJb5AdUFdI, k4zTg-NwV2I, zjQopjUr35k. Quote: "true disclosure comes from individuals making contact themselves" (AHr5wVOJYn0)

**24. Brazilian and international case ecologies.** Varginha, Colares, Operation Prato, Peru, Belgium, Iran, Korea and Japan. Roughly 8 of 7,600 where counted (section 2), but a much larger presence. Exact: Brazil is 7.8 percent of encounters after the United States at 38.6 percent, with the United Kingdom and Australia at 4.9 percent each and 87 further countries under 1 percent (4.2); Brazil UFO is the largest channel by video count at 682 (4.5). Examples: 5tgWPVQ8JHY, E76kpPjxMcw, MW58Qjd5Q54, S713pxMKovM, hkXjuEeRY_4, qCAH8btkwvo, wQwFoMpcoZg, xluya-2ov40. Quote: "PRA VOCÊ COMPREENDER MINIMAMENTE O FENÔMENO OVNI, É PRECISO APELAR A TUDO" (bhz6rb8tY4Q)

**25. Healing claims.** Addiction, Crohn's disease, cancer, a collapsed lung and a limp reported cured aboard craft or by beings. Roughly 7 of 7,600 where counted (section 4), with rare-list entries in most sections. Examples: 5bctWWFMwj4, 8yPrb-YWaN4, E47Bc9ps-uI, N6MOVZFKKWc, RFI4RWzH3ik, bM18PJY6_Zc, ls5nfnybCm0, sqNqFp6wnQI. Quote: "gold scar on her abdomen" (ls5nfnybCm0)

**26. Mantis beings as examiners, teachers and healers.** Never counted per batch, but present in the rare list of every section. Exact: mantis is 1.1 percent (83) of dominant entity codes with mean transformation 21.4 (4.3 and 5). Examples: 15ki-BkNfII, 8uG7xYh2QT4, HHtKB6aVhB8, LATwocpqpbo, WCxUaobyze8, aCFgpyJw9oQ, pNsUB0zfAaM, srii1gA3tFI. Quote: "A white hole opened, revealing three tall, skinny beings with mantis-shaped heads and large golden eyes." (8uG7xYh2QT4)

**27. Implants and monitoring devices.** Ear, sinus, wrist, jaw, toe and optic-nerve objects, some removed, some imaged. Never counted per batch. Examples: -blY9T_UZjc, IVZZV8yIkh8, Lpz1liJ7VU0, Z-2TTOhbJno, lyUC1H6fBfk, t8IJoft5FgE, ybPaGerF0TU. Quote: "Secrets." (4WtFxWrZylI)

**28. Men in Black, intimidation and silence orders.** Armed men in black clothing, confiscated film, warnings and decades of enforced quiet. Never counted per batch. Examples: -m76WMbunQk, AICm8RjnUjs, IhxdkrUlTUA, RhrH0KzKft4, i9MnL_utSJE, jcVIJV1VdTo, uPunWdFbAIg, x4wL4lbwwNU. Quote: "Major Mansman told him to never speak of the incident again" (x4wL4lbwwNU)

**29. Overlap with NDE and shared-death material.** Clinical deaths, shared-death messages, near-drownings and no-death messages inside UAP testimony. Never counted per batch. Exact: the two highest-transformation UAP encounters in the archive (56 and 49) are explicitly NDE-plus-UAP hybrids (7). Examples: -zBSWjdRNoY, 4Vr_wSaA0cs, Cgod3zRPA9Y, CdIzGW3mcDo, Vl9EYWS5LY8, dKPMVUH0UDU, nygwU16F2T0, ygwd7IwGhYg. Quote: "death does not exist." (UEGdEKQZ-yU)

## Standout accounts

Forty accounts, four from each section digest.

### Military, aviation, and nuclear witnesses

- **-0g3lLGxNfc**, "This UFO Shut Down 10 Nukes!" - Air Force Officer Robert Salas. Red-orange lights, radar confirmation and multiple missiles leaving alert status in 1967, followed by silence instructions; the archive's most retold nuclear case (1FPBT9gyeQc, 4gMai6DMDVg).
- **5zfRCZHmCpA**, "Fmr. Arizona Governor Fife Symington on witnessing a gigantic UFO in the Phoenix sky, March 13, 1997." A former pilot and governor describes a silent craft larger than a B1 bomber and reports awe rather than fear, against official explanations.
- **GBUULtF0TGw**, "F-16 pilot Yves Meelbergs and other credible witnesses talk about the Belgian UFO wave, 1989-1990." Radar-confirmed targets, F-16 intercepts, speeds up to 1,000 knots, roughly 2,000 civilian and police witnesses (Imx0GaA7yUs) and no explanation.
- **WJjP0khrKsI**, "Peruvian fighter pilot Oscar Santa María Huertas talks chasing & shooting at a UFO on April 11, 1980." Missiles fired at a globe that evaded damage, with the sighting officially accepted and no career repercussions, a rare non-punitive institutional response.
- **ZBVhtwwkgFs**, "US Navy Pilot Recalls UFO Sightings." Ryan Graves describes repeated radar tracks, a cube inside a sphere and a near mid-air collision, framing the subject as flight safety.
- **fOwS-7Fl114**, "30 seconds away from World War Three and Nuclear Armageddon!" A 1974 NORAD event with five objects, nuclear alert procedures and a pressured debriefing; the highest institutional stakes in the corpus.
- **jWoJ7UMfVLY**, "B-52 and missile crews witnessed a UFO at the vicinity of Minot Air Force Base, October 24, 1968." Radar and visual observation, an alarm, unconscious air police and a damaged missile-site vehicle, with unresolved official explanations.
- **vf7xZ5vMMfk**, "Green beam from a UFO lifts up Army helicopter, observed by Lawrence Coyne and John Healy in 1973." A four-person crew, a cigar-shaped object and an unexpected climb from 1,700 to over 3,800 feet; one of the five top-evidence encounters (ATLAS-stats section 7).
- **x4wL4lbwwNU**, "UFO Destroys Vandenberg Missile l Professor Robert Jacobs Testifies." Film showed a circular object beaming a dummy warhead, followed by an order to remain silent for 18 years.

### Abduction and contact experiencers

- **0anEeY30Zig**, "Rare, extensive Betty Hill interview on her 1961 UFO abduction with husband Barney in New Hampshire." Two witnesses, radar reporting and alleged onboard examinations; the archive's maximum evidence score of 26 and contact depth 32 (ATLAS-stats section 7).
- **89SaMvnY4BU**, "First Interview in 30 Years of Silence with Calvin Parker." Levitation, robotic examination, public ridicule and long-term disruption; the Pascagoula case as trauma, with the polygraph and Hickson's contrasting response in 9OxHbYQ6e5g.
- **SYoXSa32EZI**, "Witness Describes Undergoing Alien Medical Experiments." Thom Reed's autopsy table, insect-like figures, restraint, pain and apparent emotional indifference; the starkest onboard account in the corpus.
- **g5Jdq8yig74**, "Farmer Speaks with Aliens for 2 Hours - Gary Wilcox - DEBRIEFED ep. 57." Two metallic-suited occupants discussed farming and soil for two hours and advised him not to speak of it; the calm pole of contact (YnpbuAAFHjM).
- **zQYte-GElNw**, "Argentinian Alejandra Silvain talks about her abduction by reptilians in Marindia, Uruguay, 1969." Childhood abduction, greys, reptilians, painful experiments, premonitions and a lifelong mission to tell it; section 10's most detailed CE4.

### Physical evidence and traces

- **E9HPUxD1ZyY**, "Metallic Specimen Revealed: Oak Ridge National Lab's Surprising Findings." Laboratory analysis concluded the specimen was terrestrial and could not function as a terahertz wave guide; the corpus's clearest corrective to extraordinary-material claims.
- **OhBVWX0IkIk**, "Alien Probe, Sentient Machine, Nuclear Weapon, or Junk?: What is the Betz Mystery Sphere?" A seam-free sphere that vibrated, moved to sound and emitted radio waves, drew Navy attention, and drove the family from public life.
- **P-qkBu7RPm4**, "1988 on the Nullarbor Plain an egg-shaped UFO lifted up the Knowles family car." Vehicle effect, outside witnesses, police investigation, medical consequences and a foul-smelling mist (l732a01gvc4 adds ash residue and lasting driving trauma).
- **QC6nxcOoHbk**, "Renato Nicolaï on witnessing a landed UFO taking off & leaving burn marks, Trans-en-Provence, 1981." Soil compression, plant damage and biochemical analysis make this one of the strongest evidence-rated landings in the corpus.
- **bqinMXLfw1A**, "She Kept the UFO Debris for 40 Years." Julie Olson's close sighting, fireballs, collected material and a fragment eventually returned to her, with multiple witnesses and official reporting; a retained trace.
- **iACBwUYNWaw**, "Policeman's Chilling ALIEN ENCOUNTER CASE From New Mexico In 1964." Lonnie Zamora's egg-shaped object, two small figures, a blue flame and site evidence; the trained witness (0H-r5QzJnuM, A2fIv0utIlA).
- **t8IJoft5FgE**, "Woman Finds Implant Near Brain After Alien Encounters." Barbara Eberhardt's childhood encounters and an MRI-confirmed unusual implant; a medical finding joined to an abduction interpretation.

### Consciousness, psi, and transformation

- **-zBSWjdRNoY**, "Father CONTACTS Him From HEAVEN To Let Him Know About UFOs - Shared Death Experience (SDE)." A 1970 sighting forgotten for 47 years resurfaces after a father's death with a message to write a book about benevolent aliens; bereavement, delayed memory and psi in one account.
- **5bctWWFMwj4**, "Mantis Being Removes Man's Addiction." A mantis-like being appears through a wall portal and the claimed outcome is immediate loss of cravings and peaceful sleep; transformation in explicitly therapeutic form.
- **Cgod3zRPA9Y**, "The MOST IMPORTANT UFO & ET Case In Human History - UFO of GOD - Chris Bledsoe." Two NDEs, glowing orbs, missing hours and a mission to share, while AoeevXt6fm8 reads his filmed orb as a lens flare; vQqErgnc_3g rates the transformation 38.
- **LATwocpqpbo**, "During Michael Garfield's Ayahuasca ceremony all 17 people see Mantis Beings." An unusually large shared witness count, alleged psychic surgery and plasma-life claims; altered-state contact at group scale.
- **nVkGEL5eRiY**, "The UFO Rabbit Hole Ep 35: Through The Looking Glass [Pt 1]: My Initiation Into The Anomalous." Kelly Chase describes identity obliteration, universal connection and a move from atheism toward a higher power; the clearest transformation account in section 8.
- **ls5nfnybCm0**, "Woman's Incurable Illness Healed By Aliens Aboard UFO." Rae Dove reports being taken aboard, examined and healed, waking with a gold scar and a changed religious outlook.

### Disclosure, secrecy, and institutions

- **7STUNCWWn5c**, "Firsthand Roswell UFO debris witness Jesse Marcel: There was a cover-up." Unusual material, an instruction to call it a weather balloon and a later public challenge; the template for official dismissal becoming part of the story.
- **IhxdkrUlTUA**, "U.S. Marine forced into silence over 1997 UAP incident at 29 Palms base." A triangular craft, armed men in black uniforms, a suspicious anthrax booster, PTSD and moral injury; the psychological cost of non-acknowledgment.
- **OZMEwUsFMiA**, "Is the Government Hiding Dead Extraterrestrials?" David Grusch says he has not personally seen a body and attributes retrieval claims to interviews with officials; the center of the testimony-versus-evidence tension.
- **a4P_T-51fDA**, "'We Got It From Them'-NASA Flight Surgeon's 1992 Cape Canaveral UFO Encounter." Dr. Gregory Rogers describes a sealed-room viewing of a pearly craft, a warning not to speak and 15 years of silence (TNtlzEnl8rA, RrDzEV5dTYc).
- **i9MnL_utSJE**, "Interview with Robert Hastings: UFOs and Nuclear Weapons with Bob Jacobs." A disc interfering with a 1964 missile test, a reported 17-year silence order, dreams and threatening calls; the silence order as narrative technology.
- **qCAH8btkwvo**, "South America and 'Operation Prato' part 2: The Whistleblower and witness testimonies." Military investigation, more than 500 photographs and films, beam injuries and Colonel Uyrange Hollanda's later suicide; the emotional gravity of official involvement.
- **wp4btkW1kbs**, "UFO Witness Kevin Via 2015 Mufon Symposium." A former Nimitz combat photographer describes a square craft, peer skepticism, hospitalization, damaged relationships and public disclosure as healing (bOWdv8U8moE).

### Unusual or unique

- **HUsyYBGV1sI**, "Elk abduction by a UFO witnessed by 14 forestry workers, Mt. St. Helens area, Washington State, 1999." A disc lifted an elk, and a dead elk with no visible wounds was later found; a large witness group and an alleged biological effect.
- **SDx0uMPivJY**, "The Alien Abduction of Carl Higdon." A hunting bullet stopped in mid-air and fell back deformed, a being identified itself as OSO1, and Higdon was taken aboard a transparent craft; anomaly, communication and onboard contact concentrated in one story.
- **YUtEcAPMsT8**, "Military soldier John Vasquez talks about a bizarre 1977 UFO incident at Fort Benning, Georgia." About 1,300 troops, temporary paralysis or unconsciousness and later nightmares; the largest-scale CE4 claim in the corpus.
- **pgidlQ_zG9g**, "Australia's Terrifying Alien Abduction Case from 2001." Amy Rylance disappears from a caravan and is found 500 miles away, with a witness describing a beam of light; the strongest missing-person and external-witness case.
- **qgbkNnQntyI**, "Leaked ATC audio: real voice of pilot Frederick Valentich, who disappeared after reporting a UFO." An ongoing radio transmission, a described metallic object and an unresolved disappearance with no wreckage; the encounter as artifact.
- **z7uaipx4pSo**, "I investigated the UFO event in Peru and what I found SHOCKED me." Villagers describe armored, elongated-headed beings and gunfire with no effect, while authorities cite miners with jetpacks; contested evidence and community trauma.

## Quote bank

Copied verbatim from the section digests.

**Secrecy and disclosure**

- "There was a cover-up" (7STUNCWWn5c)
- "no investigation, no nothing" (3JA8Yp9yhBM)
- "there are two governments: the elected one and a secret government" (IVEPzcCuq3U)
- "The investigation produced over 100 detailed scientific reports, but none have been released." (MiUDl_9v6Ag)
- "withholding information is a crime against humanity." (Npn6D6NvPd8)
- "Disclosure of UFO information seems impossible, but it is ultimately inevitable." (SaB82ML3aGA)
- "The UFO issue is one of the most closely guarded secrets in the U.S. government." (w67Tcehwi-o)
- "truth embargo" (jiMscTOt41w)

**Silence orders and intimidation**

- "never speak about the incident" (IQz7innxnms)
- "We will speak no more of this." (NtMr6fWzzzs)
- "Major Mansman told him to never speak of the incident again" (x4wL4lbwwNU)
- "The family felt threatened and withdrew from public life." (OhBVWX0IkIk)

**Nuclear and military**

- "the missiles began shutting down" (4gMai6DMDVg)
- "all ten of the nuclear missiles under his control went offline" (HZUzGJmE0hQ)
- "20 nuclear missiles were disabled." (fnnwvxDKwtM)
- "30 seconds away from World War Three and Nuclear Armageddon!" (fOwS-7Fl114)
- "It's God. It's the end of the world," (g28EbphgcG0)
- "the object was jamming their systems" (dKbYwwwePTQ)
- "IT JUST REVERSED COURSE AND IS TRAILING YOUR AIRCRAFT." (bmsc8wblUOw)
- "The object was hit by a Hellfire missile but continued to fly." (8XZpOFGlrmQ)

**Craft and lights**

- "VIOLATES EVERY KIND OF LAW WE CAN THINK OF" (5KfiM9McgKs)
- "a dark gray cube inside a clear sphere" (0sXGHvTceLc)
- "appeared to be alive" (BD52YbIkQTs)
- "The object lifted their car off the ground" (P-qkBu7RPm4)
- "I couldn't see the edge of it!" (wpkX3_WkosA)
- "moving at several hundred knots underwater" (sFsjFS8LVto)

**Entities and contact**

- "three large praying mantis beings" (-9zca3Pu7Eo)
- "They waved back when Gil and others waved at them." (24wAgpPgzZ4)
- "A white hole opened, revealing three tall, skinny beings with mantis-shaped heads and large golden eyes." (8uG7xYh2QT4)
- "The beings were collecting organic material, such as grass." (YnpbuAAFHjM)
- "a three-fingered hand waved back." (ujc1uV09dpo)
- "the beings gave him pancakes that tasted like cardboard" (V-HYChT8Wgg)
- "We never called ourselves angels, you did." (PIiN6nf22q4)

**Fear and harm**

- "It tried to take my soul" (-TCD5cCOSNM)
- "It was sitting on my chest laughing" (80UTe2eoEFw)
- "I’ve never felt anything so evil" (Dxzj2rBOfuU)
- "I Was Studied Like a Guinea Pig" (DMkipUbr1N4)
- "I felt like boiling water was flowing through me." (SYoXSa32EZI)
- "treated as lab rats by the grays" (st0jWGDgxpk)
- "felt violated and distrustful of others" (zEibn49GRZI)

**Reassurance, love and healing**

- "Don't be afraid, we're just here to observe you." (AdH4zfVEyUI)
- "They walked to a spacecraft and felt overwhelming love from a tall, humanoid being" (60t0hSq3RYY)
- "feeling received rather than intruded upon" (3UeWg31G6Io)
- "It's okay, you'll be okay, we love you." (S-IACQok7iI)
- "You're in no danger. We mean you no harm." (dEJE2mAuwqQ)
- "no longer had cravings for addiction" (5bctWWFMwj4)
- "gold scar on her abdomen" (ls5nfnybCm0)
- "healthy fear" (41zks7azg5o)

**Consciousness and psi**

- "consciousness plays a key role in these interactions" (07qM-BG4p6Y)
- "many people have untapped telepathic potential" (0Mt2RPQ-pX8)
- "the brain does not create consciousness but may filter or modulate it." (ReT4JkaTZ0o)
- "many sightings may not be physical but rather holographic or related to consciousness." (RhaZdlRKzAQ)
- "reality is co-created" (_KUGF_8fU_M)
- "I felt as if I was no longer in my body" (M33siPVZg24)

**Messages about humanity**

- "We are watching you" (C3cCcHtPKvw)
- "Earth is a prison planet" (6UjGd7vspkg)
- "humanity is not facing an invasion but has already been invaded" (dePD0gy8bx8)
- "THIS PLANET WILL BE THEIRS." (xQE6qkwfaGo)

**Death and the afterlife**

- "There Is No Death" (Kv0U8EThLNc)
- "death does not exist." (UEGdEKQZ-yU)
- "death is not the end" (nygwU16F2T0)
- "My life flashed before my eyes" (kfNcLPTIjz8)

**Transformation and aftermath**

- "shifted perspective from skepticism to knowing" (CGOzegZsMu8)
- "obliteration of her identity" (nVkGEL5eRiY)
- "epistemological shock" (tD9iOI50iYo)
- "He does not feel it has made him special." (w0W5JyNWj3U)
- "85% of respondents experienced positive behavioral changes after their encounters" (q9Bp39O2TgA)

**Stigma and credibility**

- "many do not file reports due to fear of ridicule" (2VZJvUOYWao)
- "I KNOW WHAT I SAW" (8DXvwJOuv7M)
- "one out of every 10,000 to 20,000 sightings is reported." (SuYlonQsMaI)
- "they no longer felt crazy" (U6cVjGq_7iQ)
- "it brought him more trouble than reward" (vyIkpsmvDvY)

**Evidence and skepticism**

- "swamp gas" (GZxeagRDmbY)
- "not a balloon." (LB5rDWOduqg)
- "over 90% of reported UFOs can be identified" (a9ZQ39I1I10)
- "AI could lead to more fake UFO sightings and misinformation." (DjRvROtT2mQ)
- "current evidence does not convincingly support the idea of extraterrestrial craft." (z0ngu1swppQ)
- "data rather than a predetermined narrative" (kNEJaw-Erks)

## Tensions and contradictions

1. **Nonhuman craft versus human-made, staged or misidentified.** Extraterrestrial or nonhuman readings dominate (-0QLn-ayZEo, 107BtDYhTkA, Zrd44LASEKI, rih9-80p0Ec); against them stand a likely human-made Yemen object (-1fWLAZsXzg), a Chinese rocket launch (5yJ7nBYrBNo), Greer's own view that most sightings are man-made (ad2lynhIwOU), the Tic Tac attributed to Lockheed Martin (jN25seQWGBI) and Nazi-derived mechanics (cBpArWvspj8). Why it matters: a book cannot assume its subject; the archive keeps both readings live.

2. **Contact as trauma versus contact as gift.** Paralysis, examination and lifelong distress (89SaMvnY4BU, SYoXSa32EZI, nHuI69tFWJU, Rq5ahyPCdSY) against love, healing and mission (60t0hSq3RYY, 5bctWWFMwj4, ls5nfnybCm0, sqNqFp6wnQI); some testimonies hold both, a "healthy fear" (41zks7azg5o), nightmares with increased happiness (39WSuhczpYE), a daughter's kind grey beside her mother's pain (t_-pI0xwA40). Why: this is the fear-versus-peace axis that separates the UAP archive from the NDE archive, and the accounts holding both are the bridge.

3. **Instruments and traces versus consciousness and testimony.** Radar, radiation and soil (-0g3lLGxNfc, 59J98jfU8yo, QC6nxcOoHbk, 7mAT9iePR1U) against psi, synchronicity and holography as the principal evidence (-YizuipZ118, RhaZdlRKzAQ, CmogbTfvDr8, w0kMoqJrbRQ). Exact: psi mention and deep contact are close to the same set of videos, while CE5 has the weakest evidence of any class (ATLAS-stats section 5). Why: the two evidentiary regimes barely overlap, so a book must choose one or write about the gap.

4. **Instruments that disagree with witnesses.** Phoenix seen by many but absent from radar (1mKF5mgtJLc), radar without visuals and visuals without radar (1dV90xbAF6k), a filmed orb absent from radar (HXLFC-hwQ6M), 200 CE5 participants with no photograph (36p3g8Zhnvg), Vandenberg witnesses with no radar (a-YuYaG3Lqc) and Nimitz data described as missing (ZxRPkJCseyA). Why: the missing record is as much a character as the object.

5. **Disclosure as breakthrough versus theater, minimization or agenda.** Hearings and file releases as turning points (1KFO1FXnT64, 6h8XJGETzrk, rQjbFZT9_EM, xm85SLBK09c) against 161 files with nothing groundbreaking (19mbUxhkz9U), performative hearings (6jngUtwOIIw), gutted legislation (vSpHaNbd5A8), a 2026 release confirming nothing (r_xevi3rSQI), and a third position that UAP stories serve budgets or narrative control (djUvIftRIpU, gRNhXI0f7Po, znisWF5qHnA). Why: disclosure is the largest theme and has no settled plot.

6. **Official negation versus cumulative testimony.** AARO and Kirkpatrick report no credible evidence (Dbx95c0awJs, Gwql10DSgwc, NOHhlWBs2Bg, x7Yqs75eRUI), Oak Ridge found a specimen terrestrial (E9HPUxD1ZyY) and Grusch has not seen a body (OZMEwUsFMiA); against them stand missile shutdowns and retrieval claims (HZUzGJmE0hQ, H01-wVkCpTc, kRO5jOa06Qw, crFF0KPMOp4). Why: the strongest institutional denials and the strongest institutional witnesses sit in the same archive.

7. **Transformation versus no lasting effect.** Life reorientation (04w2M8w9Pvs, -gV7ugoaRO4, nVkGEL5eRiY, vQqErgnc_3g) against military and aviation witnesses who report nothing lasting (KuX4GLHLRz8, HNSJIV-jx8M, aVyYmZkdupI, GBUULtF0TGw) and Walton wishing it had never happened (JUCaVMlCTb4). Exact: 61.3 percent of scored encounters have transformation 0, and transformation is a property of contact, not of evidence (ATLAS-stats sections 4.2 and 5). Why: for an author whose first book is about aftereffects, the UAP default is no aftereffect, and the exceptions are the story.

8. **Institutions as corroborators versus suppressors.** FAA investigation (E3kShoNAejw), Portugal's openness (G9h2KP0Rdhg), an accepted Peruvian intercept with no career cost (WJjP0khrKsI) and serious attention for a military reporter (WdAiCLJzfbc) against NORAD silence (AICm8RjnUjs), anthrax shots and PTSD (IhxdkrUlTUA), guns and NDAs (RhrH0KzKft4, ShoUyC1aip0) and a career ended by interrogation (scEl3EmZWVM). Why: secrecy is a variable outcome, not a constant, which makes it a plot rather than a premise.

9. **Invitation versus capture; consent as the dividing line.** CE5 sessions, meditation and machine calling (6TaNOkvQSCQ, F56P24aulLY, LgEFH-AdETI, qGROh0PgRCE) against involuntary abduction (6HyOkIL3rIM, MEcuAAJnSeM, LpqAJuU7Dgk) and the wish to have been asked (fYTvNMIMFZU); a warning about the dangers of initiating contact (9LbJ0DT6LbQ) and a claim that some abductions are staged with human technology (D6IWd8fBNDY). Why: consent reframes the same phenomenon as practice or violation.

10. **Memory as evidence and as vulnerability.** Hypnosis treated as evidence beside false-memory warnings (F9rlKyy-sQU), Betty's account growing more elaborate than Barney's (aXCr-jdvp6U), three women recalling different beings after one gap (ekyjHGs93A4), six people seeing different things through the same binoculars (bib_AdGA20o), artificial memories (LpAB-x8TMu4) and a witness unsure after 40 years whether it was a dream (x5OJsCAvw8Y), against total recall without hypnosis (YkT4CK-omjo) and "not a dream" (rXIOl9ZkBwo). Why: missing time is the archive's main narrative engine and its weakest evidentiary link.

11. **Mass witnessing versus private revelation.** 250 at Pearl Harbor, 180 at Westall, 1,300 troops and 31 on a Yukon highway (KyJXWWJrOvo, LB5rDWOduqg, YUtEcAPMsT8, oy_vI5JsrYw) against solo DMT and ayahuasca encounters (L9a2W9xwGbA, LATwocpqpbo) and no-witness accounts (Ptxh5q4jzZg); co-witnesses who diverge (vlWVXMtcQig, qqNOwOwDVQo, UfKwQgmHfII). Exact: only 0.8 percent of encounters mention more than 100 witnesses (ATLAS-stats section 4.2). Why: witness count never settles interpretation, which is itself a finding.

12. **Official explanation versus witness rejection.** Weather balloon after a flying-saucer press release (HedqKNTt6AA), swamp gas (GZxeagRDmbY), exercises rejected by police (HQXxeTUOWRc), Redmond explanations shifting among false returns, a balloon and Venus (fu6iunUYRrM), Gorman's balloon (sshiw-xtxSI), Phoenix flares (cYPCKIL7oVw) and miners with jetpacks (z7uaipx4pSo). Why: the official explanation is a second encounter, and often the part witnesses remember most bitterly.

13. **Advanced yet fallible; the failure of force.** Craft exceed human capability (107BtDYhTkA) yet crash (0tYLmua_6k0); a Hellfire strike survived (8XZpOFGlrmQ, U5_WMxv_lyo), 64 rounds with no effect (j8Ma14cskAg), bullets that vanish or fail (93SEOSLZCrQ, w2-nJ1WUshQ, c6Lj5IzL9xY) and an Iranian F-14 exploding (wQwFoMpcoZg). Why: interception is the archive's clearest experiment, and it consistently fails to resolve anything.

14. **Health effects: none versus radiation, cancer and death.** No evidence of direct health consequences (6-m_dcJXz04) and a witness cleared by medical testing (MRQTAHAVG_0) against rare brain cancer (5vt9HjQ1K-0), hair loss (7Jc2G5aEH0A, r3APZwluZJs), Cash-Landrum burns and cancer claims (KiCgBn-Kbho), Burroughs's disability award (r3HtD8FcCPI) and alleged deaths at Colares (hkXjuEeRY_4). Why: injury is the strongest physical evidence and the least resolved.

15. **Moral message versus biological program; observer versus quarantine.** Environmental warnings to schoolchildren and cosmic love (t8i_qLr9Y5o, udwaN5YVz-A, vA_DYK2HxzU) against hybrid children and prenatal DNA modification (t4vNwUdDmsc, uxzv9W1Ki90, xY1clM-1JZg); beings not overtly aggressive (wnNrrLcCDz0) against deliberate quarantine (wsPmCysriHQ) and a demonic reading (dJSXIkNCDTo). Why: what the visitors want is the question every reader brings, and the archive answers it five ways.

## Rare and unusual

1. A yacht collides with an underwater craft and two days of visual and sonic knowledge transfer follow (0DKgV8DKSu8); a craft on the seafloor, bends symptoms, never recovered (3mbhhi7pSWQ).
2. A pilot loses consciousness, speaks through air traffic control in multiple languages and lands about 300 kilometers off course with fuel remaining (0sf5Dg2Aatg).
3. Pancakes exchanged for water, told three times (2CH_P8qNMZM, 4OHzUalark8, V-HYChT8Wgg); a Nordic woman asking for water after a landing (y6oVxmaM5cw).
4. The six-inch Atacama specimen with 9 percent unmatched DNA, cited in four sections (0XjietgsBDY, GKe2OVqDgYo, ZEht3iVnf2Q, nkYJ6wavnnQ).
5. Soldiers turned to stone after occupants merged into a glowing sphere, in two tellings (1ozMMDAhYx0, ghblaDLzecE).
6. Force that fails: a UAP struck by a Hellfire missile that kept flying (8XZpOFGlrmQ, U5_WMxv_lyo), a bomber gunner's bullets disappearing on impact (93SEOSLZCrQ), a missile-struck object releasing three possible ejection pods (c4Oo8GcWm2M).
7. Overnight hair whitening after a pyramid craft, in three tellings (EIRQQXRGo-U, FJBdjGG4T3o, IcKWvrFg9B4).
8. Animals lifted: an elk by a disc before 14 forestry workers (HUsyYBGV1sI), a cow by a blue beam followed by small creatures searching a house (Fc4EXbfVL8g), a cow floated up a ramp into a hill (6rLZDWSenz4).
9. Vehicles lifted: an Army helicopter raised by a green beam (vf7xZ5vMMfk), the Knowles car (P-qkBu7RPm4), a car lifted by an orange object with dents and ash (MTxtUqugofo), a truck lifted and gently returned after attempted telepathic contact (ZWONNaojCOQ).
10. Spheres in hand: the Betz sphere, handled and tested and unresolved (OhBVWX0IkIk, Y0Qb7nCcP7s); a seamless sphere said to respond to consciousness, paired with an energy-discharging gauntlet (QJ215I85d5M); a levitating marked sphere at a naval warfare center (Sct30Qijfv8).
11. Seventeen people at one ayahuasca ceremony reporting mantis beings (LATwocpqpbo); mantids through DMT, LSD and high fever (HHtKB6aVhB8, GkbIXDRfKZ4, DLl5tbKW4Ew); the McKennas' 1971 shamanic mantid contact (cmbY1unjW1Q).
12. Mantis kin: a green mantis called "Mom" since a 1971 agreement (srii1gA3tFI), a mantis doctor named Kurami and a completed astral contract (WCxUaobyze8), and real praying mantises arriving afterward as signs (kRTpkM0pE-o, l8Qt1NyhSLg, pNsUB0zfAaM).
13. Time slips: 22 years passing in a felt 25 minutes (kHf3-CDquXs), ten subjective years in 20 minutes (aOJSRlfosog), a couple reappearing more than 7,000 kilometers away with a burned car (SJ-d-nEgWqQ), a woman found 500 miles from her caravan (pgidlQ_zG9g).
14. Implant oddities: an inventory of 32 (Lpz1liJ7VU0), one connected to the optic nerve (lyUC1H6fBfk), one that broke apart, changed color and re-aggregated (ybPaGerF0TU), one confirmed by MRI (t8IJoft5FgE), one described as a blessing (-blY9T_UZjc).
15. Owls as markers of abduction and as rescuers (Xn9lGPBSuUM, aE_M2nT4dqg, eIJJYQ3PjJo, fHWF9EdjVmQ, y-98uGc76Gk).
16. Yowies and Sasquatch inside UAP accounts: a Yowie mirroring a driver (qcDpqtrdPSA), one entering "stealth mode" once detected (xRR6NR0VDl4), a headless bloodless kangaroo at a Yowie farm (RT02mnVZNic), 35 years of Sasquatch and ET contact (uHQRdNEdguY).
17. A telepathic request to shut radar down for 15 minutes before a craft could be touched (QYhRu2_nJ6c, gvcK9P-vys0).
18. Peru's violent outliers: bulletproof floating assailants and face peelers (1sRQQsqyXnw), a body found without its face after a laser-scalpel attack (TJDT8vn-nVU), armored elongated-headed beings that authorities called miners with jetpacks (z7uaipx4pSo).
19. Crop circles forming within 10 to 15 minutes under observation (1SSDlUu-mkM, q9e6z9QQxUQ); one read as a reply to the 1974 Arecibo message (siio3MGRaq8); a dark energy field creating one during meditation (MAG-2sEUuYg).
20. A craft marked "US Air Force" identified as extraterrestrial (TNtlzEnl8rA); a craft bearing a US Air Force insignia (NLumYfbvtxc); alien reproduction vehicles shown in a military hangar (yUFYnVXbLoY).
21. Hybrid claims: a mother of 24 human-alien hybrids with a near-death experience (_VMsWOJ5agw), a hybrid baby with forced breastfeeding (QornhFTMlgQ), an implanted and removed fetus (oRrjSWo-1IQ), a witness rejected as too small (lNk4J742IVk).
22. "Psionic assets" as biological interfaces to summon or pilot UAPs (jXnizNCEoH4, DzMIp2-oz_A, PU6aC73LhL0); magnetometer communication during CE5 (PwM2HdRql80).
23. Colares and Operation Prato: blood-draining lights (oe9qQEgsSKk, xluya-2ov40), more than 500 photographs and films, and Colonel Hollanda's later suicide (qCAH8btkwvo); the discussion that says no one was killed by the beings yet some locals died of shock (zeFG8VBqzOI).
24. Witness counts at scale: about 1,300 troops at Fort Benning (YUtEcAPMsT8), more than 1,000 witnesses and melted asphalt near a Russian nuclear plant (S713pxMKovM), reportedly 10,000 at a football match (SMvpCU9QM9I), 940 UK police officers (mWbWQfviRU4).
25. The séance edge: nine beings and a Faraday cage (2-GeTxXi670), a materialized nineteenth-century physician (3_AaxaNnG6c), a talking doll without batteries (5qnQHvhX2IY), a misty silhouette dissipating into a sleeping husband followed by a dream of his dead father (6WS7NbAwPrA).

## Candidate book directions

1. **The Nuclear Perimeter.** Premise: the most institutional, best-evidenced and most repeated stories in the archive all happen at weapons systems, and the same two or three events (Malmstrom 1967, Vandenberg 1964, NORAD 1974) are retold by the same officers across two decades of video. A book that treats the missile silo as the phenomenon's chosen stage and the silence order as its second act. Themes: nuclear, military, secrecy, silence orders. Exact: three of the five top-evidence encounters are nuclear-site testimony (ATLAS-stats section 7). IDs: -0g3lLGxNfc, Cac-056wRpk, HZUzGJmE0hQ, KkZWHpP17Rc, Tu2USgrCMvk, _EIBtsag8Sc, fnnwvxDKwtM, fOwS-7Fl114, x4wL4lbwwNU, zeAA9yTh4YQ. Audience: UAP readers.

2. **The Silence Order.** Premise: disclosure as a sociology of withholding rather than an event, told through the people who paid for speaking: clearance loss, NDAs at gunpoint, anthrax shots, a missing logbook, a colonel's suicide, a photographer's hospitalization. The chain of claims expands without settling, and that is the story. Themes: secrecy, Men in Black, stigma, the archive problem. IDs: -U2u43Vdt_g, i9MnL_utSJE, IhxdkrUlTUA, RhrH0KzKft4, x5QYbPE9Ed8, cPr0GqahbkI, ZxRPkJCseyA, qCAH8btkwvo, wp4btkW1kbs, kJQ_FsmU19g. Audience: UAP readers.

3. **The Benevolent Captor.** Premise: the same contact vocabulary yields terror in one mouth and love in another, and a small set of testimonies hold both at once. A book about consent, fear and gift in contact narratives, asking whether the polarity comes from the encounter or from the witness's prior worldview. Themes: abduction, benevolence, healing, consent. IDs: 2AXeURnQHeU, 41zks7azg5o, 39WSuhczpYE, AO-TJ0aVnhU, t_-pI0xwA40, fYTvNMIMFZU, SYoXSa32EZI, ls5nfnybCm0, JUCaVMlCTb4, dEJE2mAuwqQ. Audience: NDE readers crossing over, since fear versus peace is the axis on which the two archives most differ.

4. **The Body as Archive.** Premise: burns, white hair, implants, scars that last a year, a gold abdominal scar, radiation illness and a lab that found a specimen terrestrial. The body is the phenomenon's most persistent evidence and its least tested, and a book can walk the evidentiary ladder without treating any rung as proof. Themes: physical traces, implants, health effects, evidence disputes. Exact: CE2 has the strongest evidence of any class (ATLAS-stats section 5). IDs: 2YfF6IUBLuw, 7byEMoFezRQ, IcKWvrFg9B4, njvpQDrprpE, t8IJoft5FgE, E9HPUxD1ZyY, QgKr6VcrvLM, U6cVjGq_7iQ, 0uZMa4CfSok, hkXjuEeRY_4. Audience: consciousness-science readers and UAP readers.

5. **Contact as Practice.** Premise: a generation of experiencers no longer waits to be visited; they meditate, signal with lasers and flashlights, run machine-calling protocols and sit in ayahuasca circles, and lights answer. Whether intention creates contact or merely interprets it is the open question. Themes: psi, CE5, altered states, mantids. Exact: CE5 is the one class that is lowest in evidence and highest in transformation, and it exists only from the 1990s (ATLAS-stats section 5). IDs: 07qM-BG4p6Y, 36p3g8Zhnvg, 9nwX7OiyGF4, Cm_OGhtAptc, JUthXIGUsq8, LATwocpqpbo, RtywWrnyKU4, XGJb5AdUFdI, k4zTg-NwV2I, xFw2yqkQg-s. Audience: consciousness-science readers.

6. **The Examiner.** Premise: the entity that asks a child's opinion of human progress, removes an addiction, shows Earth from space, delivers an ecological warning to schoolchildren or says it never called itself an angel. A book about contact as evaluation and instruction rather than observation, with mantids as its recurring figure. Themes: mantis beings, healing, messages, life review. IDs: 15ki-BkNfII, 5bctWWFMwj4, 8L6M2mRcux4, MgNEaKIwCEE, PIiN6nf22q4, U3GJ7AEqQmg, udwaN5YVz-A, x4IXDQqpMSY, srii1gA3tFI, lCVN_Y0ircM. Audience: NDE readers crossing over, because the life review and the message about humanity are the closest structural echoes.

7. **Missing Time.** Premise: the gap is the hinge on which a sighting becomes an abduction, and it is also where memory is most vulnerable: hypnosis that elaborates, co-witnesses who diverge, a man unsure after 40 years whether it was a dream. Set beside deleted emails and erased radar, missing time becomes a book about how the archive loses and reconstructs itself. Themes: abduction, memory, missing records. IDs: 5d-ccxq0s50, 4jKfCse5fxc, F9rlKyy-sQU, aXCr-jdvp6U, ekyjHGs93A4, bib_AdGA20o, FVpWXxneti4, FeEdnRpN71I, x5OJsCAvw8Y, pgidlQ_zG9g. Audience: UAP readers and consciousness-science readers.

8. **The Witness Ladder.** Premise: children, a governor, deputies, admirals, DMZ soldiers, 62 schoolchildren, 1,300 troops and a town on a highway all saw something, and none of it stabilizes an explanation. A book about what witness status changes and what witness count does not. Themes: mass sightings, credibility, military, stigma. Exact: only 0.8 percent of encounters mention more than 100 witnesses (ATLAS-stats section 4.2). IDs: 4I75neaOIGE, 7J132DogCUs, E5wdHgx8uMs, LB5rDWOduqg, YUtEcAPMsT8, oy_vI5JsrYw, gX8qflzkQIE, wu3d4IEIDLc, sFsjFS8LVto, rSMufx2UxPM. Audience: UAP readers.

9. **The Ocean Below the Sky.** Premise: a yacht that hit something, sonar at several hundred knots, a sphere that splashed and was never recovered, an admiral's Fastmover program, and a claim that over half of one collection's cases cross between water and air. The submerged frontier is documented mostly through anecdote and is the least-written half of the subject. Themes: water, military, physical traces. IDs: 0DKgV8DKSu8, ABDlCbumob0, H5Jrp3CRbao, Q1WtylyzOdA, RIUskH2rsxc, cOG1kZozQc8, hUx6gHw3McM, sFsjFS8LVto, tD_dnKcbYW4, mISa5goQ9Ko. Audience: UAP readers.

10. **Where the Light Meets the Craft.** Premise: the cross-domain book. A father who returns after death with a message about aliens, a 53-minute clinical death followed by an interdimensional encounter, a naval ejection that produced both an NDE and a UAP story, near-drownings with luminous beings, and a repeated message that death does not exist. Themes: NDE overlap, psi, transformation, love. Exact: the two highest-transformation UAP encounters in the archive are NDE-plus-UAP hybrids (ATLAS-stats section 7). IDs: -zBSWjdRNoY, 4Vr_wSaA0cs, Cgod3zRPA9Y, CdIzGW3mcDo, Vl9EYWS5LY8, dKPMVUH0UDU, nygwU16F2T0, ygwd7IwGhYg, 3baDgB1LB18, UEGdEKQZ-yU. Audience: NDE readers crossing over.

11. **One Anomalous Ecology.** Premise: ancestors in Zimbabwe, Fatima's sun, owls, Yowies, Skinwalker hitchhikers, a Marian apparition seen by Christians and Muslims, Jesus from Venus and a Raelian embassy share one archive with radar returns. A book asking whether UAP reports are witnessed or culturally translated, and whether contact narratives are conversion stories in technological language. Themes: paranormal crossover, religion, alternative ontologies. IDs: 4nlYj5VY4B0, 1zimA2Sv-Q0, 8VBE_K8kk1E, OsHOQe-xRUk, y-98uGc76Gk, nrO10iXYrqc, musvkaZm6Jc, v3g2mp4WO2Y, ygwd7IwGhYg, z77GG6nnrfI. Audience: consciousness-science readers.

12. **The Negative Case.** Premise: what disciplined skepticism contributes: a lab that found a specimen terrestrial, 100,000 catalogued objects with nothing unusual, air-show videos resolved as birds, Baltic samples that were volcanic rock, a hoaxed Miami video, and the claim that over 90 percent of reports are identifiable. A book that treats the identified case as part of the phenomenon's narrative rather than its rebuttal. Themes: evidence disputes, scientific method. IDs: E9HPUxD1ZyY, 8TXpU-bDgyc, a9ZQ39I1I10, sQ7JW94VSmI, tgqAt6YN1jE, y6_s5Xy8RkM, z0ngu1swppQ, HoIaVvU-VUE, kNEJaw-Erks, fw9l0mK466I. Audience: consciousness-science readers and UAP readers.

## Bridges to the NDE corpus

- **Light as an agent, not a backdrop.** A CE5 light enters the experiencer's chest (9nwX7OiyGF4), a light passes through a witness's fingers (NXErsHzIlog), a witness feels frozen in time and emotionally connected to a light (uZusRC5GQ74), a childhood healing follows contact with a white orb (RFI4RWzH3ik).
- **Beings of light and luminous figures.** A faceless blue-winged being of light 5 to 6 meters tall (N95SRPPsoBA), floating illuminated figures near an observatory (E-9U9tPeyTw), four luminous beings during a near-drowning (CdIzGW3mcDo), light beings filmed through intention (hEJRWGgV5VA).
- **Telepathy as the default channel.** A telepathic network of non-speaking children (0Mt2RPQ-pX8), telepathic questions from a robed mantis (15ki-BkNfII), two hours of conversation with occupants (g5Jdq8yig74), six months of shared thought-reading between partners after a sighting (jkjitTkzeBY).
- **Time distortion and missing time.** Five days lost (5d-ccxq0s50), ten subjective years in 20 minutes (aOJSRlfosog), 22 years in a felt 25 minutes (kHf3-CDquXs), a coffee bar where time stopped and flu symptoms vanished (_qzmb1HQfxg).
- **Life review and moral evaluation.** Life reviews and ethical instruction (MgNEaKIwCEE), a mantis asking a child's opinion on human evolution (15ki-BkNfII), a rapid past-life review during astral projection (aCFgpyJw9oQ), "My life flashed before my eyes" (kfNcLPTIjz8).
- **Messages about humanity and the planet.** Mental imagery of environmental destruction given to 62 students (8L6M2mRcux4), lights forming Orion with environmental warnings (QRkhmCHHdhc), a mantid saying humanity harms the planet (U3GJ7AEqQmg), environmental warnings to schoolchildren (udwaN5YVz-A).
- **Loss of the fear of death.** "There Is No Death" (Kv0U8EThLNc), "death does not exist." (UEGdEKQZ-yU), "death is not the end" (nygwU16F2T0), a light-being experience with timelessness and reduced fear of death (dEazwykLZZg).
- **Fear versus peace, sometimes inside one account.** A "healthy fear" (41zks7azg5o), nightmares with increased happiness (39WSuhczpYE), terror that moves to healing (AO-TJ0aVnhU), a daughter's kind grey beside her mother's pain (t_-pI0xwA40).
- **Overwhelming love.** Overwhelming love from a tall humanoid (60t0hSq3RYY), love and gratitude (NeWtRgFanxc), "It's okay, you'll be okay, we love you." (S-IACQok7iI), "overwhelming love" (iEepxykzeV4).
- **Out-of-body and displacement.** "I felt as if I was no longer in my body" (M33siPVZg24), a mantis met in an out-of-body state (QRhIzfsCl1c), an out-of-body sequence leading to an onboard healing (sqNqFp6wnQI), a bird-like out-of-body NDE perspective linked to UAP contact (Vl9EYWS5LY8).
- **Healing as aftereffect.** Addiction removed (5bctWWFMwj4), a gold scar after an onboard cure (ls5nfnybCm0), Crohn's disease reported gone (bM18PJY6_Zc, E47Bc9ps-uI), chronic migraines gone after contact (8yPrb-YWaN4).
- **Lasting transformation and vocation.** Wall Street to spiritual work (-gV7ugoaRO4), atheism to belief (4DxEKqMoMI0), identity obliteration and a higher power (nVkGEL5eRiY), a former non-believer (yf5YfObpBC4). Exact: transformation is a property of contact depth, not evidence (ATLAS-stats section 5).
- **Explicit NDE-plus-UAP hybrids.** A shared-death message about aliens (-zBSWjdRNoY), a 53-minute clinical death (4Vr_wSaA0cs), two NDEs and orbs (Cgod3zRPA9Y), the two highest-transformation encounters in the archive (ygwd7IwGhYg, 3baDgB1LB18; ATLAS-stats section 7).
- **The dead at the edge of the encounter.** A silhouette entering a sleeping husband followed by a dream of his deceased father (6WS7NbAwPrA), a séance materialization (3_AaxaNnG6c), mediumship carrying messages attributed to Princess Diana (yl8ByDZ3muE), a child receiving information about a named girl and reincarnation (q-euHFPhUjg).
- **Psychic aftereffects and abilities.** A task-force member's NDE-linked abilities (0oI1uFzDHXU), unexplained scars with improved calculation ability (VHbi-ZymmEQ), shared thought-reading (jkjitTkzeBY), telepathy demonstrated without a letter board (f09Ko75nLiA).

## Coverage notes

This file cites 507 distinct video IDs, drawn from all ten section digests. Counting IDs that appear in each digest, section 1 contributes most (76), then sections 2 (59), 3 (57), 9 (56), 4 and 6 (51 each), 5 (49), 8 (44), 10 (40) and 7 (38); every section supplies exactly four standout accounts, and the quote bank is copied verbatim from the digests. Left out: most of each section's rare-or-unusual list (roughly 60 items per section, of which 25 groups survive here); the knowledge-base and channel layers of ATLAS-stats (sections 4.4 and 4.5), used only for the Brazil UFO channel count and the UAP Disclosure Act; section 6's cross-domain comparison, reserved for the synthesis file; the date and label inconsistencies the digests flag (FoeJGmHOqYw, c_QaAdJmVaM, yMoQEGqfYWE); and the caveat that several themes were tallied in only some batches, so every "roughly N of 7,600" figure is a floor rather than a measurement. Vallee type is null on all 7,017 encounters and pre-1900 material is retold, never witnessed (ATLAS-stats sections 4.2 and 7), so neither anchors any theme.
---
# Cross-domain synthesis

Paired rates below are indicative, not equivalent, because the two domains were coded with different instruments (ATLAS-stats section 6); the emotional-quality figures come from the site cache (ATLAS-stats section 8).

## Shared phenomenology

**1. Light.** In NDEs light is the destination or the divine presence itself, "brighter than a million suns" (BhwkMj8PkFU), reached through a tunnel (1MXb5CkwyCk, JllAZV0nmqA) or by instant arrival; exact: bright_light 60.4 percent (ATLAS-stats section 6). In UAP accounts light is mostly the craft's appearance, and only rarely an agent: a CE5 light enters a witness's chest (9nwX7OiyGF4), a light passes through fingers (NXErsHzIlog), a white orb precedes a childhood healing (RFI4RWzH3ik); exact: light-being entity 3.7 percent of encounters, cache luminous craft or entities 69 percent (section 6). The difference is that NDE light loves the experiencer while UAP light is watched from outside.

**2. Beings and their emotional quality.** NDE beings are relatives, religious figures, angels and guides who welcome and instruct (7qvswwOhcoI, OIo2kFjcWHs, XldxulLPD5s); exact: 93.6 percent of videos list at least one entity, and love is 63.8 percent of entity emotions (section 6). UAP beings are humanoids, greys and mantids seen at close range, from an examiner on an autopsy table (SYoXSa32EZI) to a three-fingered hand that waves back (ujc1uV09dpo) and a tall humanoid radiating love (60t0hSq3RYY); exact: 63.2 percent of encounter videos have a dominant entity, and fear 24.1 percent, awe 22.5 percent, curiosity 21.7 percent and love 1.0 percent (section 6). The top entity categories have zero overlap, and only unknown (14.4 versus 18.9 percent) and light beings (4.1 versus 5.8 percent) are shared (section 6).

**3. Telepathic and downloaded communication.** NDE communication is thought to thought, "Everything is telepathic" (FmYlABEEiwE), with animals and rescuers included (KDy8rv4ka2E, 9oIfs0RVqqw), and knowledge arrives compressed, "a grain of sand" that is also the desert (coSo-eQS1jI); exact: telepathy 60.0 percent of videos, 24.7 percent of 12,135 entity communications, knowledge_download 61.5 percent (section 6). UAP contact runs on the same channel, a telepathic network of non-speaking children (0Mt2RPQ-pX8), questions from a robed mantis (15ki-BkNfII), two hours of conversation about soil (g5Jdq8yig74); exact: 38.5 percent of 3,889 coded entity communications, cache noetic knowing 40 percent (section 6). Telepathy is a larger share of UAP communication, but the NDE download is universal insight while the UAP message is instruction, warning or interrogation.

**4. Time distortion.** NDE time expands, sixty years in thirty minutes (G9lrkqr1YUQ), months in four minutes (83Nvsf80Cv4), "the eternity of a single moment" (2CmeFt00Hjc); exact: time_distortion 58.8 percent (section 6). UAP time slips likewise stretch, ten subjective years in 20 minutes (aOJSRlfosog), 22 years in a felt 25 minutes (kHf3-CDquXs), a coffee bar where time stopped (_qzmb1HQfxg); exact: cache dilated time perception 27 percent (section 6). In the NDE the surplus is eternity; in the UAP account it is a puzzle to be explained.

**5. Missing time and the blank record.** The NDE corpus has its own gaps, 85 minutes of clinical death with nothing remembered (w_WtY63NnoM) and transcripts of one word (7Zsp5nvsMpw, N8NRfCHOO8Y); exact: 60 videos have none of the 15 elements (ATLAS-stats section 2.5). Missing time is the UAP corpus's main narrative engine, five days lost (5d-ccxq0s50), a woman found 500 miles from her caravan (pgidlQ_zG9g), a witness unsure after 40 years whether it was a dream (x5OJsCAvw8Y); exact: missing_time 8.7 percent of encounters (section 6). The NDE gap is left empty and cited as a counterexample; the UAP gap is filled by hypnosis and becomes an abduction.

**6. Out-of-body states.** The NDE opens with the body seen from above (hGtaSRwIfuc, 1A_ehqvWZ_w) and sometimes with interaction, a patient encouraging his own surgeon (t1QdUV4khoE); exact: out_of_body 83.7 percent (section 6). UAP displacement is the medium of contact for the psi track, "no longer in my body" (M33siPVZg24), a mantis met out of body (QRhIzfsCl1c), an out-of-body sequence leading to an onboard healing (sqNqFp6wnQI); exact: cache kinesthetic displacement 9 percent (section 6). The NDE out-of-body state produces checkable claims; the UAP one produces contact.

**7. Life review and messages about humanity.** The NDE review is a personal audit felt from the other side, "how you made them feel" (Q7JfC0U0_Fc), the pain given to others (17vs21uAjVw, RVuU5U_0beI); exact: life_review 49.3 percent (section 6). UAP evaluation is species-level, environmental imagery given to 62 students (8L6M2mRcux4), a mantid saying humanity harms the planet (U3GJ7AEqQmg), a mantis asking a child's opinion on human evolution (15ki-BkNfII), and a rare literal review, "My life flashed before my eyes" (kfNcLPTIjz8); exact: not coded (section 6). One corpus audits a life; the other warns a species.

**8. Fear versus peace.** NDE fear is a threshold that resolves, "complete terror to absolute peace" (N_BHl3FV9NE), and even the hell accounts mostly end in rescue (BlqIHQOfM3U, gAJShDqxM1E); exact: feelings_of_peace 93.0 percent, journey fear_distress 16.2 percent, very_negative tone 1.5 percent (section 6). UAP fear persists, "It tried to take my soul" (-TCD5cCOSNM), thirty years of silence after Pascagoula (89SaMvnY4BU), against a minority reassured, "We mean you no harm" (dEJE2mAuwqQ); exact: fear 24.1 percent of coded entity emotions, love plus peace 1.7 percent (section 6). Fear is the NDE's opening and the UAP account's residue.

**9. Lasting transformation and vocation.** The NDE aftermath is near universal, an ice climber's forgiveness (RVuU5U_0beI), a hospice vocation (OhoidSzUaxk), all 15 elements and Transformation 43 (upmgXkXBKII); exact: 97.0 percent score above zero, 90.3 percent at 20 or above (section 6). The UAP aftermath is the exception, identity obliteration and a higher power (nVkGEL5eRiY), Wall Street to spiritual work (-gV7ugoaRO4), a former non-believer (yf5YfObpBC4); exact: 38.7 percent above zero, 17.5 percent at 20 or above (section 6). Transformation is the NDE default and a property of contact depth in UAP, not of evidence (ATLAS-stats section 5).

**10. Veridical and checkable claims.** NDE evidence is a message or observation confirmed by a person, a salon message (d3Bo1Fei950), texts sent while unconscious (sAjRH6nL5Gc), a four-number code from a grandmother (mL3nT0cAZ2g); exact: Exceptional evidential strength 2.9 percent, High 8.8 percent (ATLAS-stats section 2.4). UAP evidence is instruments, traces and bodies, soil compression at Trans-en-Provence (QC6nxcOoHbk), radar and two witnesses at the archive's maximum score of 26 (0anEeY30Zig), a helicopter lifted by a beam (vf7xZ5vMMfk); exact: CE2 mean evidence 16.4 with 28.9 percent at 19 or above (ATLAS-stats section 4.2). In NDEs vivid is not veridical (ATLAS-stats section 2.4); in UAP the best-evidenced class transforms least and CE5 transforms most (ATLAS-stats section 5).

**11. Being returned.** The NDE return is chosen, negotiated, commanded or forced, "You have two sons to raise" (As9o57usxuI), a physical push (-UQxGKYsBHU), a refusal (gER5KxnMfw0); exact: sudden_return 49.6 percent, choice_to_return 17.1 percent, forced_return 10.4 percent of journeys (ATLAS-stats section 2.7). The UAP return is a release, a truck lifted and gently set down (ZWONNaojCOQ), a farmer advised not to speak (g5Jdq8yig74), a promise, "We are coming back for you" (-BHwqr6EZMw). The NDE return closes a story; the UAP return opens a recurring one.

**12. Childhood onset.** NDE children drown, see without eyes (GywGA-9TEDk), enter rescuers' minds (9oIfs0RVqqw) or draw what they saw as newborns (r4WJMRu78_g), with memory reconstructed through family testimony; exact: 623 heuristic child matches, 351 with a parsed age of 12 or under (ATLAS-stats section 7). UAP childhood contact is the first chapter of a lifelong relationship, a childhood abduction in Uruguay (zQYte-GElNw), childhood encounters followed by an MRI-confirmed implant (t8IJoft5FgE), multigenerational abduction (rE0LJvSUi8s). The NDE child had one event; the UAP child acquired a visitor.

**13. Each corpus inside the other.** NDEs contain greys, mantis beings, reptilians and an AI that says "DO NOT WORSHIP ME" (4ZPHunKGo3U, AiI0MQUsSQA, pvtuKyDV1WE) and councils of blue Arcturians (9V5YcGUJ-ww); exact: unknown entity type 14.3 percent of encounters (ATLAS-stats section 2.6). UAP testimony contains clinical deaths, shared deaths and the message that death does not exist (-zBSWjdRNoY, 4Vr_wSaA0cs, UEGdEKQZ-yU); exact: the two highest-transformation UAP encounters are NDE-plus-UAP hybrids (ATLAS-stats section 7). Each archive carries the other's central figure as a rarity.

## Where the corpora disagree

**1. Love versus fear as the core emotion.** NDE entity encounters are loving, "a waterfall of endless love" (06RNZkRnevo), "worthy of all the love in the universe" (xb2eHbj8huU), "I was home" (0HGnO-tzeqw); UAP encounters are frightening, "sitting on my chest laughing" (80UTe2eoEFw), "never felt anything so evil" (Dxzj2rBOfuU), "boiling water" (SYoXSa32EZI). Exact: love 63.8 versus 1.0 percent, fear 3.0 versus 24.1 percent, the strongest quantitative statement the archive can make (section 8).

**2. Certainty versus evidence-seeking.** NDE experiencers rate the event more real than life and rarely seek proof (RVuU5U_0beI, VOBEOvAgm4I, cDbEkJeWuAI); exact: 95.1 percent more real than life while 73.4 percent are Low evidential strength (ATLAS-stats sections 2.8 and 2.4). UAP testimony is built around corroboration and its absence, a lab finding a specimen terrestrial (E9HPUxD1ZyY), "over 90 percent identifiable" (a9ZQ39I1I10), "data rather than a predetermined narrative" (kNEJaw-Erks); exact: investigative is the dominant tone at 50.4 percent (ATLAS-stats section 4.3).

**3. Private versus institutional framing.** The NDE happens in an operating room or a family and answers a private question (As9o57usxuI, OhoidSzUaxk, CA_RQ_kSvqs); the site's Big Questions are consolation with nothing on evidence (ATLAS-stats section 1). The UAP story is often about the institution more than the object, a cover-up (7STUNCWWn5c), a body no one has seen (OZMEwUsFMiA), an 18-year silence order (x4wL4lbwwNU); exact: secrecy mechanisms in 22.2 percent of videos, 171 under-oath claims (ATLAS-stats section 4.3).

**4. Tell them versus tell no one.** The NDE returns its experiencer with a mandate, "go back and tell the others" (tnHgYKxXYjg), "You must tell them there is no death" (0YJAqNe2exc), "Tell my mom I love her" (HwmnyYSXE44). The UAP witness is told to keep quiet, by occupants (g5Jdq8yig74), by officers (IQz7innxnms, NtMr6fWzzzs) and by ridicule, one sighting in 10,000 to 20,000 reported (SuYlonQsMaI, 2VZJvUOYWao). Both corpora punish speaking, since NDE invalidation and isolation exist too (1e4HSPc49FA, d5_6jIEc3sc), but only one commands it.

**5. Depth with aftermath versus depth without.** In NDEs depth and aftermath rise together (Jod2NliehiU, upmgXkXBKII, npuP7AxBBMs), with the 190 zero-transformation cases as exceptions (ISozsB1hhms, PqddJsxn16s); exact: 97.0 percent transformed (section 6). In UAP a large population reports deep contact and no aftermath, military witnesses with nothing lasting (GBUULtF0TGw, KuX4GLHLRz8, HNSJIV-jx8M) and Walton wishing it had never happened (JUCaVMlCTb4); exact: CE3 mean contact 20.4 against mean transformation 10.8, and 61.3 percent of scored encounters at zero (section 8).

**6. Consent at the exit versus consent at the entrance.** NDE agency sits at the return, "I give the choice to you" (1RLnKja_EPE), "You're good either way" (SpyB-ElkeRk), "under no obligation" (jZfbO2XFshY), and the arrival is never framed as violation. UAP agency sits at the beginning, capture without consent (6HyOkIL3rIM, MEcuAAJnSeM), the wish to have been asked (fYTvNMIMFZU), against invitation through CE5 (6TaNOkvQSCQ, F56P24aulLY).

**7. Familiar beings versus strangers.** NDE beings are recognized, a deceased grandmother (7qvswwOhcoI), sons who say "We got to go" (OhoidSzUaxk), Jesus and angels (Fxl-nRX5Lrs, oA3BDwezNtY); UAP beings are unknown, a Zamora figure (0H-r5QzJnuM), greys and reptilians (zQYte-GElNw), mantids through a wall (8uG7xYh2QT4). Exact: religious figures, relatives, groups, guides and animals appear only in NDEs, humanoids, greys and mantids only in UAP (section 6).

**8. Memory trusted versus memory interrogated.** NDE memory is sharper than life and childhood accounts are accepted through family corroboration (-831_OI42Qk, r4WJMRu78_g); exact: 95.1 percent more real than ordinary life (ATLAS-stats section 2.8). UAP memory is the weakest link, hypnosis beside false-memory warnings (F9rlKyy-sQU), an account that grows in retelling (aXCr-jdvp6U), three witnesses recalling different beings (ekyjHGs93A4).

**9. Death as home versus death as casualty.** The NDE says "Dying doesn't hurt. Nobody dies alone" (kKqreMVM_ig) and fear of death falls in 5,893 videos (ATLAS-stats section 2.3). In UAP testimony death is a cost, alleged deaths at Colares (hkXjuEeRY_4), rare brain cancer (5vt9HjQ1K-0), a pilot who vanished mid-transmission (qgbkNnQntyI), with a minority echoing the NDE, "There Is No Death" (Kv0U8EThLNc, nygwU16F2T0).

## Questions the archive can answer that no single book has asked

1. Does the emotional tone of an encounter come from the being, from the body's state (dying versus awake), or from the witness's expectation? Evidence: section 6 emotional-quality row; NDE tensions 1 and 9; UAP tension 2; the accounts holding both (N_BHl3FV9NE, 41zks7azg5o, 39WSuhczpYE, t_-pI0xwA40).

2. What produces lasting change: depth, love, consent or interpretation afterward? Evidence: section 6 transformation rows; section 8 on deep contact without aftermath; ATLAS-stats section 5 on CE5; NDE tension 7; UAP tensions 7 and 9.

3. Is the NDE light and the UAP light the same phenomenon described from inside and outside? Evidence: section 6 light row; NDE theme 10 and tension 8; UAP bridges on light as an agent (9nwX7OiyGF4, NXErsHzIlog, uZusRC5GQ74).

4. What happens to a witness ordered to speak compared with one ordered to be silent? Evidence: NDE quote bank "Messages carried back" and theme 24; UAP themes 12 and 28 and direction 2; IhxdkrUlTUA and wp4btkW1kbs on disclosure as injury and as healing.

5. Does time expand when the body is dying and vanish when it is awake? Evidence: section 6 time rows; NDE theme 9 and rare item 23; UAP rare item 13 and tension 10.

6. What do the nonhuman beings inside NDEs say, and do they behave like UAP mantids and greys? Evidence: NDE theme 20 and rare items 4 and 24; UAP theme 26 and direction 6; section 6 entity-type comparison.

7. When one person reports both an NDE and a UAP encounter, which frame governs the aftermath? Evidence: UAP theme 29 and direction 10; ATLAS-stats section 7 hybrids (ygwd7IwGhYg, 3baDgB1LB18); NDE standout 4ZPHunKGo3U.

8. Is the life review a private form of the species-level warning? Evidence: NDE theme 6 and direction 2; UAP theme 20 and bridges on life review and messages; section 6 notes life review is not coded for UAP.

9. Does evidence strength predict aftermath in either corpus? Evidence: NDE tension 5 and ATLAS-stats section 2.4; UAP tension 3 and ATLAS-stats section 5; section 8 on veridical scoring.

10. How does a childhood encounter differ when the visitor is an angel rather than a grey? Evidence: NDE theme 16 and direction 6; UAP theme 19; ATLAS-stats section 7 child matches; GywGA-9TEDk against zQYte-GElNw.

11. How does retelling change testimony across both corpora? Evidence: NDE theme 19 and direction 11; UAP standout -0g3lLGxNfc with its retellings (1FPBT9gyeQc, 4gMai6DMDVg) and rare item 3; ATLAS-stats section 7 on repeat names.

## Cross-domain book directions

**1. Sixty-Four to One (the emotional split).** The archive's strongest number is that love is 63.8 percent of NDE entity emotions and 1.0 percent of UAP ones (section 8), and the book asks what sets the tone: the being, the dying body, or the witness's worldview. Extends the UAP direction The Benevolent Captor by adding the NDE hell shelf and the peaceful darkness. NDE: N_BHl3FV9NE, BlqIHQOfM3U, ry9ARwjCwD8, gAJShDqxM1E, 0HGnO-tzeqw. UAP: 41zks7azg5o, 39WSuhczpYE, AO-TJ0aVnhU, 60t0hSq3RYY, SYoXSa32EZI.

**2. Tell Them, Tell No One.** The NDE sends its experiencer back with a message to deliver; the UAP encounter sends its witness home with an order to keep quiet, from occupants, officers and neighbors alike. A book about what testimony costs when it is commanded and when it is forbidden. Extends The Silence Order and The Second Half of the Story. NDE: tnHgYKxXYjg, 0YJAqNe2exc, HwmnyYSXE44, 1e4HSPc49FA, d5_6jIEc3sc. UAP: x4wL4lbwwNU, g5Jdq8yig74, IhxdkrUlTUA, 2VZJvUOYWao, wp4btkW1kbs.

**3. The Clock and the Gap.** Time expands in NDEs and vanishes in UAP encounters, and both corpora hold the blank record: 85 minutes of clinical death with nothing remembered, and a gap filled forty years later under hypnosis. A book on what witnesses do with time they cannot account for. Extends Missing Time. NDE: G9lrkqr1YUQ, h-XpjzpHx2g, w_WtY63NnoM, 2CmeFt00Hjc, jPqMsmvgE3w. UAP: 5d-ccxq0s50, kHf3-CDquXs, aOJSRlfosog, x5OJsCAvw8Y, pgidlQ_zG9g.

**4. Depth Without Aftermath.** NDE depth and change rise together (97.0 percent transformed, section 6), yet the UAP archive holds a large population of deep contact with no aftermath (section 8) and its least-evidenced class, CE5, changes people most (ATLAS-stats section 5). A book that isolates what actually transforms a person, using the NDE zero cases as the control. Extends Contact as Practice. NDE: RVuU5U_0beI, upmgXkXBKII, ISozsB1hhms, PqddJsxn16s, oOo6YoZPNDw. UAP: nVkGEL5eRiY, GBUULtF0TGw, KuX4GLHLRz8, JUCaVMlCTb4, 36p3g8Zhnvg.

**5. Strangers and Relatives.** The entity populations have zero overlap at the top (section 6), yet each corpus carries the other's beings as a rarity: mantids, greys and Arcturian councils in NDEs, dead fathers and materialized physicians in UAP. A book about recognition, asking whether familiarity rather than nature decides what an encounter means. Extends Who Owns the Light and One Anomalous Ecology. NDE: 4ZPHunKGo3U, AiI0MQUsSQA, 9V5YcGUJ-ww, pvtuKyDV1WE, OhoidSzUaxk. UAP: -zBSWjdRNoY, 6WS7NbAwPrA, 3_AaxaNnG6c, srii1gA3tFI, PIiN6nf22q4.

**6. The Ledger and the Warning.** The life review is a personal moral audit felt from the other side; the UAP message is an ecological warning to a species, delivered to schoolchildren and abductees. Both are instruction from nonhuman beings, one facing backward and one facing forward. Extends Feeling What You Made Them Feel and The Examiner. NDE: 17vs21uAjVw, 28o9qbvktN8, Q7JfC0U0_Fc, XLJ4V7O6KhI, BycLo54-XqM. UAP: 8L6M2mRcux4, QRkhmCHHdhc, U3GJ7AEqQmg, udwaN5YVz-A, MgNEaKIwCEE.

**7. Proof by Slipper, Proof by Radar.** The NDE ladder is a message confirmed by a person; the UAP ladder is soil, radar, a lab result and a body no one has seen. In one, vivid is not veridical (ATLAS-stats section 2.4); in the other, evidence and transformation move in opposite directions (ATLAS-stats section 5). A book that sets the two ladders side by side. Extends Evidence at the Ceiling and The Body as Archive. NDE: 911eSfXSrIA, d3Bo1Fei950, sAjRH6nL5Gc, mL3nT0cAZ2g, cIyb089-2f8. UAP: QC6nxcOoHbk, 0anEeY30Zig, E9HPUxD1ZyY, vf7xZ5vMMfk, OZMEwUsFMiA.

## Reading order for an ideation session

1. Read the intro, then the candidate directions: twelve NDE, twelve UAP and the seven cross-domain directions above.
2. Choose two or three directions and read the tensions they cite.
3. Read the standout accounts and quote banks for those directions, on both sides where the direction is cross-domain.
4. Check every number against ATLAS-stats sections 2 through 6 and read section 8 before quoting any prevalence figure.
5. Pull the cited IDs with scripts/corpus-atlas/retrieve.mjs and verify each quotation against the video before it enters a manuscript.
