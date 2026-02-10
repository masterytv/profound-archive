
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function CvndePage() {
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
                        Claimed Veridical Perception Scale (cvNDE)
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        For First-Person Text/Audio/Video NDE Accounts
                    </p>
                </div>

                <hr className="border-gray-200 dark:border-gray-800" />

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Scale Overview and Rationale</h2>
                    <p>
                        The Claimed Veridical Perception Scale (cvNDE) is designed to evaluate the evidential strength of veridical perception claims within first-person Near-Death Experience accounts shared through audio or video formats (such as YouTube videos, podcasts, or recorded interviews).
                    </p>
                    <p>
                        Unlike the vNDE Scale, which requires external investigation and third-party verification by researchers, the cvNDE Scale:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Accepts the experiencer's account as presented (evaluating quality of claims, not investigating truth)</li>
                        <li>Measures evidential strength rather than verified accuracy</li>
                        <li>Assesses qualities inherent to the narrative that make veridical perception claims more or less compelling</li>
                        <li>Can be applied to any first-person account without requiring researcher access to witnesses or medical records</li>
                    </ul>

                    <h3 className="text-xl font-semibold mt-6">What Strengthens the Evidence for a Veridical Perception Claim?</h3>
                    <p>A veridical perception claim carries greater evidential strength when:</p>
                    <ol className="list-decimal pl-6 space-y-2">
                        <li>The medical state should have precluded any perception</li>
                        <li>Ordinary sensory access to the information was physically impossible</li>
                        <li>The perceived details are specific rather than vague</li>
                        <li>The information could not have been known, guessed, or inferred</li>
                        <li>The experiencer actively sought to verify the perception</li>
                        <li>Perceptions that were verified carry more weight than unverified claims</li>
                        <li>The perception was reported before the experiencer could have learned it was accurate</li>
                    </ol>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                <section className="space-y-8">
                    <h2 className="text-2xl font-semibold">Scale Criteria</h2>

                    {/* Criterion 1 */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Criterion 1: Medical State Severity During Perception</h3>
                        <p className="italic">What was the reported medical/physical state during which the veridical perceptions occurred?</p>
                        <p>
                            This criterion assesses how compromised brain function reportedly was during the experience. The more severe the medical crisis, the greater the evidential strength of any accurate perception, as conventional neuroscience would predict no perception should be possible.
                        </p>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Rating</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Examples</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">1</TableCell>
                                        <TableCell>Normal or near-normal consciousness, or experiencer is uncertain of their medical state</TableCell>
                                        <TableCell>"I'm not sure if I was fully under yet"; "I might have been drowsy"; no clear medical crisis described</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">2</TableCell>
                                        <TableCell>Altered consciousness without complete unconsciousness</TableCell>
                                        <TableCell>Sedation, fainting, oxygen deprivation effects, semi-conscious states, unclear depth of anesthesia</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">3</TableCell>
                                        <TableCell>Deep unconsciousness reported</TableCell>
                                        <TableCell>General anesthesia, coma, completely unresponsive state, reported by medical staff to have been unconscious</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">4</TableCell>
                                        <TableCell>Extreme physiological crisis</TableCell>
                                        <TableCell>Cardiac arrest (heart stopped), documented flatline (EEG or EKG), clinical death, resuscitation required, deep hypothermic circulatory arrest, prolonged lack of vital signs</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-md text-sm space-y-2">
                            <p className="font-semibold">Rating Guidance:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Listen for specific medical terminology (cardiac arrest, flatline, code blue, resuscitation)</li>
                                <li>Note whether the state was communicated by medical professionals or assumed by experiencer</li>
                                <li>"I was told I died for X minutes" = higher than "I think I was unconscious"</li>
                                <li>Claims of documented medical records mentioning the crisis increase rating</li>
                            </ul>
                        </div>
                    </div>

                    {/* Criterion 2 */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Criterion 2: Perceptual Access Impossibility</h3>
                        <p className="italic">How physically impossible was ordinary sensory perception of the reported information?</p>
                        <p>
                            This criterion evaluates whether the perceived information could have been obtained through normal sensory channels (hearing, peripheral vision, logical inference from sounds) given the experiencer's physical position and state.
                        </p>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Rating</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Examples</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">1</TableCell>
                                        <TableCell>Perceptions within potential sensory range</TableCell>
                                        <TableCell>Information from the immediate environment that could potentially be heard (conversations) or sensed through non-visual means; perceiving things from their body's physical perspective</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">2</TableCell>
                                        <TableCell>Perceptions from an impossible vantage point but in the same location</TableCell>
                                        <TableCell>Viewing themselves from above, seeing things behind them or occluded from their body's line of sight, but still within the same room</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">3</TableCell>
                                        <TableCell>Perceptions in areas physically separated from the body</TableCell>
                                        <TableCell>Different room, operating theater when body was in recovery, hallway conversations, covered eyes during surgery, perceiving things through walls/ceilings</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">4</TableCell>
                                        <TableCell>Remote perceptions</TableCell>
                                        <TableCell>Different building, different city, events happening miles away, perceiving events to relatives at home while in hospital, information from entirely separate locations</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-md text-sm space-y-2">
                            <p className="font-semibold">Rating Guidance:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Consider: "Could someone lying in that position potentially have sensed this?"</li>
                                <li>Auditory information in the same room rates lower than visual details from impossible angles</li>
                                <li>Operating room perceptions with confirmed eye closure/anesthesia rate higher</li>
                                <li>Remote viewing (e.g., seeing family member at home) = highest rating</li>
                                <li>Perceptions of information on TOP of objects (like a number on top of a cabinet) when viewing from above rate higher than eye-level perceptions</li>
                            </ul>
                        </div>
                    </div>

                    {/* Criterion 3 */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Criterion 3: Specificity and Precision of Perceptions</h3>
                        <p className="italic">How detailed and specific are the reported veridical perceptions?</p>
                        <p>
                            Vague impressions that could apply to many situations carry less evidential weight than precise, specific details that could be clearly confirmed or refuted.
                        </p>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Rating</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Examples</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">1</TableCell>
                                        <TableCell>Vague or general impressions</TableCell>
                                        <TableCell>"There were people around me"; "I saw doctors working"; "Someone was talking"; general atmosphere descriptions</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">2</TableCell>
                                        <TableCell>Moderate detail with some specifics</TableCell>
                                        <TableCell>"A woman with dark hair was on my left"; "Someone said something about my heart"; "There was some kind of commotion"</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">3</TableCell>
                                        <TableCell>Specific verifiable details</TableCell>
                                        <TableCell>Particular words or phrases quoted; specific actions described ("the doctor hit the cart"); specific but common characteristics ("nurse in blue scrubs said 'we're losing him'")</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">4</TableCell>
                                        <TableCell>Highly precise, unique details</TableCell>
                                        <TableCell>Exact numbers, specific names of people they didn't know, precise unusual details (plaid shoelaces, specific license plate, exact time, model number, unique identifier), unexpected or unusual events with specific characteristics</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-md text-sm space-y-2">
                            <p className="font-semibold">Rating Guidance:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Numbers, proper names, and exact quotes rate highest</li>
                                <li>Details that would be impossible to guess (specific numbers on hidden objects, exact words of conversations) = 4</li>
                                <li>"A doctor" = low; “My anesthesiologist” = medium, "Dr. Smith with the mustache" = high</li>
                                <li>Unusual/unexpected details rate higher than expected ones</li>
                                <li>Multiple specific details can elevate rating even if individually moderate</li>
                            </ul>
                        </div>
                    </div>

                    {/* Criterion 4 */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Criterion 4: Unpredictability of Perceived Information</h3>
                        <p className="italic">Could the perceived information have been known beforehand, logically inferred, or reasonably guessed?</p>
                        <p>
                            This criterion assesses whether the veridical perception represents information that would be surprising or impossible to know through normal means versus information that might be expected or inferred.
                        </p>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Rating</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Examples</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">1</TableCell>
                                        <TableCell>Expected or easily inferred information</TableCell>
                                        <TableCell>Knowing surgery involves doctors, operating room has equipment, family members are worried, predictable events during medical procedures</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">2</TableCell>
                                        <TableCell>Information that could possibly be guessed with some probability</TableCell>
                                        <TableCell>General appearance of medical staff, typical actions during resuscitation, common equipment configurations</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">3</TableCell>
                                        <TableCell>Unlikely to be known or correctly guessed</TableCell>
                                        <TableCell>Unexpected events (someone dropping something, unusual conversations), specific personnel not previously met, atypical occurrences, unusual clothing or accessories</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">4</TableCell>
                                        <TableCell>Seemingly impossible to know</TableCell>
                                        <TableCell>Hidden information (items on top of cabinets, in closed drawers), events involving strangers, numbers/codes never seen, events in remote locations unknown to experiencer, information about deceased individuals they couldn't have known</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-md text-sm space-y-2">
                            <p className="font-semibold">Rating Guidance:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Ask: "What are the odds someone could guess this correctly?"</li>
                                <li>Prior knowledge matters: Had they been in this hospital before? Did they know the staff?</li>
                                <li>Information about deceased relatives the experiencer didn't know had died = 4</li>
                                <li>Seeing standard equipment = low; seeing nurse's unusual tennis shoes hidden behind drape = high</li>
                                <li>Consider cultural/medical knowledge that might allow inference</li>
                            </ul>
                        </div>
                    </div>

                    {/* Criterion 5 */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Criterion 5: Self-Reported Verification Quality</h3>
                        <p className="italic">Did the experiencer attempt to verify their perceptions, and how compelling is their verification account?</p>
                        <p>
                            This criterion evaluates whether and how the experiencer claims to have checked whether their perceptions were accurate. Active verification attempts with specific methods and results carry greater evidential weight than vague claims of accuracy.
                        </p>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Rating</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Examples</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">1</TableCell>
                                        <TableCell>No verification attempt mentioned, or unable to verify, or disconfirming evidence found</TableCell>
                                        <TableCell>Experience described without any mention of checking accuracy; "I never found out if it was true"; never discussed perceptions with potential witnesses. “The doctor said that my perception wasn’t exactly what happened, but it was close.”</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">2</TableCell>
                                        <TableCell>Vague or passive verification claim</TableCell>
                                        <TableCell>"I found out later it was true"; "Someone told me I was right"; no specific method or source of verification described</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">3</TableCell>
                                        <TableCell>Specific verification method with general confirmation</TableCell>
                                        <TableCell>"I asked the nurse and she confirmed it"; "I later visited the location and it matched"; specific person or method identified but details of confirmation not elaborated</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">4</TableCell>
                                        <TableCell>Detailed verification with specific confirmation</TableCell>
                                        <TableCell>"I asked Dr. Smith about the plaid shoelaces and he turned white and showed them to me"; "I called the fire station and they confirmed truck 25 was at the scene"; "I described the conversation to my wife and she confirmed those exact words"; precise match between perception and verification explicitly described</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-md text-sm space-y-2">
                            <p className="font-semibold">Rating Guidance:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Method matters: Visiting locations, asking specific witnesses, checking records = higher</li>
                                <li>Response matters: Shocked reactions, specific confirmation of unlikely details = higher</li>
                                <li>Multiple verification sources elevate rating</li>
                                <li>Verification that occurs during the video (showing photos, having witnesses present) = highest consideration</li>
                            </ul>
                        </div>
                    </div>

                    {/* Criterion 6 */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Criterion 6: Verified Perception Weight</h3>
                        <p className="italic">What is the ratio and quality of perceptions the experiencer claims were verified versus those that remain unverified?</p>
                        <p>
                            This criterion captures the insight that one well-verified perception carries greater evidential weight than many unverified claims. Quality of verification matters more than quantity of claims.
                        </p>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Rating</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Examples</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">1</TableCell>
                                        <TableCell>No claimed verifications; all perceptions are unverified claims</TableCell>
                                        <TableCell>Multiple perceptions described but no mention of ever checking any of them; only claims without any verification narrative</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">2</TableCell>
                                        <TableCell>At least one perception with claimed verification among several unverified</TableCell>
                                        <TableCell>Many details claimed but only one was ever checked or confirmed; most claims remain unverified</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">3</TableCell>
                                        <TableCell>Multiple perceptions with claimed verification (2-4) OR one perception with exceptional verification quality</TableCell>
                                        <TableCell>Several specific details reportedly confirmed; or single perception that was verified with extraordinary specificity and witness confirmation</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">4</TableCell>
                                        <TableCell>Multiple perceptions (5+) with specific verification claims OR complete or near-complete verification of all claims</TableCell>
                                        <TableCell>Extensive verification effort across most or all claimed perceptions; systematic confirmation of multiple specific details</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-md text-sm space-y-2">
                            <p className="font-semibold">Rating Guidance:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>One extraordinarily verified perception (specific, unexpected, multiply confirmed) can rate 3</li>
                                <li>Many vague verifications &lt; fewer specific verifications</li>
                                <li>Weight quality over quantity</li>
                                <li>Consider: Did they try to verify everything they could, or only mention convenient confirmations?</li>
                            </ul>
                        </div>
                    </div>

                    {/* Criterion 7 */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Criterion 7: Temporal Precedence of Perception Report</h3>
                        <p className="italic">When did the experiencer share the perception relative to when they learned it was accurate?</p>
                        <p>
                            This is crucial for ruling out confabulation or unconscious memory revision. A perception that was documented or told to others BEFORE verification carries much greater evidential weight than one reported only after accuracy was discovered.
                        </p>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Rating</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Examples</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">1</TableCell>
                                        <TableCell>No information about when perception was first reported</TableCell>
                                        <TableCell>Account doesn't specify when they told anyone about the perception; timing of disclosure unclear</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">2</TableCell>
                                        <TableCell>Perception reported after verification was possible or after they could have learned the information</TableCell>
                                        <TableCell>"After I recovered, I told them what I'd seen"; ambiguous timing where they could have learned information before reporting</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">3</TableCell>
                                        <TableCell>Perception reported to others before claimed verification</TableCell>
                                        <TableCell>"As soon as I woke up, I told the nurse what I'd seen before anyone told me what happened"; "I wrote it down before I asked"; clear temporal precedence claimed but not documented</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">4</TableCell>
                                        <TableCell>Perception documented before verification was possible</TableCell>
                                        <TableCell>Told multiple witnesses immediately upon awakening; wrote down details before any opportunity for contamination; perception was so immediate it was part of their first words; witnesses present in video can confirm temporal precedence</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-md text-sm space-y-2">
                            <p className="font-semibold">Rating Guidance:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>"I described it to my wife immediately when I woke up" = strong if wife is referenced as confirmable witness</li>
                                <li>"I remembered seeing this, and later found out it was true" = weaker (when did they "remember" it?)</li>
                                <li>Look for phrases like "the first thing I said when I woke up was..."</li>
                                <li>Medical staff surprised by accurate details they provided = evidence of temporal precedence</li>
                                <li>Written/recorded documentation &gt; verbal claims</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold">Scoring and Interpretation</h2>

                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Calculation</h3>
                        <p>Total Score Range: 7-28 points</p>
                        <p>Sum all seven criterion ratings (each 1-4) for total score.</p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Evidential Strength Levels</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px]">Score Range</TableHead>
                                        <TableHead>Evidential Strength Level</TableHead>
                                        <TableHead>Interpretation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">7-12</TableCell>
                                        <TableCell>Low Evidential Strength</TableCell>
                                        <TableCell>The veridical perception claims, as presented, lack compelling features. May be due to vague details, lack of verification attempts, information that could be inferred, or unclear medical circumstances.</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">13-17</TableCell>
                                        <TableCell>Moderate Evidential Strength</TableCell>
                                        <TableCell>The account contains some compelling elements but is limited by missing information, partial verification, or features that reduce the anomalous nature of the claims.</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">18-22</TableCell>
                                        <TableCell>High Evidential Strength</TableCell>
                                        <TableCell>The account contains multiple compelling features: severe medical crisis, specific details, verification attempts, and unpredictable information. Would be considered noteworthy for further investigation.</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">23-28</TableCell>
                                        <TableCell>Exceptional Evidential Strength</TableCell>
                                        <TableCell>The account presents highly compelling veridical perception claims with extreme medical crisis, specific and verified unpredictable details. If the claims are accurate, they represent a significant challenge to conventional understanding.</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Critical Threshold Markers</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Strong Account Indicators</strong> (any of these significantly elevates evidential strength):
                                <ul className="list-circle pl-6 mt-1 space-y-1">
                                    <li>Criterion 1 ≥ 3 AND Criterion 5 ≥ 3 (severe medical crisis WITH specific verification)</li>
                                    <li>Criterion 4 = 4 (information seemingly impossible to know)</li>
                                    <li>Criterion 7 ≥ 3 (perception reported before verification possible)</li>
                                    <li>Criterion 2 = 4 (remote perceptions)</li>
                                </ul>
                            </li>
                            <li><strong>Limiting Factors</strong> (these cap overall evidential strength regardless of other scores):
                                <ul className="list-circle pl-6 mt-1 space-y-1">
                                    <li>Criterion 5 = 1 (no verification attempt) limits maximum practical evidential strength</li>
                                    <li>Criterion 3 ≤ 2 (vague details) makes verification claims less meaningful</li>
                                    <li>Criterion 6 = 1 (no verified perceptions) undermines the veridical nature of the claims</li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                <section className="space-y-4 text-sm text-muted-foreground bg-muted/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-base text-foreground">Notes on Scale Limitations</h3>
                    <p>
                        The cvNDE Scale assesses evidential strength of claims as presented—it does not and cannot determine whether claims are actually true. Key limitations include:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>No independent verification: All verification claims come from the experiencer</li>
                        <li>Potential for selective reporting: Experiencers may share verified perceptions and omit errors</li>
                        <li>Memory considerations: Time between experience and recording affects recall</li>
                        <li>Presentation context: Interview format, audience, and platform may influence presentation</li>
                    </ol>
                    <p className="mt-2 font-medium">
                        A high cvNDE score indicates an account WORTH INVESTIGATING further with the vNDE Scale methodology, not proof of veridical perception.
                    </p>
                    <p className="mt-4 italic">
                        Scale developed as a companion to the vNDE Scale (Greyson et al., 2025) for preliminary assessment of first-person accounts.
                    </p>
                </section>
            </div>
        </div>
    );
}
