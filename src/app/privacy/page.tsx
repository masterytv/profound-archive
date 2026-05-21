export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-white/5 dark:border dark:border-white/10 rounded-xl shadow-md p-8">
        <h1 className="text-4xl font-extrabold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: May 21, 2026</p>

        <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <p>Welcome to Project Profound (the &quot;Website&quot;). This Privacy Policy describes how we collect, use, and protect your information when you visit our website and use our services (the &quot;Services&quot;). We are committed to protecting your privacy and handling your data in an open and transparent manner.</p>

            <p>Project Profound provides research tools spanning two domains: <strong>Near-Death Experience (NDE) research</strong> and <strong>UFO/UAP (Unidentified Anomalous Phenomena) research</strong>. This policy applies equally to both sections of the platform.</p>

            <h2 className="text-2xl font-bold text-foreground mb-3">1. Information We Collect</h2>
            <p>We collect information in the following ways:</p>
            <ul className="list-disc pl-5">
                <li><strong>Information You Provide:</strong> When you use our &quot;Connect&quot; or &quot;Get In Touch&quot; form, we collect personal information such as your full name, email address, and any message you send us. When you create an account or subscribe to our newsletter, we collect your email address and display name.</li>
                <li><strong>Information for Research:</strong> When you use our research tools — including but not limited to the NDE Video Researcher, AI Analysis of NDE Testimonies, UFO/UAP Video Explorer, UFO/UAP Research Assistant, or Cross-Domain Analysis tools — we may collect the search terms, YouTube URLs, filter selections, and other data you input. This data is primarily used for research purposes to improve our AI models and understand user queries.</li>
                <li><strong>Automatically Collected Information:</strong> Like most websites, we may collect non-personally-identifying information such as your browser type, language preference, referring site, and the date and time of each visitor request. This helps us understand how visitors use our website and to improve our Services.</li>
                <li><strong>Newsletter Preferences:</strong> If you subscribe to either the NDE or UFO/UAP newsletter, we store your email address, subscription domain preference (NDE, UAP, or both), and subscription timestamp. You may unsubscribe or manage preferences at any time.</li>
            </ul>

            <h2 className="text-2xl font-bold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-5">
                <li><strong>To Respond to You:</strong> We use the information from our contact forms to respond to your inquiries, questions, and collaboration offers.</li>
                <li><strong>For Research and Development:</strong> Data submitted through our research tools is anonymized and aggregated to train our AI models, validate research scales (such as the Greyson NDE Scale, Veridical Perception scoring, and UAP credibility assessments), and conduct research into Near-Death Experiences and UFO/UAP phenomena. Our goal is to uncover patterns and insights from the data to contribute to the fields of consciousness studies and anomalous phenomena research. We will not use your personal contact information in our research datasets.</li>
                <li><strong>To Improve Our Services:</strong> We use aggregated, non-identifying data to understand how our Services are being used, which helps us improve the user experience and functionality.</li>
                <li><strong>To Maintain Security:</strong> We may use information to protect the security and integrity of our Website and Services.</li>
                <li><strong>To Deliver Newsletters:</strong> We use your email address to send you periodic updates relevant to your selected domain(s) (NDE, UAP, or both). Each email includes an unsubscribe link.</li>
            </ul>

            <h2 className="text-2xl font-bold text-foreground mb-3">3. Data Sharing and Disclosure</h2>
            <p>Project Profound is a research initiative, and collaboration is one of our core values. However, we are also committed to protecting your privacy.</p>
            <ul className="list-disc pl-5">
                <li><strong>Personal Information:</strong> We do not sell, rent, or trade your personal information (like your name and email address) with third parties for their marketing purposes.</li>
                <li><strong>Anonymized Research Data:</strong> We may share anonymized and aggregated research data — from both NDE and UFO/UAP domains — with academic partners, researchers, and the public through publications, our data portal, or other collaborative efforts. This data will be stripped of any personally identifiable information.</li>
                <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to comply with a legal obligation, protect and defend our rights or property, or in urgent circumstances to protect the personal safety of users of the Service or the public.</li>
            </ul>

            <h2 className="text-2xl font-bold text-foreground mb-3">4. Data Security</h2>
            <p>We take reasonable measures to protect the information we collect from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. However, no internet-based service is 100% secure, so we cannot guarantee the absolute security of your information.</p>

            <h2 className="text-2xl font-bold text-foreground mb-3">5. AI-Generated Content</h2>
            <p>Project Profound uses artificial intelligence to analyze and score content across both the NDE and UFO/UAP sections of the platform. This includes:</p>
            <ul className="list-disc pl-5">
                <li><strong>NDE Analysis:</strong> AI-generated Greyson Scale scores, Veridical Perception ratings, Transformation Index scores, and narrative summaries of near-death experience testimonies.</li>
                <li><strong>UFO/UAP Analysis:</strong> AI-generated credibility assessments, entity/event/organization profiles, channel engagement metrics, and research summaries of UAP-related content.</li>
                <li><strong>Cross-Domain Analysis:</strong> AI-generated comparisons identifying thematic overlaps between NDE and UAP phenomena.</li>
            </ul>
            <p>All AI-generated content is clearly labeled as such and is provided for informational and research purposes only. We do not guarantee the accuracy, completeness, or reliability of AI-generated analyses. These outputs should not be treated as definitive assessments or professional opinions.</p>

            <h2 className="text-2xl font-bold text-foreground mb-3">6. Cookies &amp; Consent</h2>
            <p>We use cookies and similar technologies on the Website. When you first visit, a consent banner allows you to choose which categories of cookies to allow. Non-essential cookies are <strong>not loaded until you provide explicit consent</strong>.</p>

            <h3 className="text-xl font-semibold text-foreground mb-2">Cookie Categories</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <th className="px-4 py-2 text-left font-semibold text-foreground">Category</th>
                    <th className="px-4 py-2 text-left font-semibold text-foreground">What It Includes</th>
                    <th className="px-4 py-2 text-left font-semibold text-foreground">Can You Opt Out?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  <tr>
                    <td className="px-4 py-2 font-medium text-foreground">Necessary</td>
                    <td className="px-4 py-2">Supabase authentication session, theme preference, cookie consent record</td>
                    <td className="px-4 py-2">No — required for core functionality</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-foreground">Analytics</td>
                    <td className="px-4 py-2">Google Analytics 4 — anonymized page views and usage patterns. No personal data is shared with Google.</td>
                    <td className="px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-foreground">Marketing</td>
                    <td className="px-4 py-2">ConvertKit newsletter subscription forms and related scripts. No advertising or retargeting cookies.</td>
                    <td className="px-4 py-2">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-2">Managing Your Preferences</h3>
            <ul className="list-disc pl-5">
                <li><strong>On first visit:</strong> A consent banner appears with equal-prominence &quot;Accept all&quot; and &quot;Reject all&quot; buttons, plus granular per-category toggles.</li>
                <li><strong>At any time:</strong> Click <strong>&quot;Cookie Settings&quot;</strong> in the website footer to reopen the consent banner and change your choices.</li>
                <li><strong>Consent record:</strong> Your preference is stored locally in your browser. We do not transmit your consent choice to any server. If we add new cookie categories in the future, the banner will reappear to collect fresh consent.</li>
            </ul>

            <h2 className="text-2xl font-bold text-foreground mb-3">7. Third-Party Services</h2>
            <p>Our website may contain links to or embed content from other websites and services, including but not limited to YouTube, GoFundMe, and various UFO/UAP research databases. This Privacy Policy does not apply to the practices of third parties that we do not own or control. We encourage you to review the privacy policies of any third-party services you access.</p>

            <h2 className="text-2xl font-bold text-foreground mb-3">8. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.</p>

            <h2 className="text-2xl font-bold text-foreground mb-3">9. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us through the form on our homepage.</p>
        </div>
      </div>
    </div>
  );
}