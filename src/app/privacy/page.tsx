export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-extrabold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: October 5, 2025</p>

        <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Introduction</h2>
            <p>
              Project Profound is committed to protecting your privacy. This policy explains how we collect, use, and
              safeguard your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Information We Collect</h2>
            <p>
              We collect minimal information necessary to provide our services, including search queries, chat
              interactions, and basic analytics data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">How We Use Your Information</h2>
            <p>
              Your information is used solely to improve our services, provide search and chat functionality, and
              understand usage patterns.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data from unauthorized access or
              disclosure.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
