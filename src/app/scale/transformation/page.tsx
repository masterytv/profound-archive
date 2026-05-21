
import Link from 'next/link';
import { ArrowLeft, Leaf, PersonStanding, Heart, Gem, Sparkles, Church, Feather, Telescope, Users, Compass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export const metadata = {
    title: 'NDE Transformation Index (NDE-TI) | Project Profound',
    description: 'The NDE Transformation Index is a narrative-analysis scale for measuring post-NDE transformation from first-person accounts, covering 10 domains across 5 decades of NDE research.',
};

export default function TransformationScalePage() {
    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Back Link */}
                <div>
                    <Link
                        href="/search3"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Search
                    </Link>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        NDE Transformation Index (NDE-TI)
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        A Narrative-Analysis Scale for Measuring Post-NDE Transformation from First-Person Accounts
                    </p>
                </div>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Overview Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Overview</h2>
                    <p>
                        Near-death experiences are not merely events that happen <em>to</em> people—they are events that fundamentally <em>change</em> people. This is one of the most robust and consistently replicated findings across five decades of NDE research.
                    </p>
                    <p>
                        The NDE Transformation Index (NDE-TI) is designed specifically for narrative analysis: it enables a trained reader or an AI system to evaluate the transformation described in a first-person account without requiring any additional investigation, survey completion, or follow-up contact with the experiencer. It extracts transformation evidence from what the experiencer chose to share, recognizing that this represents what was most salient and meaningful to them.
                    </p>
                </section>

                {/* What It Measures */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">What the Scale Measures</h2>
                    <p>
                        The NDE-TI measures the transformation that an experiencer <em>describes</em> as resulting from their NDE, as expressed in their own account. It does not measure the depth or type of the NDE itself (that is the role of the <Link href="/scale/greyson" className="text-primary hover:underline">Greyson NDE Scale</Link>). It does not verify whether changes actually occurred—it assesses what the experiencer reports.
                    </p>
                </section>

                {/* Gap This Scale Addresses */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">The Gap This Scale Addresses</h2>
                    <p>
                        Existing instruments (the Greyson NDE Scale, the Life Changes Inventory, Ring&apos;s Psychic Experiences Inventory) require the experiencer to complete a structured questionnaire. They cannot be applied retrospectively to narrative accounts—the thousands of interviews, testimonies, books, social media posts, and video transcripts that constitute the vast majority of available NDE data.
                    </p>
                    <p>
                        The NDE-TI fills this gap by enabling systematic, comparable assessment of transformation from any first-person narrative source.
                    </p>
                </section>

                {/* Design Principles */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Design Principles</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Text-Derivable:</strong> Every element can be assessed from a first-person narrative without additional investigation.</li>
                        <li><strong>Direction-Sensitive:</strong> Captures not just <em>that</em> change occurred, but <em>which way</em> it went.</li>
                        <li><strong>Neutral on Valence:</strong> Does not assume transformation is positive or negative—captures what the experiencer reports.</li>
                        <li><strong>Breadth and Depth:</strong> Distinguishes between wide-ranging transformation across many life areas and deep transformation in a single area.</li>
                        <li><strong>Academically Grounded:</strong> Each domain maps to established constructs in the peer-reviewed NDE literature.</li>
                        <li><strong>Intuitively Accessible:</strong> Described in language a high school student can understand.</li>
                    </ul>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Scale Structure */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Scale Structure</h2>
                    <p>
                        The NDE-TI consists of <strong>10 Transformation Domains</strong>, each scored on a <strong>0–5 intensity scale</strong>, with a direction indicator. The scale also generates three meta-scores and qualitative context notes.
                    </p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Score</TableHead>
                                <TableHead className="w-[150px]">Label</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">0</TableCell>
                                <TableCell>Not Addressed</TableCell>
                                <TableCell>This area of transformation is not discussed in the account</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">1</TableCell>
                                <TableCell>Briefly Noted</TableCell>
                                <TableCell>A passing mention or slight implication of change</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">2</TableCell>
                                <TableCell>Mild Change</TableCell>
                                <TableCell>A noticeable shift is described, with limited detail</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">3</TableCell>
                                <TableCell>Moderate Change</TableCell>
                                <TableCell>A clear, meaningful transformation is described with some specific examples</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">4</TableCell>
                                <TableCell>Significant Change</TableCell>
                                <TableCell>A major, life-altering transformation is described in detail; clearly important to the experiencer</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">5</TableCell>
                                <TableCell>Profound Transformation</TableCell>
                                <TableCell>A dramatic, fundamental, life-defining change described with vivid detail and emotional emphasis</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    <h3 className="text-lg font-semibold mt-6">Direction Indicators</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Symbol</TableHead>
                                <TableHead>Meaning</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium text-emerald-700">↑</TableCell>
                                <TableCell>Increased</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium text-amber-600">↓</TableCell>
                                <TableCell>Decreased</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium text-blue-700">↕</TableCell>
                                <TableCell>Mixed / Complex</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium text-blue-700">→</TableCell>
                                <TableCell>Shifted / Redirected (e.g., from organized religion to personal spirituality)</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium text-cyan-700">✦</TableCell>
                                <TableCell>Newly Emerged</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* The 10 Domains */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">The 10 Transformation Domains</h2>
                    <p>Each domain maps to established constructs in the peer-reviewed NDE literature.</p>
                </section>

                {/* Domain Cards */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Leaf className="w-5 h-5 text-green-500" /> 1. Appreciation for Life (AL)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            Changes in how much the experiencer values being alive, notices beauty, savors ordinary moments, and feels gratitude for existence.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> Consistently identified as one of the strongest and most universal aftereffects (Ring, 1984; Greyson LCI-R; van Lommel, 2010; Long/NDERF). NDErs frequently describe the world as more vivid, beautiful, and precious after their experience.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: ↑ Increase</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><PersonStanding className="w-5 h-5 text-sky-500" /> 2. Self-Perception &amp; Identity (SI)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            Changes in how the experiencer sees themselves—self-worth, self-acceptance, inner peace, confidence, personality traits, and sense of who they are.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> Ring (1984) documented increased self-acceptance and inner peace. Greyson&apos;s LCI-R includes a &quot;Self-Acceptance&quot; factor. Atwater (2007) noted personality changes including increased assertiveness and emotional sensitivity. Many experiencers report feeling like a &quot;different person&quot; after their NDE.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: ↑ Self-acceptance increases; identity may be disrupted then reconstructed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Heart className="w-5 h-5 text-amber-500" /> 3. Compassion &amp; Concern for Others (CC)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            Changes in empathy, care for others, desire to help or serve, tolerance, and the capacity for unconditional love.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> Among the most consistently reported aftereffects across all studies (Ring, 1984; Greyson LCI-R; van Lommel, 2010; Sutherland, 1992; Long/NDERF). NDErs frequently report heightened empathy—sometimes to the point of feeling others&apos; emotions or pain—and an overwhelming desire to be of service.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: ↑ Increase</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Gem className="w-5 h-5 text-cyan-500" /> 4. Values &amp; Priorities (VP)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            Changes in what the experiencer considers important in life—particularly shifts regarding materialism, status, competition, wealth, social approval, simplicity, and authenticity.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> Decreased materialism and decreased concern with social status are among the most replicated findings in NDE research (Ring, 1984; Greyson LCI-R; van Lommel, 2010; Sutherland, 1992). NDErs consistently report that possessions, money, career prestige, and social image became far less important.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: ↓ Materialism/status; ↑ Simplicity/authenticity</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-500" /> 5. Spiritual Awareness (SA)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            Changes in the experiencer&apos;s sense of connection to something greater than themselves—universal consciousness, the divine, a higher power, oneness, transcendence—and in spiritual practices.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> Increased spirituality is one of the most prominent aftereffects (Ring, 1984; Greyson LCI-R; Khanna &amp; Greyson, 2014; van Lommel, 2010). Critically, the research distinguishes between <em>spirituality</em> (personal connection to the transcendent) and <em>religiousness</em> (adherence to organized doctrine). NDErs overwhelmingly report increased spirituality.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: ↑ Increase</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Church className="w-5 h-5 text-stone-500" /> 6. Religious Orientation (RO)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            Changes in the experiencer&apos;s relationship with organized religion—including adherence to specific doctrines, participation in religious institutions, and beliefs about religious exclusivism or universalism.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> This is one of the most nuanced domains. Research consistently shows a complex pattern: NDErs may become more religious, less religious, or—most commonly—shift from organized religion toward personal spirituality (Ring, 1984; van Lommel, 2010; Long/NDERF). The direction is highly variable and important for interpretation.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: Variable — ↑ More religious, ↓ Less religious, → Shift to spirituality/universalism, ↕ Mixed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Feather className="w-5 h-5 text-sky-400" /> 7. Attitude Toward Death (AD)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            Changes in fear of death, understanding of what death is, belief in an afterlife or continuation of consciousness, and overall peace with mortality.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> Reduced fear of death is arguably the single most consistent aftereffect of NDEs, reported across virtually every study (Moody, 1975; Ring, 1980; Greyson, 1992, 2021; van Lommel, 2001; Sutherland, 1992; Long/NDERF). NDErs overwhelmingly describe death as a transition rather than an ending, often reporting complete elimination of death anxiety.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: ↓ Fear of death; ↑ Belief in continuation</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Telescope className="w-5 h-5 text-purple-500" /> 8. Psychic &amp; Expanded Perception (PE)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            The emergence or enhancement of experiences typically classified as psychic or anomalous—including heightened intuition, precognition, telepathy, healing abilities, mediumistic experiences, out-of-body experiences, synchronicities, and electromagnetic sensitivity.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> Ring (1984) documented this extensively. Greyson has published multiple studies on paranormal aftereffects. Atwater (1988, 2007) was particularly detailed about EM sensitivity. These experiences are among the most challenging for NDErs because they are often socially stigmatized.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: ↑ New emergence or significant increase</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-rose-500" /> 9. Relationships &amp; Social Dynamics (RS)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            Changes in interpersonal relationships—intimate partnerships, family, friendships, and broader social dynamics—as well as the social challenges of being an NDEr.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> Relationship changes are among the most complex and often most painful aftereffects. Research documents both deepening of some relationships and loss of others (Ring, 1984; Sutherland, 1992; Atwater, 2007; Greyson, 2021). Elevated divorce rates among NDErs have been noted. This domain captures both the growth <em>and</em> the struggle.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: ↕ Mixed — depth increases, but some relationships end due to incompatibility</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Compass className="w-5 h-5 text-teal-500" /> 10. Purpose, Meaning &amp; Life Direction (PD)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">
                            Changes in the experiencer&apos;s sense of life purpose, mission, calling, career direction, and quest for knowledge and understanding.
                        </p>
                        <p className="text-sm">
                            <strong>Literature:</strong> A heightened sense of purpose or mission is widely documented (Ring, 1984; van Lommel, 2010; Greyson LCI-R; Atwater, 2007; Long/NDERF). Career changes—often away from high-earning positions toward helping professions—are frequently reported. An intense thirst for knowledge about consciousness, spirituality, and philosophy is common.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Typical Direction: ↑ Sense of purpose increases; life direction shifts toward service or knowledge</p>
                    </CardContent>
                </Card>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Scoring and Interpretation */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Scoring and Interpretation</h2>

                    <h3 className="text-lg font-semibold">Overall Transformation Score (0–50)</h3>
                    <p>Sum of all 10 domain scores. Classifies the breadth and depth of transformation described in the account.</p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Score Range</TableHead>
                                <TableHead className="w-[180px]">Classification</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">0</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                        No Transformation
                                    </span>
                                </TableCell>
                                <TableCell>The account focuses on the NDE itself without describing aftereffects</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">1–10</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                        Minimal Transformation
                                    </span>
                                </TableCell>
                                <TableCell>A few areas of change are briefly mentioned</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">11–20</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                        Moderate Transformation
                                    </span>
                                </TableCell>
                                <TableCell>Several areas of meaningful change described</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">21–30</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                        Significant Transformation
                                    </span>
                                </TableCell>
                                <TableCell>Multiple areas of clear, substantial transformation described</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">31–40</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        Major Transformation
                                    </span>
                                </TableCell>
                                <TableCell>Extensive, deep transformation across many life areas</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">41–50</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        Comprehensive Profound
                                    </span>
                                </TableCell>
                                <TableCell>Near-total life transformation described in vivid detail across virtually all domains</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    <h3 className="text-lg font-semibold mt-6">Transformation Breadth (0–10)</h3>
                    <p>Count of domains scoring ≥1. Indicates how many different areas of life were affected.</p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Breadth</TableHead>
                                <TableHead>Label</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">0</TableCell>
                                <TableCell>No transformation discussed</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">1–3</TableCell>
                                <TableCell>Focused transformation (few areas)</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">4–6</TableCell>
                                <TableCell>Moderate breadth</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">7–8</TableCell>
                                <TableCell>Broad transformation</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">9–10</TableCell>
                                <TableCell>Comprehensive transformation (nearly all life areas affected)</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    <h3 className="text-lg font-semibold mt-6">Transformation Depth (1.0–5.0)</h3>
                    <p>Mean score of all domains scoring ≥1 (excludes domains scored 0). Indicates how intensely transformation is described in the areas that were discussed.</p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Depth</TableHead>
                                <TableHead>Label</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">1.0–1.9</TableCell>
                                <TableCell>Lightly described</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">2.0–2.9</TableCell>
                                <TableCell>Moderately described</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">3.0–3.9</TableCell>
                                <TableCell>Strongly described</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">4.0–5.0</TableCell>
                                <TableCell>Profoundly described</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Special Considerations */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Special Considerations</h2>

                    <h3 className="text-lg font-semibold">Distressing NDEs</h3>
                    <p>
                        Accounts of distressing or frightening NDEs may show distinctive transformation patterns: initial increase in fear before eventual transformation, dramatic religious conversion, and transformation that may take longer to manifest but can be as deep or deeper than from pleasurable NDEs.
                    </p>

                    <h3 className="text-lg font-semibold">Childhood NDEs</h3>
                    <p>
                        Atwater&apos;s research shows that children who have NDEs may not recognize their transformation until adulthood. Their accounts may describe growing up feeling &quot;different&quot; without knowing why, or psychic abilities assumed to be normal.
                    </p>

                    <h3 className="text-lg font-semibold">Account Length and Detail</h3>
                    <p>
                        Longer, more detailed accounts will naturally score higher because there is more opportunity for transformation to be discussed. This is not a flaw—it reflects the richness of the data. The Transformation Depth score (mean of non-zero domains) helps normalize for this, as a short account that deeply describes one area will have a high Depth score even with a lower Overall score.
                    </p>

                    <h3 className="text-lg font-semibold">Cultural Context</h3>
                    <p>
                        Transformation expressions may vary across cultures and religious traditions. The analysis assesses transformation based on the <em>degree of change from the person&apos;s own baseline</em>, not against a universal template.
                    </p>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Literature Foundation */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Literature Foundation</h2>
                    <p>
                        The NDE-TI is grounded in five decades of peer-reviewed NDE research. Each domain maps directly to established constructs in the published literature.
                    </p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Source</TableHead>
                                <TableHead>Contribution to Scale Design</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Ring (1980, 1984, 1998)</TableCell>
                                <TableCell>Omega prototype; value shifts; psychic aftereffects</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Greyson (2004) LCI-R</TableCell>
                                <TableCell>Nine value-change domains; direction and magnitude framework</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Greyson (2021) <em>After</em></TableCell>
                                <TableCell>Comprehensive review of transformation research</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Van Lommel (2001, 2010)</TableCell>
                                <TableCell>Longitudinal transformation; deepening over time</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Atwater (1988, 2007)</TableCell>
                                <TableCell>Physiological changes; EM sensitivity; childhood patterns</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Sutherland (1992)</TableCell>
                                <TableCell>Cross-cultural confirmation; relationship changes</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Long/NDERF surveys</TableCell>
                                <TableCell>Large-scale aftereffect data; belief changes</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Noyes et al. (2009)</TableCell>
                                <TableCell>Aftereffects typology for pleasurable vs. distressing NDEs</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Khanna &amp; Greyson (2014)</TableCell>
                                <TableCell>Daily spiritual experiences pre/post NDE</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Bush (2012)</TableCell>
                                <TableCell>Distressing NDEs and their transformative aftereffects</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Holden, Greyson &amp; James (2009)</TableCell>
                                <TableCell><em>Handbook of NDEs</em>: comprehensive academic review</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* How We Use It */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">How We Use the NDE-TI</h2>
                    <p>
                        On this platform, we apply the NDE Transformation Index to first-person NDE accounts shared through video. Our AI analysis system evaluates each of the 10 domains based on the experiencer&apos;s own description in the video transcript, providing:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>An <strong>Overall Transformation Score</strong> (0–50) with corresponding classification</li>
                        <li><strong>Breadth</strong> (how many life areas were affected) and <strong>Depth</strong> (how intensely transformation is described)</li>
                        <li>Individual <strong>domain scores</strong> (0–5) with direction indicators for each of the 10 domains</li>
                        <li><strong>Evidence summaries</strong> and key quotes from the transcript for each scored domain</li>
                        <li>A <strong>qualitative profile</strong> with dominant themes, integration notes, and timeline observations</li>
                    </ul>
                    <p className="text-sm text-muted-foreground italic">
                        Note: Our AI-generated NDE-TI scores are approximations based on the video transcript and should be considered indicative rather than definitive. A low score may indicate the experiencer focused on describing the NDE itself rather than its aftereffects, not that transformation did not occur.
                    </p>
                </section>

                {/* Back to Search */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                    <Link
                        href="/search3"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Search
                    </Link>
                </div>
            </div>
        </div>
    );
}
