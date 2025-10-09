export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-extrabold text-foreground mb-4">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: October 5, 2025</p>

        <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Acceptance of Terms</h2>
            <p>By accessing and using Project Profound, you accept and agree to be bound by these Terms of Service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Use of Services</h2>
            <p>
              Our services are provided for informational and research purposes. You agree to use them responsibly and
              in accordance with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Content</h2>
            <p>
              The NDE accounts and information provided are sourced from publicly available videos and should not be
              considered medical or professional advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Disclaimer</h2>
            <p>
              Project Profound is an educational and research platform. We make no claims about the veracity of
              individual NDE accounts.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
