
import Link from 'next/link';
import { ArrowLeft, Brain, Heart, Eye, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function GreysonScalePage() {
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
                        The Greyson Near-Death Experience Scale
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        A Validated Scientific Measure of NDE Depth and Characteristics
                    </p>
                </div>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Overview Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Overview</h2>
                    <p>
                        The Greyson Near-Death Experience Scale was developed by psychiatrist Dr. Bruce Greyson and first published in 1983 in the <em>Journal of Nervous and Mental Disease</em>. It is the most widely used and scientifically validated instrument for measuring the depth and characteristics of near-death experiences (NDEs).
                    </p>
                    <p>
                        The scale was designed to provide a standardized, reliable, and clinically useful tool to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Differentiate NDEs from other types of experiences (e.g., hallucinations, dreams, delirium)</li>
                        <li>Quantify the depth and intensity of an NDE</li>
                        <li>Enable comparison across different NDE accounts in research</li>
                        <li>Standardize NDE research methodology worldwide</li>
                    </ul>
                </section>

                {/* Structure Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Scale Structure</h2>
                    <p>
                        The scale consists of <strong>16 items</strong> organized into <strong>four components</strong>, each containing four questions. Every question is scored on a 3-point scale:
                    </p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Score</TableHead>
                                <TableHead>Meaning</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">0</TableCell>
                                <TableCell>Not present</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">1</TableCell>
                                <TableCell>Moderately or ambiguously present</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">2</TableCell>
                                <TableCell>Definitely present</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <p>
                        The total score ranges from <strong>0 to 32</strong>. Each component contributes a subscore of 0 to 8.
                    </p>
                </section>

                {/* Cognitive Component */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Brain className="w-5 h-5 text-violet-500" /> Cognitive Component (Items 1–4)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-muted-foreground">
                            These items assess changes in thought processes and cognition during the experience.
                        </p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">#</TableHead>
                                    <TableHead>Question</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">1</TableCell>
                                    <TableCell>Did time seem to speed up or slow down?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">2</TableCell>
                                    <TableCell>Were your thoughts speeded up?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">3</TableCell>
                                    <TableCell>Did scenes from your past come back to you? (Life review)</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">4</TableCell>
                                    <TableCell>Did you suddenly seem to understand everything?</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Affective Component */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500" /> Affective Component (Items 5–8)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-muted-foreground">
                            These items assess emotional and feeling-based elements of the experience.
                        </p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">#</TableHead>
                                    <TableHead>Question</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">5</TableCell>
                                    <TableCell>Did you have a feeling of peace or pleasantness?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">6</TableCell>
                                    <TableCell>Did you have a feeling of joy?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">7</TableCell>
                                    <TableCell>Did you feel a sense of harmony or unity with the universe?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">8</TableCell>
                                    <TableCell>Did you see or feel surrounded by a brilliant light?</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Paranormal Component */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Eye className="w-5 h-5 text-indigo-500" /> Paranormal Component (Items 9–12)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-muted-foreground">
                            These items assess perception and awareness that extends beyond normal sensory experience.
                        </p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">#</TableHead>
                                    <TableHead>Question</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">9</TableCell>
                                    <TableCell>Were your senses more vivid than usual?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">10</TableCell>
                                    <TableCell>Did you seem to be aware of things going on elsewhere, as if by ESP?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">11</TableCell>
                                    <TableCell>Did scenes from the future come to you? (Precognitive visions)</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">12</TableCell>
                                    <TableCell>Did you feel separated from your body? (Out-of-body experience)</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Transcendental Component */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Transcendental Component (Items 13–16)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-muted-foreground">
                            These items assess encounters and environments that transcend ordinary reality.
                        </p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">#</TableHead>
                                    <TableHead>Question</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">13</TableCell>
                                    <TableCell>Did you seem to enter some other, unearthly world?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">14</TableCell>
                                    <TableCell>Did you seem to encounter a mystical being or presence, or hear an unidentifiable voice?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">15</TableCell>
                                    <TableCell>Did you see deceased or religious spirits?</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">16</TableCell>
                                    <TableCell>Did you come to a border or point of no return?</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Scoring and Interpretation */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Scoring and Interpretation</h2>
                    <p>
                        A total score of <strong>7 or higher</strong> is generally accepted as indicative of a genuine near-death experience for research purposes. The total score further classifies the depth of the experience:
                    </p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Score Range</TableHead>
                                <TableHead className="w-[150px]">Classification</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">0–6</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                        Not an NDE
                                    </span>
                                </TableCell>
                                <TableCell>The experience lacks sufficient NDE characteristics to be classified as one.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">7–12</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                        Mild NDE
                                    </span>
                                </TableCell>
                                <TableCell>Contains some NDE elements but at a lower intensity. The experiencer reported several characteristic features.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">13–20</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        Moderate NDE
                                    </span>
                                </TableCell>
                                <TableCell>A significant NDE with multiple characteristic elements present. The experience was rich and multi-dimensional.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">21–32</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        Deep NDE
                                    </span>
                                </TableCell>
                                <TableCell>A profound experience with most or all NDE elements present at high intensity. These are the most comprehensive NDEs.</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </section>

                {/* Reliability and Validity */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Reliability and Validity</h2>
                    <p>
                        The Greyson NDE Scale has demonstrated strong psychometric properties in multiple studies:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Internal consistency:</strong> Cronbach&apos;s alpha of 0.88, indicating high reliability.</li>
                        <li><strong>Test-retest reliability:</strong> Pearson correlation of 0.92 when administered at different time points, demonstrating stability over time.</li>
                        <li><strong>Split-half reliability:</strong> High correlation between odd and even items.</li>
                        <li><strong>Discriminant validity:</strong> The scale successfully differentiates NDEs from other altered states of consciousness, including hallucinations, dreams, and delirium.</li>
                    </ul>
                    <p>
                        The scale has been translated into multiple languages and validated cross-culturally, making it the gold standard for NDE research worldwide.
                    </p>
                </section>

                {/* How We Use It */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">How We Use the Greyson Scale</h2>
                    <p>
                        On this platform, we apply the Greyson NDE Scale to first-person NDE accounts shared through video. Our AI analysis system evaluates each of the 16 items based on the experiencer&apos;s own description, providing:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>A <strong>total score</strong> (0–32) with corresponding depth classification</li>
                        <li>Individual <strong>item scores</strong> for each of the 16 questions</li>
                        <li><strong>Reasoning</strong> for each score, citing specific elements from the account</li>
                        <li>A <strong>component breakdown</strong> showing the cognitive, affective, paranormal, and transcendental subscores</li>
                    </ul>
                    <p className="text-sm text-muted-foreground italic">
                        Note: Our AI-generated Greyson scores are approximations based on the video transcript and should be considered indicative rather than definitive. The original scale was designed for direct experiencer self-report.
                    </p>
                </section>

                {/* Reference */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Reference</h2>
                    <p>
                        Greyson, B. (1983). The Near-Death Experience Scale: Construction, reliability, and validity. <em>Journal of Nervous and Mental Disease</em>, 171(6), 369–375.
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
