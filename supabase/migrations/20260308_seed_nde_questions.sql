-- ============================================================
-- Migration: 20260308_seed_nde_questions.sql
-- Purpose:   Seed the nde_questions table with the initial set
--            of 79 curated consumer questions + HyDE ai_query
--            passages, organised by category / subcategory.
--
-- Safe to re-run: INSERT ... ON CONFLICT (question_normalized)
--                 DO NOTHING — existing rows are never touched.
--
-- categories (category → subcategory):
--   reunion          → "Seeing Our Loved Ones Again"
--   pets             → "Pets on the Other Side"
--   children         → "Children, Babies & Pregnancy Loss"
--   suicide          → "Suicide & Tragic Death"
--   signs            → "Signs, Dreams & Messages"
--   dying-process    → "What Dying Actually Feels Like"
--   life-review      → "The Life Review"
--   hell             → "Hell & Judgment"
--   identity         → "Will I Still Be Me?"
--   religion         → "God, Religion & Belief"
--   afterlife-description → "What the Afterlife Is Like"
--   purpose          → "Why We're Here"
-- ============================================================

INSERT INTO public.nde_questions
  (question, category, subcategory, ai_query, needs_refresh, is_active)
VALUES

-- ── reunion ──────────────────────────────────────────────────
(
  'Are our loved ones really there to greet us when we die?',
  'reunion', 'Seeing Our Loved Ones Again',
  'Someone I had loved and lost was there waiting for me the moment I crossed over. They were right there, smiling, and I immediately felt the warmth and recognition between us.',
  TRUE, TRUE
),
(
  'Will I recognize the people I''ve lost, and will they look the way I remember?',
  'reunion', 'Seeing Our Loved Ones Again',
  'I recognized them instantly even though they looked younger and radiant. It wasn''t their face exactly — it was something deeper, like a soul signature I knew completely.',
  TRUE, TRUE
),
(
  'Do the people who''ve crossed over know what''s happening in my life right now?',
  'reunion', 'Seeing Our Loved Ones Again',
  'From where I was, I could see everything happening on Earth. I was aware of the people I had left behind and what they were going through. The love I felt for them didn''t stop — it just continued from a different place.',
  TRUE, TRUE
),
(
  'I never got to say goodbye — does my loved one know what they meant to me?',
  'reunion', 'Seeing Our Loved Ones Again',
  'The person I had lost knew everything I had felt but never said. There were no unfinished words between us — the love I had carried was completely understood. Nothing was left unsaid on that side.',
  TRUE, TRUE
),
(
  'Is the love between us still personal and deep, or does it become something universal and impersonal?',
  'reunion', 'Seeing Our Loved Ones Again',
  'The connection I felt with the people I had loved was still deeply personal — not dissolved into something vague. It was the same relationship, the same knowing, just without the friction and distance of physical life.',
  TRUE, TRUE
),
(
  'If my spouse remarries after I die, who are they with on the other side?',
  'reunion', 'Seeing Our Loved Ones Again',
  'There was no jealousy or possession in the way love worked there. Every bond was honored. The relationships I had carried across a lifetime were each real and present — there was no competition between them.',
  TRUE, TRUE
),
(
  'Can deceased loved ones come to escort us when it''s our time to cross over?',
  'reunion', 'Seeing Our Loved Ones Again',
  'The person who came to meet me had crossed over years before I did. They were there specifically to guide me through. I wasn''t left to find my way alone — someone who loved me had come to bring me across.',
  TRUE, TRUE
),
(
  'What if someone who hurt or abused me in life is waiting on the other side?',
  'reunion', 'Seeing Our Loved Ones Again',
  'I was not forced to encounter anyone who had caused me harm. The space I entered was one of safety and peace. I wasn''t afraid about who would be there — the love of the light protected who I was near.',
  TRUE, TRUE
),
(
  'What if my loved one has already reincarnated by the time I die — will I ever see them again?',
  'reunion', 'Seeing Our Loved Ones Again',
  'I was told that even those who had moved on to another life could still be present in some way. Time and reunion worked differently there — no one was truly lost or permanently unreachable.',
  TRUE, TRUE
),

-- ── pets ─────────────────────────────────────────────────────
(
  'Do pets have souls, and will mine really be waiting for me when I die?',
  'pets', 'Pets on the Other Side',
  'My animal companion was there. Not a memory of them — actually them. Bounding toward me, entirely themselves, with no trace of their final illness or pain. I had not expected that, and it undid me completely.',
  TRUE, TRUE
),
(
  'Will my pet be young, healthy, and free from the suffering of their final days?',
  'pets', 'Pets on the Other Side',
  'The animal I had lost appeared young and restored — the way they were at the peak of their life, before the illness took hold. All the suffering was completely gone.',
  TRUE, TRUE
),
(
  'Did my pet understand why I had to let them go?',
  'pets', 'Pets on the Other Side',
  'There was no grievance in them — only joy and reunion. Whatever had happened at the end, they carried none of it. The love between us was exactly as it had been on the best days.',
  TRUE, TRUE
),
(
  'Will all the different pets I''ve loved throughout my life be there?',
  'pets', 'Pets on the Other Side',
  'I saw more than one animal I had loved and lost. They were all there — different seasons of my life all present at once in the same space.',
  TRUE, TRUE
),
(
  'Who is looking after my pet right now while they wait for me?',
  'pets', 'Pets on the Other Side',
  'The animals I encountered weren''t wandering alone. Somehow the space they were in was full of care and warmth — they were held and content even before I arrived.',
  TRUE, TRUE
),
(
  'Have NDE experiencers ever encountered animals during their experience?',
  'pets', 'Pets on the Other Side',
  'During my experience I encountered animals — not just pets but a sense that all living things had some form of continued existence. It surprised me. I hadn''t expected them to be there.',
  TRUE, TRUE
),

-- ── children ─────────────────────────────────────────────────
(
  'Where does the soul of a miscarried or stillborn baby go?',
  'children', 'Children, Babies & Pregnancy Loss',
  'I became aware of a soul that had not fully entered physical life — a presence connected to me that I recognized as a child I had lost before they were born. They were whole and complete and surrounded by love.',
  TRUE, TRUE
),
(
  'Will my child be waiting as the baby I lost, or will they have grown up on the other side?',
  'children', 'Children, Babies & Pregnancy Loss',
  'The child I had lost appeared to me — I could sense both the infant they had been and something more developed, as though both were true at once. They were not stuck as a baby but could present however felt most meaningful for reunion.',
  TRUE, TRUE
),
(
  'Will I get the chance to raise and be close to the child I never got to raise here?',
  'children', 'Children, Babies & Pregnancy Loss',
  'I was shown that the relationship with the child I had lost was not over — there would be closeness and connection, a continuation of the bond in whatever form it could take. The loss wasn''t final.',
  TRUE, TRUE
),
(
  'Is my child frightened or alone in the afterlife, or are they safe and loved?',
  'children', 'Children, Babies & Pregnancy Loss',
  'The child I had lost was not alone and was not afraid. Someone was with them — a presence of warmth and care. They were being held and loved and were at complete peace.',
  TRUE, TRUE
),
(
  'Do deceased relatives look after children who cross over before their parents arrive?',
  'children', 'Children, Babies & Pregnancy Loss',
  'I saw that children who had crossed over were in the care of beings who loved them — relatives, guides, or presences of deep warmth — and they were thriving and content until reunion with the rest of their family.',
  TRUE, TRUE
),
(
  'Why would a loving God allow a child to suffer and die?',
  'children', 'Children, Babies & Pregnancy Loss',
  'From the perspective I was given, every soul — even those who lived only a short time — had a complete and purposeful existence. The brevity of a life did not diminish its meaning. I could feel the deep love that surrounded even the hardest stories.',
  TRUE, TRUE
),

-- ── suicide ───────────────────────────────────────────────────
(
  'What happens to someone who dies by suicide — are they punished, or met with compassion?',
  'suicide', 'Suicide & Tragic Death',
  'The person who had ended their own life was not condemned. When they crossed over they were met with compassion and understanding for the suffering that had driven them to that point. There was no punishment — only the grief of realizing what had been left behind.',
  TRUE, TRUE
),
(
  'Does someone who takes their own life regret it when they cross over?',
  'suicide', 'Suicide & Tragic Death',
  'From the other side, someone who had died by suicide could see the pain their leaving had caused and felt the weight of that. Not as punishment — but as a natural grief for the ripple their choice had created.',
  TRUE, TRUE
),
(
  'Is suicide an unforgivable act, or does God understand that depth of desperation?',
  'suicide', 'Suicide & Tragic Death',
  'I was told the circumstances of how someone died were fully understood — the desperation, the suffering, the moment of darkness. It was not held as an unforgivable act. The love there was unconditional and complete.',
  TRUE, TRUE
),
(
  'If someone was murdered or died violently, is their soul protected before the worst of it?',
  'suicide', 'Suicide & Tragic Death',
  'I understood that even in violent or sudden death, the soul was guided and shielded. Whatever the body experienced, the consciousness had already begun to leave before the worst of it. They were not alone and were not abandoned.',
  TRUE, TRUE
),
(
  'Do people who die suddenly — in accidents or without warning — get extra help crossing over?',
  'suicide', 'Suicide & Tragic Death',
  'There was a sense that when someone crossed over suddenly without time to prepare, additional help was given. A presence came immediately to guide them. No one was left confused and alone.',
  TRUE, TRUE
),
(
  'Can a soul get stuck after a violent death without realizing they''ve died?',
  'suicide', 'Suicide & Tragic Death',
  'I understood that some souls, particularly after sudden or traumatic death, could become confused and not fully understand they had died. They might linger near the physical world until they were gently guided forward.',
  TRUE, TRUE
),
(
  'If someone dies from addiction or overdose, do they find clarity on the other side?',
  'suicide', 'Suicide & Tragic Death',
  'The fog and compulsion of addiction was completely gone the moment they crossed over. The clarity that replaced it was described as overwhelming — a return to the person they truly were without the distortion of that pain.',
  TRUE, TRUE
),
(
  'Can someone who died in terrible suffering still find complete peace and healing?',
  'suicide', 'Suicide & Tragic Death',
  'No matter what the final moments had been — pain, fear, confusion — on the other side there was complete healing. The suffering did not carry over. What I encountered there was peace so total it erased everything that had come before.',
  TRUE, TRUE
),

-- ── signs ─────────────────────────────────────────────────────
(
  'When lights flicker, coins appear, or I see my loved one''s favorite bird — is that really them contacting me?',
  'signs', 'Signs, Dreams & Messages',
  'After I came back I understood that the people I had lost were still aware of me. Some experiencers described being able to influence small things in the physical world — lights, objects, a presence in the room — to let us know they were near.',
  TRUE, TRUE
),
(
  'Why hasn''t my deceased loved one visited me in a dream — are they unable to, or upset with me?',
  'signs', 'Signs, Dreams & Messages',
  'Not every person who had crossed over could make contact easily. It wasn''t a matter of love or want — some connections were harder to bridge through dreams. The absence of a visit didn''t mean absence of love.',
  TRUE, TRUE
),
(
  'Can the people who''ve crossed over actually hear me when I talk to them out loud?',
  'signs', 'Signs, Dreams & Messages',
  'From the other side, I was aware of the people I had left behind. I could sense when they were thinking of me or speaking to me. Their love and their words reached me even though they couldn''t see me hearing.',
  TRUE, TRUE
),
(
  'Does my constant grief disturb the peace of the people I''ve lost — should I try to let go?',
  'signs', 'Signs, Dreams & Messages',
  'The grief of those left behind was felt by the people who had crossed over, and it created a kind of longing or pull. They didn''t want the grief to bind us. Their deepest wish was for us to find peace and joy while still living.',
  TRUE, TRUE
),
(
  'Are mediums really communicating with deceased loved ones, or just reading our emotions?',
  'signs', 'Signs, Dreams & Messages',
  'I was aware from the other side that communication with those still living was possible, though difficult and imperfect. The channel was real but the signal was imperfect — not every medium was equally able to translate it clearly.',
  TRUE, TRUE
),
(
  'How do I tell the difference between a genuine sign from a loved one and just a coincidence?',
  'signs', 'Signs, Dreams & Messages',
  'I understood that signs from someone who had crossed were often accompanied by a feeling — a specific warmth or recognition that was distinct from ordinary coincidence. It wasn''t always the event itself but the inner knowing that came with it.',
  TRUE, TRUE
),
(
  'If I start to heal and feel happy again, will my deceased loved one think I''ve moved on and forgotten them?',
  'signs', 'Signs, Dreams & Messages',
  'The person I had lost wanted me to heal and be happy. From where they were, my joy was their joy. They didn''t experience my healing as abandonment — they experienced it as relief. My laughter was something they celebrated, not mourned.',
  TRUE, TRUE
),

-- ── dying-process ─────────────────────────────────────────────
(
  'Is dying painful, or do people feel peace at the end?',
  'dying-process', 'What Dying Actually Feels Like',
  'The moment I left my body the pain stopped completely. It was instant — like removing a heavy coat. Whatever had been happening to my body became irrelevant and distant. What replaced it was a peace I had never felt while alive.',
  TRUE, TRUE
),
(
  'Will I panic and feel terror as I die, or does calm come over you?',
  'dying-process', 'What Dying Actually Feels Like',
  'I expected to be afraid. I had been terrified of death my whole life. But in the moment it happened, a calm came over me that I cannot describe — total and complete, as though the fear had never existed.',
  TRUE, TRUE
),
(
  'What does it feel like in the first moments after leaving the body?',
  'dying-process', 'What Dying Actually Feels Like',
  'The first sensation after leaving my body was one of lightness and freedom. I could see my body below me but I felt no attachment to it. I was still fully myself — thinking, feeling, aware — just no longer inside the physical form.',
  TRUE, TRUE
),
(
  'If I die suddenly — in a crash or in my sleep — will I understand what happened?',
  'dying-process', 'What Dying Actually Feels Like',
  'Even though my death was sudden and unexpected, I quickly became aware of what had occurred. There was a moment of confusion and then a clarity settled in. I understood that I had died and I was not afraid.',
  TRUE, TRUE
),
(
  'Will someone be there to meet me, or could I die completely alone?',
  'dying-process', 'What Dying Actually Feels Like',
  'I was not alone. The moment I crossed there was a presence — a being or a loved one — right there. No one is left to wander into that space without being met. I was received.',
  TRUE, TRUE
),
(
  'What if I''m aware but unable to move or speak as my body shuts down?',
  'dying-process', 'What Dying Actually Feels Like',
  'Even in those final moments when the body had stopped responding, I was still fully aware. I could hear and sense everything around me. And then the transition came and I realized my awareness was not dependent on my body at all.',
  TRUE, TRUE
),
(
  'Do people who have NDEs actually lose their fear of death afterward?',
  'dying-process', 'What Dying Actually Feels Like',
  'When I came back, the fear of death was simply gone. Not suppressed — gone. I had been there and come back. I knew what waited on the other side, and it was nothing to fear.',
  TRUE, TRUE
),

-- ── life-review ───────────────────────────────────────────────
(
  'Will I have to relive everything I''ve ever done — especially the things I''m most ashamed of?',
  'life-review', 'The Life Review',
  'During the life review I witnessed everything I had done — including the moments I was most ashamed of. But it wasn''t replayed to punish me. It was shown to me so I could understand the full picture of my life and what it had meant to those around me.',
  TRUE, TRUE
),
(
  'Do you feel the pain you caused others, exactly as they experienced it?',
  'life-review', 'The Life Review',
  'In the life review I felt what the other person had felt — their hurt, their fear, their longing — as though I were inside their experience. It was not comfortable. But it was not punitive. It was the fullest form of understanding I had ever known.',
  TRUE, TRUE
),
(
  'Is the life review meant to punish, or to help a soul understand and heal?',
  'life-review', 'The Life Review',
  'The life review was not a courtroom. There was no verdict, no punishment. The tone of the entire experience was one of deep compassion and instruction — a chance to see clearly and understand, not to be condemned.',
  TRUE, TRUE
),
(
  'Does God judge me during the life review, or am I the one doing the judging?',
  'life-review', 'The Life Review',
  'There was a presence with me during the life review — a being of light and love — but the judgment I experienced was my own. I was the one who felt the weight of my choices. The being held me in love while I came to my own understanding.',
  TRUE, TRUE
),
(
  'What if I''m so ashamed of what I see that I can''t forgive myself?',
  'life-review', 'The Life Review',
  'Even in the hardest moments of the life review, the love surrounding me was constant. It did not withdraw when I saw my failures. The question was never whether I would be forgiven — it was whether I could receive the forgiveness that was already there.',
  TRUE, TRUE
),
(
  'Do small, forgotten acts of kindness show up during the life review and matter?',
  'life-review', 'The Life Review',
  'In my life review I saw moments I had completely forgotten — small gestures, brief kindnesses, a smile given without thinking. They were there, luminous and fully counted. What I had thought was insignificant had rippled further than I knew.',
  TRUE, TRUE
),
(
  'If I''ve already made amends for my worst mistakes, does that change how the life review feels?',
  'life-review', 'The Life Review',
  'I was shown that the healing and repair I had attempted in life was fully recognized. The efforts I had made to set things right were present in the review — they mattered and they changed the texture of what I saw.',
  TRUE, TRUE
),

-- ── hell ──────────────────────────────────────────────────────
(
  'Is hell a real place, or is it a story religion invented to control people through fear?',
  'hell', 'Hell & Judgment',
  'During my experience I encountered a realm of darkness and suffering — not the cartoonish hell of religious imagery, but a real state of isolation, regret, and spiritual anguish. It was not a metaphor. But it also wasn''t permanent.',
  TRUE, TRUE
),
(
  'What happens to genuinely evil people — murderers, abusers — do they face real consequences?',
  'hell', 'Hell & Judgment',
  'I was shown that those who had caused tremendous harm to others did not simply walk into peace without any reckoning. Their life review was profound and their understanding of what they had done was complete. There were consequences — not cruelty, but full accountability.',
  TRUE, TRUE
),
(
  'I''ve done things I''m deeply ashamed of — does that mean I''m going to hell?',
  'hell', 'Hell & Judgment',
  'The love I encountered was not conditional on my having lived a perfect life. What mattered was the sincere intent, the love I had given and received, the growth I had pursued. My worst moments were seen — and I was still held.',
  TRUE, TRUE
),
(
  'Some people describe dark and terrifying NDEs — what causes those, and could that happen to anyone?',
  'hell', 'Hell & Judgment',
  'My experience began in darkness — a frightening void with a sense of dread and isolation. I understand now that these darker NDEs reflect something about the state the soul enters with — fear, guilt, disconnection from love. It was not permanent and it was not the whole picture.',
  TRUE, TRUE
),
(
  'If someone dies while deeply depressed or afraid, could their mental state pull them into a dark experience?',
  'hell', 'Hell & Judgment',
  'The emotional state carried at the moment of death can shape the initial experience. Someone who crosses in deep fear or despair may enter a darker space first. But beings of light are present even there — and the pathway toward love remains open.',
  TRUE, TRUE
),
(
  'Is there always a way out if someone ends up in a frightening or hellish NDE?',
  'hell', 'Hell & Judgment',
  'Even in the darkest part of my experience, I found that calling out — expressing even a flicker of desire for love or light — began to shift things. The darkness was not a locked room. There was always movement available, always a response to genuine reaching.',
  TRUE, TRUE
),

-- ── identity ──────────────────────────────────────────────────
(
  'Will I still feel like "me" — with my personality, my sense of humor, my memories?',
  'identity', 'Will I Still Be Me?',
  'I was still completely myself. My personality, my memories, my particular way of experiencing the world — all of it was intact. I did not dissolve. I did not lose myself. I was simply myself without the limitations of a body.',
  TRUE, TRUE
),
(
  'If my loved one had dementia or brain damage when they died, is their mind fully restored?',
  'identity', 'Will I Still Be Me?',
  'The person I encountered who had suffered cognitive decline in life was fully themselves again — sharp, present, entirely recognizable. The deterioration of the brain had not been who they were. Who they were was still intact, restored, and complete.',
  TRUE, TRUE
),
(
  'Does my identity dissolve into a cosmic "oneness" where I disappear — or do I stay myself?',
  'identity', 'Will I Still Be Me?',
  'I experienced a profound sense of unity — an oneness with everything — but I did not disappear into it. I was still there, still aware of being me, as I expanded into that larger consciousness. The two were not contradictory.',
  TRUE, TRUE
),
(
  'Do people keep their sense of gender, their appearance, and the things that made them who they are?',
  'identity', 'Will I Still Be Me?',
  'I recognized the people I encountered — not just because they looked familiar but because they were recognizably themselves. The core of who they were had carried through intact.',
  TRUE, TRUE
),
(
  'If I''ve lived past lives, which version of "me" am I in the afterlife?',
  'identity', 'Will I Still Be Me?',
  'I became aware of other lifetimes — other expressions of my soul — and yet there was a continuous thread of selfhood running through all of them. I was not limited to this life''s identity but I was still a coherent self across all of them.',
  TRUE, TRUE
),
(
  'Is consciousness actually separate from the brain — can it survive after the brain has stopped?',
  'identity', 'Will I Still Be Me?',
  'My brain had stopped. I know this because I could see my body below me, lifeless. And yet I was fully conscious — thinking, perceiving, feeling. My awareness was not coming from the brain. It was something separate that the brain had only ever been a receiver for.',
  TRUE, TRUE
),

-- ── religion ──────────────────────────────────────────────────
(
  'Do atheists and nonreligious people have beautiful, loving NDEs too?',
  'religion', 'God, Religion & Belief',
  'I had not believed in any of this before it happened to me. I was not religious. And yet what I encountered was the most profound love and light I had ever experienced. My disbelief had not excluded me from it.',
  TRUE, TRUE
),
(
  'Why do people from different religions encounter different beings — Jesus, Hindu gods, ancestors?',
  'religion', 'God, Religion & Belief',
  'The being I encountered appeared in a form I could recognize and receive — shaped by my own culture and understanding. I came to sense that the underlying reality was the same, but it wore different faces depending on who was crossing over.',
  TRUE, TRUE
),
(
  'If I followed the wrong religion my whole life, will I be turned away?',
  'religion', 'God, Religion & Belief',
  'There was no gate keeping based on the name of the God I had worshipped or the doctrine I had followed. What was evaluated was how I had loved — whether I had been compassionate, whether I had grown, whether I had given and received love.',
  TRUE, TRUE
),
(
  'Does God care more about what I believed, or how I actually treated people?',
  'religion', 'God, Religion & Belief',
  'What I understood from the life review and from the presence I encountered was that the love I had given and received — the actual moments of kindness, connection, and compassion — carried far more weight than what I had professed to believe.',
  TRUE, TRUE
),
(
  'If God is real and loving, why is there so much horrific suffering in the world?',
  'religion', 'God, Religion & Belief',
  'I was given a perspective on suffering that I could not have understood from inside a human life. The pain was real. But from where I was, I could see the growth and the meaning that was woven through even the hardest experiences. I still don''t fully understand it, but I saw it was not random.',
  TRUE, TRUE
),
(
  'I left the faith I was raised in — will I face consequences for that when I die?',
  'religion', 'God, Religion & Belief',
  'There was no condemnation for having walked away from a particular religion or for having doubted. The being I encountered held me without any judgment about the tradition I had left. What mattered was what was in my heart, not what institution I had belonged to.',
  TRUE, TRUE
),

-- ── afterlife-description ─────────────────────────────────────
(
  'What does the afterlife actually look like, according to people who''ve been there?',
  'afterlife-description', 'What the Afterlife Is Like',
  'What I saw defies description but I''ll try. There was light — but not light like sunlight. Colors I had no names for. A landscape that felt more real than anything on Earth, though it was unlike anything I had seen here. And a beauty that made me weep.',
  TRUE, TRUE
),
(
  'Can you still enjoy pleasures there — music, laughter, a sense of touch?',
  'afterlife-description', 'What the Afterlife Is Like',
  'There was music — I heard it as clearly as I have ever heard anything. And joy — unmistakable, embodied joy. The senses were not gone; they were expanded. I could feel and experience and delight. It was more vivid than physical life, not less.',
  TRUE, TRUE
),
(
  'Does eternity get boring, or is there always something meaningful to experience?',
  'afterlife-description', 'What the Afterlife Is Like',
  'I had no sense of boredom or emptiness. The peace there was not stagnant — it was alive with meaning and connection. There seemed to be endless layers to explore, endless understanding to receive.',
  TRUE, TRUE
),
(
  'How does time work — will it feel like my loved ones arrive moments after me, even if decades pass on Earth?',
  'afterlife-description', 'What the Afterlife Is Like',
  'Time did not function the way it does on Earth. What would be decades of separation from a human perspective felt, from where I was, like no distance at all. The arrival of those I loved felt close and inevitable rather than distant.',
  TRUE, TRUE
),
(
  'Can you explore other worlds or dimensions from the other side?',
  'afterlife-description', 'What the Afterlife Is Like',
  'I was given the sense that the afterlife was not a single flat place but an expansive reality with many layers and realms — that there was more to explore and experience than any single encounter could show. The sense of vastness was overwhelming.',
  TRUE, TRUE
),
(
  'Are the colors and sensations really beyond anything we can perceive as humans?',
  'afterlife-description', 'What the Afterlife Is Like',
  'The colors were beyond anything in the visible spectrum. I keep trying to describe them and there are no words. My eyes on Earth could not have seen them — they were perceived differently. The whole experience was more real than real.',
  TRUE, TRUE
),
(
  'Will I finally be able to rest? I am so tired from this life.',
  'afterlife-description', 'What the Afterlife Is Like',
  'The exhaustion I had carried for years — physical, emotional, spiritual — simply was not there when I crossed over. What replaced it was a rest so complete it was like putting down a weight I had forgotten I was carrying. You will rest.',
  TRUE, TRUE
),

-- ── purpose ───────────────────────────────────────────────────
(
  'If the afterlife is so beautiful and full of love, why do we come to Earth at all?',
  'purpose', 'Why We''re Here',
  'I was shown that the soul comes to Earth specifically because physical life offers something the spirit world cannot — friction, growth, the particular kind of love that can only emerge through limitation and loss. The beauty of the other side was the destination; Earth was the journey.',
  TRUE, TRUE
),
(
  'Did I choose this life — including the suffering — before I was born?',
  'purpose', 'Why We''re Here',
  'I was shown that before I entered this life I had some form of choice or agreement about the broad shape of my experience — including some of the hardest things. Not to be punished but because the soul understood what those experiences would create.',
  TRUE, TRUE
),
(
  'What is the actual purpose of my life from a soul''s perspective?',
  'purpose', 'Why We''re Here',
  'From the perspective I was given, the purpose of my life was not achievement or success or belief — it was love. How much I had given it, how much I had received it, how willing I had been to grow through the hard parts.',
  TRUE, TRUE
),
(
  'When I die, will I finally understand why everything happened the way it did?',
  'purpose', 'Why We''re Here',
  'In my experience, understanding came all at once — complete and total. Every thread of my life connected. Every loss, every detour, every hard season I had not understood while living was suddenly clear and meaningful.',
  TRUE, TRUE
),
(
  'Do people come back from NDEs struggling and depressed because they miss the peace of the other side?',
  'purpose', 'Why We''re Here',
  'Coming back was the hardest part. The peace I had felt was unlike anything available in physical life, and returning to a body and a limited existence felt like a deep grief. Many experiencers struggle with that dissonance for years.',
  TRUE, TRUE
),
(
  'If souls choose their lives for growth, why would anyone choose abuse, illness, or tragedy?',
  'purpose', 'Why We''re Here',
  'I didn''t fully understand this either. But I was shown that souls, from their perspective before birth, can see the profound transformation that comes through the hardest experiences — and they choose them not out of masochism but out of a desire for the fastest, deepest growth. From inside a human life, that makes no sense. From there, it does.',
  TRUE, TRUE
)

ON CONFLICT (question_normalized) DO NOTHING;
