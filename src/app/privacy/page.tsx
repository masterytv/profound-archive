export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-extrabold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: September 25, 2025</p>

        <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <p>Welcome to Project Profound (the "Website"). This Privacy Policy describes how we collect, use, and protect your information when you visit our website and use our services (the "Services"). We are committed to protecting your privacy and handling your data in an open and transparent manner.</p>

            <h2 className="text-2xl font-bold text-foreground mb-3">1. Information We Collect</h2>
            <p>We collect information in the following ways:</p>
            <ul className="list-disc pl-5">
                <li><strong>Information You Provide:</strong> When you use our "Connect" or "Get In Touch" form, we collect personal information such as your full name, email address, and any message you send us.</li>
                <li><strong>Information for Research:</strong> When you use our "NDE Video Researcher" or "AI Analysis of NDE Testimonies" tools, we may collect the search terms, YouTube URLs, and other data you input. This data is primarily used for research purposes to improve our AI models and understand user queries.</li>
                <li><strong>Automatically Collected Information:</strong> Like most websites, we may collect non-personally-identifying information such as your browser type, language preference, referring site, and the date and time of each visitor request. This helps us understand how visitors use our website and to improve our Services.</li>
            </ul>

            <h2 className="text-2xl font-bold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-5">
                <li><strong>To Respond to You:</strong> We use the information from our contact forms to respond to your inquiries, questions, and collaboration offers.</li>
                <li><strong>For Research and Development:</strong> Data submitted through our research tools is anonymized and aggregated to train our AI models, validate NDE scales, and conduct research into Near-Death Experiences. Our goal is to uncover patterns and insights from the data to contribute to the field of consciousness studies. We will not use your personal contact information in our research datasets.</li>
                <li><strong>To Improve Our Services:</strong> We use aggregated, non-identifying data to understand how our Services are being used, which helps us improve the user experience and functionality.</li>
                <li><strong>To Maintain Security:</strong> We may use information to protect the security and integrity of our Website and Services.</li>
            </ul>

            <h2 className="text-2xl font-bold text-foreground mb-3">3. Data Sharing and Disclosure</h2>
            <p>Project Profound is a research initiative, and collaboration is one of our core values. However, we are also committed to protecting your privacy.</p>
            <ul className="list-disc pl-5">
                <li><strong>Personal Information:</strong> We do not sell, rent, or trade your personal information (like your name and email address) with third parties for their marketing purposes.</li>
                <li><strong>Anonymized Research Data:</strong> We may share anonymized and aggregated research data with academic partners, researchers, and the public through publications, our data portal, or other collaborative efforts. This data will be stripped of any personally identifiable information.</li>
                <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to comply with a legal obligation, protect and defend our rights or property, or in urgent circumstances to protect the personal safety of users of the Service or the public.</li>
            </ul>

            <h2 className="text-2xl font-bold text-foreground mb-3">4. Data Security</h2>
            <p>We take reasonable measures to protect the information we collect from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. However, no internet-based service is 100% secure, so we cannot guarantee the absolute security of your information.</p>

            <h2 className="text-2xl font-bold text-foreground mb-3">5. Third-Party Services</h2>
            <p>Our website may contain links to other websites, such as YouTube. This Privacy Policy does not apply to the practices of third parties that we do not own or control. We encourage you to review the privacy policies of any third-party services you access.</p>

            <h2 className="text-2xl font-bold text-foreground mb-3">6. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.</p>

            <h2 className="text-2xl font-bold text-foreground mb-3">7. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us through the form on our homepage.</p>
        </div>
      </div>
    </div>
  );
}