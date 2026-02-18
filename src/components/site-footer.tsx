import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/60 bg-slate-50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3
              className="text-lg font-bold text-slate-900 mb-2"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Project Profound
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Exploring Near-Death Experiences through research, data analysis, and compassionate AI.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Quick Links
            </h4>
            <div className="space-y-2 text-sm">
              <Link href="/search3" className="block text-slate-600 hover:text-blue-600 transition-colors">
                Search NDEs
              </Link>
              <Link href="/explore/veridical" className="block text-slate-600 hover:text-blue-600 transition-colors">
                Veridical Perception
              </Link>
              <Link href="/explore/greyson" className="block text-slate-600 hover:text-blue-600 transition-colors">
                Greyson Scale
              </Link>
              <Link href="/explore/transformation" className="block text-slate-600 hover:text-blue-600 transition-colors">
                Transformation Index
              </Link>
              <a
                href="https://blog.projectprofound.org"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-slate-600 hover:text-blue-600 transition-colors"
              >
                Blog
              </a>
            </div>
          </div>

          {/* Community & Research */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Community & Research
            </h4>
            <div className="space-y-2 text-sm">
              <a
                href="https://noeticmap.com/research/literature"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-slate-600 hover:text-blue-600 transition-colors"
              >
                Academic Literature ↗
              </a>
              <a
                href="https://noeticmap.com/answers"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-slate-600 hover:text-blue-600 transition-colors"
              >
                Evidence-Based Q&A ↗
              </a>
              <a
                href="https://www.nderf.org"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-slate-600 hover:text-blue-600 transition-colors"
              >
                NDERF Archive ↗
              </a>
              <Link href="/resources" className="block text-slate-600 hover:text-blue-600 transition-colors">
                All Resources
              </Link>
            </div>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Legal & Support
            </h4>
            <div className="space-y-2 text-sm">
              <Link href="/privacy" className="block text-slate-600 hover:text-blue-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block text-slate-600 hover:text-blue-600 transition-colors">
                Terms of Service
              </Link>
              <Link href="/about#connect" className="block text-slate-600 hover:text-blue-600 transition-colors">
                Contact
              </Link>
              <a
                href="https://www.gofundme.com/f/project-profound"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Contribute
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Project Profound. Dive deep into the experience.
          </p>
          <a
            data-formkit-toggle="893453eeff"
            href="https://project-profound.kit.com/893453eeff"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Subscribe to Newsletter
          </a>
        </div>
      </div>
    </footer>
  );
}
